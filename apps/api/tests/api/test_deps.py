import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, make_engine
from app.core.errors import AuthError
from app.models import Invitation, Organization, User


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
    with pytest.raises(AuthError):
        deps._bearer("Bearer    ")
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


async def test_provision_joins_org_via_pending_invitation(sm):
    org_id = uuid.uuid4()
    inviter = uuid.uuid4()
    async with sm() as s:
        s.add(Organization(id=org_id, name="acme.fr"))
        s.add(User(id=inviter, org_id=org_id, email="owner@acme.fr", role="owner"))
        s.add(
            Invitation(
                org_id=org_id,
                email="invitee@acme.fr",
                role="editor",
                token="tok-123",
                status="pending",
                invited_by=inviter,
                expires_at=datetime.now(timezone.utc) + timedelta(days=14),
            )
        )
        await s.commit()

    uid = uuid.uuid4()
    async with sm() as s:
        user = await deps._provision(s, uid, "invitee@acme.fr")
        assert user.org_id == org_id
        assert user.role == "editor"
    async with sm() as s:
        orgs = (
            await s.execute(select(func.count()).select_from(Organization))
        ).scalar_one()
        assert orgs == 1  # no new org created
        inv = (
            await s.execute(select(Invitation).where(Invitation.token == "tok-123"))
        ).scalar_one()
        assert inv.status == "accepted"


async def test_provision_ignores_expired_invitation(sm):
    org_id = uuid.uuid4()
    async with sm() as s:
        s.add(Organization(id=org_id, name="acme.fr"))
        s.add(
            Invitation(
                org_id=org_id,
                email="late@acme.fr",
                role="editor",
                token="tok-old",
                status="pending",
                invited_by=None,
                expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            )
        )
        await s.commit()

    uid = uuid.uuid4()
    async with sm() as s:
        user = await deps._provision(s, uid, "late@acme.fr")
        # Expired invitation ignored -> new org, owner role.
        assert user.org_id != org_id
        assert user.role == "owner"
    async with sm() as s:
        orgs = (
            await s.execute(select(func.count()).select_from(Organization))
        ).scalar_one()
        assert orgs == 2


async def test_get_current_user_rejects_non_uuid_sub(sm, monkeypatch):
    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps,
        "verify_token",
        lambda token, *, key, issuer=None: {"sub": "not-a-uuid", "email": "x@y.fr"},
    )
    async with sm() as s:
        with pytest.raises(AuthError):
            await deps.get_current_user(authorization="Bearer x", session=s)
