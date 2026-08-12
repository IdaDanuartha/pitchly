from app.api.deps import get_llm
from app.main import app
from tests.test_sessions import BranchingLLM, _analyzed_document, _auth_headers


def _override_llm():
    app.dependency_overrides[get_llm] = lambda: BranchingLLM()


async def test_team_crud(client):
    headers = await _auth_headers(client, "lead@primakara.ac.id")
    create = await client.post("/teams", json={"nama_tim": "ASTAGA REG"}, headers=headers)
    assert create.status_code == 201
    team = create.json()
    assert team["nama_tim"] == "ASTAGA REG"
    team_id = team["id"]

    add = await client.post(
        f"/teams/{team_id}/members",
        json={"nama": "Rangga", "peran": "Ketua"},
        headers=headers,
    )
    assert add.status_code == 201
    assert len(add.json()["members"]) == 1

    await client.post(
        f"/teams/{team_id}/members",
        json={"nama": "Wulan", "peran": "Teknis"},
        headers=headers,
    )

    lst = await client.get("/teams", headers=headers)
    assert lst.status_code == 200
    assert len(lst.json()) == 1
    assert len(lst.json()[0]["members"]) == 2


async def test_foreign_team_forbidden(client):
    h1 = await _auth_headers(client, "t1@primakara.ac.id")
    create = await client.post("/teams", json={"nama_tim": "Tim A"}, headers=h1)
    team_id = create.json()["id"]

    h2 = await _auth_headers(client, "t2@primakara.ac.id")
    got = await client.get(f"/teams/{team_id}", headers=h2)
    assert got.status_code == 403


async def test_team_session_targets_members(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "timlead@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)

    team = (
        await client.post("/teams", json={"nama_tim": "Tim"}, headers=headers)
    ).json()
    team_id = team["id"]
    await client.post(
        f"/teams/{team_id}/members",
        json={"nama": "Rangga", "peran": "Ketua"},
        headers=headers,
    )
    await client.post(
        f"/teams/{team_id}/members",
        json={"nama": "Wulan", "peran": "Teknis"},
        headers=headers,
    )

    create = await client.post(
        "/sessions",
        json={"document_id": doc_id, "team_id": team_id},
        headers=headers,
    )
    assert create.status_code == 201
    sess = create.json()
    assert sess["mode"] == "tim"
    assert sess["team_id"] == team_id
    session_id = sess["id"]

    perans = []
    for _ in range(2):
        nxt = await client.get(f"/sessions/{session_id}/next", headers=headers)
        turn = nxt.json()["turn"]
        perans.append(turn["target_peran"])
        await client.post(
            f"/sessions/{session_id}/answer",
            json={"turn_id": turn["id"], "jawaban": "Jawab."},
            headers=headers,
        )

    # Round-robin over 2 members.
    assert perans == ["Ketua", "Teknis"]

    app.dependency_overrides.pop(get_llm, None)


async def test_team_session_requires_member(client, monkeypatch):
    _override_llm()
    headers = await _auth_headers(client, "empty@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)
    team = (
        await client.post("/teams", json={"nama_tim": "Kosong"}, headers=headers)
    ).json()

    create = await client.post(
        "/sessions",
        json={"document_id": doc_id, "team_id": team["id"]},
        headers=headers,
    )
    assert create.status_code == 400
    app.dependency_overrides.pop(get_llm, None)


async def test_delete_team(client):
    headers = await _auth_headers(client, "deleter@primakara.ac.id")
    create = await client.post("/teams", json={"nama_tim": "Hapus Me"}, headers=headers)
    assert create.status_code == 201
    team_id = create.json()["id"]

    res_del = await client.delete(f"/teams/{team_id}", headers=headers)
    assert res_del.status_code == 204

    res_get = await client.get(f"/teams/{team_id}", headers=headers)
    assert res_get.status_code == 404

