import httpx


class WebSearchError(Exception):
    """Raised when the web search request is unavailable or fails."""


class TavilySearch:
    """Minimal Tavily web-search client (https://tavily.com)."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def search(self, query: str, k: int = 5) -> list[dict]:
        """Return up to k results as [{title, url, content}]."""
        try:
            with httpx.Client(timeout=20.0) as client:
                res = client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self._api_key,
                        "query": query,
                        "max_results": k,
                        "search_depth": "basic",
                    },
                )
                if res.status_code >= 400:
                    # Surface Tavily's own error body (bad key, quota, etc).
                    body = res.text[:300]
                    raise WebSearchError(
                        f"Tavily HTTP {res.status_code}: {body}"
                    )
                data = res.json()
        except httpx.TimeoutException as exc:
            raise WebSearchError(f"Tavily timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise WebSearchError(f"Permintaan web search gagal: {exc}") from exc

        results = data.get("results") or []
        return [
            {
                "title": str(r.get("title", "")).strip(),
                "url": str(r.get("url", "")).strip(),
                "content": str(r.get("content", "")).strip(),
            }
            for r in results
            if r.get("content")
        ]
