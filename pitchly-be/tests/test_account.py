from app.api.deps import get_llm
from app.main import app
from tests.test_sessions import BranchingLLM, _analyzed_document, _auth_headers


def _override_llm():
    app.dependency_overrides[get_llm] = lambda: BranchingLLM()


async def test_delete_my_data_keeps_account(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "wipe@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    await client.post("/sessions", json={"document_id": doc_id}, headers=headers)

    res = await client.delete("/account/data", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["dokumen_dihapus"] == 1
    assert body["sesi_dihapus"] == 1

    # Account still works; documents gone.
    me = await client.get("/auth/me", headers=headers)
    assert me.status_code == 200
    got = await client.get(f"/documents/{doc_id}", headers=headers)
    assert got.status_code == 404
    app.dependency_overrides.pop(get_llm, None)


async def test_delete_account(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "gone@primakara.ac.id")
    await _analyzed_document(client, headers, monkeypatch)

    res = await client.delete("/account", headers=headers)
    assert res.status_code == 200

    # Token now references a deleted user → unauthorized.
    me = await client.get("/auth/me", headers=headers)
    assert me.status_code == 401
    app.dependency_overrides.pop(get_llm, None)
