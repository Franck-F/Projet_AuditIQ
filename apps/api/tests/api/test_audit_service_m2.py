import io
import uuid

import numpy as np
import pandas as pd
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.schemas.audit import AuditCreate, M2MetricsOut
from app.services import audit_service
from app.services.dataset_service import create_dataset


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


def _csv() -> bytes:
    rng = np.random.default_rng(42)
    a = pd.DataFrame({"f1": rng.normal(-5, 0.5, 120),
                      "f2": rng.normal(-5, 0.5, 120),
                      "embauche": (["oui"] * 108) + (["non"] * 12)})
    b = pd.DataFrame({"f1": rng.normal(5, 0.5, 120),
                      "f2": rng.normal(5, 0.5, 120),
                      "embauche": (["oui"] * 12) + (["non"] * 108)})
    buf = io.BytesIO()
    pd.concat([a, b], ignore_index=True).to_csv(buf, index=False)
    return buf.getvalue()


async def test_run_m2_audit_persists_and_returns(ctx):
    sm, org_id, user_id = ctx
    store = MemoryStorage()
    async with sm() as session:
        dataset = await create_dataset(
            session, store, org_id=org_id, user_id=user_id,
            filename="r.csv", raw=_csv(), retention_days=30,
        )
        body = AuditCreate(
            dataset_id=dataset.id, title="Smoke M2", module="M2",
            decision_column="embauche", favorable_value="oui",
            config={"k": 2},
        )
        pending = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id, body=body,
            llm_provider=None,
        )
        audit = await audit_service._load_audit(session, pending.id)
        await audit_service.compute_m2_audit(
            session, audit, body, storage=store, llm_provider=None,
        )
        await session.commit()
        out = await audit_service.get_audit(session, pending.id, org_id=org_id)
    assert out.module == "M2"
    assert out.status == "done"
    assert isinstance(out.metrics, M2MetricsOut)
    assert out.metrics.verdict == "fail"
    assert out.interpretation is not None
    assert out.interpretation.provider == "fallback"

    async with sm() as session:
        fetched = await audit_service.get_audit(session, out.id, org_id=org_id)
    assert isinstance(fetched.metrics, M2MetricsOut)
    assert fetched.module == "M2"
