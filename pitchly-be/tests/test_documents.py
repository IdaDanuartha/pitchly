import json

from tests.conftest import override_llm


async def _auth_headers(client, email="user@primakara.ac.id"):
    await client.post(
        "/auth/register",
        json={"nama": "User", "email": email, "password": "rahasia123"},
    )
    login = await client.post(
        "/auth/login", json={"email": email, "password": "rahasia123"}
    )
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


_ANALYSIS_JSON = json.dumps(
    {
        "findings": [
            {"bagian": "problem_statement", "temuan": "a", "rujukan": "r1", "severity": "tinggi"},
            {"bagian": "kelayakan_teknis", "temuan": "b", "rujukan": "r2", "severity": "sedang"},
            {"bagian": "dampak", "temuan": "c", "rujukan": "r3", "severity": "rendah"},
        ]
    }
)


async def test_upload_requires_auth(client):
    resp = await client.post("/documents", files={"file": ("d.pdf", b"data")})
    assert resp.status_code == 401


async def test_upload_then_get(client):
    headers = await _auth_headers(client)
    up = await client.post(
        "/documents", files={"file": ("proposal.pdf", b"%PDF-1.4 data")}, headers=headers
    )
    assert up.status_code == 201
    doc_id = up.json()["id"]

    got = await client.get(f"/documents/{doc_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["filename"] == "proposal.pdf"


async def test_foreign_document_forbidden(client):
    h1 = await _auth_headers(client, "a@primakara.ac.id")
    up = await client.post(
        "/documents", files={"file": ("p.pdf", b"%PDF-1.4 data")}, headers=h1
    )
    doc_id = up.json()["id"]

    h2 = await _auth_headers(client, "b@primakara.ac.id")
    got = await client.get(f"/documents/{doc_id}", headers=h2)
    assert got.status_code == 403


async def test_rubric_upload_uses_fallback_template(client):
    headers = await _auth_headers(client)
    resp = await client.post(
        "/rubrics",
        data={"nama_kompetisi": "BISA AI 2026"},
        files={"file": ("pedoman.pdf", b"data")},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["nama_kompetisi"] == "BISA AI 2026"
    assert len(body["kriteria_json"]) >= 3


async def test_analyze_persists_findings(client, monkeypatch):
    # extract_text is bypassed by returning canned text regardless of bytes.
    import app.api.documents as documents_module

    monkeypatch.setattr(documents_module, "extract_text", lambda data: "teks proposal")
    monkeypatch.setattr(documents_module, "extract_pages", lambda data: ["teks proposal"])
    override_llm(_ANALYSIS_JSON)

    headers = await _auth_headers(client)
    up = await client.post(
        "/documents", files={"file": ("p.pdf", b"%PDF-1.4 data")}, headers=headers
    )
    doc_id = up.json()["id"]

    analyze = await client.post(f"/documents/{doc_id}/analyze", headers=headers)
    assert analyze.status_code == 200, analyze.text
    assert len(analyze.json()["findings"]) == 3

    got = await client.get(f"/documents/{doc_id}/analysis", headers=headers)
    assert got.status_code == 200
    assert got.json()["model_used"] == "fake"

    from app.api.deps import get_llm
    from app.main import app

    app.dependency_overrides.pop(get_llm, None)
