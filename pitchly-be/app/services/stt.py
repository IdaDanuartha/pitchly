import io

from app.core.config import settings


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
                model=self.model, file=buffer
            )
        except OpenAIError as exc:
            raise STTError(f"Transkripsi gagal: {exc}") from exc
        return result.text or ""


def get_stt() -> WhisperSTT:
    return WhisperSTT(api_key=settings.openai_api_key, model=settings.stt_model)
