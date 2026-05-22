import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate, M1MetricsOut
from app.services import audit_service
from app.services.dataset_service import create_dataset


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()
    async with sm() as s:
        org = Organization(name="acme")
        s.add(org)
        await s.flush()
        user = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(user)
        await s.commit()
        org_id, uid = org.id, user.id

    async def _upload(session, org_id, user_id, raw: bytes):
        return await create_dataset(
            session, store, org_id=org_id, user_id=user_id,
            filename="data.csv", raw=raw, retention_days=30,
        )

    yield sm, org_id, uid, _upload, store
    await eng.dispose()


async def test_run_m1_audit_with_ground_truth_roundtrip(ctx):
    sm, org_id, user_id, upload, store = ctx
    # Both groups have real positives AND real negatives so EO + EOdds computable
    csv = (
        "genre,embauche,reel\n"
        + "homme,oui,oui\n" * 20 + "homme,non,non\n" * 10
        + "homme,oui,non\n" * 5 + "homme,non,oui\n" * 5
        + "femme,oui,oui\n" * 10 + "femme,non,non\n" * 5
        + "femme,oui,non\n" * 10 + "femme,non,oui\n" * 15
    ).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        out = await audit_service.run_m1_audit(
            session, store, org_id=org_id, user_id=user_id,
            body=AuditCreate(
                dataset_id=ds.id, title="M1 GT",
                protected_attribute="genre", decision_column="embauche",
                favorable_value="oui", ground_truth_column="reel",
            ),
            llm_provider=None,
        )
    assert out.status == "done"
    assert isinstance(out.metrics, M1MetricsOut)
    assert out.metrics.equal_opportunity_diff is not None
    assert out.metrics.equalized_odds_diff is not None
    async with sm() as session:
        fetched = await audit_service.get_audit(session, out.id,
                                                org_id=org_id)
    assert isinstance(fetched.metrics, M1MetricsOut)
    assert fetched.metrics.equal_opportunity_diff is not None


async def test_run_m1_audit_without_ground_truth_unchanged(ctx):
    sm, org_id, user_id, upload, store = ctx
    csv = ("genre,embauche\n" + "homme,oui\n" * 20 + "homme,non\n" * 20
           + "femme,oui\n" * 10 + "femme,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        out = await audit_service.run_m1_audit(
            session, store, org_id=org_id, user_id=user_id,
            body=AuditCreate(dataset_id=ds.id, title="M1 plain",
                             protected_attribute="genre",
                             decision_column="embauche",
                             favorable_value="oui"),
            llm_provider=None,
        )
    assert out.status == "done"
    assert isinstance(out.metrics, M1MetricsOut)
    assert out.metrics.equal_opportunity_diff is None
    assert out.metrics.equalized_odds_diff is None
