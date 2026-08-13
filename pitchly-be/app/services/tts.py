import hashlib
import logging
import os
import tempfile
from xml.sax.saxutils import escape

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


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
_GAYA_TONE_EN = {
    "kritis": "highly critical, probing, and hard to satisfy",
    "seimbang": "firm yet fair",
    "santai": "relaxed and supportive",
}

_PERSONA_LABEL = {
    "teknis": "Juri Teknis yang menuntut kelayakan implementasi",
    "dampak": "Juri Dampak yang menuntut manfaat dan skalabilitas",
    "skeptis": "Juri Skeptis yang mencari celah pada solusi",
}
_PERSONA_LABEL_EN = {
    "teknis": "a Technical Judge who demands implementation feasibility",
    "dampak": "an Impact Judge who demands benefit and scalability",
    "skeptis": "a Skeptical Judge who probes for gaps in the solution",
}


def _openai_instructions(
    persona: str, gaya: str, output_language: str, is_followup: bool = False
) -> str:
    if is_followup:
        if output_language == "en":
            return (
                f"You are {_PERSONA_LABEL_EN.get(persona, 'a competition judge')} who is frustrated "
                "by an evasive or unclear answer. Speak in English with intense vocal energy, "
                "a sharp, demanding tone, and clear annoyance. Express strong authority!"
            )
        return (
            f"Anda adalah {_PERSONA_LABEL.get(persona, 'juri kompetisi')} yang jengkel dan tegas "
            "karena jawaban peserta tidak jelas atau mengelak. Bicara dalam Bahasa Indonesia "
            "dengan intonasi tinggi, nada ketus, bertenaga, dan menuntut penjelasan jujur!"
        )
    if output_language == "en":
        return (
            f"You are {_PERSONA_LABEL_EN.get(persona, 'a competition judge')}. "
            f"Speak in English with a {_GAYA_TONE_EN.get(gaya, 'firm')} tone. "
            "High vocal energy, clear articulation, authoritative pace, like a real judge."
        )
    return (
        f"Anda adalah {_PERSONA_LABEL.get(persona, 'juri kompetisi')}. "
        f"Bicara dalam Bahasa Indonesia dengan nada {_GAYA_TONE.get(gaya, 'tegas')} dan bertenaga. "
        "Artikulasi tajam, ekspresif, tidak datar, seperti juri/dosen sungguhan di ruang sidang."
    )


class OpenAITTS:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def synthesize(
        self,
        text: str,
        persona: str,
        gaya: str = "seimbang",
        output_language: str = "id",
        is_followup: bool = False,
    ) -> bytes:
        if not self.api_key:
            raise TTSError("Kunci OpenAI belum diatur; suara tidak tersedia")
        from openai import OpenAI, OpenAIError

        voice = PERSONA_VOICE.get(persona, _DEFAULT_VOICE)
        instructions = _openai_instructions(persona, gaya, output_language, is_followup)
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

AZURE_PERSONA_VOICE = {
    "id": {
        "teknis": "id-ID-ArdiNeural",
        "dampak": "id-ID-GadisNeural",
        "skeptis": "id-ID-ArdiNeural",
    },
    "en": {
        "teknis": "en-US-GuyNeural",
        "dampak": "en-US-JennyNeural",
        "skeptis": "en-US-GuyNeural",
    },
}
_AZURE_DEFAULT_VOICE = {"id": "id-ID-ArdiNeural", "en": "en-US-GuyNeural"}
_AZURE_XML_LANG = {"id": "id-ID", "en": "en-US"}

# Dynamic prosody for energetic, non-flat delivery.
_AZURE_PROSODY = {
    "kritis": ("+6%", "+4%"),
    "seimbang": ("+4%", "+2%"),
    "santai": ("+2%", "+0%"),
}
_AZURE_FOLLOWUP_PROSODY = ("+10%", "+8%")


def _lang_voice(table: dict, default: dict, output_language: str, persona: str) -> str:
    lang = output_language if output_language in table else "id"
    return table[lang].get(persona, default[lang])


class AzureTTS:
    def __init__(self, api_key: str, region: str) -> None:
        self.api_key = api_key
        self.region = region

    @property
    def _endpoint(self) -> str:
        return f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def synthesize(
        self,
        text: str,
        persona: str,
        gaya: str = "seimbang",
        output_language: str = "id",
        is_followup: bool = False,
    ) -> bytes:
        if not self.api_key:
            raise TTSError("Azure Speech belum diatur")
        voice = _lang_voice(
            AZURE_PERSONA_VOICE, _AZURE_DEFAULT_VOICE, output_language, persona
        )
        xml_lang = _AZURE_XML_LANG.get(output_language, "id-ID")
        if is_followup:
            rate, pitch = _AZURE_FOLLOWUP_PROSODY
            volume = "+25%"
            voice_content = (
                f"<express-as style='angry' styledegree='1.8'>"
                f"<prosody rate='{rate}' pitch='{pitch}' volume='{volume}'>{escape(text)}</prosody>"
                "</express-as>"
            )
        else:
            rate, pitch = _AZURE_PROSODY.get(gaya, ("+4%", "+2%"))
            volume = "+10%"
            voice_content = (
                f"<prosody rate='{rate}' pitch='{pitch}' volume='{volume}'>{escape(text)}</prosody>"
            )

        ssml = (
            f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
            f"xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='{xml_lang}'>"
            f"<voice name='{voice}'>"
            f"{voice_content}"
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

EDGE_PERSONA_VOICE = {
    "id": {
        "teknis": "id-ID-ArdiNeural",
        "dampak": "id-ID-GadisNeural",
        "skeptis": "id-ID-ArdiNeural",
    },
    "en": {
        "teknis": "en-US-GuyNeural",
        "dampak": "en-US-JennyNeural",
        "skeptis": "en-US-GuyNeural",
    },
}
_EDGE_DEFAULT_VOICE = {"id": "id-ID-ArdiNeural", "en": "en-US-GuyNeural"}

# Energetic prosody per gaya (rate, pitch).
_EDGE_PROSODY = {
    "kritis": ("+6%", "+4Hz"),
    "seimbang": ("+4%", "+2Hz"),
    "santai": ("+2%", "+0Hz"),
}
_EDGE_FOLLOWUP_PROSODY = ("+10%", "+8Hz")


class EdgeTTS:
    """Free text-to-speech via Microsoft Edge's online voices (no API key)."""

    def synthesize(
        self,
        text: str,
        persona: str,
        gaya: str = "seimbang",
        output_language: str = "id",
        is_followup: bool = False,
    ) -> bytes:
        import asyncio

        try:
            import edge_tts
        except ImportError as exc:  # pragma: no cover
            raise TTSError("Paket edge-tts belum terpasang") from exc

        voice = _lang_voice(
            EDGE_PERSONA_VOICE, _EDGE_DEFAULT_VOICE, output_language, persona
        )
        if is_followup:
            rate, pitch = _EDGE_FOLLOWUP_PROSODY
            volume = "+25%"
        else:
            rate, pitch = _EDGE_PROSODY.get(gaya, ("+4%", "+2Hz"))
            volume = "+10%"

        async def _run() -> bytes:
            communicate = edge_tts.Communicate(
                text, voice, rate=rate, pitch=pitch, volume=volume
            )
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


class CachingTTS:
    """Disk-cache mp3 output keyed by hash(engine+persona+gaya+is_followup+text)."""

    def __init__(self, inner, engine_id: str, cache_dir: str) -> None:
        self.inner = inner
        self.engine_id = engine_id
        self.cache_dir = cache_dir
        try:
            os.makedirs(self.cache_dir, exist_ok=True)
        except OSError:
            logger.warning("TTS cache dir unavailable: %s", self.cache_dir)

    def _path(
        self, text: str, persona: str, gaya: str, output_language: str, is_followup: bool
    ) -> str:
        raw = (
            f"{self.engine_id}\x00{output_language}\x00{persona}\x00{gaya}\x00"
            f"{is_followup}\x00{text}"
        ).encode("utf-8")
        digest = hashlib.sha256(raw).hexdigest()
        return os.path.join(self.cache_dir, f"{digest}.mp3")

    def synthesize(
        self,
        text: str,
        persona: str,
        gaya: str = "seimbang",
        output_language: str = "id",
        is_followup: bool = False,
    ) -> bytes:
        path = self._path(text, persona, gaya, output_language, is_followup)
        try:
            with open(path, "rb") as fh:
                return fh.read()
        except OSError:
            pass  # cache miss or unreadable — synthesize below
        audio = self.inner.synthesize(text, persona, gaya, output_language, is_followup)
        try:
            tmp = f"{path}.{os.getpid()}.tmp"
            with open(tmp, "wb") as fh:
                fh.write(audio)
            os.replace(tmp, path)  # atomic — no partial reads on concurrent hits
        except OSError:
            logger.warning("Failed to cache TTS output at %s", path)
        return audio


class CompositeTTS:
    """Try the primary engine, fall back to the secondary on failure."""

    def __init__(self, primary, fallback) -> None:
        self.primary = primary
        self.fallback = fallback

    def synthesize(
        self,
        text: str,
        persona: str,
        gaya: str = "seimbang",
        output_language: str = "id",
        is_followup: bool = False,
    ) -> bytes:
        try:
            return self.primary.synthesize(
                text, persona, gaya, output_language, is_followup
            )
        except TTSError:
            return self.fallback.synthesize(
                text, persona, gaya, output_language, is_followup
            )


def get_tts():
    openai_tts = OpenAITTS(api_key=settings.openai_api_key, model=settings.tts_model)
    if settings.azure_tts_enabled:
        primary = AzureTTS(
            api_key=settings.azure_speech_key, region=settings.azure_region
        )
    else:
        primary = EdgeTTS()
    composite = CompositeTTS(primary=primary, fallback=openai_tts)
    if not settings.tts_cache_enabled:
        return composite
    cache_dir = settings.tts_cache_dir or os.path.join(
        tempfile.gettempdir(), "pitchly-tts-cache"
    )
    engine_id = f"{type(primary).__name__}:{settings.tts_model}"
    return CachingTTS(composite, engine_id=engine_id, cache_dir=cache_dir)

