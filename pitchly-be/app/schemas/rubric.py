import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RubricPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    nama_kompetisi: str
    kriteria_json: list
    bobot_json: dict
    created_at: datetime
