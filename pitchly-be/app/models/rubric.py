import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk

# Use JSONB on Postgres, plain JSON elsewhere (tests on sqlite).
JsonType = JSON().with_variant(JSONB(), "postgresql")


class CompetitionRubric(TimestampMixin, Base):
    __tablename__ = "competition_rubrics"

    id: Mapped[uuid.UUID] = uuid_pk()
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    nama_kompetisi: Mapped[str] = mapped_column(nullable=False)
    kriteria_json: Mapped[list] = mapped_column(JsonType, nullable=False)
    bobot_json: Mapped[dict] = mapped_column(JsonType, nullable=False)
