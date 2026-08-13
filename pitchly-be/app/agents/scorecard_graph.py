import json
from dataclasses import dataclass
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents.language import language_directive
from app.agents.safety import SAFETY_NOTICE, sanitize, wrap_untrusted
from app.llm.client import LLMClient


class ScorecardError(Exception):
    """Raised when the scorecard LLM response cannot be parsed."""


@dataclass
class ScorecardResult:
    skor_per_kategori: dict[str, int]
    ringkasan_kekuatan: str
    ringkasan_kelemahan: str
    rencana_perbaikan: list[str]
    # Present only when the session had a presentation phase.
    penilaian_presentasi: dict | None = None


class ScorecardState(TypedDict, total=False):
    rubric_kriteria: list[str]
    transcript: list[dict]
    presentasi_transkrip: str | None
    output_language: str
    client: LLMClient
    result: ScorecardResult


SYSTEM = (
    "Anda ketua panel juri yang menyusun laporan akhir sesi tanya jawab "
    "kompetisi. Nilai terutama substansi jawaban terhadap kriteria rubrik. "
    "Bila tersedia, pertimbangkan juga cara penyampaian (delivery: tempo, jeda, "
    "kata pengisi) dan bahasa tubuh (ekspresi, kepercayaan diri, postur) sebagai "
    "aspek kesiapan panggung. Nada presisi dan membumi, tanpa hiperbola."
)


def _format_transcript(transcript: list[dict]) -> str:
    blocks = []
    for t in transcript:
        extra = ""
        if t.get("delivery"):
            extra += f"\nDelivery: {t['delivery']}"
        if t.get("ekspresi"):
            extra += f"\nBahasa tubuh: {t['ekspresi']}"
        jawab = sanitize(t.get("jawaban"), 2000) or "(tidak dijawab)"
        blocks.append(
            f"[{t['persona']}] Tanya: {t['pertanyaan']}\n"
            f"Jawab: {jawab}{extra}"
        )
    return "\n\n".join(blocks)


def _compile(state: ScorecardState) -> dict[str, Any]:
    kriteria = state.get("rubric_kriteria") or ["Kualitas jawaban keseluruhan"]
    presentasi = (state.get("presentasi_transkrip") or "").strip()
    _pres_block = wrap_untrusted(
        "Transkrip presentasi lisan peserta (nilai juga kejelasan, struktur, dan "
        "kelengkapan penyampaian):",
        presentasi,
        limit=6000,
    )
    presentasi_block = f"{_pres_block}\n\n" if _pres_block else ""
    presentasi_field = (
        '  "penilaian_presentasi": {\n'
        '    "skor": <0-100 kualitas presentasi lisan>,\n'
        '    "ringkasan": "<paragraf ringkas penilaian presentasi>",\n'
        '    "kekuatan": ["<hal baik dari presentasi>", "..."],\n'
        '    "perbaikan": ["<saran perbaikan presentasi>", "..."]\n'
        "  },\n"
        if presentasi
        else ""
    )
    presentasi_instruksi = (
        'Isi "penilaian_presentasi" khusus menilai presentasi lisan (kejelasan, '
        "struktur, alur, kelengkapan) terpisah dari sesi tanya jawab.\n"
        if presentasi
        else ""
    )
    prompt = (
        "Susun scorecard dari sesi berikut.\n\n"
        f"Kriteria penilaian: {', '.join(kriteria)}\n\n"
        f"{presentasi_block}"
        f"Transkrip tanya jawab:\n{_format_transcript(state.get('transcript') or [])}\n\n"
        "Balas HANYA JSON valid dengan struktur:\n"
        "{\n"
        '  "skor_per_kategori": { "<nama kriteria>": <0-100>, ... },\n'
        '  "ringkasan_kekuatan": "<paragraf ringkas kekuatan peserta>",\n'
        '  "ringkasan_kelemahan": "<paragraf ringkas kelemahan peserta>",\n'
        '  "rencana_perbaikan": ["<tindakan konkret>", "..."],\n'
        f"{presentasi_field}"
        "}\n"
        "skor_per_kategori WAJIB memuat setiap kriteria di atas.\n"
        f"{presentasi_instruksi}"
    )
    client: LLMClient = state["client"]
    directive = language_directive(state.get("output_language"))
    raw = client.complete(
        prompt, system=f"{SYSTEM}\n{SAFETY_NOTICE}\n{directive}", json_mode=True
    )

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ScorecardError(f"Respons scorecard bukan JSON valid: {exc}") from exc

    try:
        skor = {str(k): int(v) for k, v in data["skor_per_kategori"].items()}
        penilaian = data.get("penilaian_presentasi") if presentasi else None
        result = ScorecardResult(
            skor_per_kategori=skor,
            ringkasan_kekuatan=str(data["ringkasan_kekuatan"]),
            ringkasan_kelemahan=str(data["ringkasan_kelemahan"]),
            rencana_perbaikan=[str(x) for x in data["rencana_perbaikan"]],
            penilaian_presentasi=penilaian if isinstance(penilaian, dict) else None,
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ScorecardError(f"Struktur scorecard tidak lengkap: {exc}") from exc

    return {"result": result}


def _build_graph():
    g = StateGraph(ScorecardState)
    g.add_node("compile_scorecard", _compile)
    g.add_edge(START, "compile_scorecard")
    g.add_edge("compile_scorecard", END)
    return g.compile()


_SCORECARD = _build_graph()


def compile_scorecard(
    *,
    rubric_kriteria: list[str],
    transcript: list[dict],
    client: LLMClient,
    presentasi_transkrip: str | None = None,
    output_language: str = "id",
) -> ScorecardResult:
    result = _SCORECARD.invoke(
        {
            "rubric_kriteria": rubric_kriteria,
            "transcript": transcript,
            "presentasi_transkrip": presentasi_transkrip,
            "output_language": output_language,
            "client": client,
        }
    )
    return result["result"]
