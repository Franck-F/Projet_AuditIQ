import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, make_engine
from app.models import Organization, User


@pytest.fixture
async def sm(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'p.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(eng, expire_on_commit=False)
    await eng.dispose()


async def test_second_provision_same_uid_recovers(sm):
    uid = uuid.uuid4()
    async with sm() as s1:
        u1 = await deps._provision(s1, uid, "a@acme.fr")
    # Simulates the racing request that lost: same uid already exists.
    async with sm() as s2:
        u2 = await deps._provision(s2, uid, "a@acme.fr")
    assert u1.id == u2.id == uid
    async with sm() as s:
        orgs = (
            await s.execute(select(func.count()).select_from(Organization))
        ).scalar_one()
        users = (
            await s.execute(select(func.count()).select_from(User))
        ).scalar_one()
        assert orgs == 1  # the loser's orphan org was rolled back
        assert users == 1
