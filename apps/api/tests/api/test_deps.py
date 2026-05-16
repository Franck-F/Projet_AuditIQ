import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, make_engine
from app.core.errors import AuthError
from app.models import Organization, User


@pytest.fixture
async def sm(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'd.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(eng, expire_on_commit=False)
    await eng.dispose()


def test_bearer_parsing():
    with pytest.raises(AuthError):
        deps._bearer(None)
    with pytest.raises(AuthError):
        deps._bearer("Token abc")
    assert deps._bearer("Bearer abc") == "abc"


async def test_provision_creates_one_org_and_user(sm):
    uid = uuid.uuid4()
    async with sm() as s:
        user = await deps._provision(s, uid, "alice@acme.fr")
        assert user.org_id is not None
        assert user.role == "owner"
    async with sm() as s:
        orgs = (
            await s.execute(select(func.count()).select_from(Organization))
        ).scalar_one()
        users = (
            await s.execute(select(func.count()).select_from(User))
        ).scalar_one()
        assert orgs == 1
        assert users == 1
