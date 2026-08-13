import json
import re

from pydantic import ValidationError

from app.agents.safety import SAFETY_NOTICE, sanitize
from app.llm.client import LLMClient
from app.schemas.analysis import Finding

SYSTEM_PROMPT = (
    "Anda adalah juri kompetisi berpengalaman yang menganalisis proposal/pitch "
    "deck peserta. Tugas Anda menemukan kelemahan substantif sebelum sesi tanya "
    "jawab. Fokus pada tiga bagian: problem_statement (kejelasan & urgensi "
    "masalah), kelayakan_teknis (apakah solusi realistis dibangun), dan dampak "
    "(manfaat & skalabilitas). Nada presisi dan membumi, tanpa hiperbola.\n"
    + SAFETY_NOTICE
)

USER_TEMPLATE = """Analisis dokumen berikut dan kembalikan MINIMAL 3 temuan kelemahan.

Balas HANYA dalam format JSON valid dengan struktur:
{{
  "findings": [
    {{
      "bagian": "problem_statement" | "kelayakan_teknis" | "dampak",
      "temuan": "penjelasan kelemahan yang konkret",
      "rujukan": "parafrase bagian dokumen yang dirujuk",
      "kutipan": "potongan kalimat PERSIS dari dokumen (verbatim, <=160 karakter)",
      "severity": "rendah" | "sedang" | "tinggi"
    }}
  ]
}}

Setiap temuan WAJIB menyebut bagian dokumen yang dirujuk pada field "rujukan".
Field "kutipan" HARUS disalin kata demi kata dari dokumen (jangan diparafrasekan)
agar bisa ditemukan kembali; bila tak ada kalimat yang cocok, isi string kosong.
Sertakan minimal satu temuan untuk masing-masing dari tiga bagian bila relevan.

=== DOKUMEN ===
{document}
=== AKHIR DOKUMEN ==="""


class AnalysisError(Exception):
    """Raised when the LLM response cannot be parsed into findings."""


def _parse_findings(raw: str) -> list[Finding]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AnalysisError(f"Respons bukan JSON valid: {exc}") from exc

    items = data.get("findings") if isinstance(data, dict) else data
    if not isinstance(items, list) or len(items) < 3:
        raise AnalysisError("Analisis harus menghasilkan minimal 3 temuan")

    try:
        return [Finding.model_validate(item) for item in items]
    except ValidationError as exc:
        raise AnalysisError(f"Struktur temuan tidak valid: {exc}") from exc


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _locate_page(kutipan: str, pages: list[str]) -> int | None:
    """Find the 1-indexed page whose text contains the verbatim snippet."""
    needle = _normalize(kutipan)
    if len(needle) < 12:  # too short to match reliably
        return None
    for idx, page in enumerate(pages, start=1):
        if needle in _normalize(page):
            return idx
    return None


def analyze_document(
    text: str, client: LLMClient, pages: list[str] | None = None
) -> list[Finding]:
    if not text.strip():
        raise AnalysisError("Dokumen kosong, tidak ada teks untuk dianalisis")
    # Cap payload to keep latency/token use bounded (~15 pages). Neutralize any
    # injection markers embedded in the document before feeding it to the LLM.
    document = sanitize(text, 24000)
    raw = client.complete(
        USER_TEMPLATE.format(document=document),
        system=SYSTEM_PROMPT,
        json_mode=True,
    )
    findings = _parse_findings(raw)

    # Attribute each verbatim quote to its page for clickable citations.
    if pages:
        for f in findings:
            if f.kutipan:
                f.halaman = _locate_page(f.kutipan, pages)
    return findings
