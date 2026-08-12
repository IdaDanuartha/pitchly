from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    account,
    auth,
    avatar,
    billing,
    documents,
    health,
    rubrics,
    sessions,
    teams,
    transcribe,
    tts,
)
from app.core.config import settings

app = FastAPI(title="Pitchly API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(rubrics.router)
app.include_router(sessions.router)
app.include_router(teams.router)
app.include_router(transcribe.router)
app.include_router(tts.router)
app.include_router(avatar.router)
app.include_router(account.router)
app.include_router(billing.router)
