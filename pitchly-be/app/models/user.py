import uuid
from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models._mixins import TimestampMixin, uuid_pk


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    nama: Mapped[str] = mapped_column(nullable=False)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(default="user", nullable=False)
    email_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    auth_provider: Mapped[str] = mapped_column(default="local", nullable=False)
    google_sub: Mapped[str | None] = mapped_column(
        unique=True, index=True, nullable=True
    )
    # Subscription (billing is mock — no payment gateway).
    plan: Mapped[str] = mapped_column(default="free", nullable=False)  # free|pro|tim
    plan_interval: Mapped[str | None] = mapped_column(nullable=True)  # monthly|yearly
    plan_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
