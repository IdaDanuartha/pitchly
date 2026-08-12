import json
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents.personas import PERSONAS, persona_for_turn
from app.llm.client import LLMClient


class PanelState(TypedDict, total=False):
    urutan: int  # rotation index (main questions only) for round-robin persona
    panel_order: list[str]  # persona keys for this session's context
    konteks: str | None  # human label of jenis+kategori for domain grounding
    presentasi_transkrip: str | None  # what the candidate said while presenting
    analysis_findings: list[dict]
    rubric_kriteria: list[str]
    transcript: list[dict]  # [{persona, pertanyaan, jawaban}]
    target_peran: str | None
    target_nama: str | None
    gaya: str
    kedalaman: str
    bahasa: str
    # last answered turn — enables the adaptive follow-up branch
    allow_followup: bool
    last_persona: str | None
    last_pertanyaan: str | None
    last_jawaban: str | None
    client: LLMClient
    # outputs
    persona: str
    pertanyaan: str
    is_followup: bool


_JUDGE_SYSTEM = (
    "Anda juri kompetisi yang jeli. Nilai apakah jawaban peserta atas pertanyaan "
    "sebelumnya sudah tuntas atau masih mengelak/dangkal/klaim tanpa bukti."
)


def _decide(state: PanelState) -> dict[str, Any]:
    """ReAct-style branch: probe the previous answer with a follow-up when it is
    evasive or shallow; otherwise move on to the next round-robin persona."""
    if state.get("allow_followup") and (state.get("last_jawaban") or "").strip():
        client: LLMClient = state["client"]
        prompt = (
            "Pertanyaan juri sebelumnya:\n"
            f"{state.get('last_pertanyaan')}\n\n"
            "Jawaban peserta:\n"
            f"{state.get('last_jawaban')}\n\n"
            "Apakah jawaban ini mengelak, dangkal, atau mengklaim tanpa bukti "
            "sehingga layak dikejar satu pertanyaan lanjutan? Balas HANYA JSON: "
            '{"perlu_lanjutan": true|false}'
        )
        try:
            raw = client.complete(prompt, system=_JUDGE_SYSTEM, json_mode=True)
            perlu = bool(json.loads(raw).get("perlu_lanjutan"))
        except Exception:
            perlu = False
        if perlu:
            return {"persona": state["last_persona"], "is_followup": True}
    order = state.get("panel_order") or None
    return {
        "persona": persona_for_turn(state["urutan"], order),
        "is_followup": False,
    }


def _format_transcript(transcript: list[dict]) -> str:
    if not transcript:
        return "(Belum ada tanya jawab sebelumnya.)"
    lines = []
    for t in transcript:
        lines.append(f"[{t['persona']}] Tanya: {t['pertanyaan']}")
        if t.get("jawaban"):
            lines.append(f"    Jawab peserta: {t['jawaban']}")
    return "\n".join(lines)


def _generate_question(state: PanelState) -> dict[str, Any]:
    persona = PERSONAS[state["persona"]]
    findings = state.get("analysis_findings") or []
    kriteria = state.get("rubric_kriteria") or []
    temuan = "; ".join(f"{f.get('bagian')}: {f.get('temuan')}" for f in findings[:6])

    gaya_map = {
        "kritis": "Sangat kritis dan menekan; kejar kelemahan tanpa kompromi.",
        "seimbang": "Kritis namun adil; tegas tetapi membangun.",
        "santai": "Santai dan suportif; menantang lembut, tidak menekan.",
    }
    kedalaman_map = {
        "ringkas": "Ajukan satu pertanyaan singkat dan langsung ke inti.",
        "detail": "Ajukan pertanyaan mendalam dengan konteks spesifik dari dokumen.",
    }
    bahasa_map = {
        "formal": (
            "Gunakan bahasa Indonesia yang jelas dan profesional, TETAPI terdengar "
            "natural seperti juri bicara langsung — bukan kalimat kaku/tertulis."
        ),
        "santai": "Gunakan bahasa Indonesia santai dan akrab, seperti ngobrol.",
    }
    gaya_arahan = (
        f"Nada juri: {gaya_map.get(state.get('gaya', 'seimbang'))} "
        f"{kedalaman_map.get(state.get('kedalaman', 'ringkas'))} "
        f"{bahasa_map.get(state.get('bahasa', 'formal'))}\n"
        "PENTING gaya bahasa: bicara seperti juri sungguhan di lapangan — lugas, "
        "mengalir, dan mudah dipahami. Boleh pakai sapaan langsung ('Coba jelaskan…', "
        "'Menurut kamu…', 'Saya penasaran…'). Hindari bahasa birokratis, kaku, atau "
        "bertele-tele. Satu pertanyaan fokus, maksimal 1-2 kalimat.\n"
    )

    target_peran = state.get("target_peran")
    target_nama = state.get("target_nama")
    arahan = ""
    if target_peran:
        siapa = f"{target_peran}" + (f" ({target_nama})" if target_nama else "")
        arahan = (
            f"Sesi tim: arahkan pertanyaan ini secara spesifik kepada anggota "
            f"dengan peran {siapa}. Uji koordinasi tim, boleh menyinggung apakah "
            f"jawaban anggota ini konsisten dengan jawaban rekan sebelumnya. "
            f"Awali pertanyaan dengan menyebut peran yang dituju.\n"
        )

    if state.get("is_followup"):
        instruksi = (
            "Peserta baru saja menjawab pertanyaan Anda:\n"
            f"Tanya: {state.get('last_pertanyaan')}\n"
            f"Jawab: {state.get('last_jawaban')}\n\n"
            "Jawaban itu belum tuntas. Ajukan SATU pertanyaan lanjutan yang "
            "mengejar tepat pada bagian yang mengelak atau belum dibuktikan. "
            "Boleh diawali penegasan singkat ('Tunggu, tadi…', 'Tapi…'). "
            "Balas hanya pertanyaannya."
        )
    else:
        instruksi = (
            "Berdasarkan peran Anda, ajukan SATU pertanyaan yang tajam dan "
            "belum ditanyakan. Balas hanya pertanyaannya, tanpa awalan nama juri."
        )

    konteks = state.get("konteks")
    konteks_line = f"Konteks sesi: {konteks}.\n" if konteks else ""

    presentasi = (state.get("presentasi_transkrip") or "").strip()
    presentasi_line = (
        "Isi presentasi lisan peserta (transkrip; boleh dijadikan bahan "
        f"pertanyaan bila relevan):\n{presentasi[:4000]}\n\n"
        if presentasi
        else ""
    )

    prompt = (
        f"{konteks_line}"
        "Konteks proposal peserta.\n"
        f"Kelemahan awal terdeteksi: {temuan or '(tidak ada)'}\n"
        f"{presentasi_line}"
        f"Kriteria penilaian kompetisi: {', '.join(kriteria) or '(umum)'}\n\n"
        "Riwayat tanya jawab sejauh ini:\n"
        f"{_format_transcript(state.get('transcript') or [])}\n\n"
        f"{gaya_arahan}"
        f"{arahan}"
        f"{instruksi}"
    )
    client: LLMClient = state["client"]
    pertanyaan = client.complete(prompt, system=persona.system).strip()
    return {"pertanyaan": pertanyaan}


def _build_graph():
    g = StateGraph(PanelState)
    g.add_node("decide", _decide)
    g.add_node("generate_question", _generate_question)
    g.add_edge(START, "decide")
    g.add_edge("decide", "generate_question")
    g.add_edge("generate_question", END)
    return g.compile()


_PANEL = _build_graph()


def generate_next_question(
    *,
    urutan: int,
    analysis_findings: list[dict],
    rubric_kriteria: list[str],
    transcript: list[dict],
    client: LLMClient,
    panel_order: list[str] | None = None,
    konteks: str | None = None,
    presentasi_transkrip: str | None = None,
    target_peran: str | None = None,
    target_nama: str | None = None,
    gaya: str = "seimbang",
    kedalaman: str = "ringkas",
    bahasa: str = "formal",
    allow_followup: bool = False,
    last_persona: str | None = None,
    last_pertanyaan: str | None = None,
    last_jawaban: str | None = None,
) -> tuple[str, str, bool]:
    """Run the panel graph. Returns (persona_key, pertanyaan, is_followup)."""
    result = _PANEL.invoke(
        {
            "urutan": urutan,
            "panel_order": panel_order,
            "konteks": konteks,
            "presentasi_transkrip": presentasi_transkrip,
            "analysis_findings": analysis_findings,
            "rubric_kriteria": rubric_kriteria,
            "transcript": transcript,
            "target_peran": target_peran,
            "target_nama": target_nama,
            "gaya": gaya,
            "kedalaman": kedalaman,
            "bahasa": bahasa,
            "allow_followup": allow_followup,
            "last_persona": last_persona,
            "last_pertanyaan": last_pertanyaan,
            "last_jawaban": last_jawaban,
            "client": client,
        }
    )
    return result["persona"], result["pertanyaan"], bool(result.get("is_followup"))
