import json

from app.api.deps import get_llm
from app.main import app


class BranchingLLM:
    """Serves findings JSON, panel questions, and scorecard JSON by context."""

    last_model_used = "fake"

    def complete(self, prompt, *, system=None, json_mode=False):
        if json_mode and "scorecard" in prompt.lower():
            return json.dumps(
                {
                    "skor_per_kategori": {
                        "Kejelasan problem statement": 60,
                        "Kelayakan teknis solusi": 55,
                        "Dampak dan skalabilitas": 65,
                        "Orisinalitas ide": 50,
                        "Kualitas penyampaian": 58,
                    },
                    "ringkasan_kekuatan": "Ide relevan.",
                    "ringkasan_kelemahan": "Bukti skala kurang.",
                    "rencana_perbaikan": ["Uji beban", "Perjelas metrik"],
                }
            )
        if json_mode:
            return json.dumps(
                {
                    "findings": [
                        {"bagian": "problem_statement", "temuan": "a", "rujukan": "r1", "severity": "tinggi"},
                        {"bagian": "kelayakan_teknis", "temuan": "b", "rujukan": "r2", "severity": "sedang"},
                        {"bagian": "dampak", "temuan": "c", "rujukan": "r3", "severity": "rendah"},
                    ]
                }
            )
        return "Apa titik gagal pertama arsitektur Anda?"


def _override_llm():
    app.dependency_overrides[get_llm] = lambda: BranchingLLM()


async def _auth_headers(client, email="tim@primakara.ac.id"):
    await client.post(
        "/auth/register",
        json={"nama": "Tim", "email": email, "password": "rahasia123"},
    )
    login = await client.post(
        "/auth/login", json={"email": email, "password": "rahasia123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _analyzed_document(client, headers, monkeypatch):
    import app.api.documents as documents_module

    monkeypatch.setattr(documents_module, "extract_text", lambda data: "teks proposal")
    up = await client.post(
        "/documents", files={"file": ("p.pdf", b"%PDF data")}, headers=headers
    )
    doc_id = up.json()["id"]
    await client.post(f"/documents/{doc_id}/analyze", headers=headers)
    return doc_id


async def test_full_session_flow(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client)
    doc_id = await _analyzed_document(client, headers, monkeypatch)

    # Start session.
    create = await client.post(
        "/sessions", json={"document_id": doc_id}, headers=headers
    )
    assert create.status_code == 201, create.text
    sess = create.json()
    assert sess["durasi_menit"] == 15
    assert sess["sisa_detik"] > 0
    assert sess["persona_order"] == ["teknis", "dampak", "skeptis"]
    session_id = sess["id"]

    # Duration hasn't elapsed → questions keep coming (round-robin personas).
    personas_seen = []
    for _ in range(4):
        nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
        body = nxt.json()
        assert body["done"] is False
        turn = body["turn"]
        personas_seen.append(turn["persona"])
        ans = await client.post(
            f"/sessions/{session_id}/answer",
            json={"turn_id": turn["id"], "jawaban": "Jawaban saya.", "waktu_tempuh_ms": 1200},
            headers=headers,
        )
        assert ans.status_code == 200

    assert personas_seen == ["teknis", "dampak", "skeptis", "teknis"]

    # Scorecard (session can be compiled anytime from answered turns).
    sc = await client.post(f"/sessions/{session_id}/scorecard", headers=headers)
    assert sc.status_code == 200, sc.text
    data = sc.json()
    assert len(data["skor_per_kategori_json"]) == 5
    assert len(data["rencana_perbaikan_json"]) == 2

    # Idempotent.
    sc2 = await client.post(f"/sessions/{session_id}/scorecard", headers=headers)
    assert sc2.json()["id"] == data["id"]

    app.dependency_overrides.pop(get_llm, None)


async def test_list_and_overview(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "ov@primakara.ac.id")
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
    await client.post(f"/sessions/{session_id}/scorecard", headers=headers)

    lst = await client.get("/sessions", headers=headers)
    assert lst.status_code == 200
    items = lst.json()
    assert len(items) == 1
    assert items[0]["status"] == "selesai"
    assert isinstance(items[0]["skor_rata_rata"], int)

    ov = await client.get("/sessions/overview", headers=headers)
    assert ov.status_code == 200
    body = ov.json()
    assert body["sesi_selesai"] == 1
    assert body["dokumen_dianalisis"] == 1
    assert isinstance(body["skor_terakhir"], int)

    app.dependency_overrides.pop(get_llm, None)


def test_time_helpers():
    from datetime import datetime, timedelta, timezone

    from app.api.sessions import _remaining_seconds, _time_up
    from app.models.session import Session

    now = datetime.now(timezone.utc)
    sess = Session(durasi_menit=10, mulai_pada=now - timedelta(minutes=3))
    assert not _time_up(sess, now)
    assert 400 < _remaining_seconds(sess, now) <= 420  # ~7 min left

    over = Session(durasi_menit=10, mulai_pada=now - timedelta(minutes=11))
    assert _time_up(over, now)
    assert _remaining_seconds(over, now) == 0


async def test_session_config(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "cfg@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    create = await client.post(
        "/sessions",
        json={
            "document_id": doc_id,
            "gaya": "kritis",
            "kedalaman": "detail",
            "bahasa": "santai",
            "durasi_menit": 20,
        },
        headers=headers,
    )
    assert create.status_code == 201
    sess = create.json()
    assert sess["gaya"] == "kritis"
    assert sess["kedalaman"] == "detail"
    assert sess["bahasa"] == "santai"
    assert sess["durasi_menit"] == 20
    assert sess["sisa_detik"] > 1000

    session_id = sess["id"]
    # Questions keep coming while time remains.
    for _ in range(3):
        nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
        body = nxt.json()
        assert body["done"] is False
        await client.post(
            f"/sessions/{session_id}/answer",
            json={"turn_id": body["turn"]["id"], "jawaban": "Jawab."},
            headers=headers,
        )
    app.dependency_overrides.pop(get_llm, None)


async def test_session_requires_analysis(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "solo@primakara.ac.id")
    up = await client.post(
        "/documents", files={"file": ("p.pdf", b"%PDF data")}, headers=headers
    )
    doc_id = up.json()["id"]
    # No analyze step → session creation rejected.
    create = await client.post(
        "/sessions", json={"document_id": doc_id}, headers=headers
    )
    assert create.status_code == 400
    app.dependency_overrides.pop(get_llm, None)


async def test_foreign_session_forbidden(client, monkeypatch):
    _override_llm()
    h1 = await _auth_headers(client, "a2@primakara.ac.id")
    doc_id = await _analyzed_document(client, h1, monkeypatch)
    create = await client.post("/sessions", json={"document_id": doc_id}, headers=h1)
    session_id = create.json()["id"]

    h2 = await _auth_headers(client, "b2@primakara.ac.id")
    got = await client.get(f"/sessions/{session_id}", headers=h2)
    assert got.status_code == 403
    app.dependency_overrides.pop(get_llm, None)


async def test_delete_session(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "sess_deleter@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    create = await client.post("/sessions", json={"document_id": doc_id}, headers=headers)
    assert create.status_code == 201
    session_id = create.json()["id"]

    res_del = await client.delete(f"/sessions/{session_id}", headers=headers)
    assert res_del.status_code == 204

    res_get = await client.get(f"/sessions/{session_id}", headers=headers)
    assert res_get.status_code == 404
    app.dependency_overrides.pop(get_llm, None)

