from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_hash_differs_and_verifies():
    h = hash_password("rahasia123")
    assert h != "rahasia123"
    assert verify_password("rahasia123", h) is True
    assert verify_password("salah", h) is False


def test_token_roundtrip():
    token = create_access_token("user-42")
    assert decode_token(token) == "user-42"


def test_tampered_token_returns_none():
    assert decode_token("not.a.jwt") is None
