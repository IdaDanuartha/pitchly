import io

from pypdf import PdfReader


def extract_pages(data: bytes) -> list[str]:
    """Extract text per page from a PDF byte payload (1-indexed by list order)."""
    reader = PdfReader(io.BytesIO(data))
    return [page.extract_text() or "" for page in reader.pages]


def extract_text(data: bytes) -> str:
    """Extract concatenated text from a PDF byte payload."""
    return "\n".join(extract_pages(data)).strip()
