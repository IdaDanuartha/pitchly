import io
import re

from app.core.config import settings

# Frasa yang sering dihasilkan Whisper ketika audio adalah noise/kesunyian.
# Referensi: https://github.com/openai/whisper/discussions/928
_HALLUCINATION_PATTERNS = re.compile(
    r"^\s*("
    # English patterns
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
    # Indonesian YouTube / social-media patterns
    r"|jangan lupa (subscribe|like|komen|share|klik)[^.]{0,60}"
    r"|like (dan|dan subscribe|subscribe)[^.]{0,40}"
    r"|terima kasih (sudah|telah) (menonton|nonton)[^.]{0,40}"
    r"|sampai jumpa di (video|konten)[^.]{0,40}"
    r"|tekan tombol[^.]{0,40}"
    r"|nyalakan notifikasi[^.]{0,40}"
    # Prompt echo — Whisper kadang mengulang prompt yang dikirim
    r"|jawaban lisan peserta kompetisi[^.]{0,80}"
    r"|peserta kompetisi dalam bahasa indonesia[^.]{0,60}"
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
                # language=id mengurangi tebakan bahasa yang salah dari noise
                # tanpa prompt agar Whisper tidak echo-balik teks prompt.
                language="id",
            )
        except OpenAIError as exc:
            raise STTError(f"Transkripsi gagal: {exc}") from exc
        text = (result.text or "").strip()
        # Buang halusinasi Whisper umum (noise → frasa aneh)
        if _HALLUCINATION_PATTERNS.match(text):
            return ""
        return text


def get_stt() -> WhisperSTT:
    return WhisperSTT(api_key=settings.openai_api_key, model=settings.stt_model)
