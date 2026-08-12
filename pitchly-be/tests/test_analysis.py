import json

import pytest

from app.services.analysis import AnalysisError, analyze_document


class FakeClient:
    def __init__(self, response):
        self._response = response
        self.last_model_used = "fake"

    def complete(self, prompt, *, system=None, json_mode=False):
        return self._response


_GOOD = json.dumps(
    {
        "findings": [
            {
                "bagian": "problem_statement",
                "temuan": "Masalah belum terkuantifikasi",
                "rujukan": "Bagian latar belakang",
                "severity": "tinggi",
            },
            {
                "bagian": "kelayakan_teknis",
                "temuan": "Arsitektur belum dijelaskan",
                "rujukan": "Bagian solusi",
                "severity": "sedang",
            },
            {
                "bagian": "dampak",
                "temuan": "Skalabilitas tidak dibahas",
                "rujukan": "Bagian dampak",
                "severity": "sedang",
            },
        ]
    }
)


def test_parses_three_findings():
    findings = analyze_document("teks proposal", FakeClient(_GOOD))
    assert len(findings) == 3
    assert findings[0].bagian == "problem_statement"


def test_malformed_json_raises():
    with pytest.raises(AnalysisError):
        analyze_document("teks", FakeClient("bukan json"))


def test_too_few_findings_raises():
    payload = json.dumps({"findings": _json_one()})
    with pytest.raises(AnalysisError):
        analyze_document("teks", FakeClient(payload))


def test_empty_document_raises():
    with pytest.raises(AnalysisError):
        analyze_document("   ", FakeClient(_GOOD))


def _json_one():
    return [
        {
            "bagian": "dampak",
            "temuan": "x",
            "rujukan": "y",
            "severity": "rendah",
        }
    ]
