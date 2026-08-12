import base64
import json

from app.core.config import settings


class VisionError(Exception):
    """Raised when expression analysis is unavailable or fails."""


SYSTEM = (
    "Anda pelatih presentasi yang membaca bahasa tubuh peserta saat menjawab "
    "panel juri kompetisi. Analisis singkat, objektif, membangun."
)

PROMPT = (
    "Ini foto peserta saat menjawab pertanyaan juri. Nilai ekspresi wajah, "
    "kontak mata, dan postur/bahasa tubuh. Balas HANYA JSON:\n"
    "{\n"
    '  "ekspresi": "<ringkas ekspresi wajah>",\n'
    '  "kepercayaan_diri": "rendah" | "sedang" | "tinggi",\n'
    '  "body_language": "<ringkas postur & kontak mata>",\n'
    '  "catatan": "<satu saran perbaikan sikap>"\n'
    "}"
)


class OpenAIVision:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def analyze(self, image_bytes: bytes, mime: str = "image/jpeg") -> dict:
        if not self.api_key:
            raise VisionError("Kunci OpenAI belum diatur; analisis ekspresi nonaktif")
        from openai import OpenAI, OpenAIError

        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime};base64,{b64}"
        client = OpenAI(api_key=self.api_key)
        try:
            resp = client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": PROMPT},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    },
                ],
            )
        except OpenAIError as exc:
            raise VisionError(f"Analisis ekspresi gagal: {exc}") from exc

        raw = resp.choices[0].message.content or "{}"
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise VisionError(f"Respons ekspresi bukan JSON: {exc}") from exc


def get_vision() -> OpenAIVision:
    return OpenAIVision(api_key=settings.openai_api_key, model=settings.vision_model)
