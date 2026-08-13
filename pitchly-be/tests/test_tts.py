from app.main import app
from app.services.tts import CompositeTTS, OpenAITTS, TTSError, get_tts
from tests.test_sessions import _auth_headers


def test_composite_falls_back_on_primary_failure():
    class FailPrimary:
        def synthesize(
            self, text, persona, gaya="seimbang", output_language="id", is_followup=False
        ):
            raise TTSError("azure down")

    class OkFallback:
        def synthesize(
            self, text, persona, gaya="seimbang", output_language="id", is_followup=False
        ):
            return b"fallback-mp3"

    tts = CompositeTTS(primary=FailPrimary(), fallback=OkFallback())
    assert tts.synthesize("halo", "teknis") == b"fallback-mp3"


def test_composite_uses_primary_when_ok():
    class OkPrimary:
        def synthesize(
            self, text, persona, gaya="seimbang", output_language="id", is_followup=False
        ):
            return b"azure-mp3"

    class FallbackUnused:
        def synthesize(
            self, text, persona, gaya="seimbang", output_language="id", is_followup=False
        ):  # pragma: no cover
            raise AssertionError("should not be called")

    tts = CompositeTTS(primary=OkPrimary(), fallback=FallbackUnused())
    assert tts.synthesize("halo", "teknis") == b"azure-mp3"


class FakeTTS:
    def synthesize(
        self, text, persona, gaya="seimbang", output_language="id", is_followup=False
    ):
        return b"ID3fake-mp3-bytes"


def test_voice_maps_switch_by_language():
    from app.services.tts import (
        AZURE_PERSONA_VOICE,
        EDGE_PERSONA_VOICE,
        _lang_voice,
        _AZURE_DEFAULT_VOICE,
        _EDGE_DEFAULT_VOICE,
    )

    # Indonesian → id-ID voices; English → en-US voices.
    assert _lang_voice(AZURE_PERSONA_VOICE, _AZURE_DEFAULT_VOICE, "id", "teknis") == "id-ID-ArdiNeural"
    assert _lang_voice(AZURE_PERSONA_VOICE, _AZURE_DEFAULT_VOICE, "en", "teknis") == "en-US-GuyNeural"
    assert _lang_voice(EDGE_PERSONA_VOICE, _EDGE_DEFAULT_VOICE, "en", "dampak") == "en-US-JennyNeural"
    # Unknown language falls back to Indonesian.
    assert _lang_voice(AZURE_PERSONA_VOICE, _AZURE_DEFAULT_VOICE, "xx", "skeptis") == "id-ID-ArdiNeural"


def test_did_voice_switches_by_language():
    from app.core.config import settings

    assert settings.did_voice("teknis", "id") == "id-ID-ArdiNeural"
    assert settings.did_voice("teknis", "en") == "en-US-GuyNeural"
    assert settings.did_voice("dampak", "en") == "en-US-JennyNeural"


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
