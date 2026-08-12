"""Seed the originality corpus at container start. Safe to run repeatedly."""

from app.core.config import settings
from app.vector.base import VectorError
from app.vector.chroma_store import ChromaStore
from app.vector.openai_embedder import OpenAIEmbedder
from app.vector.seed import seed


def main() -> None:
    if not settings.openai_api_key:
        print("Seed orisinalitas dilewati: OPENAI_API_KEY belum diatur.")
        return
    embedder = OpenAIEmbedder(settings.openai_api_key, settings.embedding_model)
    store = ChromaStore(settings.chroma_dir)
    try:
        n = seed(embedder, store)
    except VectorError as exc:
        print(f"Seed orisinalitas gagal (dilewati): {exc}")
        return
    if n:
        print(f"Seed orisinalitas: {n} solusi terindeks.")
    else:
        print("Seed orisinalitas: korpus sudah terisi, dilewati.")


if __name__ == "__main__":
    main()
