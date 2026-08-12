import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession as DBSession

from app.agents.calibration_graph import CalibrationError, compile_calibration
from app.agents.panel_graph import generate_next_question
from app.agents.personas import default_kriteria_for, panel_for
from app.agents.scorecard_graph import ScorecardError, compile_scorecard
from app.agents.suggestion_graph import SuggestionError, suggest_answers
from app.api.deps import get_current_user, get_llm
from app.services.vision import OpenAIVision, VisionError, get_vision
from app.core.config import DEFAULT_RUBRIC_KRITERIA
from app.core.plans import effective_plan, entitlements
from app.db.session import get_db
from app.llm import LLMClient
from app.llm.base import LLMError
from app.models.analysis import DocumentAnalysis
from app.models.document import Document
from app.models.outcome import CompetitionOutcome
from app.models.rubric import CompetitionRubric
from app.models.scorecard import Scorecard
from app.models.session import Session
from app.models.team import Team, TeamMember
from app.models.turn import SessionTurn
from app.models.user import User
from app.schemas.session import (
    AnswerRequest,
    InsightKategori,
    InsightsResponse,
    NextTurnResponse,
    OutcomeCreate,
    OutcomePublic,
    OverviewResponse,
    PresentationSubmit,
    ScorecardPublic,
    SuggestionsResponse,
    SessionCreate,
    SessionListItem,
    SessionPublic,
    TurnPublic,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def _owned_session(session_id: uuid.UUID, user: User, db: DBSession) -> Session:
    sess = await db.get(Session, session_id)
    if sess is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sesi tidak ditemukan")
    if sess.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bukan pemilik sesi")
    return sess


async def _ordered_turns(session_id: uuid.UUID, db: DBSession) -> list[SessionTurn]:
    result = await db.scalars(
        select(SessionTurn)
        .where(SessionTurn.session_id == session_id)
        .order_by(SessionTurn.urutan)
    )
    return list(result)


def _compute_pacing(turns: list[SessionTurn]) -> dict | None:
    """Aggregate delivery (pacing) over answered turns for the scorecard."""
    deliveries = [t.delivery_json for t in turns if t.delivery_json]
    if not deliveries:
        return None
    wpms = [int(d.get("wpm", 0)) for d in deliveries if d.get("wpm")]
    total_filler = sum(int(d.get("filler", 0) or 0) for d in deliveries)
    n = len(deliveries)
    wpm_rata = round(sum(wpms) / len(wpms)) if wpms else 0
    filler_per_jawaban = total_filler / n if n else 0

    if wpm_rata and wpm_rata > 160:
        tempo = "terlalu cepat"
    elif wpm_rata and wpm_rata < 110:
        tempo = "terlalu lambat"
    else:
        tempo = "pas"

    catatan = []
    if tempo == "terlalu cepat":
        catatan.append("Tempo bicara cepat — beri jeda agar juri mudah mengikuti.")
    elif tempo == "terlalu lambat":
        catatan.append("Tempo cenderung lambat — jaga energi dan ketegasan.")
    else:
        catatan.append("Tempo bicara sudah proporsional.")
    if filler_per_jawaban >= 3:
        catatan.append(
            f"Kata pengisi cukup sering (~{filler_per_jawaban:.1f}/jawaban); "
            "kurangi 'eee', 'anu', 'kayak'."
        )

    return {
        "wpm_rata": wpm_rata,
        "total_filler": total_filler,
        "jumlah_jawaban": n,
        "tempo": tempo,
        "catatan": catatan,
    }


def _transcript(turns: list[SessionTurn]) -> list[dict]:
    return [
        {
            "persona": t.persona,
            "pertanyaan": t.pertanyaan,
            "jawaban": t.jawaban,
            "delivery": t.delivery_json,
            "ekspresi": t.ekspresi_json,
        }
        for t in turns
        if t.jawaban is not None
    ]


def _elapsed_seconds(sess: Session, now: datetime | None = None) -> int:
    if sess.mulai_pada is None:
        return 0
    # Q&A clock hasn't started until the presentation phase is finished.
    if sess.dengan_presentasi and not sess.presentasi_selesai:
        return 0
    now = now or datetime.now(timezone.utc)
    # While paused ("lanjut nanti") the clock is frozen at jeda_pada.
    if sess.jeda_pada is not None:
        now = sess.jeda_pada
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
    started = sess.mulai_pada
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    return max(0, int((now - started).total_seconds()))


def _remaining_seconds(sess: Session, now: datetime | None = None) -> int:
    return max(0, sess.durasi_menit * 60 - _elapsed_seconds(sess, now))


def _time_up(sess: Session, now: datetime | None = None) -> bool:
    return _remaining_seconds(sess, now) <= 0


def _public(sess: Session, turns: list[SessionTurn]) -> SessionPublic:
    return SessionPublic(
        id=sess.id,
        document_id=sess.document_id,
        rubric_id=sess.rubric_id,
        team_id=sess.team_id,
        mode=sess.mode,
        status=sess.status,
        gaya=sess.gaya,
        kedalaman=sess.kedalaman,
        bahasa=sess.bahasa,
        jenis=sess.jenis,
        kategori=sess.kategori,
        dengan_presentasi=sess.dengan_presentasi,
        durasi_presentasi_menit=sess.durasi_presentasi_menit,
        presentasi_selesai=sess.presentasi_selesai,
        durasi_menit=sess.durasi_menit,
        sisa_detik=_remaining_seconds(sess),
        persona_order=panel_for(sess.jenis, sess.kategori),
        turns=[TurnPublic.model_validate(t) for t in turns],
    )


async def _team_members(sess: Session, db: DBSession) -> list[TeamMember]:
    if not sess.team_id:
        return []
    result = await db.scalars(
        select(TeamMember)
        .where(TeamMember.team_id == sess.team_id)
        .order_by(TeamMember.created_at)
    )
    return list(result)


_KATEGORI_LABEL = {
    "umum": "kompetisi umum",
    "hackathon": "kompetisi hackathon",
    "software": "kompetisi software development",
    "data_ai": "kompetisi data science / AI",
    "uiux": "kompetisi desain UI/UX",
    "business_case": "kompetisi business case",
    "business_plan": "kompetisi business plan",
    "sempro": "seminar proposal skripsi",
    "skripsi": "sidang skripsi",
    "ujian": "presentasi ujian (UTS/UAS)",
}


def _konteks_label(jenis: str, kategori: str) -> str:
    label = _KATEGORI_LABEL.get(kategori, kategori)
    if jenis == "akademik":
        return f"Sidang/presentasi akademik — {label}"
    return f"Kompetisi — {label}"


async def _rubric_kriteria(sess: Session, db: DBSession) -> list[str]:
    if sess.rubric_id:
        rubric = await db.get(CompetitionRubric, sess.rubric_id)
        if rubric and rubric.kriteria_json:
            return list(rubric.kriteria_json)
    # No uploaded rubric → context-specific default, else the global default.
    ctx_default = default_kriteria_for(sess.jenis, sess.kategori)
    return list(ctx_default or DEFAULT_RUBRIC_KRITERIA)


async def _analysis_findings(sess: Session, db: DBSession) -> list[dict]:
    if not sess.document_id:
        return []
    analysis = await db.scalar(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.document_id == sess.document_id)
        .order_by(DocumentAnalysis.created_at.desc())
    )
    return list(analysis.findings_json) if analysis else []


@router.post("", response_model=SessionPublic, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SessionPublic:
    doc = await db.get(Document, payload.document_id)
    if doc is None or doc.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dokumen tidak ditemukan")

    analysis = await db.scalar(
        select(DocumentAnalysis).where(
            DocumentAnalysis.document_id == doc.id
        )
    )
    if analysis is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Dokumen harus dianalisis sebelum memulai simulasi",
        )

    # Plan entitlements.
    plan = effective_plan(user.plan, user.plan_expires_at)
    ent = entitlements(plan)
    kuota = ent["sesi_kuota"]
    if kuota is not None:
        dipakai = await db.scalar(
            select(func.count()).select_from(Session).where(Session.user_id == user.id)
        )
        if int(dipakai or 0) >= kuota:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                f"Kuota sesi paket gratis habis ({kuota}). Upgrade ke Pro untuk sesi tak terbatas.",
            )
    if payload.dengan_presentasi and not ent["presentasi"]:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Fase presentasi hanya tersedia di paket Pro atau Tim.",
        )
    if payload.team_id is not None and not ent["tim"]:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Mode tim hanya tersedia di paket Tim.",
        )

    mode = "individu"
    team_id = None
    if payload.team_id is not None:
        team = await db.get(Team, payload.team_id)
        if team is None or team.owner_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tim tidak ditemukan")
        has_member = await db.scalar(
            select(TeamMember.id).where(TeamMember.team_id == team.id)
        )
        if has_member is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Tim belum memiliki anggota"
            )
        mode = "tim"
        team_id = team.id

    sess = Session(
        user_id=user.id,
        document_id=doc.id,
        rubric_id=payload.rubric_id,
        team_id=team_id,
        mode=mode,
        jenis=payload.jenis,
        kategori=payload.kategori,
        dengan_presentasi=payload.dengan_presentasi,
        durasi_presentasi_menit=(
            payload.durasi_presentasi_menit if payload.dengan_presentasi else 0
        ),
        status="active",
        gaya=payload.gaya,
        kedalaman=payload.kedalaman,
        bahasa=payload.bahasa,
        durasi_menit=payload.durasi_menit,
        mulai_pada=datetime.now(timezone.utc),
    )
    db.add(sess)
    await db.commit()
    await db.refresh(sess)
    return _public(sess, [])


def _avg_score(skor_json: dict | None) -> int | None:
    if not skor_json:
        return None
    values = [int(v) for v in skor_json.values()]
    return round(sum(values) / len(values)) if values else None


@router.get("", response_model=list[SessionListItem])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> list[SessionListItem]:
    sessions = list(
        await db.scalars(
            select(Session)
            .where(Session.user_id == user.id)
            .order_by(Session.created_at.desc())
        )
    )
    if not sessions:
        return []

    doc_ids = {s.document_id for s in sessions if s.document_id}
    rubric_ids = {s.rubric_id for s in sessions if s.rubric_id}
    sess_ids = [s.id for s in sessions]

    docs = {
        d.id: d
        for d in await db.scalars(select(Document).where(Document.id.in_(doc_ids)))
    } if doc_ids else {}
    rubrics = {
        r.id: r
        for r in await db.scalars(
            select(CompetitionRubric).where(CompetitionRubric.id.in_(rubric_ids))
        )
    } if rubric_ids else {}
    scorecards = {
        sc.session_id: sc
        for sc in await db.scalars(
            select(Scorecard).where(Scorecard.session_id.in_(sess_ids))
        )
    }

    items = []
    for s in sessions:
        doc = docs.get(s.document_id) if s.document_id else None
        rubric = rubrics.get(s.rubric_id) if s.rubric_id else None
        sc = scorecards.get(s.id)
        items.append(
            SessionListItem(
                id=s.id,
                document_filename=doc.filename if doc else None,
                nama_kompetisi=rubric.nama_kompetisi if rubric else "Rubrik umum",
                mode=s.mode,
                status=s.status,
                skor_rata_rata=_avg_score(sc.skor_per_kategori_json) if sc else None,
                created_at=s.created_at,
            )
        )
    return items


@router.get("/overview", response_model=OverviewResponse)
async def overview(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> OverviewResponse:
    sessions = list(
        await db.scalars(select(Session).where(Session.user_id == user.id))
    )
    selesai = [s for s in sessions if s.status == "selesai"]

    dokumen_dianalisis = len(
        list(
            await db.scalars(
                select(Document.id).where(
                    Document.owner_id == user.id,
                    Document.status_analisis == "analyzed",
                )
            )
        )
    )

    skor_terakhir: int | None = None
    if selesai:
        latest = max(selesai, key=lambda s: s.selesai_pada or s.created_at)
        sc = await db.scalar(
            select(Scorecard).where(Scorecard.session_id == latest.id)
        )
        skor_terakhir = _avg_score(sc.skor_per_kategori_json) if sc else None

    return OverviewResponse(
        total_sesi=len(sessions),
        sesi_selesai=len(selesai),
        skor_terakhir=skor_terakhir,
        dokumen_dianalisis=dokumen_dianalisis,
    )


# Categories scoring below this across sessions count as a recurring weakness.
_WEAK_THRESHOLD = 60


@router.get("/insights", response_model=InsightsResponse)
async def insights(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> InsightsResponse:
    """Recurring-weakness patterns across a user's completed sessions (PRD §2.5):
    per-category average and how many sessions each category came out weak."""
    sess_ids = list(
        await db.scalars(select(Session.id).where(Session.user_id == user.id))
    )
    cards = (
        list(
            await db.scalars(
                select(Scorecard).where(Scorecard.session_id.in_(sess_ids))
            )
        )
        if sess_ids
        else []
    )
    if len(cards) < 2:
        return InsightsResponse(
            cukup_data=False, total_sesi_dinilai=len(cards), kategori=[]
        )

    totals: dict[str, int] = {}
    counts: dict[str, int] = {}
    weak: dict[str, int] = {}
    for sc in cards:
        for nama, skor in (sc.skor_per_kategori_json or {}).items():
            try:
                nilai = int(skor)
            except (TypeError, ValueError):
                continue
            totals[nama] = totals.get(nama, 0) + nilai
            counts[nama] = counts.get(nama, 0) + 1
            if nilai < _WEAK_THRESHOLD:
                weak[nama] = weak.get(nama, 0) + 1

    kategori = [
        InsightKategori(
            nama=nama,
            rata=round(totals[nama] / counts[nama]),
            sesi_lemah=weak.get(nama, 0),
            total_sesi=counts[nama],
        )
        for nama in totals
    ]
    # Weakest (lowest average) first — the patterns worth drilling.
    kategori.sort(key=lambda k: k.rata)
    return InsightsResponse(
        cukup_data=True, total_sesi_dinilai=len(cards), kategori=kategori
    )


@router.get("/{session_id}", response_model=SessionPublic)
async def get_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SessionPublic:
    sess = await _owned_session(session_id, user, db)
    # Resuming after "lanjut nanti": shift the start forward by the paused gap so
    # the clock picks up exactly where it left off, then clear the pause.
    if sess.jeda_pada is not None:
        now = datetime.now(timezone.utc)
        paused = sess.jeda_pada
        if paused.tzinfo is None:
            paused = paused.replace(tzinfo=timezone.utc)
        if sess.mulai_pada is not None:
            started = sess.mulai_pada
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            sess.mulai_pada = started + (now - paused)
        sess.jeda_pada = None
        await db.commit()
        await db.refresh(sess)
    turns = await _ordered_turns(session_id, db)
    return _public(sess, turns)


@router.post("/{session_id}/jeda", response_model=SessionPublic)
async def pause_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SessionPublic:
    """Freeze the session clock ("lanjut nanti"). Idempotent."""
    sess = await _owned_session(session_id, user, db)
    if sess.jeda_pada is None:
        sess.jeda_pada = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(sess)
    turns = await _ordered_turns(session_id, db)
    return _public(sess, turns)


@router.post("/{session_id}/presentation", response_model=SessionPublic)
async def finish_presentation(
    session_id: uuid.UUID,
    payload: PresentationSubmit,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SessionPublic:
    """Store the presentation transcript and start the Q&A clock. Idempotent."""
    sess = await _owned_session(session_id, user, db)
    if not sess.presentasi_selesai:
        sess.presentasi_transkrip = payload.transkrip or None
        sess.presentasi_selesai = True
        # Q&A duration counts from the moment the presentation ends.
        sess.mulai_pada = datetime.now(timezone.utc)
        sess.jeda_pada = None
        await db.commit()
        await db.refresh(sess)
    turns = await _ordered_turns(session_id, db)
    return _public(sess, turns)


@router.get("/{session_id}/next", response_model=NextTurnResponse)
async def next_turn(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
) -> NextTurnResponse:
    sess = await _owned_session(session_id, user, db)
    turns = await _ordered_turns(session_id, db)

    # Return an existing unanswered turn first (mid-question resume).
    for t in turns:
        if t.jawaban is None:
            return NextTurnResponse(done=False, turn=TurnPublic.model_validate(t))

    # Session ends when the chosen duration elapses (after ≥1 question).
    if turns and _time_up(sess):
        return NextTurnResponse(done=True, turn=None)

    urutan = len(turns) + 1
    findings = await _analysis_findings(sess, db)
    kriteria = await _rubric_kriteria(sess, db)

    # Adaptive follow-up: allow probing the previous answer unless that answer
    # was itself already a follow-up (avoid endless chaining).
    answered = [t for t in turns if t.jawaban is not None]
    last = answered[-1] if answered else None
    allow_followup = last is not None and not last.is_followup

    # Round-robin rotation counts only main (non-follow-up) questions so that
    # inserted follow-ups don't scramble the panel order.
    rotasi = sum(1 for t in turns if not t.is_followup) + 1

    panel_order = panel_for(sess.jenis, sess.kategori)
    konteks = _konteks_label(sess.jenis, sess.kategori)

    target_peran = None
    target_nama = None
    if sess.mode == "tim":
        members = await _team_members(sess, db)
        if members:
            target = members[(rotasi - 1) % len(members)]
            target_peran = target.peran
            target_nama = target.nama

    try:
        persona, pertanyaan, is_followup = await run_in_threadpool(
            generate_next_question,
            urutan=rotasi,
            panel_order=panel_order,
            konteks=konteks,
            presentasi_transkrip=sess.presentasi_transkrip,
            analysis_findings=findings,
            rubric_kriteria=kriteria,
            transcript=_transcript(turns),
            client=llm,
            target_peran=target_peran,
            target_nama=target_nama,
            gaya=sess.gaya,
            kedalaman=sess.kedalaman,
            bahasa=sess.bahasa,
            allow_followup=allow_followup,
            last_persona=last.persona if last else None,
            last_pertanyaan=last.pertanyaan if last else None,
            last_jawaban=last.jawaban if last else None,
        )
    except LLMError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Model AI gagal merespons (GPT & Gemini). Periksa API key/model. {exc}",
        ) from exc

    # A follow-up presses the same member who just answered.
    if is_followup and last is not None:
        target_peran = last.target_peran
        target_nama = last.target_nama

    turn = SessionTurn(
        session_id=sess.id,
        urutan=urutan,
        persona=persona,
        pertanyaan=pertanyaan,
        target_peran=target_peran,
        target_nama=target_nama,
        is_followup=is_followup,
    )
    db.add(turn)
    await db.commit()
    await db.refresh(turn)
    return NextTurnResponse(done=False, turn=TurnPublic.model_validate(turn))


@router.post("/{session_id}/answer", response_model=TurnPublic)
async def submit_answer(
    session_id: uuid.UUID,
    payload: AnswerRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> SessionTurn:
    sess = await _owned_session(session_id, user, db)
    turn = await db.get(SessionTurn, payload.turn_id)
    if turn is None or turn.session_id != sess.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Giliran tidak ditemukan")

    turn.jawaban = payload.jawaban
    turn.waktu_tempuh_ms = payload.waktu_tempuh_ms
    if payload.delivery is not None:
        turn.delivery_json = payload.delivery

    if _time_up(sess):
        sess.status = "menunggu_scorecard"

    await db.commit()
    await db.refresh(turn)
    return turn


@router.post("/{session_id}/turns/{turn_id}/observe", response_model=TurnPublic)
async def observe_turn(
    session_id: uuid.UUID,
    turn_id: uuid.UUID,
    photo: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    vision: OpenAIVision = Depends(get_vision),
) -> SessionTurn:
    sess = await _owned_session(session_id, user, db)
    turn = await db.get(SessionTurn, turn_id)
    if turn is None or turn.session_id != sess.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Giliran tidak ditemukan")

    data = await photo.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Foto kosong")

    try:
        result = await run_in_threadpool(vision.analyze, data)
    except VisionError:
        # Degrade gracefully — expression analysis is optional.
        result = {"tersedia": False}

    turn.ekspresi_json = result
    await db.commit()
    await db.refresh(turn)
    return turn


@router.post("/{session_id}/scorecard", response_model=ScorecardPublic)
async def build_scorecard(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
) -> Scorecard:
    sess = await _owned_session(session_id, user, db)

    existing = await db.scalar(
        select(Scorecard).where(Scorecard.session_id == sess.id)
    )
    if existing is not None:
        return existing

    turns = await _ordered_turns(session_id, db)
    transcript = _transcript(turns)
    if not transcript:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Belum ada jawaban untuk dinilai"
        )

    kriteria = await _rubric_kriteria(sess, db)
    try:
        result = await run_in_threadpool(
            compile_scorecard,
            rubric_kriteria=kriteria,
            transcript=transcript,
            client=llm,
            presentasi_transkrip=sess.presentasi_transkrip,
        )
    except ScorecardError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    except LLMError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Model AI gagal merespons (GPT & Gemini). Periksa API key/model. {exc}",
        ) from exc

    scorecard = Scorecard(
        session_id=sess.id,
        skor_per_kategori_json=result.skor_per_kategori,
        ringkasan_kekuatan=result.ringkasan_kekuatan,
        ringkasan_kelemahan=result.ringkasan_kelemahan,
        rencana_perbaikan_json=result.rencana_perbaikan,
        pacing_json=_compute_pacing(turns),
        penilaian_presentasi_json=result.penilaian_presentasi,
        model_used=llm.last_model_used or "unknown",
    )
    sess.status = "selesai"
    sess.selesai_pada = datetime.now(timezone.utc)
    db.add(scorecard)
    await db.commit()
    await db.refresh(scorecard)
    return scorecard


@router.get("/{session_id}/scorecard", response_model=ScorecardPublic)
async def get_scorecard(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> Scorecard:
    sess = await _owned_session(session_id, user, db)
    scorecard = await db.scalar(
        select(Scorecard).where(Scorecard.session_id == sess.id)
    )
    if scorecard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scorecard belum tersedia")
    return scorecard


@router.post("/{session_id}/outcome", response_model=OutcomePublic)
async def record_outcome(
    session_id: uuid.UUID,
    payload: OutcomeCreate,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
) -> CompetitionOutcome:
    """Record the real competition result + jury critique, then calibrate it
    against Pitchly's predicted critiques (PRD §4.4.b). Idempotent per session."""
    sess = await _owned_session(session_id, user, db)

    if not entitlements(effective_plan(user.plan, user.plan_expires_at))["kalibrasi"]:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Kalibrasi pasca-kompetisi hanya tersedia di paket Pro atau Tim.",
        )

    existing = await db.scalar(
        select(CompetitionOutcome).where(CompetitionOutcome.session_id == sess.id)
    )
    if existing is not None:
        return existing

    scorecard = await db.scalar(
        select(Scorecard).where(Scorecard.session_id == sess.id)
    )
    if scorecard is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Scorecard sesi ini belum ada; selesaikan sesi dulu.",
        )

    analisis: dict | None = None
    model_used: str | None = None
    try:
        result = await run_in_threadpool(
            compile_calibration,
            prediksi_kelemahan=scorecard.ringkasan_kelemahan,
            prediksi_rencana=list(scorecard.rencana_perbaikan_json or []),
            kritik_juri_asli=payload.kritik_juri_asli,
            hasil=payload.hasil,
            client=llm,
        )
        analisis = {
            "akurasi_persen": result.akurasi_persen,
            "prediksi_tepat": result.prediksi_tepat,
            "prediksi_terlewat": result.prediksi_terlewat,
            "ringkasan": result.ringkasan,
        }
        model_used = llm.last_model_used or "unknown"
    except (CalibrationError, LLMError):
        # Keep the recorded outcome even if calibration analysis fails.
        analisis = None

    outcome = CompetitionOutcome(
        session_id=sess.id,
        user_id=user.id,
        kritik_juri_asli=payload.kritik_juri_asli,
        hasil=payload.hasil,
        catatan=payload.catatan,
        analisis_json=analisis,
        model_used=model_used,
    )
    db.add(outcome)
    await db.commit()
    await db.refresh(outcome)
    return outcome


@router.get("/{session_id}/outcome", response_model=OutcomePublic)
async def get_outcome(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> CompetitionOutcome:
    sess = await _owned_session(session_id, user, db)
    outcome = await db.scalar(
        select(CompetitionOutcome).where(CompetitionOutcome.session_id == sess.id)
    )
    if outcome is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Belum ada hasil kompetisi")
    return outcome


@router.post("/{session_id}/suggestions", response_model=SuggestionsResponse)
async def answer_suggestions(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
) -> SuggestionsResponse:
    """Per-question improved-answer coaching (shown after a session, NOT exported).
    Generated on demand and cached on the scorecard."""
    sess = await _owned_session(session_id, user, db)
    scorecard = await db.scalar(
        select(Scorecard).where(Scorecard.session_id == sess.id)
    )
    if scorecard is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Scorecard belum tersedia; selesaikan sesi dulu."
        )

    turns = await _ordered_turns(session_id, db)
    answered = [t for t in turns if t.jawaban is not None]
    by_urutan = {t.urutan: t for t in answered}

    def _merge(raw: list[dict]) -> list[dict]:
        out = []
        for item in raw:
            t = by_urutan.get(int(item.get("urutan", 0)))
            if not t:
                continue
            out.append(
                {
                    "urutan": t.urutan,
                    "pertanyaan": t.pertanyaan,
                    "jawaban": t.jawaban,
                    "koreksi": item.get("koreksi", ""),
                    "jawaban_lebih_baik": item.get("jawaban_lebih_baik", ""),
                }
            )
        return out

    # Return cached suggestions if already generated.
    if scorecard.saran_jawaban_json:
        return SuggestionsResponse(items=scorecard.saran_jawaban_json)

    if not answered:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Belum ada jawaban.")

    transcript = [
        {
            "urutan": t.urutan,
            "persona": t.persona,
            "pertanyaan": t.pertanyaan,
            "jawaban": t.jawaban,
        }
        for t in answered
    ]
    findings = await _analysis_findings(sess, db)
    kriteria = await _rubric_kriteria(sess, db)
    try:
        raw = await run_in_threadpool(
            suggest_answers,
            transcript=transcript,
            analysis_findings=findings,
            rubric_kriteria=kriteria,
            client=llm,
        )
    except SuggestionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    except LLMError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Model AI gagal merespons. {exc}",
        ) from exc

    items = _merge(raw)
    scorecard.saran_jawaban_json = items
    await db.commit()
    return SuggestionsResponse(items=items)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
) -> None:
    sess = await _owned_session(session_id, user, db)
    await db.delete(sess)
    await db.commit()

