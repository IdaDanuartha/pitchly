"""Subscription plans and entitlements (billing is mock — no payment gateway)."""

from datetime import datetime, timedelta, timezone


# Entitlements per plan. sesi_kuota None = unlimited.
ENTITLEMENTS: dict[str, dict] = {
    "free": {
        "sesi_kuota": 2,
        "presentasi": False,
        "tim": False,
        "kalibrasi": False,
        "orisinalitas_web": False,
    },
    "pro": {
        "sesi_kuota": None,
        "presentasi": True,
        "tim": False,
        "kalibrasi": True,
        "orisinalitas_web": True,
    },
    "tim": {
        "sesi_kuota": None,
        "presentasi": True,
        "tim": True,
        "kalibrasi": True,
        "orisinalitas_web": True,
    },
}

# Catalog shown on the pricing page (harga in IDR).
PLAN_CATALOG = [
    {
        "id": "free",
        "nama": "Free",
        "deskripsi": "Coba Pitchly tanpa biaya.",
        "harga_bulanan": 0,
        "harga_tahunan": 0,
        "fitur": [
            "2 sesi latihan (total)",
            "Panel juri multi-persona",
            "Mode individu · tanya jawab",
            "Scorecard & rencana perbaikan",
        ],
    },
    {
        "id": "pro",
        "nama": "Pro",
        "deskripsi": "Untuk peserta serius yang berlatih rutin.",
        "harga_bulanan": 49000,
        "harga_tahunan": 490000,
        "fitur": [
            "Sesi latihan tak terbatas",
            "Fase presentasi + berbagi layar",
            "Semua kategori kompetisi & akademik",
            "Kalibrasi pasca-kompetisi",
            "Cek orisinalitas via pencarian web",
            "Analisis pola kelemahan lintas sesi",
        ],
    },
    {
        "id": "tim",
        "nama": "Tim",
        "deskripsi": "Untuk tim kompetisi & unit kemahasiswaan.",
        "harga_bulanan": 99000,
        "harga_tahunan": 990000,
        "fitur": [
            "Semua fitur Pro",
            "Mode simulasi tim (lintas peran)",
            "Kelola anggota tim",
            "Prioritas dukungan",
        ],
    },
]

PLAN_IDS = {p["id"] for p in PLAN_CATALOG}


def entitlements(plan: str) -> dict:
    return ENTITLEMENTS.get(plan, ENTITLEMENTS["free"])


def effective_plan(plan: str, expires_at: datetime | None) -> str:
    """A paid plan reverts to free once it expires."""
    if plan == "free" or not plan:
        return "free"
    if expires_at is None:
        return plan
    exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return "free"
    return plan


def period_end(interval: str) -> datetime:
    days = 365 if interval == "yearly" else 30
    return datetime.now(timezone.utc) + timedelta(days=days)
