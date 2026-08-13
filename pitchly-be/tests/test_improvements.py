import json

from app.api.deps import get_llm
from app.main import app

from tests.test_sessions import (
    BranchingLLM,
    _analyzed_document,
    _auth_headers,
    _override_llm,
)


# --- #1/#2 weighted scoring ---------------------------------------------------


def test_weighted_score_prefers_bobot():
    from app.api.sessions import _weighted_score

    skor = {"a": 100, "b": 0}
    # Heavier weight on the high score pulls the result up vs. equal (50).
    assert _weighted_score(skor, {"a": 3, "b": 1}) == 75
    # Equal weighting when bobot is None.
    assert _weighted_score(skor, None) == 50
    # Empty score → 0, never a ZeroDivisionError.
    assert _weighted_score({}, {"a": 1}) == 0


async def test_scorecard_exposes_skor_akhir(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "weighted@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    create = await client.post("/sessions", json={"document_id": doc_id}, headers=headers)
    session_id = create.json()["id"]

    for _ in range(3):
        nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
        turn = nxt.json()["turn"]
        await client.post(
            f"/sessions/{session_id}/answer",
            json={"turn_id": turn["id"], "jawaban": "Jawaban."},
            headers=headers,
        )
    sc = await client.post(f"/sessions/{session_id}/scorecard", headers=headers)
    assert sc.status_code == 200, sc.text
    assert isinstance(sc.json()["skor_akhir"], int)
    app.dependency_overrides.pop(get_llm, None)


# --- #6 upload validation -----------------------------------------------------


async def test_upload_rejects_non_pdf(client):
    headers = await _auth_headers(client, "nonpdf@primakara.ac.id")
    res = await client.post(
        "/documents",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        headers=headers,
    )
    assert res.status_code == 415


async def test_upload_rejects_non_pdf_magic(client):
    headers = await _auth_headers(client, "fakepdf@primakara.ac.id")
    # .pdf name but bytes are not a real PDF.
    res = await client.post(
        "/documents",
        files={"file": ("x.pdf", b"not a pdf", "application/pdf")},
        headers=headers,
    )
    assert res.status_code == 415


async def test_upload_rejects_oversize(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "max_upload_mb", 0)  # nothing passes
    headers = await _auth_headers(client, "big@primakara.ac.id")
    res = await client.post(
        "/documents",
        files={"file": ("x.pdf", b"%PDF-1.4 data", "application/pdf")},
        headers=headers,
    )
    assert res.status_code == 413


# --- #5 free quota counts only used-up sessions -------------------------------


async def test_free_quota_ignores_unused_sessions(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "quota@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)

    # Free plan quota is 2. Create three sessions but finish none of them.
    for _ in range(3):
        res = await client.post(
            "/sessions", json={"document_id": doc_id}, headers=headers
        )
        assert res.status_code == 201, res.text

    # Billing usage reflects zero used-up sessions despite three drafts.
    me = await client.get("/billing/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["usage"]["sesi_dipakai"] == 0
    app.dependency_overrides.pop(get_llm, None)


# --- #4 answer suggestions endpoint (new feature) -----------------------------


class SuggestingLLM(BranchingLLM):
    def complete(self, prompt, *, system=None, json_mode=False):
        if json_mode and "jawaban_lebih_baik" in prompt:
            return json.dumps(
                {
                    "items": [
                        {
                            "urutan": 1,
                            "koreksi": "Kurang bukti kuantitatif.",
                            "jawaban_lebih_baik": "Sebutkan metrik konkret.",
                        }
                    ]
                }
            )
        return super().complete(prompt, system=system, json_mode=json_mode)


async def test_answer_suggestions_endpoint(client, monkeypatch):
    app.dependency_overrides[get_llm] = lambda: SuggestingLLM()
    headers = await _auth_headers(client, "sugg@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    create = await client.post("/sessions", json={"document_id": doc_id}, headers=headers)
    session_id = create.json()["id"]

    nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
    turn = nxt.json()["turn"]
    await client.post(
        f"/sessions/{session_id}/answer",
        json={"turn_id": turn["id"], "jawaban": "Jawaban singkat."},
        headers=headers,
    )
    # Suggestions require a compiled scorecard (finished session).
    await client.post(f"/sessions/{session_id}/scorecard", headers=headers)

    res = await client.post(f"/sessions/{session_id}/suggestions", headers=headers)
    assert res.status_code == 200, res.text
    items = res.json()["items"]
    assert len(items) >= 1
    assert items[0]["jawaban_lebih_baik"]
    app.dependency_overrides.pop(get_llm, None)


# --- #7 TTS caching -----------------------------------------------------------


def test_tts_cache_serves_second_call_from_disk(tmp_path):
    from app.services.tts import CachingTTS

    class CountingTTS:
        def __init__(self):
            self.calls = 0

        def synthesize(
            self,
            text,
            persona,
            gaya="seimbang",
            output_language="id",
            is_followup=False,
        ):
            self.calls += 1
            return b"AUDIO"

    inner = CountingTTS()
    cache = CachingTTS(inner, engine_id="test", cache_dir=str(tmp_path))
    a = cache.synthesize("halo", "teknis", "seimbang")
    b = cache.synthesize("halo", "teknis", "seimbang")
    assert a == b == b"AUDIO"
    assert inner.calls == 1  # second call hit the cache

    # Different text → cache miss → inner invoked again.
    cache.synthesize("beda", "teknis", "seimbang")
    assert inner.calls == 2
