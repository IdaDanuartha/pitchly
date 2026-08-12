async def _register(client, email="rangga@primakara.ac.id"):
    return await client.post(
        "/auth/register",
        json={"nama": "Rangga", "email": email, "password": "rahasia123"},
    )


async def test_register_ok(client):
    resp = await _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "rangga@primakara.ac.id"
    assert "password" not in body


async def test_register_duplicate(client):
    await _register(client)
    resp = await _register(client)
    assert resp.status_code == 409


async def test_login_wrong_password(client):
    await _register(client)
    resp = await client.post(
        "/auth/login",
        json={"email": "rangga@primakara.ac.id", "password": "salah"},
    )
    assert resp.status_code == 401


async def test_login_and_me(client):
    await _register(client)
    login = await client.post(
        "/auth/login",
        json={"email": "rangga@primakara.ac.id", "password": "rahasia123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["nama"] == "Rangga"


async def test_me_requires_auth(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


async def test_email_verification_flow(client, monkeypatch):
    import app.api.auth as auth_module
    from app.core.config import settings
    from app.core.security import create_verify_token

    # Simulate Resend enabled; stub the actual email send.
    monkeypatch.setattr(settings, "resend_api_key", "test-key")
    monkeypatch.setattr(auth_module, "send_verification_email", lambda *a, **k: None)

    await client.post(
        "/auth/register",
        json={"nama": "Wulan", "email": "wulan@primakara.ac.id", "password": "rahasia123"},
    )

    # Unverified → login blocked.
    login = await client.post(
        "/auth/login",
        json={"email": "wulan@primakara.ac.id", "password": "rahasia123"},
    )
    assert login.status_code == 403

    # Verify with a valid token.
    token = create_verify_token("wulan@primakara.ac.id")
    verify = await client.post("/auth/verify", json={"token": token})
    assert verify.status_code == 200
    assert verify.json()["email_verified"] is True

    # Now login works.
    login2 = await client.post(
        "/auth/login",
        json={"email": "wulan@primakara.ac.id", "password": "rahasia123"},
    )
    assert login2.status_code == 200


async def test_verify_invalid_token(client):
    resp = await client.post("/auth/verify", json={"token": "bogus"})
    assert resp.status_code == 400


async def test_google_disabled_returns_400(client):
    resp = await client.get("/auth/google/url")
    assert resp.status_code == 400


async def test_google_exchange_creates_user(client, monkeypatch):
    import app.api.auth as auth_module
    from app.core.config import settings

    monkeypatch.setattr(settings, "google_client_id", "cid")
    monkeypatch.setattr(settings, "google_client_secret", "secret")
    monkeypatch.setattr(
        auth_module,
        "exchange_code",
        lambda code: {"sub": "g-123", "email": "rangga@gmail.com", "name": "Rangga"},
    )

    resp = await client.post("/auth/google/exchange", json={"code": "abc"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "rangga@gmail.com"
