from tests.test_sessions import _auth_headers


async def test_talk_requires_auth(client):
    res = await client.post("/avatar/talk", json={"text": "halo", "persona": "teknis"})
    assert res.status_code == 401


async def test_talk_disabled_returns_flag(client):
    # No D-ID config → enabled false, frontend falls back.
    headers = await _auth_headers(client, "did@primakara.ac.id")
    res = await client.post(
        "/avatar/talk",
        json={"text": "Apa titik gagalnya?", "persona": "teknis"},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["enabled"] is False
    assert body["video_url"] is None


async def test_talk_enabled_returns_video(client, monkeypatch):
    import app.api.avatar as avatar_module
    from app.core.config import settings

    monkeypatch.setattr(settings, "did_api_key", "key")
    monkeypatch.setattr(settings, "did_source_teknis", "https://img/face.jpg")
    monkeypatch.setattr(
        avatar_module,
        "create_talk",
        lambda text, persona, gaya, output_language="id": "https://d-id/vid.mp4",
    )

    headers = await _auth_headers(client, "did2@primakara.ac.id")
    res = await client.post(
        "/avatar/talk",
        json={"text": "Jelaskan arsitektur Anda.", "persona": "teknis"},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["enabled"] is True
    assert body["video_url"] == "https://d-id/vid.mp4"
