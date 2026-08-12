from app.llm.base import LLMError


class OpenAIProvider:
    def __init__(self, api_key: str, model: str, timeout: float = 30.0) -> None:
        self.api_key = api_key
        self.model = model
        self.name = f"openai:{model}"
        self.timeout = timeout
        self._client = None

    def _get_client(self):
        if self._client is None:
            # Imported lazily so tests / fallback paths don't require the SDK.
            from openai import OpenAI

            self._client = OpenAI(api_key=self.api_key, timeout=self.timeout)
        return self._client

    def complete(
        self, prompt: str, *, system: str | None = None, json_mode: bool = False
    ) -> str:
        from openai import OpenAIError

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs: dict = {"model": self.model, "messages": messages}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            resp = self._get_client().chat.completions.create(**kwargs)
        except OpenAIError as exc:
            # Wrap every OpenAI failure (timeout, rate limit, auth, bad model,
            # 5xx) so the client can fall back to the secondary provider.
            raise LLMError(f"OpenAI failure: {exc}") from exc

        return resp.choices[0].message.content or ""
