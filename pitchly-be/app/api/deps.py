import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.llm import LLMClient, get_llm_client
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)


def get_llm() -> LLMClient:
    """LLM client dependency. Overridden in tests with a fake client."""
    return get_llm_client()


def get_embedder():
    """Embedder dependency. Overridden in tests with a fake embedder."""
    from app.vector.openai_embedder import OpenAIEmbedder

    from app.core.config import settings

    return OpenAIEmbedder(settings.openai_api_key, settings.embedding_model)


def get_vector_store():
    """Vector store dependency. Overridden in tests with a fake store."""
    from app.vector.chroma_store import ChromaStore

    from app.core.config import settings

    return ChromaStore(settings.chroma_dir)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Tidak terautentikasi"
        )
    subject = decode_token(credentials.credentials)
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid"
        )
    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid"
        )
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Pengguna tidak ditemukan"
        )
    return user
