import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations.storage import MemoryStorage
from app.main import create_app
from app.routers.datasets import get_storage_dep


def _recruitment_csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["Hommes,oui"] * 100 + ["Hommes,non"] * 100
    rows += ["Femmes,oui"] * 72 + ["Femmes,non"] * 128
    return ("\n".join(rows) + "\n").encode()


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


async def _upload(client) -> str:
    files = {"file": ("r.csv", _recruitment_csv(), "text/csv")}
    r = await client.post(
        "/api/v1/datasets", files=files, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 201
    return r.json()["id"]


async def test_run_audit_end_to_end(client):
    did = await _upload(client)
    r = await client.post(
        "/api/v1/audits",
        json={
            "dataset_id": did,
            "title": "Recrutement Q2",
            "protected_attribute": "genre",
            "decision_column": "decision",
            "favorable_value": "oui",
        },
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "done"
    assert body["metrics"]["verdict"] == "fail"
    assert body["metrics"]["disparate_impact"] == 0.72
    assert body["metrics"]["risk_score"] == 55
    aid = body["id"]
    g = await client.get(
        f"/api/v1/audits/{aid}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["metrics"]["worst_group"] == "Femmes"


async def test_run_audit_bad_mapping_returns_422_problem(client):
    did = await _upload(client)
    r = await client.post(
        "/api/v1/audits",
        json={
            "dataset_id": did,
            "title": "Bad",
            "protected_attribute": "ABSENT",
            "decision_column": "decision",
            "favorable_value": "oui",
        },
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 422
    assert r.json()["title"] == "Dataset Validation Error"
    assert r.headers["content-type"].startswith("application/problem+json")
