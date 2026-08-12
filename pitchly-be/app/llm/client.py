import logging
from collections.abc import Iterable

from app.llm.base import LLMError, Provider

logger = logging.getLogger("pitchly.llm")


class LLMClient:
    """Single call site: a primary provider plus an ordered list of fallbacks.

    On primary failure: retry once, then try each fallback in order until one
    succeeds. Agents never know which model actually served the request.
    """

    def __init__(self, primary: Provider, fallbacks: Iterable[Provider]) -> None:
        self.primary = primary
        self.fallbacks = list(fallbacks)
        self.last_model_used: str | None = None

    def complete(
        self, prompt: str, *, system: str | None = None, json_mode: bool = False
    ) -> str:
        # Primary: try twice.
        for attempt in (1, 2):
            try:
                result = self.primary.complete(
                    prompt, system=system, json_mode=json_mode
                )
                self.last_model_used = self.primary.name
                return result
            except LLMError as exc:
                logger.warning(
                    "Primary provider %s failed (attempt %d): %s",
                    self.primary.name,
                    attempt,
                    exc,
                )

        # Fallbacks: one attempt each, in order.
        for fb in self.fallbacks:
            logger.warning("Falling back to %s", fb.name)
            try:
                result = fb.complete(prompt, system=system, json_mode=json_mode)
                self.last_model_used = fb.name
                return result
            except LLMError as exc:
                logger.warning("Fallback provider %s failed: %s", fb.name, exc)

        logger.error("All providers failed for request")
        raise LLMError("Semua provider LLM gagal (primary + seluruh fallback)")
