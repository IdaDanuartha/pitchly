from app.main import app
from app.services.stt import WhisperSTT, get_stt
from tests.test_sessions import _auth_headers


class FakeSTT:
    def transcribe(self, data, filename):
        return "hasil transkrip suara"


async def test_transcribe_requires_auth(client):
    res = await client.post("/transcribe", files={"file": ("a.webm", b"audio")})
    assert res.status_code == 401


async def test_transcribe_with_stub(client):
    app.dependency_overrides[get_stt] = lambda: FakeSTT()
    headers = await _auth_headers(client, "voice@primakara.ac.id")
    res = await client.post(
        "/transcribe", files={"file": ("a.webm", b"audio")}, headers=headers
    )
    assert res.status_code == 200
    assert res.json()["text"] == "hasil transkrip suara"
    app.dependency_overrides.pop(get_stt, None)


async def test_transcribe_no_key_unavailable(client):
    # Empty key → 503 without touching the OpenAI SDK.
    app.dependency_overrides[get_stt] = lambda: WhisperSTT(api_key="", model="whisper-1")
    headers = await _auth_headers(client, "nokey@primakara.ac.id")
    res = await client.post(
        "/transcribe", files={"file": ("a.webm", b"audio")}, headers=headers
    )
    assert res.status_code == 503
    app.dependency_overrides.pop(get_stt, None)
