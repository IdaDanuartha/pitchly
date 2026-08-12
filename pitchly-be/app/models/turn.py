import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk
from app.models.rubric import JsonType


class SessionTurn(TimestampMixin, Base):
    __tablename__ = "session_turns"

    id: Mapped[uuid.UUID] = uuid_pk()
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    urutan: Mapped[int] = mapped_column(Integer, nullable=False)
    persona: Mapped[str] = mapped_column(nullable=False)
    pertanyaan: Mapped[str] = mapped_column(nullable=False)
    jawaban: Mapped[str | None] = mapped_column(nullable=True)
    waktu_tempuh_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Team mode: which member the question is directed at (label, not an account).
    target_peran: Mapped[str | None] = mapped_column(nullable=True)
    target_nama: Mapped[str | None] = mapped_column(nullable=True)
    # True when this question is an adaptive follow-up probing the previous
    # answer (same persona), rather than the next round-robin question.
    is_followup: Mapped[bool] = mapped_column(default=False, nullable=False)
    # Multimodal observations (full-voice sessions).
    delivery_json: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    ekspresi_json: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
