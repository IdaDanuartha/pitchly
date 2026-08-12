from dataclasses import dataclass
from typing import Protocol


class VectorError(Exception):
    """Raised when embedding or vector search is unavailable/fails."""


@dataclass
class QueryHit:
    metadata: dict
    distance: float


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text."""
        ...


class VectorStore(Protocol):
    def count(self) -> int: ...

    def add(
        self, ids: list[str], vectors: list[list[float]], metadatas: list[dict]
    ) -> None: ...

    def query(self, vector: list[float], k: int) -> list[QueryHit]: ...
