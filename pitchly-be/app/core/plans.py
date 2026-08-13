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

# Pricing is language-neutral (harga in IDR); nama is a brand label kept as-is.
PLAN_PRICING = [
    {"id": "free", "nama": "Free", "harga_bulanan": 0, "harga_tahunan": 0},
    {"id": "pro", "nama": "Pro", "harga_bulanan": 49000, "harga_tahunan": 490000},
    {"id": "tim", "nama": "Tim", "harga_bulanan": 99000, "harga_tahunan": 990000},
]

# Localized copy (deskripsi + fitur) per plan id.
PLAN_TEXT: dict[str, dict[str, dict]] = {
    "id": {
        "free": {
            "deskripsi": "Coba Pitchly tanpa biaya.",
            "fitur": [
                "2 sesi latihan (total)",
                "Panel juri multi-persona",
                "Mode individu · tanya jawab",
                "Scorecard & rencana perbaikan",
            ],
        },
        "pro": {
            "deskripsi": "Untuk peserta serius yang berlatih rutin.",
            "fitur": [
                "Sesi latihan tak terbatas",
                "Fase presentasi + berbagi layar",
                "Semua kategori kompetisi & akademik",
                "Kalibrasi pasca-kompetisi",
                "Cek orisinalitas via pencarian web",
                "Analisis pola kelemahan lintas sesi",
            ],
        },
        "tim": {
            "deskripsi": "Untuk tim kompetisi & unit kemahasiswaan.",
            "fitur": [
                "Semua fitur Pro",
                "Mode simulasi tim (lintas peran)",
                "Kelola anggota tim",
                "Prioritas dukungan",
            ],
        },
    },
    "en": {
        "free": {
            "deskripsi": "Try Pitchly at no cost.",
            "fitur": [
                "2 practice sessions (total)",
                "Multi-persona judge panel",
                "Individual mode · Q&A",
                "Scorecard & improvement plan",
            ],
        },
        "pro": {
            "deskripsi": "For serious contestants who practice regularly.",
            "fitur": [
                "Unlimited practice sessions",
                "Presentation phase + screen sharing",
                "All competition & academic categories",
                "Post-competition calibration",
                "Originality check via web search",
                "Recurring-weakness analysis across sessions",
            ],
        },
        "tim": {
            "deskripsi": "For competition teams & student units.",
            "fitur": [
                "Everything in Pro",
                "Team simulation mode (cross-role)",
                "Manage team members",
                "Priority support",
            ],
        },
    },
}

PLAN_IDS = {p["id"] for p in PLAN_PRICING}


def plan_catalog(lang: str = "id") -> list[dict]:
    """Assemble the pricing catalog with localized copy."""
    text = PLAN_TEXT.get(lang, PLAN_TEXT["id"])
    return [
        {**p, "deskripsi": text[p["id"]]["deskripsi"], "fitur": text[p["id"]]["fitur"]}
        for p in PLAN_PRICING
    ]


# Backward-compatible default (Indonesian) for any importer expecting a list.
PLAN_CATALOG = plan_catalog("id")


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
