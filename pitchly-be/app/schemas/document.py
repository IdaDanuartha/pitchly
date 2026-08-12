import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    tipe: str
    filename: str
    status_analisis: str
    created_at: datetime


class SimilarSolutionPublic(BaseModel):
    nama: str
    deskripsi: str
    skor_kemiripan: int
    url: str | None = None
    sumber: str = "korpus"


class OriginalityResponse(BaseModel):
    available: bool
    matches: list[SimilarSolutionPublic]
    sumber: str = "korpus"  # "web" | "korpus"
    # Set when a web search was attempted but failed (visible for debugging).
    web_error: str | None = None
