import json

import pytest

from app.agents.panel_graph import generate_next_question
from app.agents.personas import TOTAL_TURNS, persona_for_turn
from app.agents.scorecard_graph import ScorecardError, compile_scorecard


class FixedClient:
    def __init__(self, response):
        self._response = response
        self.last_model_used = "fake"

    def complete(self, prompt, *, system=None, json_mode=False):
        return self._response


def test_persona_round_robin():
    assert persona_for_turn(1) == "teknis"
    assert persona_for_turn(2) == "dampak"
    assert persona_for_turn(3) == "skeptis"
    assert persona_for_turn(4) == "teknis"
    assert TOTAL_TURNS == 6


def test_panel_generates_question_for_persona():
    persona, pertanyaan = generate_next_question(
        urutan=2,
        analysis_findings=[{"bagian": "dampak", "temuan": "x"}],
        rubric_kriteria=["Dampak"],
        transcript=[],
        client=FixedClient("Seberapa besar dampaknya?"),
    )
    assert persona == "dampak"
    assert pertanyaan == "Seberapa besar dampaknya?"


_SCORE_JSON = json.dumps(
    {
        "skor_per_kategori": {"Dampak": 70, "Kelayakan": 55},
        "ringkasan_kekuatan": "Solusi jelas.",
        "ringkasan_kelemahan": "Skala belum terbukti.",
        "rencana_perbaikan": ["Uji beban", "Tambah metrik dampak"],
    }
)


def test_scorecard_compiles():
    result = compile_scorecard(
        rubric_kriteria=["Dampak", "Kelayakan"],
        transcript=[{"persona": "teknis", "pertanyaan": "q", "jawaban": "a"}],
        client=FixedClient(_SCORE_JSON),
    )
    assert result.skor_per_kategori["Dampak"] == 70
    assert len(result.rencana_perbaikan) == 2


def test_scorecard_malformed_raises():
    with pytest.raises(ScorecardError):
        compile_scorecard(
            rubric_kriteria=["Dampak"],
            transcript=[{"persona": "teknis", "pertanyaan": "q", "jawaban": "a"}],
            client=FixedClient("bukan json"),
        )
