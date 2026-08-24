import io
import re

from app.core.config import settings

# Frasa yang sering dihasilkan Whisper ketika audio adalah noise/kesunyian.
# Referensi: https://github.com/openai/whisper/discussions/928
_HALLUCINATION_PATTERNS = re.compile(
    r"^\s*("
    r"thanks for watching[!.]?"
    r"|thank you for watching[!.]?"
    r"|please subscribe[!.]?"
    r"|don't forget to like[!.]?"
    r"|like and subscribe[!.]?"
    r"|subscribe to[^.]{0,40}channel[!.]?"
    r"|subtitles by[^.]{0,40}"
    r"|transcribed by[^.]{0,40}"
    r"|\[music\]"
    r"|\[silence\]"
    r"|\[blank_audio\]"
    r"|\(music\)"
    r"|www\.[a-z]+\.[a-z]+"
    r")\s*$",
    re.IGNORECASE,
)


class STTError(Exception):
    """Raised when speech-to-text is unavailable or fails."""


class WhisperSTT:
    """Speech-to-text via OpenAI Whisper."""

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def transcribe(self, data: bytes, filename: str) -> str:
        if not self.api_key:
            raise STTError("Kunci OpenAI belum diatur; mode suara tidak tersedia")
        from openai import OpenAI, OpenAIError

        client = OpenAI(api_key=self.api_key)
        buffer = io.BytesIO(data)
        buffer.name = filename or "audio.webm"
        try:
            result = client.audio.transcriptions.create(
                model=self.model,
                file=buffer,
                # Memberi konteks bahasa Indonesia agar Whisper tidak menebak
                # bahasa lain dari noise, dan mengurangi halusinasi umum.
                prompt=(
                    "Ini adalah jawaban lisan peserta kompetisi dalam bahasa Indonesia. "
                    "Jawaban berisi penjelasan teknis, solusi, atau argumen."
                ),
                language="id",
            )
        except OpenAIError as exc:
            raise STTError(f"Transkripsi gagal: {exc}") from exc
        text = (result.text or "").strip()
        # Buang halusinasi Whisper umum (noise → frasa bahasa Inggris aneh)
        if _HALLUCINATION_PATTERNS.match(text):
            return ""
        return text


def get_stt() -> WhisperSTT:
    return WhisperSTT(api_key=settings.openai_api_key, model=settings.stt_model)
