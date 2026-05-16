import uuid

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.main import create_app


@pytest.fixture
async def app_client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'app.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps,
        "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "claire@acme.fr",
        },
    )

    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
        yield client
    await eng.dispose()


async def test_health_ok(app_client):
    r = await app_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_me_requires_auth(app_client):
    r = await app_client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["title"] == "Unauthorized"


async def test_me_provisions_then_is_idempotent(app_client):
    r = await app_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "claire@acme.fr"
    assert body["role"] == "owner"
    assert uuid.UUID(body["id"]) == uuid.UUID(
        "11111111-1111-1111-1111-111111111111"
    )
    r2 = await app_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer x"}
    )
    assert r2.status_code == 200
    assert r2.json()["org_id"] == body["org_id"]


async def test_me_rejects_invalid_token(tmp_path, monkeypatch):
    from app.core.errors import AuthError

    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'inv.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)

    async def _session_override():
        async with sm() as s:
            yield s

    def _raise(token, *, key, issuer=None):
        raise AuthError("Jeton invalide ou expiré.")

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(deps, "verify_token", _raise)

    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
        r = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer bad"}
        )
    assert r.status_code == 401
    assert r.json()["title"] == "Unauthorized"
    assert r.headers["content-type"].startswith("application/problem+json")
    await eng.dispose()
