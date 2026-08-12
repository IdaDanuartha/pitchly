from app.api.deps import get_embedder, get_vector_store
from app.main import app
from app.services.originality import find_similar
from app.vector.base import QueryHit, VectorError
from tests.test_sessions import _analyzed_document, _auth_headers


class FakeEmbedder:
    def __init__(self, fail=False):
        self.fail = fail

    def embed(self, texts):
        if self.fail:
            raise VectorError("no key")
        return [[0.1, 0.2, 0.3] for _ in texts]


class FakeStore:
    def __init__(self, hits, count=10):
        self._hits = hits
        self._count = count

    def count(self):
        return self._count

    def add(self, ids, vectors, metadatas):  # pragma: no cover
        pass

    def query(self, vector, k):
        return self._hits[:k]


def test_find_similar_maps_distance_to_score():
    hits = [
        QueryHit(metadata={"nama": "A", "deskripsi": "da"}, distance=0.0),
        QueryHit(metadata={"nama": "B", "deskripsi": "db"}, distance=1.0),
    ]
    out = find_similar("ide saya", FakeEmbedder(), FakeStore(hits))
    assert out[0].skor_kemiripan == 100
    assert out[1].skor_kemiripan == 0
    assert out[0].nama == "A"


def test_find_similar_empty_store():
    out = find_similar("ide", FakeEmbedder(), FakeStore([], count=0))
    assert out == []


async def test_originality_endpoint(client, monkeypatch):
    from app.api.deps import get_llm
    from tests.test_sessions import BranchingLLM

    app.dependency_overrides[get_llm] = lambda: BranchingLLM()
    hits = [QueryHit(metadata={"nama": "Marketplace", "deskripsi": "d"}, distance=0.2)]
    app.dependency_overrides[get_embedder] = lambda: FakeEmbedder()
    app.dependency_overrides[get_vector_store] = lambda: FakeStore(hits)

    monkeypatch.setattr(
        "app.api.documents.extract_text", lambda data: "teks proposal ide"
    )
    headers = await _auth_headers(client, "orig@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)

    res = await client.post(f"/documents/{doc_id}/originality", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["available"] is True
    assert body["matches"][0]["nama"] == "Marketplace"
    assert body["matches"][0]["skor_kemiripan"] == 80

    for dep in (get_embedder, get_vector_store, get_llm):
        app.dependency_overrides.pop(dep, None)


async def test_originality_unavailable(client, monkeypatch):
    from app.api.deps import get_llm
    from tests.test_sessions import BranchingLLM

    app.dependency_overrides[get_llm] = lambda: BranchingLLM()
    app.dependency_overrides[get_embedder] = lambda: FakeEmbedder(fail=True)
    app.dependency_overrides[get_vector_store] = lambda: FakeStore([], count=5)

    monkeypatch.setattr("app.api.documents.extract_text", lambda data: "teks")
    headers = await _auth_headers(client, "orig2@primakara.ac.id")
    doc_id = await _analyzed_document(client, headers, monkeypatch)

    res = await client.post(f"/documents/{doc_id}/originality", headers=headers)
    assert res.status_code == 200
    assert res.json()["available"] is False

    for dep in (get_embedder, get_vector_store, get_llm):
        app.dependency_overrides.pop(dep, None)
