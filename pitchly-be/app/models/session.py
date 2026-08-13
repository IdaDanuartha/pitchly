import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk


class Session(TimestampMixin, Base):
    """Shell for a simulation session. Not yet driven this slice."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    rubric_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("competition_rubrics.id", ondelete="SET NULL"), nullable=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    mode: Mapped[str] = mapped_column(default="individu", nullable=False)
    status: Mapped[str] = mapped_column(default="draft", nullable=False)
    # Session context — drives which panel of personas asks the questions.
    jenis: Mapped[str] = mapped_column(default="kompetisi", nullable=False)  # kompetisi|akademik
    kategori: Mapped[str] = mapped_column(default="umum", nullable=False)
    # Optional presentation phase before Q&A (screen-share pitch/demo). The Q&A
    # clock only starts once the presentation is finished.
    dengan_presentasi: Mapped[bool] = mapped_column(default=False, nullable=False)
    durasi_presentasi_menit: Mapped[int] = mapped_column(default=0, nullable=False)
    presentasi_selesai: Mapped[bool] = mapped_column(default=False, nullable=False)
    presentasi_transkrip: Mapped[str | None] = mapped_column(nullable=True)
    # Konfigurasi sesi (setelan pra-sesi).
    gaya: Mapped[str] = mapped_column(default="seimbang", nullable=False)
    kedalaman: Mapped[str] = mapped_column(default="ringkas", nullable=False)
    bahasa: Mapped[str] = mapped_column(default="formal", nullable=False)
    # Output language the judges speak/score in: "id" (default) or "en".
    output_language: Mapped[str] = mapped_column(default="id", nullable=False)
    ronde: Mapped[int] = mapped_column(default=2, nullable=False)  # deprecated
    durasi_menit: Mapped[int] = mapped_column(default=15, nullable=False)
    mulai_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    selesai_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Set while the candidate is away ("lanjut nanti"): the session clock is
    # frozen at this instant and shifted forward on resume.
    jeda_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
