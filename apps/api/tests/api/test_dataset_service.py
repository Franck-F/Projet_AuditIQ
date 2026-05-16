import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.core.errors import APIError
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.services import dataset_service


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
        user = User(id=uuid.uuid4(), org_id=org.id, email="a@acme.fr")
        s.add(user)
        await s.commit()
        org_id, uid = org.id, user.id
    yield sm, org_id, uid
    await eng.dispose()


async def test_create_dataset_persists_and_parses(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid,
            filename="d.csv", raw=b"genre,decision\nH,oui\nF,non\n",
            retention_days=30,
        )
        assert ds.row_count == 2
        assert ds.columns == ["genre", "decision"]
        assert ds.org_id == org_id
        assert ds.expires_at is not None
    assert await store.download(ds.storage_path) == b"genre,decision\nH,oui\nF,non\n"


async def test_create_dataset_rejects_non_csv(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        with pytest.raises(APIError):
            await dataset_service.create_dataset(
                s, store, org_id=org_id, user_id=uid,
                filename="x.csv", raw=b"\x00\x01not a csv", retention_days=30,
            )


async def test_get_dataset_is_org_scoped(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="d.csv",
            raw=b"a,b\n1,2\n", retention_days=30,
        )
        did = ds.id
    other_org = uuid.uuid4()
    async with sm() as s:
        from app.core.errors import NotFoundError
        with pytest.raises(NotFoundError):
            await dataset_service.get_dataset(s, did, org_id=other_org)
        got = await dataset_service.get_dataset(s, did, org_id=org_id)
        assert got.id == did
