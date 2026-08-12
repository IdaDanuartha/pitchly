import asyncio

from app.db.base import Base
from app.db.session import engine
from app.models import (  # noqa: F401  (ensure models are registered on Base)
    CompetitionOutcome,
    CompetitionRubric,
    Document,
    DocumentAnalysis,
    Scorecard,
    Session,
    SessionTurn,
    Team,
    TeamMember,
    User,
)


# Columns added to pre-existing tables after their first release. create_all
# only creates missing tables, never alters existing ones, so on a persisted
# database these must be added explicitly (idempotent, Postgres only).
_ENSURE_COLUMNS = [
    ("users", "email_verified", "BOOLEAN DEFAULT FALSE NOT NULL"),
    ("users", "auth_provider", "VARCHAR DEFAULT 'local' NOT NULL"),
    ("users", "google_sub", "VARCHAR"),
    ("users", "plan", "VARCHAR DEFAULT 'free' NOT NULL"),
    ("users", "plan_interval", "VARCHAR"),
    ("users", "plan_expires_at", "TIMESTAMPTZ"),
    ("sessions", "team_id", "UUID"),
    ("sessions", "gaya", "VARCHAR DEFAULT 'seimbang' NOT NULL"),
    ("sessions", "kedalaman", "VARCHAR DEFAULT 'ringkas' NOT NULL"),
    ("sessions", "bahasa", "VARCHAR DEFAULT 'formal' NOT NULL"),
    ("sessions", "ronde", "INTEGER DEFAULT 2 NOT NULL"),
    ("sessions", "durasi_menit", "INTEGER DEFAULT 15 NOT NULL"),
    ("sessions", "jeda_pada", "TIMESTAMPTZ"),
    ("sessions", "jenis", "VARCHAR DEFAULT 'kompetisi' NOT NULL"),
    ("sessions", "kategori", "VARCHAR DEFAULT 'umum' NOT NULL"),
    ("sessions", "dengan_presentasi", "BOOLEAN DEFAULT FALSE NOT NULL"),
    ("sessions", "durasi_presentasi_menit", "INTEGER DEFAULT 0 NOT NULL"),
    ("sessions", "presentasi_selesai", "BOOLEAN DEFAULT FALSE NOT NULL"),
    ("sessions", "presentasi_transkrip", "TEXT"),
    ("session_turns", "target_peran", "VARCHAR"),
    ("session_turns", "target_nama", "VARCHAR"),
    ("session_turns", "delivery_json", "JSONB"),
    ("session_turns", "ekspresi_json", "JSONB"),
    ("session_turns", "is_followup", "BOOLEAN DEFAULT FALSE NOT NULL"),
    ("scorecards", "pacing_json", "JSONB"),
    ("scorecards", "penilaian_presentasi_json", "JSONB"),
    ("scorecards", "saran_jawaban_json", "JSONB"),
]


async def create_all() -> None:
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "postgresql":
            for table, column, coltype in _ENSURE_COLUMNS:
                await conn.execute(
                    text(
                        f"ALTER TABLE {table} "
                        f"ADD COLUMN IF NOT EXISTS {column} {coltype}"
                    )
                )


def main() -> None:
    asyncio.run(create_all())


if __name__ == "__main__":
    main()
