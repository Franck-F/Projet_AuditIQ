import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.main import create_app


@pytest.fixture
async def client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "c@acme.fr",
        },
    )
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c
    await eng.dispose()


async def test_dashboard_summary_requires_auth(client):
    r = await client.get("/api/v1/dashboard/summary")
    assert r.status_code == 401


async def test_dashboard_summary_empty_ok(client):
    r = await client.get(
        "/api/v1/dashboard/summary", headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total_audits"] == 0
    assert body["risk_score"] == 0
    assert body["recent_audits"] == []
    assert body["module_usage"] == {}
