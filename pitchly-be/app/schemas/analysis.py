import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

Bagian = Literal["problem_statement", "kelayakan_teknis", "dampak"]
Severity = Literal["rendah", "sedang", "tinggi"]


class Finding(BaseModel):
    bagian: Bagian
    temuan: str
    rujukan: str
    severity: Severity
    # Verbatim snippet from the document + the page it was found on (citation).
    kutipan: str | None = None
    halaman: int | None = None


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    findings: list[Finding]
    model_used: str
    created_at: datetime
