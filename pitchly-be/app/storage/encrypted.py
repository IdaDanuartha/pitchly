import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.storage.base import Storage

# Marks a blob written by this wrapper so legacy plaintext files (uploaded
# before encryption was enabled) can still be read back untouched.
_MAGIC = b"ENC1"


def _fernet_from_secret(secret: str) -> Fernet:
    """Derive a stable Fernet key from any passphrase string."""
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


class EncryptedStorage(Storage):
    """Transparent encryption-at-rest wrapper around any Storage backend.

    Bytes are encrypted on save and decrypted on read; callers are unchanged.
    Reads of pre-existing plaintext blobs pass through unmodified.
    """

    def __init__(self, inner: Storage, secret: str) -> None:
        self._inner = inner
        self._fernet = _fernet_from_secret(secret)

    def save(self, data: bytes, key: str) -> str:
        blob = _MAGIC + self._fernet.encrypt(data)
        return self._inner.save(blob, key)

    def read(self, key: str) -> bytes:
        raw = self._inner.read(key)
        if raw.startswith(_MAGIC):
            try:
                return self._fernet.decrypt(raw[len(_MAGIC):])
            except InvalidToken as exc:
                raise ValueError(
                    "Gagal mendekripsi dokumen — kunci enkripsi salah/berubah."
                ) from exc
        return raw  # legacy plaintext, stored before encryption was enabled

    def delete(self, key: str) -> None:
        self._inner.delete(key)
