from app.core.config import settings
from app.storage.base import Storage
from app.storage.encrypted import EncryptedStorage
from app.storage.local import LocalStorage


def get_storage() -> Storage:
    base: Storage = LocalStorage(settings.upload_dir)
    if settings.document_encryption_enabled:
        return EncryptedStorage(base, settings.document_encryption_key)
    return base
