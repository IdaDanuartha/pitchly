from app.vector.base import VectorError


class OpenAIEmbedder:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self.api_key:
            raise VectorError("Kunci OpenAI belum diatur; embedding tidak tersedia")
        from openai import OpenAI, OpenAIError

        client = OpenAI(api_key=self.api_key)
        try:
            resp = client.embeddings.create(model=self.model, input=texts)
        except OpenAIError as exc:
            raise VectorError(f"Embedding gagal: {exc}") from exc
        return [item.embedding for item in resp.data]
