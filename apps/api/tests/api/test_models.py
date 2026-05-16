import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.models import Organization, User


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
