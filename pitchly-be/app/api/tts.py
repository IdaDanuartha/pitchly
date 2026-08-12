from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.services.tts import TTSError, get_tts

router = APIRouter(tags=["voice"])


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    persona: str = "teknis"
    gaya: str = "seimbang"


@router.post("/tts")
async def synthesize(
    payload: TTSRequest,
    _user: User = Depends(get_current_user),
    tts=Depends(get_tts),
) -> Response:
    try:
        audio = await run_in_threadpool(
            tts.synthesize, payload.text, payload.persona, payload.gaya
        )
    except TTSError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    return Response(content=audio, media_type="audio/mpeg")
