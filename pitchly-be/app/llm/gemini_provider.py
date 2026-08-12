from app.llm.base import LLMError


class GeminiProvider:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model
        self.name = f"gemini:{model}"
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def complete(
        self, prompt: str, *, system: str | None = None, json_mode: bool = False
    ) -> str:
        from google.genai import errors, types

        config = types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json" if json_mode else "text/plain",
        )
        try:
            resp = self._get_client().models.generate_content(
                model=self.model, contents=prompt, config=config
            )
        except errors.APIError as exc:
            # Treat server/quota errors as transient for the fallback chain.
            raise LLMError(f"Gemini failure: {exc}") from exc

        return resp.text or ""
