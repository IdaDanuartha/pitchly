from app.vector.base import QueryHit, VectorError

COLLECTION = "solusi_pasar"


class ChromaStore:
    def __init__(self, persist_dir: str) -> None:
        self.persist_dir = persist_dir
        self._collection = None

    def _get(self):
        if self._collection is None:
            try:
                import chromadb

                client = chromadb.PersistentClient(path=self.persist_dir)
                self._collection = client.get_or_create_collection(
                    name=COLLECTION, metadata={"hnsw:space": "cosine"}
                )
            except Exception as exc:  # noqa: BLE001
                raise VectorError(f"Chroma tidak tersedia: {exc}") from exc
        return self._collection

    def count(self) -> int:
        return self._get().count()

    def add(
        self, ids: list[str], vectors: list[list[float]], metadatas: list[dict]
    ) -> None:
        self._get().add(ids=ids, embeddings=vectors, metadatas=metadatas)

    def query(self, vector: list[float], k: int) -> list[QueryHit]:
        res = self._get().query(query_embeddings=[vector], n_results=k)
        metadatas = (res.get("metadatas") or [[]])[0]
        distances = (res.get("distances") or [[]])[0]
        return [
            QueryHit(metadata=m, distance=float(d))
            for m, d in zip(metadatas, distances)
        ]
