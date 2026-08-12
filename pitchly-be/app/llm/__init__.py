from app.core.config import settings
from app.llm.base import LLMError, Provider
from app.llm.client import LLMClient
from app.llm.gemini_provider import GeminiProvider
from app.llm.openai_provider import OpenAIProvider

__all__ = ["LLMClient", "LLMError", "Provider", "get_llm_client"]


def get_llm_client() -> LLMClient:
    primary = OpenAIProvider(
        api_key=settings.openai_api_key, model=settings.primary_model
    )
    fallbacks = [
        GeminiProvider(api_key=settings.gemini_api_key, model=model)
        for model in settings.fallback_model_list
    ]
    return LLMClient(primary=primary, fallbacks=fallbacks)
