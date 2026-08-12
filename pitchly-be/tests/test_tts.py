from app.main import app
from app.services.tts import CompositeTTS, OpenAITTS, TTSError, get_tts
from tests.test_sessions import _auth_headers


def test_composite_falls_back_on_primary_failure():
    class FailPrimary:
        def synthesize(self, text, persona, gaya="seimbang"):
            raise TTSError("azure down")

    class OkFallback:
        def synthesize(self, text, persona, gaya="seimbang"):
            return b"fallback-mp3"

    tts = CompositeTTS(primary=FailPrimary(), fallback=OkFallback())
    assert tts.synthesize("halo", "teknis") == b"fallback-mp3"


def test_composite_uses_primary_when_ok():
    class OkPrimary:
        def synthesize(self, text, persona, gaya="seimbang"):
            return b"azure-mp3"

    class FallbackUnused:
        def synthesize(self, text, persona, gaya="seimbang"):  # pragma: no cover
            raise AssertionError("should not be called")

    tts = CompositeTTS(primary=OkPrimary(), fallback=FallbackUnused())
    assert tts.synthesize("halo", "teknis") == b"azure-mp3"


class FakeTTS:
    def synthesize(self, text, persona, gaya="seimbang"):
        return b"ID3fake-mp3-bytes"


async def test_tts_requires_auth(client):
    res = await client.post("/tts", json={"text": "halo", "persona": "teknis"})
    assert res.status_code == 401


async def test_tts_returns_audio(client):
    app.dependency_overrides[get_tts] = lambda: FakeTTS()
    headers = await _auth_headers(client, "tts@primakara.ac.id")
    res = await client.post(
        "/tts",
        json={"text": "Apa titik gagalnya?", "persona": "skeptis", "gaya": "kritis"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/mpeg"
    assert res.content == b"ID3fake-mp3-bytes"
    app.dependency_overrides.pop(get_tts, None)


async def test_tts_no_key_unavailable(client):
    app.dependency_overrides[get_tts] = lambda: OpenAITTS(api_key="", model="x")
    headers = await _auth_headers(client, "tts2@primakara.ac.id")
    res = await client.post(
        "/tts", json={"text": "halo", "persona": "teknis"}, headers=headers
    )
    assert res.status_code == 503
    app.dependency_overrides.pop(get_tts, None)
