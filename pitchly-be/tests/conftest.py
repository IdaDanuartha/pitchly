import os
import tempfile
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Configure env before app modules read settings at import time.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="pitchly-test-"))
os.environ.setdefault("JWT_SECRET", "test-secret")
# Keep tests hermetic: blank external-integration keys that would otherwise leak
# in from a local .env file and flip feature flags (email verification, Google
# OAuth, D-ID avatar, web search, at-rest encryption) to "enabled".
for _leak in (
    "RESEND_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "DID_API_KEY",
    "TAVILY_API_KEY",
    "DOCUMENT_ENCRYPTION_KEY",
):
    os.environ[_leak] = ""

from app.api.deps import get_llm  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_engine) -> AsyncGenerator[AsyncClient, None]:
    maker = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


class FakeLLM:
    """Stand-in LLMClient for API tests."""

    def __init__(self, response: str, model: str = "fake") -> None:
        self._response = response
        self.last_model_used = model

    def complete(self, prompt, *, system=None, json_mode=False) -> str:
        return self._response


def override_llm(response: str):
    def _factory():
        return FakeLLM(response)

    app.dependency_overrides[get_llm] = _factory
