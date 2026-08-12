import json
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.llm.client import LLMClient


class SuggestionError(Exception):
    """Raised when the suggestion LLM response cannot be parsed."""


class SuggestionState(TypedDict, total=False):
    transcript: list[dict]  # [{urutan, persona, pertanyaan, jawaban}]
    analysis_findings: list[dict]
    rubric_kriteria: list[str]
    client: LLMClient
    result: list[dict]


SYSTEM = (
    "Anda pelatih presentasi kompetisi. Untuk tiap pertanyaan juri, Anda menilai "
    "jawaban peserta lalu menuliskan contoh jawaban yang lebih kuat: padat, "
    "berbasis bukti, dan langsung menjawab inti pertanyaan. Bahasa Indonesia "
    "natural, membumi, tanpa hiperbola."
)


def _format(transcript: list[dict]) -> str:
    blocks = []
    for t in transcript:
        blocks.append(
            f"[{t.get('urutan')}] ({t.get('persona')}) Tanya: {t.get('pertanyaan')}\n"
            f"Jawaban peserta: {t.get('jawaban') or '(tidak dijawab)'}"
        )
    return "\n\n".join(blocks)


def _suggest(state: SuggestionState) -> dict[str, Any]:
    findings = state.get("analysis_findings") or []
    temuan = "; ".join(
        f"{f.get('bagian')}: {f.get('temuan')}" for f in findings[:6]
    )
    kriteria = ", ".join(state.get("rubric_kriteria") or [])
    prompt = (
        "Berdasarkan sesi tanya jawab berikut, untuk SETIAP pertanyaan berikan "
        "koreksi singkat atas jawaban peserta dan satu contoh jawaban yang lebih "
        "baik.\n\n"
        f"Kelemahan dokumen: {temuan or '(tidak ada)'}\n"
        f"Kriteria penilaian: {kriteria or '(umum)'}\n\n"
        f"Transkrip:\n{_format(state.get('transcript') or [])}\n\n"
        "Balas HANYA JSON valid:\n"
        "{\n"
        '  "items": [\n'
        '    { "urutan": <angka>, "koreksi": "<apa yang kurang dari jawaban peserta>", '
        '"jawaban_lebih_baik": "<contoh jawaban ideal, 2-4 kalimat>" }\n'
        "  ]\n"
        "}\n"
        "Sertakan satu item untuk tiap pertanyaan sesuai urutannya."
    )
    client: LLMClient = state["client"]
    raw = client.complete(prompt, system=SYSTEM, json_mode=True)

    try:
        data = json.loads(raw)
        items = data.get("items") if isinstance(data, dict) else data
        result = [
            {
                "urutan": int(it.get("urutan", 0)),
                "koreksi": str(it.get("koreksi", "")),
                "jawaban_lebih_baik": str(it.get("jawaban_lebih_baik", "")),
            }
            for it in (items or [])
        ]
    except (json.JSONDecodeError, TypeError, ValueError, AttributeError) as exc:
        raise SuggestionError(f"Respons saran tidak valid: {exc}") from exc

    return {"result": result}


def _build_graph():
    g = StateGraph(SuggestionState)
    g.add_node("suggest", _suggest)
    g.add_edge(START, "suggest")
    g.add_edge("suggest", END)
    return g.compile()


_SUGGESTION = _build_graph()


def suggest_answers(
    *,
    transcript: list[dict],
    analysis_findings: list[dict],
    rubric_kriteria: list[str],
    client: LLMClient,
) -> list[dict]:
    result = _SUGGESTION.invoke(
        {
            "transcript": transcript,
            "analysis_findings": analysis_findings,
            "rubric_kriteria": rubric_kriteria,
            "client": client,
        }
    )
    return result["result"]
