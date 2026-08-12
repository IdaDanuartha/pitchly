import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk
from app.models.rubric import JsonType


class CompetitionOutcome(TimestampMixin, Base):
    """Real-world result of a competition the user practised for, plus a
    calibration comparing Pitchly's predicted critiques to the actual jury
    feedback (PRD §4.4.b — agent evaluasi pasca kompetisi)."""

    __tablename__ = "competition_outcomes"

    id: Mapped[uuid.UUID] = uuid_pk()
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # What the real judges actually said, and how it turned out.
    kritik_juri_asli: Mapped[str] = mapped_column(nullable=False)
    hasil: Mapped[str] = mapped_column(nullable=False)  # menang|finalis|lolos|gugur
    catatan: Mapped[str | None] = mapped_column(nullable=True)
    # LLM comparison of predicted vs actual critiques.
    analisis_json: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    model_used: Mapped[str | None] = mapped_column(nullable=True)
