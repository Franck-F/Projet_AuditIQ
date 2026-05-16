import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations.storage import MemoryStorage
from app.main import create_app
from app.routers.datasets import get_storage_dep


@pytest.fixture
async def client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()

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
    app.dependency_overrides[get_storage_dep] = lambda: store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c
    await eng.dispose()


async def test_upload_dataset(client):
    files = {"file": ("d.csv", b"genre,decision\nH,oui\nF,non\n", "text/csv")}
    r = await client.post(
        "/api/v1/datasets", files=files, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["row_count"] == 2
    assert body["columns"] == ["genre", "decision"]
    did = body["id"]
    g = await client.get(
        f"/api/v1/datasets/{did}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["id"] == did


async def test_upload_requires_auth(client):
    files = {"file": ("d.csv", b"a,b\n1,2\n", "text/csv")}
    r = await client.post("/api/v1/datasets", files=files)
    assert r.status_code == 401
