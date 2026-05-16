import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.models import Audit, AuditResult, Dataset, Organization, User


async def test_org_user_roundtrip(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'm.db'}")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="Acme")
        s.add(org)
        await s.flush()
        org_id = org.id
        s.add(User(id=uuid.uuid4(), org_id=org_id, email="a@acme.fr"))
        await s.commit()
    async with sm() as s:
        got = (
            await s.execute(select(User).where(User.email == "a@acme.fr"))
        ).scalar_one()
        assert got.org_id == org_id
        assert got.role == "owner"
    await eng.dispose()


async def test_organization_settings_default(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 's.db'}")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="Acme")
        s.add(org)
        await s.commit()
        oid = org.id
    async with sm() as s:
        got = (
            await s.execute(select(Organization).where(Organization.id == oid))
        ).scalar_one()
        assert got.settings == {
            "llm_provider": "gemini",
            "di_threshold": 0.8,
            "retention_days": 30,
        }
    await eng.dispose()


async def test_full_fk_chain_inserts(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'c.db'}")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        org = Organization(name="Acme")
        s.add(org)
        await s.flush()
        user = User(id=uuid.uuid4(), org_id=org.id, email="b@acme.fr")
        s.add(user)
        await s.flush()
        ds = Dataset(
            org_id=org.id,
            uploaded_by=user.id,
            filename="data.csv",
            storage_path=f"{org.id}/x.csv",
            row_count=10,
        )
        s.add(ds)
        await s.flush()
        audit = Audit(
            org_id=org.id,
            dataset_id=ds.id,
            title="Recrutement",
            protected_attribute="genre",
            decision_column="decision",
            favorable_value="oui",
            created_by=user.id,
        )
        s.add(audit)
        await s.flush()
        s.add(
            AuditResult(
                audit_id=audit.id,
                metrics={"disparate_impact": 0.72},
                verdict="fail",
                risk_score=55,
            )
        )
        await s.commit()
        aid = audit.id
    async with sm() as s:
        res = (
            await s.execute(
                select(AuditResult).where(AuditResult.audit_id == aid)
            )
        ).scalar_one()
        assert res.verdict == "fail"
        assert res.risk_score == 55
        assert res.metrics == {"disparate_impact": 0.72}
        assert res.interpretation == {}
        assert ds.columns == []
        assert ds.status == "ready"
        assert audit.module == "M1"
        assert audit.status == "pending"
    await eng.dispose()
