import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate
from app.services import audit_service, dashboard_service, dataset_service


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'd.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="acme")
        s.add(org)
        await s.flush()
        u = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(u)
        await s.commit()
        oid, uid = org.id, u.id
    yield sm, oid, uid
    await eng.dispose()


def _csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["H,oui"] * 100 + ["H,non"] * 100 + ["F,oui"] * 72 + ["F,non"] * 128
    return ("\n".join(rows) + "\n").encode()


async def test_summary_aggregates_org_audits(ctx):
    sm, oid, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=oid, user_id=uid, filename="r.csv",
            raw=_csv(), retention_days=30,
        )
        body = AuditCreate(dataset_id=ds.id, title="R1",
                             protected_attribute="genre",
                             decision_column="decision",
                             favorable_value="oui")
        pending = await audit_service.submit_audit(
            s, org_id=oid, user_id=uid, body=body, llm_provider=None,
        )
        audit = await audit_service._load_audit(s, pending.id)
        await audit_service.compute_m1_audit(
            s, audit, body, storage=store, llm_provider=None,
        )
        await s.commit()
        summary = await dashboard_service.get_summary(s, org_id=oid)
    assert summary.total_audits == 1
    assert summary.failing_audits == 1
    assert summary.module_usage == {"M1": 1}
    assert 0 <= summary.risk_score <= 100
    assert len(summary.recent_audits) == 1
    assert summary.recent_audits[0].verdict == "fail"


async def test_summary_is_org_scoped(ctx):
    sm, oid, uid = ctx
    async with sm() as s:
        summary = await dashboard_service.get_summary(s, org_id=uuid.uuid4())
    assert summary.total_audits == 0
    assert summary.risk_score == 0
    assert summary.recent_audits == []
