import time

import httpx

from app.core.config import settings

API_BASE = "https://api.d-id.com"


class DIDError(Exception):
    """Raised when the D-ID talking-photo request is unavailable or fails."""


# Map our gaya to a Microsoft TTS style where available.
_GAYA_STYLE = {
    "kritis": "serious",
    "seimbang": "",
    "santai": "friendly",
}


def create_talk(
    text: str, persona: str, gaya: str = "seimbang", output_language: str = "id"
) -> str:
    """Create a D-ID talk and poll until the lip-synced video is ready.

    Returns the result video URL. Raises DIDError if not configured or on failure.
    """
    if not settings.did_enabled:
        raise DIDError("D-ID belum dikonfigurasi")
    source = settings.did_source(persona)
    if not source:
        raise DIDError(f"Sumber gambar D-ID untuk persona '{persona}' belum diatur")

    voice_id = settings.did_voice(persona, output_language)
    style = _GAYA_STYLE.get(gaya, "")
    voice_config = {"style": style} if style else {}

    headers = {
        "Authorization": f"Basic {settings.did_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "source_url": source,
        "script": {
            "type": "text",
            "input": text,
            "provider": {
                "type": "microsoft",
                "voice_id": voice_id,
                **({"voice_config": voice_config} if voice_config else {}),
            },
        },
        "config": {"fluent": True, "pad_audio": 0.0},
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            create = client.post(f"{API_BASE}/talks", headers=headers, json=body)
            create.raise_for_status()
            talk_id = create.json().get("id")
            if not talk_id:
                raise DIDError("D-ID tidak mengembalikan id talk")

            # Poll until done. Capped short: the frontend already shows
            # portrait + TTS and only swaps in the video if it arrives quickly,
            # so there is no point holding a worker for a slow/stuck render.
            for _ in range(22):
                time.sleep(1.0)
                poll = client.get(f"{API_BASE}/talks/{talk_id}", headers=headers)
                poll.raise_for_status()
                data = poll.json()
                status = data.get("status")
                if status == "done":
                    result = data.get("result_url")
                    if not result:
                        raise DIDError("D-ID selesai tanpa result_url")
                    return result
                if status == "error":
                    raise DIDError(f"D-ID gagal render: {data.get('error')}")
            raise DIDError("D-ID render melebihi batas waktu")
    except httpx.HTTPError as exc:
        raise DIDError(f"Permintaan D-ID gagal: {exc}") from exc
