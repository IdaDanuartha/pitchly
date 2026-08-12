#!/bin/sh
set -e

echo "Menunggu database siap..."
python - <<'PY'
import asyncio
import os
import sys

import asyncpg


async def wait():
    url = os.environ.get("DATABASE_URL", "")
    # asyncpg wants a plain postgres URL, strip the SQLAlchemy driver suffix.
    dsn = url.replace("postgresql+asyncpg://", "postgresql://")
    for attempt in range(30):
        try:
            conn = await asyncpg.connect(dsn)
            await conn.close()
            print("Database siap.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"  belum siap ({attempt + 1}/30): {exc}")
            await asyncio.sleep(2)
    sys.exit("Database tidak kunjung siap.")


asyncio.run(wait())
PY

echo "Membuat skema database..."
python -m app.db.init_db

echo "Menyiapkan korpus orisinalitas..."
python -m app.vector.seed_run || echo "  (seed dilewati)"

echo "Menjalankan API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
