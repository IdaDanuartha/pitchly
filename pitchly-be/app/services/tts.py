from xml.sax.saxutils import escape

import httpx

from app.core.config import settings


class TTSError(Exception):
    """Raised when text-to-speech is unavailable or fails."""


# --- OpenAI TTS (fallback) ---

# Distinct OpenAI voices per persona (deeper = more authoritative).
PERSONA_VOICE = {
    "teknis": "onyx",
    "dampak": "nova",
    "skeptis": "echo",
}
_DEFAULT_VOICE = "onyx"

_GAYA_TONE = {
    "kritis": "sangat kritis, menekan, dan tidak mudah puas",
    "seimbang": "tegas namun adil",
    "santai": "santai dan suportif",
}

_PERSONA_LABEL = {
    "teknis": "Juri Teknis yang menuntut kelayakan implementasi",
    "dampak": "Juri Dampak yang menuntut manfaat dan skalabilitas",
    "skeptis": "Juri Skeptis yang mencari celah pada solusi",
}


class OpenAITTS:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def synthesize(self, text: str, persona: str, gaya: str = "seimbang") -> bytes:
        if not self.api_key:
            raise TTSError("Kunci OpenAI belum diatur; suara tidak tersedia")
        from openai import OpenAI, OpenAIError

        voice = PERSONA_VOICE.get(persona, _DEFAULT_VOICE)
        instructions = (
            f"Anda adalah {_PERSONA_LABEL.get(persona, 'juri kompetisi')}. "
            f"Bicara dalam Bahasa Indonesia dengan nada {_GAYA_TONE.get(gaya, 'tegas')}. "
            "Artikulasi jelas, tempo mantap, seperti juri sungguhan di ruang sidang."
        )
        client = OpenAI(api_key=self.api_key)
        try:
            resp = client.audio.speech.create(
                model=self.model,
                voice=voice,
                input=text,
                instructions=instructions,
                response_format="mp3",
            )
            return resp.read()
        except OpenAIError as exc:
            raise TTSError(f"Sintesis suara gagal: {exc}") from exc


# --- Azure Speech TTS (native Indonesian, primary) ---

# Native id-ID neural voices.
AZURE_PERSONA_VOICE = {
    "teknis": "id-ID-ArdiNeural",
    "dampak": "id-ID-GadisNeural",
    "skeptis": "id-ID-ArdiNeural",
}
_AZURE_DEFAULT_VOICE = "id-ID-ArdiNeural"

# Prosody per gaya (rate, pitch) for a critical-judge tone.
_AZURE_PROSODY = {
    "kritis": ("-6%", "-4%"),
    "seimbang": ("-2%", "0%"),
    "santai": ("+2%", "+2%"),
}


class AzureTTS:
    def __init__(self, api_key: str, region: str) -> None:
        self.api_key = api_key
        self.region = region

    @property
    def _endpoint(self) -> str:
        return f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def synthesize(self, text: str, persona: str, gaya: str = "seimbang") -> bytes:
        if not self.api_key:
            raise TTSError("Azure Speech belum diatur")
        voice = AZURE_PERSONA_VOICE.get(persona, _AZURE_DEFAULT_VOICE)
        rate, pitch = _AZURE_PROSODY.get(gaya, ("0%", "0%"))
        ssml = (
            "<speak version='1.0' xml:lang='id-ID'>"
            f"<voice name='{voice}'>"
            f"<prosody rate='{rate}' pitch='{pitch}'>{escape(text)}</prosody>"
            "</voice></speak>"
        )
        try:
            resp = httpx.post(
                self._endpoint,
                headers={
                    "Ocp-Apim-Subscription-Key": self.api_key,
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                    "User-Agent": "pitchly",
                },
                content=ssml.encode("utf-8"),
                timeout=20.0,
            )
            resp.raise_for_status()
            return resp.content
        except httpx.HTTPError as exc:
            raise TTSError(f"Azure TTS gagal: {exc}") from exc


# --- Edge TTS (free, no key, native Indonesian) ---

# Same neural voices as Azure, served via Edge's online TTS.
EDGE_PERSONA_VOICE = {
    "teknis": "id-ID-ArdiNeural",
    "dampak": "id-ID-GadisNeural",
    "skeptis": "id-ID-ArdiNeural",
}
_EDGE_DEFAULT_VOICE = "id-ID-ArdiNeural"

# (rate, pitch) per gaya — lower/slower for a critical-judge tone.
_EDGE_PROSODY = {
    "kritis": ("-8%", "-8Hz"),
    "seimbang": ("-2%", "+0Hz"),
    "santai": ("+3%", "+3Hz"),
}


class EdgeTTS:
    """Free text-to-speech via Microsoft Edge's online voices (no API key)."""

    def synthesize(self, text: str, persona: str, gaya: str = "seimbang") -> bytes:
        import asyncio

        try:
            import edge_tts
        except ImportError as exc:  # pragma: no cover
            raise TTSError("Paket edge-tts belum terpasang") from exc

        voice = EDGE_PERSONA_VOICE.get(persona, _EDGE_DEFAULT_VOICE)
        rate, pitch = _EDGE_PROSODY.get(gaya, ("+0%", "+0Hz"))

        async def _run() -> bytes:
            communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            buf = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    buf.extend(chunk["data"])
            return bytes(buf)

        try:
            audio = asyncio.run(_run())
        except Exception as exc:  # noqa: BLE001 — network/endpoint errors
            raise TTSError(f"Edge TTS gagal: {exc}") from exc
        if not audio:
            raise TTSError("Edge TTS tidak mengembalikan audio")
        return audio


class CompositeTTS:
    """Try the primary engine, fall back to the secondary on failure."""

    def __init__(self, primary, fallback) -> None:
        self.primary = primary
        self.fallback = fallback

    def synthesize(self, text: str, persona: str, gaya: str = "seimbang") -> bytes:
        try:
            return self.primary.synthesize(text, persona, gaya)
        except TTSError:
            return self.fallback.synthesize(text, persona, gaya)


def get_tts():
    openai_tts = OpenAITTS(api_key=settings.openai_api_key, model=settings.tts_model)
    # Azure if configured, else free Edge TTS — both native Indonesian; OpenAI
    # is the last-resort fallback.
    if settings.azure_tts_enabled:
        primary = AzureTTS(
            api_key=settings.azure_speech_key, region=settings.azure_region
        )
    else:
        primary = EdgeTTS()
    return CompositeTTS(primary=primary, fallback=openai_tts)
