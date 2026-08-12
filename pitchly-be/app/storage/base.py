from abc import ABC, abstractmethod


class Storage(ABC):
    @abstractmethod
    def save(self, data: bytes, key: str) -> str:
        """Persist bytes under key. Returns the stored path/locator."""

    @abstractmethod
    def read(self, key: str) -> bytes:
        """Read bytes previously stored under key."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete the object at key. No-op if it does not exist."""
