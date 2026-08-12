import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk
from app.models.rubric import JsonType


class DocumentAnalysis(TimestampMixin, Base):
    __tablename__ = "document_analyses"

    id: Mapped[uuid.UUID] = uuid_pk()
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    findings_json: Mapped[list] = mapped_column(JsonType, nullable=False)
    model_used: Mapped[str] = mapped_column(nullable=False)
