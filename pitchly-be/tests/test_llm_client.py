import logging

import pytest

from app.llm.base import LLMError
from app.llm.client import LLMClient


class StubProvider:
    def __init__(self, name, *, fail=False, response="ok"):
        self.name = name
        self.fail = fail
        self.response = response
        self.calls = 0

    def complete(self, prompt, *, system=None, json_mode=False):
        self.calls += 1
        if self.fail:
            raise LLMError(f"{self.name} down")
        return self.response


def test_primary_success():
    primary = StubProvider("openai", response="from-gpt")
    fallback = StubProvider("gemini")
    client = LLMClient(primary, [fallback])
    assert client.complete("hi") == "from-gpt"
    assert client.last_model_used == "openai"
    assert fallback.calls == 0


def test_fallback_after_two_primary_failures(caplog):
    primary = StubProvider("openai", fail=True)
    fallback = StubProvider("gemini", response="from-gemini")
    client = LLMClient(primary, [fallback])
    with caplog.at_level(logging.WARNING):
        assert client.complete("hi") == "from-gemini"
    assert primary.calls == 2  # retried once
    assert client.last_model_used == "gemini"
    assert any("Falling back" in r.message for r in caplog.records)


def test_multiple_fallbacks_tried_in_order():
    primary = StubProvider("openai", fail=True)
    fb1 = StubProvider("gemini:a", fail=True)
    fb2 = StubProvider("gemini:b", response="from-b")
    client = LLMClient(primary, [fb1, fb2])
    assert client.complete("hi") == "from-b"
    assert fb1.calls == 1
    assert fb2.calls == 1
    assert client.last_model_used == "gemini:b"


def test_all_fail_raises():
    primary = StubProvider("openai", fail=True)
    fb1 = StubProvider("gemini:a", fail=True)
    fb2 = StubProvider("gemini:b", fail=True)
    client = LLMClient(primary, [fb1, fb2])
    with pytest.raises(LLMError):
        client.complete("hi")
