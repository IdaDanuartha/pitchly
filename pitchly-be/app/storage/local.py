from pathlib import Path

from app.storage.base import Storage


class LocalStorage(Storage):
    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # `key` may be a relative key (from save) or a stored absolute path
        # (persisted in documents.storage_path). Accept both.
        candidate = Path(key)
        if candidate.is_absolute():
            return candidate
        # Prevent path traversal; keep key relative to root.
        safe = key.lstrip("/").replace("..", "")
        return self.root / safe

    def save(self, data: bytes, key: str) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return str(path)

    def read(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)
