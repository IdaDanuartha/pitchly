from typing import Protocol, runtime_checkable


class LLMError(Exception):
    """Raised by a provider on timeout, 5xx, or rate-limit."""


@runtime_checkable
class Provider(Protocol):
    name: str

    def complete(
        self, prompt: str, *, system: str | None = None, json_mode: bool = False
    ) -> str:
        """Return the model's text completion. Raise LLMError on transient failure."""
        ...
