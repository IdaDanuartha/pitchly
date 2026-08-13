import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk
from app.models.rubric import JsonType


class Scorecard(TimestampMixin, Base):
    __tablename__ = "scorecards"

    id: Mapped[uuid.UUID] = uuid_pk()
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    skor_per_kategori_json: Mapped[dict] = mapped_column(JsonType, nullable=False)
    # Weighted final score using the rubric's bobot (weights). Null on legacy rows.
    skor_akhir: Mapped[int | None] = mapped_column(nullable=True)
    ringkasan_kekuatan: Mapped[str] = mapped_column(nullable=False)
    ringkasan_kelemahan: Mapped[str] = mapped_column(nullable=False)
    rencana_perbaikan_json: Mapped[list] = mapped_column(JsonType, nullable=False)
    # Aggregate delivery/pacing over the session's answers (wpm, filler, verdict).
    pacing_json: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    # Assessment of the presentation phase (only when the session had one).
    penilaian_presentasi_json: Mapped[dict | None] = mapped_column(
        JsonType, nullable=True
    )
    # Per-question improved-answer suggestions (generated on demand, cached here).
    # Intentionally NOT included in the printed/exported report.
    saran_jawaban_json: Mapped[list | None] = mapped_column(JsonType, nullable=True)
    model_used: Mapped[str] = mapped_column(nullable=False)
