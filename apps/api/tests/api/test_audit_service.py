import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.core.errors import NotFoundError
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate
from app.services import audit_service, dataset_service


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="acme")
        s.add(org)
        await s.flush()
        user = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(user)
        await s.commit()
        org_id, uid = org.id, user.id
    yield sm, org_id, uid
    await eng.dispose()


def _recruitment_csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["Hommes,oui"] * 100 + ["Hommes,non"] * 100
    rows += ["Femmes,oui"] * 72 + ["Femmes,non"] * 128
    return ("\n".join(rows) + "\n").encode()


async def test_run_m1_audit_recruitment_fail(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="r.csv",
            raw=_recruitment_csv(), retention_days=30,
        )
        body = AuditCreate(
            dataset_id=ds.id, title="Recrutement",
            protected_attribute="genre", decision_column="decision",
            favorable_value="oui",
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=org_id, user_id=uid, body=body
        )
    assert out.status == "done"
    assert out.metrics is not None
    assert out.metrics.verdict == "fail"
    assert out.metrics.disparate_impact == 0.72
    assert out.metrics.risk_score == 55
    assert out.code is not None and out.code.startswith("AUD-")


async def test_run_m1_audit_numeric_decision_column(ctx):
    # decision column is integer 1/0; favorable_value passed as "1" must match
    sm, org_id, uid = ctx
    store = MemoryStorage()
    rows = ["genre,decision"]
    rows += ["H,1"] * 100 + ["H,0"] * 100 + ["F,1"] * 72 + ["F,0"] * 128
    raw = ("\n".join(rows) + "\n").encode()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="n.csv",
            raw=raw, retention_days=30,
        )
        body = AuditCreate(
            dataset_id=ds.id, title="Num", protected_attribute="genre",
            decision_column="decision", favorable_value="1",
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=org_id, user_id=uid, body=body
        )
    assert out.metrics is not None
    assert out.metrics.disparate_impact == 0.72
    assert out.metrics.verdict == "fail"


async def test_run_m1_audit_invalid_mapping_raises_dataset_validation(ctx):
    from app.audit_engine import DatasetValidationError

    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="r.csv",
            raw=b"genre,decision\nH,oui\nF,non\n", retention_days=30,
        )
        body = AuditCreate(
            dataset_id=ds.id, title="Bad", protected_attribute="ABSENT",
            decision_column="decision", favorable_value="oui",
        )
        with pytest.raises(DatasetValidationError):
            await audit_service.run_m1_audit(
                s, store, org_id=org_id, user_id=uid, body=body
            )


async def test_get_audit_org_scoped(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="r.csv",
            raw=_recruitment_csv(), retention_days=30,
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=org_id, user_id=uid,
            body=AuditCreate(
                dataset_id=ds.id, title="R", protected_attribute="genre",
                decision_column="decision", favorable_value="oui",
            ),
        )
        aid = out.id
    async with sm() as s:
        with pytest.raises(NotFoundError):
            await audit_service.get_audit(s, aid, org_id=uuid.uuid4())
        got = await audit_service.get_audit(s, aid, org_id=org_id)
        assert got.id == aid
        assert got.metrics is not None
