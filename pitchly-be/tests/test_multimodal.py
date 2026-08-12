from app.api.deps import get_llm
from app.main import app
from app.services.vision import OpenAIVision, get_vision
from tests.test_sessions import BranchingLLM, _analyzed_document, _auth_headers


class FakeVision:
    def analyze(self, image_bytes, mime="image/jpeg"):
        return {
            "ekspresi": "tenang dan fokus",
            "kepercayaan_diri": "tinggi",
            "body_language": "postur tegak, kontak mata baik",
            "catatan": "pertahankan kontak mata",
        }


async def _start_session(client, headers, monkeypatch):
    app.dependency_overrides[get_llm] = lambda: BranchingLLM()
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    create = await client.post("/sessions", json={"document_id": doc_id}, headers=headers)
    return create.json()["id"]


async def test_answer_stores_delivery(client, monkeypatch):
    headers = await _auth_headers(client, "mm1@primakara.ac.id")
    session_id = await _start_session(client, headers, monkeypatch)

    nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
    turn = nxt.json()["turn"]
    ans = await client.post(
        f"/sessions/{session_id}/answer",
        json={
            "turn_id": turn["id"],
            "jawaban": "Jawaban saya.",
            "waktu_tempuh_ms": 8000,
            "delivery": {"wpm": 120, "filler": 2, "durasi_detik": 8},
        },
        headers=headers,
    )
    assert ans.status_code == 200
    assert ans.json()["delivery_json"]["wpm"] == 120
    app.dependency_overrides.pop(get_llm, None)


async def test_observe_stores_expression(client, monkeypatch):
    app.dependency_overrides[get_vision] = lambda: FakeVision()
    headers = await _auth_headers(client, "mm2@primakara.ac.id")
    session_id = await _start_session(client, headers, monkeypatch)

    nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
    turn = nxt.json()["turn"]
    obs = await client.post(
        f"/sessions/{session_id}/turns/{turn['id']}/observe",
        files={"photo": ("frame.jpg", b"fake-image-bytes")},
        headers=headers,
    )
    assert obs.status_code == 200
    assert obs.json()["ekspresi_json"]["kepercayaan_diri"] == "tinggi"

    app.dependency_overrides.pop(get_vision, None)
    app.dependency_overrides.pop(get_llm, None)


async def test_observe_degrades_without_key(client, monkeypatch):
    app.dependency_overrides[get_vision] = lambda: OpenAIVision(api_key="", model="x")
    headers = await _auth_headers(client, "mm3@primakara.ac.id")
    session_id = await _start_session(client, headers, monkeypatch)

    nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
    turn = nxt.json()["turn"]
    obs = await client.post(
        f"/sessions/{session_id}/turns/{turn['id']}/observe",
        files={"photo": ("frame.jpg", b"img")},
        headers=headers,
    )
    assert obs.status_code == 200
    assert obs.json()["ekspresi_json"]["tersedia"] is False

    app.dependency_overrides.pop(get_vision, None)
    app.dependency_overrides.pop(get_llm, None)
