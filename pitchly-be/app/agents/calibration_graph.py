import json
from dataclasses import dataclass
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.llm.client import LLMClient


class CalibrationError(Exception):
    """Raised when the calibration LLM response cannot be parsed."""


@dataclass
class CalibrationResult:
    akurasi_persen: int
    prediksi_tepat: list[str]
    prediksi_terlewat: list[str]
    ringkasan: str


class CalibrationState(TypedDict, total=False):
    prediksi_kelemahan: str
    prediksi_rencana: list[str]
    kritik_juri_asli: str
    hasil: str
    client: LLMClient
    result: CalibrationResult


SYSTEM = (
    "Anda evaluator yang membandingkan prediksi latihan dengan kenyataan "
    "kompetisi. Jujur dan spesifik; tujuannya mengkalibrasi kualitas prediksi, "
    "bukan menyenangkan pengguna."
)


def _compare(state: CalibrationState) -> dict[str, Any]:
    rencana = "\n".join(f"- {r}" for r in state.get("prediksi_rencana") or [])
    prompt = (
        "Bandingkan kritik yang DIPREDIKSI Pitchly saat latihan dengan kritik "
        "NYATA dari juri kompetisi.\n\n"
        "== Prediksi Pitchly ==\n"
        f"Ringkasan kelemahan: {state.get('prediksi_kelemahan')}\n"
        f"Rencana perbaikan yang disarankan:\n{rencana or '- (tidak ada)'}\n\n"
        "== Kenyataan ==\n"
        f"Kritik juri asli: {state.get('kritik_juri_asli')}\n"
        f"Hasil akhir: {state.get('hasil')}\n\n"
        "Balas HANYA JSON valid:\n"
        "{\n"
        '  "akurasi_persen": <0-100 seberapa cocok prediksi dgn kenyataan>,\n'
        '  "prediksi_tepat": ["poin prediksi yang benar terbukti", ...],\n'
        '  "prediksi_terlewat": ["kritik juri yang tidak diprediksi", ...],\n'
        '  "ringkasan": "<2-3 kalimat penilaian kalibrasi & saran fokus berikutnya>"\n'
        "}"
    )
    client: LLMClient = state["client"]
    raw = client.complete(prompt, system=SYSTEM, json_mode=True)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise CalibrationError(f"Respons kalibrasi bukan JSON valid: {exc}") from exc

    try:
        result = CalibrationResult(
            akurasi_persen=int(data["akurasi_persen"]),
            prediksi_tepat=[str(x) for x in data.get("prediksi_tepat", [])],
            prediksi_terlewat=[str(x) for x in data.get("prediksi_terlewat", [])],
            ringkasan=str(data["ringkasan"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise CalibrationError(f"Struktur kalibrasi tidak lengkap: {exc}") from exc

    return {"result": result}


def _build_graph():
    g = StateGraph(CalibrationState)
    g.add_node("compare", _compare)
    g.add_edge(START, "compare")
    g.add_edge("compare", END)
    return g.compile()


_CALIBRATION = _build_graph()


def compile_calibration(
    *,
    prediksi_kelemahan: str,
    prediksi_rencana: list[str],
    kritik_juri_asli: str,
    hasil: str,
    client: LLMClient,
) -> CalibrationResult:
    result = _CALIBRATION.invoke(
        {
            "prediksi_kelemahan": prediksi_kelemahan,
            "prediksi_rencana": prediksi_rencana,
            "kritik_juri_asli": kritik_juri_asli,
            "hasil": hasil,
            "client": client,
        }
    )
    return result["result"]
