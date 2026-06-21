"""End-to-end tests for archive / unarchive / delete of audits (apps/api).

Storage is the in-process MemoryStorage; the auth layer is monkeypatched as in
the sibling router tests. Covers: archive hides from the dashboard summary
(list + KPI) and surfaces under GET /audits?archived=true; unarchive reverses
it; delete cascades (Report / AuditResult / Audit / Dataset) and returns 204;
delete by a non-admin is 403; delete of another org's audit is 404.
"""
import uuid as _uuid

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations.storage import MemoryStorage
from app.main import create_app
from app.models import Audit, AuditResult, Dataset, Organization, Report, User
from app.routers.audits import get_report_storage_dep
from app.routers.datasets import get_storage_dep
from app.schemas.audit import AuditCreate
from app.services import audit_service

_USER_ID = "11111111-1111-1111-1111-111111111111"


def _recruitment_csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["Hommes,oui"] * 100 + ["Hommes,non"] * 100
    rows += ["Femmes,oui"] * 72 + ["Femmes,non"] * 128
    return ("\n".join(rows) + "\n").encode()


@pytest.fixture
async def ctx(tmp_path, monkeypatch):
    """Yield (client, sm, store, report_store) with auth patched.

    The signed-in user resolves to ``_USER_ID``; ``get_current_user`` will
    provision it as the org's ``owner`` on first request (default role).
    """
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()
    report_store = MemoryStorage()

    import app.services.audit_service as _svc
    monkeypatch.setattr(_svc, "get_storage", lambda: store)

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": _USER_ID,
            "email": "c@acme.fr",
        },
    )
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_storage_dep] = lambda: store
    app.dependency_overrides[get_report_storage_dep] = lambda: report_store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c, sm, store, report_store
    await eng.dispose()


_H = {"Authorization": "Bearer x"}


async def _upload(client) -> str:
    files = {"file": ("r.csv", _recruitment_csv(), "text/csv")}
    r = await client.post("/api/v1/datasets", files=files, headers=_H)
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_completed_audit(client, sm, did: str) -> str:
    """POST an M1 audit and drive its background job to completion."""
    import app.routers.audits as _r

    post_json = {
        "dataset_id": did,
        "title": "Recrutement",
        "protected_attribute": "genre",
        "decision_column": "decision",
        "favorable_value": "oui",
    }
    captured: list = []
    _real = _r.asyncio.create_task

    async def _noop() -> None:
        return None

    def _shim(coro):
        captured.append(coro)
        return _real(_noop())

    _r.asyncio.create_task = _shim  # type: ignore[assignment]
    try:
        r = await client.post("/api/v1/audits", json=post_json, headers=_H)
    finally:
        _r.asyncio.create_task = _real  # type: ignore[assignment]
    assert r.status_code == 202, r.text
    audit_id = r.json()["id"]

    audit_service._audit_semaphore = None
    for coro in captured:
        coro.close()
    await audit_service.run_audit_job(
        _uuid.UUID(audit_id), AuditCreate(**post_json), None, session_maker=sm
    )
    return audit_id


# ---------------------------------------------------------------------------
# Archive / unarchive
# ---------------------------------------------------------------------------

async def test_archive_hides_from_dashboard_and_lists_under_archived(ctx):
    client, sm, _store, _rstore = ctx
    did = await _upload(client)
    audit_id = await _create_completed_audit(client, sm, did)

    # Baseline: dashboard counts it, list?archived=false shows it.
    s = await client.get("/api/v1/dashboard/summary", headers=_H)
    assert s.json()["total_audits"] == 1
    assert s.json()["failing_audits"] == 1
    assert len(s.json()["recent_audits"]) == 1

    active = await client.get("/api/v1/audits", headers=_H)
    assert active.status_code == 200
    assert [a["id"] for a in active.json()] == [audit_id]
    assert active.json()[0]["verdict"] == "fail"
    assert active.json()[0]["archived_at"] is None

    archived = await client.get("/api/v1/audits?archived=true", headers=_H)
    assert archived.json() == []

    # Archive it.
    p = await client.patch(
        f"/api/v1/audits/{audit_id}", json={"archived": True}, headers=_H
    )
    assert p.status_code == 200, p.text
    assert p.json()["archived_at"] is not None

    # Gone from dashboard (list AND KPI).
    s2 = await client.get("/api/v1/dashboard/summary", headers=_H)
    assert s2.json()["total_audits"] == 0
    assert s2.json()["failing_audits"] == 0
    assert s2.json()["module_usage"] == {}
    assert s2.json()["recent_audits"] == []

    # Gone from active list, present under archived.
    active2 = await client.get("/api/v1/audits", headers=_H)
    assert active2.json() == []
    arch2 = await client.get("/api/v1/audits?archived=true", headers=_H)
    assert [a["id"] for a in arch2.json()] == [audit_id]


async def test_unarchive_restores(ctx):
    client, sm, _store, _rstore = ctx
    did = await _upload(client)
    audit_id = await _create_completed_audit(client, sm, did)

    await client.patch(
        f"/api/v1/audits/{audit_id}", json={"archived": True}, headers=_H
    )
    p = await client.patch(
        f"/api/v1/audits/{audit_id}", json={"archived": False}, headers=_H
    )
    assert p.status_code == 200
    assert p.json()["archived_at"] is None

    s = await client.get("/api/v1/dashboard/summary", headers=_H)
    assert s.json()["total_audits"] == 1
    active = await client.get("/api/v1/audits", headers=_H)
    assert [a["id"] for a in active.json()] == [audit_id]


async def test_patch_other_org_audit_is_404(ctx):
    client, sm, _store, _rstore = ctx
    # Seed an audit in a different org.
    async with sm() as s:
        org = Organization(name="other")
        s.add(org)
        await s.flush()
        u = User(id=_uuid.uuid4(), org_id=org.id, email="x@other.fr")
        s.add(u)
        await s.flush()
        a = Audit(
            org_id=org.id, module="M1", title="foreign", status="done",
            created_by=u.id,
        )
        s.add(a)
        await s.commit()
        foreign_id = a.id

    p = await client.patch(
        f"/api/v1/audits/{foreign_id}", json={"archived": True}, headers=_H
    )
    assert p.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

async def test_delete_cascades_and_returns_204(ctx):
    client, sm, _store, report_store = ctx
    did = await _upload(client)
    audit_id = await _create_completed_audit(client, sm, did)

    # Build a report (xlsx) so a Report row + file exist before deletion.
    rep = await client.get(
        f"/api/v1/audits/{audit_id}/report.xlsx", headers=_H
    )
    assert rep.status_code == 200, rep.text

    async with sm() as s:
        report_paths = (
            await s.execute(
                select(Report.storage_path).where(
                    Report.audit_id == _uuid.UUID(audit_id)
                )
            )
        ).scalars().all()
        assert report_paths
        ds = (
            await s.execute(select(Dataset).where(Dataset.id == _uuid.UUID(did)))
        ).scalar_one()
        dataset_path = ds.storage_path
    for p in report_paths:
        assert p in report_store._blobs
    assert dataset_path in _store._blobs

    d = await client.delete(f"/api/v1/audits/{audit_id}", headers=_H)
    assert d.status_code == 204

    # GET now 404.
    g = await client.get(f"/api/v1/audits/{audit_id}", headers=_H)
    assert g.status_code == 404

    # DB rows gone.
    async with sm() as s:
        assert (
            await s.execute(
                select(Audit).where(Audit.id == _uuid.UUID(audit_id))
            )
        ).scalar_one_or_none() is None
        assert (
            await s.execute(
                select(AuditResult).where(
                    AuditResult.audit_id == _uuid.UUID(audit_id)
                )
            )
        ).scalar_one_or_none() is None
        assert (
            await s.execute(
                select(Report).where(Report.audit_id == _uuid.UUID(audit_id))
            )
        ).scalar_one_or_none() is None
        assert (
            await s.execute(
                select(Dataset).where(Dataset.id == _uuid.UUID(did))
            )
        ).scalar_one_or_none() is None

    # Storage files removed (best-effort succeeded for MemoryStorage).
    for p in report_paths:
        assert p not in report_store._blobs
    assert dataset_path not in _store._blobs


async def test_delete_by_non_admin_is_403(ctx, monkeypatch):
    client, sm, store, _rstore = ctx
    did = await _upload(client)
    audit_id = await _create_completed_audit(client, sm, did)

    # Demote the signed-in user to a non-admin role.
    async with sm() as s:
        u = (
            await s.execute(select(User).where(User.id == _uuid.UUID(_USER_ID)))
        ).scalar_one()
        u.role = "viewer"
        await s.commit()

    d = await client.delete(f"/api/v1/audits/{audit_id}", headers=_H)
    assert d.status_code == 403

    # Audit untouched.
    g = await client.get(f"/api/v1/audits/{audit_id}", headers=_H)
    assert g.status_code == 200


async def test_delete_other_org_audit_is_404(ctx):
    client, sm, _store, _rstore = ctx
    async with sm() as s:
        org = Organization(name="other")
        s.add(org)
        await s.flush()
        u = User(id=_uuid.uuid4(), org_id=org.id, email="x@other.fr")
        s.add(u)
        await s.flush()
        a = Audit(
            org_id=org.id, module="M1", title="foreign", status="done",
            created_by=u.id,
        )
        s.add(a)
        await s.commit()
        foreign_id = a.id

    # The signed-in user is owner of their own org (admin) — guard passes,
    # but the audit is in another org → 404.
    d = await client.delete(f"/api/v1/audits/{foreign_id}", headers=_H)
    assert d.status_code == 404
