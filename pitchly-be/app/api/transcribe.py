from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_current_user
from app.models.user import User
from app.services.stt import STTError, WhisperSTT, get_stt

router = APIRouter(tags=["voice"])


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
    stt: WhisperSTT = Depends(get_stt),
) -> dict[str, str]:
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Berkas audio kosong")
    try:
        text = await run_in_threadpool(
            stt.transcribe, data, file.filename or "audio.webm"
        )
    except STTError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    return {"text": text}
