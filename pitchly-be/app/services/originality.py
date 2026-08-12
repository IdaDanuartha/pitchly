import math
from dataclasses import dataclass

from app.llm.client import LLMClient
from app.services.web_search import TavilySearch
from app.vector.base import Embedder, VectorStore


@dataclass
class SimilarSolution:
    nama: str
    deskripsi: str
    skor_kemiripan: int  # 0..100
    url: str | None = None
    sumber: str = "korpus"  # "korpus" | "web"


def _similarity_from_cosine_distance(distance: float) -> int:
    # Chroma cosine distance ∈ [0, 2]; similarity = 1 - distance, clamped.
    sim = max(0.0, min(1.0, 1.0 - distance))
    return round(sim * 100)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def find_similar(
    text: str, embedder: Embedder, store: VectorStore, k: int = 5
) -> list[SimilarSolution]:
    """Semantic match against the local seeded corpus (offline fallback)."""
    snippet = text.strip()[:4000]
    if not snippet:
        return []
    if store.count() == 0:
        return []
    vector = embedder.embed([snippet])[0]
    hits = store.query(vector, k)
    return [
        SimilarSolution(
            nama=str(h.metadata.get("nama", "")),
            deskripsi=str(h.metadata.get("deskripsi", "")),
            skor_kemiripan=_similarity_from_cosine_distance(h.distance),
        )
        for h in hits
    ]


_QUERY_SYSTEM = (
    "Anda meringkas ide produk menjadi satu kueri pencarian singkat (maksimal 12 "
    "kata) untuk menemukan solusi/produk sejenis yang sudah ada di pasar. Balas "
    "hanya kuerinya, tanpa tanda kutip."
)


def _extract_query(text: str, client: LLMClient) -> str:
    try:
        q = client.complete(
            f"Ide produk:\n{text[:2000]}\n\nKueri pencarian:",
            system=_QUERY_SYSTEM,
        ).strip()
        return q[:200] or text[:120]
    except Exception:
        return text[:120]


def find_similar_web(
    text: str,
    embedder: Embedder,
    search: TavilySearch,
    client: LLMClient,
    k: int = 5,
) -> list[SimilarSolution]:
    """Real existing-solution check: search the web, then rank results by
    semantic similarity to the proposal."""
    snippet = text.strip()[:4000]
    if not snippet:
        return []
    query = _extract_query(snippet, client)
    results = search.search(query, k)
    if not results:
        return []

    contents = [r["content"][:1000] for r in results]
    vectors = embedder.embed([snippet] + contents)
    base, rest = vectors[0], vectors[1:]

    matches = [
        SimilarSolution(
            nama=r["title"] or r["url"] or "Solusi serupa",
            deskripsi=r["content"][:300],
            skor_kemiripan=round(max(0.0, min(1.0, _cosine(base, v))) * 100),
            url=r["url"] or None,
            sumber="web",
        )
        for r, v in zip(results, rest)
    ]
    matches.sort(key=lambda m: m.skor_kemiripan, reverse=True)
    return matches
