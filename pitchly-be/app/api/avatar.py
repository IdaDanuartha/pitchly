from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.did import DIDError, create_talk

router = APIRouter(prefix="/avatar", tags=["avatar"])


class TalkRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    persona: str = "teknis"
    gaya: str = "seimbang"
    output_language: str = "id"


class TalkResponse(BaseModel):
    enabled: bool
    video_url: str | None = None


@router.post("/talk", response_model=TalkResponse)
async def talk(
    payload: TalkRequest,
    _user: User = Depends(get_current_user),
) -> TalkResponse:
    if not settings.did_enabled:
        # Not configured → frontend falls back to portrait + TTS.
        return TalkResponse(enabled=False, video_url=None)
    try:
        url = await run_in_threadpool(
            create_talk,
            payload.text,
            payload.persona,
            payload.gaya,
            payload.output_language,
        )
    except DIDError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    return TalkResponse(enabled=True, video_url=url)
