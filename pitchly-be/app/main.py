import logging
import time
import uuid

from fastapi import FastAPI, Request
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
from app.core.logging import configure_logging, request_id_ctx

configure_logging()
logger = logging.getLogger("pitchly.request")

app = FastAPI(title="Pitchly API", version="0.1.0")


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Assign/propagate a request id and log each request with its latency."""
    rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    token = request_id_ctx.set(rid)
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = rid
        return response
    finally:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "%s %s -> %s",
            request.method,
            request.url.path,
            status_code,
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": status_code,
                "duration_ms": elapsed_ms,
            },
        )
        request_id_ctx.reset(token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
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
