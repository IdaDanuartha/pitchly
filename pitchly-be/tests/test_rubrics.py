from tests.test_sessions import _auth_headers


async def _make_rubric(client, headers, nama="ITFEST 2026"):
    return await client.post(
        "/rubrics",
        data={"nama_kompetisi": nama},
        files={"file": ("pedoman.pdf", b"data")},
        headers=headers,
    )


async def test_list_and_delete_rubric(client):
    headers = await _auth_headers(client, "rub@primakara.ac.id")
    created = await _make_rubric(client, headers)
    rubric_id = created.json()["id"]

    lst = await client.get("/rubrics", headers=headers)
    assert lst.status_code == 200
    assert len(lst.json()) == 1

    delete = await client.delete(f"/rubrics/{rubric_id}", headers=headers)
    assert delete.status_code == 200

    lst2 = await client.get("/rubrics", headers=headers)
    assert lst2.json() == []


async def test_delete_foreign_rubric_forbidden(client):
    h1 = await _auth_headers(client, "r1@primakara.ac.id")
    created = await _make_rubric(client, h1)
    rubric_id = created.json()["id"]

    h2 = await _auth_headers(client, "r2@primakara.ac.id")
    res = await client.delete(f"/rubrics/{rubric_id}", headers=h2)
    assert res.status_code == 403
