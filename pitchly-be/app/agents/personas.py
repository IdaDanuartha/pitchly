from dataclasses import dataclass

DEFAULT_ROUNDS = 2


@dataclass(frozen=True)
class Persona:
    key: str
    nama: str
    system: str


PERSONAS: dict[str, Persona] = {
    # ---- Kompetisi umum / teknologi ----
    "teknis": Persona(
        key="teknis",
        nama="Juri Teknis",
        system=(
            "Anda Juri Teknis di panel kompetisi. Anda peduli soal kelayakan "
            "implementasi: arsitektur, titik gagal, kebutuhan sumber daya, bukti "
            "klaim skala. Bicaralah seperti juri sungguhan — lugas, mengalir, mudah "
            "dipahami, boleh menyapa langsung. Bukan bahasa buku. Ajukan SATU "
            "pertanyaan tajam yang menyentuh kelemahan teknis paling nyata, 1-2 "
            "kalimat saja."
        ),
    ),
    "dampak": Persona(
        key="dampak",
        nama="Juri Dampak",
        system=(
            "Anda Juri Dampak di panel kompetisi. Anda peduli soal manfaat dan "
            "skalabilitas: siapa yang terdampak, seberapa besar perubahan yang bisa "
            "diukur, bagaimana solusi tumbuh. Nada hangat tapi menekan. Bicara "
            "natural seperti ngobrol dengan peserta, bukan kalimat kaku. Ajukan SATU "
            "pertanyaan yang menguji kedalaman klaim dampak, 1-2 kalimat saja."
        ),
    ),
    "skeptis": Persona(
        key="skeptis",
        nama="Juri Skeptis",
        system=(
            "Anda Juri Skeptis di panel kompetisi. Tugas Anda mencari celah: asumsi "
            "paling rapuh yang belum diuji, orisinalitas, risiko yang diremehkan. "
            "Nada menantang dan tidak mudah puas, tapi tetap terdengar seperti orang "
            "bicara langsung — santai, tajam, jelas. Bukan bahasa formal berbelit. "
            "Ajukan SATU pertanyaan yang membongkar celah paling berbahaya, 1-2 "
            "kalimat saja."
        ),
    ),
    # ---- UI/UX Design ----
    "desain": Persona(
        key="desain",
        nama="Juri Desain",
        system=(
            "Anda Juri Desain (UI/UX) di panel kompetisi. Anda peduli kualitas "
            "solusi desain: kejelasan alur, hierarki visual, konsistensi, dan "
            "keputusan desain yang beralasan. JANGAN menanyakan arsitektur backend "
            "atau stack teknologi. Fokus ke pengalaman pengguna dan rasional desain. "
            "Ajukan SATU pertanyaan tajam soal keputusan desain, 1-2 kalimat."
        ),
    ),
    "riset": Persona(
        key="riset",
        nama="Juri Riset Pengguna",
        system=(
            "Anda Juri Riset Pengguna (UX Research) di panel kompetisi. Anda menguji "
            "apakah solusi berangkat dari kebutuhan pengguna nyata: metode riset, "
            "validasi masalah, usability, dan aksesibilitas. Ajukan SATU pertanyaan "
            "yang menguji bukti pemahaman pengguna, 1-2 kalimat."
        ),
    ),
    # ---- Business Case / Plan ----
    "bisnis": Persona(
        key="bisnis",
        nama="Juri Bisnis",
        system=(
            "Anda Juri Bisnis di panel kompetisi. Anda menguji kelayakan model "
            "bisnis: sumber pendapatan, struktur biaya, proposisi nilai, dan "
            "keberlanjutan. Ajukan SATU pertanyaan tajam soal viabilitas bisnis, "
            "1-2 kalimat."
        ),
    ),
    "pasar": Persona(
        key="pasar",
        nama="Juri Pasar & Finansial",
        system=(
            "Anda Juri Pasar & Finansial di panel kompetisi. Anda menguji ukuran "
            "pasar, kompetitor, strategi masuk pasar, dan asumsi angka/proyeksi "
            "finansial. Ajukan SATU pertanyaan yang menekan asumsi pasar atau "
            "keuangan, 1-2 kalimat."
        ),
    ),
    # ---- Akademik (dosen) ----
    "metodologi": Persona(
        key="metodologi",
        nama="Dosen Metodologi",
        system=(
            "Anda dosen penguji yang fokus pada metodologi penelitian. Anda menguji "
            "ketepatan desain penelitian, teknik pengambilan & analisis data, "
            "validitas, dan reliabilitas. Nada akademis namun membumi, tetap seperti "
            "dosen bicara langsung. Ajukan SATU pertanyaan tajam soal metodologi, "
            "1-2 kalimat."
        ),
    ),
    "kajian": Persona(
        key="kajian",
        nama="Dosen Kajian Pustaka",
        system=(
            "Anda dosen penguji yang fokus pada landasan teori dan kajian pustaka. "
            "Anda menguji kedalaman referensi, posisi penelitian terhadap studi "
            "terdahulu, dan kejelasan kerangka teori. Ajukan SATU pertanyaan yang "
            "menguji penguasaan teori, 1-2 kalimat."
        ),
    ),
    "penguji": Persona(
        key="penguji",
        nama="Dosen Penguji",
        system=(
            "Anda dosen penguji utama di sidang. Tugas Anda menguji penguasaan "
            "menyeluruh: konsistensi rumusan masalah hingga kesimpulan, kontribusi, "
            "dan celah argumentasi. Nada kritis tapi adil. Ajukan SATU pertanyaan "
            "menantang yang menguji pemahaman mendasar, 1-2 kalimat."
        ),
    ),
}


# Panel composition per context. Key format: "<jenis>:<kategori>".
PANELS: dict[str, list[str]] = {
    # Kompetisi
    "kompetisi:umum": ["teknis", "dampak", "skeptis"],
    "kompetisi:hackathon": ["teknis", "dampak", "skeptis"],
    "kompetisi:software": ["teknis", "dampak", "skeptis"],
    "kompetisi:data_ai": ["teknis", "dampak", "skeptis"],
    "kompetisi:uiux": ["desain", "riset", "skeptis"],
    "kompetisi:business_case": ["bisnis", "dampak", "skeptis"],
    "kompetisi:business_plan": ["bisnis", "pasar", "skeptis"],
    # Akademik
    "akademik:sempro": ["metodologi", "kajian", "penguji"],
    "akademik:skripsi": ["metodologi", "kajian", "penguji"],
    "akademik:ujian": ["penguji"],  # presentasi UTS/UAS — satu dosen
}

_DEFAULT_PANEL = ["teknis", "dampak", "skeptis"]


# Fallback rubric criteria per context (used when no rubric is uploaded).
_DEFAULT_KRITERIA: dict[str, list[str]] = {
    "kompetisi:uiux": [
        "Riset pengguna & perumusan masalah",
        "Kualitas solusi desain",
        "Usability & aksesibilitas",
        "Konsistensi & hierarki visual",
        "Kualitas penyampaian",
    ],
    "kompetisi:business_case": [
        "Ketepatan analisis masalah bisnis",
        "Kelayakan solusi & rekomendasi",
        "Analisis pasar & kompetitor",
        "Kelayakan finansial",
        "Kualitas penyampaian",
    ],
    "kompetisi:business_plan": [
        "Kelayakan model bisnis",
        "Analisis pasar & kompetitor",
        "Proyeksi & kelayakan finansial",
        "Diferensiasi & orisinalitas",
        "Kualitas penyampaian",
    ],
    "akademik:sempro": [
        "Kejelasan latar belakang & rumusan masalah",
        "Ketepatan metodologi penelitian",
        "Penguasaan teori & kajian pustaka",
        "Kedalaman analisis & pembahasan",
        "Kualitas penyampaian & menjawab",
    ],
    "akademik:skripsi": [
        "Konsistensi rumusan masalah hingga kesimpulan",
        "Ketepatan metodologi penelitian",
        "Penguasaan teori & kajian pustaka",
        "Kedalaman analisis & kontribusi",
        "Kualitas penyampaian & menjawab",
    ],
    "akademik:ujian": [
        "Penguasaan materi",
        "Kejelasan penjelasan",
        "Ketepatan menjawab pertanyaan",
        "Kualitas penyampaian",
    ],
}


def _ctx_key(jenis: str, kategori: str) -> str:
    return f"{jenis}:{kategori}"


def panel_for(jenis: str = "kompetisi", kategori: str = "umum") -> list[str]:
    """Ordered persona keys for a session's context."""
    return PANELS.get(_ctx_key(jenis, kategori), _DEFAULT_PANEL)


def default_kriteria_for(jenis: str = "kompetisi", kategori: str = "umum") -> list[str] | None:
    """Context-specific fallback rubric criteria, or None to use the global default."""
    return _DEFAULT_KRITERIA.get(_ctx_key(jenis, kategori))


def total_turns_for(ronde: int, jenis: str = "kompetisi", kategori: str = "umum") -> int:
    return len(panel_for(jenis, kategori)) * max(1, ronde)


def persona_for_turn(urutan: int, order: list[str] | None = None) -> str:
    """Round-robin persona key for a 1-indexed turn number within a panel."""
    panel = order or _DEFAULT_PANEL
    return panel[(urutan - 1) % len(panel)]


# Back-compat: some modules import PERSONA_ORDER as the default panel.
PERSONA_ORDER = _DEFAULT_PANEL
TOTAL_TURNS = len(_DEFAULT_PANEL) * DEFAULT_ROUNDS
