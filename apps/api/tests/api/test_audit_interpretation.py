import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate
from app.services import audit_service, dataset_service


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'i.db'}")
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


async def test_audit_persists_fallback_interpretation(ctx):
    sm, oid, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=oid, user_id=uid, filename="r.csv",
            raw=_csv(), retention_days=30,
        )
        body = AuditCreate(dataset_id=ds.id, title="R",
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
        out = await audit_service.get_audit(s, pending.id, org_id=oid)
        aid = out.id
    assert out.interpretation is not None
    assert out.interpretation.provider == "fallback"
    assert out.interpretation.disclaimers
    async with sm() as s:
        got = await audit_service.get_audit(s, aid, org_id=oid)
        assert got.interpretation is not None
        assert got.interpretation.provider == "fallback"
