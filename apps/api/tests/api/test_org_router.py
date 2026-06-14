import uuid

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations import email as email_mod
from app.main import create_app
from app.models import Invitation, Organization, User

OWNER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
OWNER_EMAIL = "owner@acme.fr"


@pytest.fixture
async def ctx(tmp_path, monkeypatch):
    """Seeded org with an owner; client whose identity is switchable.

    ``ctx.as_user(uid, email)`` rewrites the verified-token identity so tests
    can act as different members.
    """
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'org.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)

    org_id = uuid.uuid4()
    async with sm() as s:
        s.add(Organization(id=org_id, name="acme.fr"))
        s.add(
            User(
                id=OWNER_ID,
                org_id=org_id,
                email=OWNER_EMAIL,
                role="owner",
                first_name="Alice",
            )
        )
        await s.commit()

    identity = {"sub": str(OWNER_ID), "email": OWNER_EMAIL}

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: dict(identity),
    )
    # E-mail sending is mocked off by default (no RESEND key path).
    monkeypatch.setattr(
        email_mod, "send_invitation_email",
        _make_email_mock(False),
    )
    # The router imports the symbol directly.
    import app.routers.org as org_router
    monkeypatch.setattr(org_router, "send_invitation_email", _make_email_mock(False))

    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
        class Ctx:
            def __init__(self) -> None:
                self.client = client
                self.sm = sm
                self.org_id = org_id

            def as_user(self, uid, em):
                identity["sub"] = str(uid)
                identity["email"] = em

            async def add_member(self, *, role, email, first_name=None):
                mid = uuid.uuid4()
                async with sm() as s:
                    s.add(
                        User(
                            id=mid,
                            org_id=org_id,
                            email=email,
                            role=role,
                            first_name=first_name,
                        )
                    )
                    await s.commit()
                return mid

        yield Ctx()
    await eng.dispose()


def _make_email_mock(result):
    async def _mock(**kwargs):
        return result
    return _mock


H = {"Authorization": "Bearer x"}


# --- org --------------------------------------------------------------------


async def test_get_org(ctx):
    r = await ctx.client.get("/api/v1/org", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "acme.fr"
    assert "settings" in body


async def test_patch_org_admin_ok(ctx):
    r = await ctx.client.patch(
        "/api/v1/org", headers=H, json={"siren": "123456789", "sector": "Finance"}
    )
    assert r.status_code == 200
    assert r.json()["siren"] == "123456789"
    assert r.json()["sector"] == "Finance"


async def test_patch_org_non_admin_403(ctx):
    vid = await ctx.add_member(role="viewer", email="v@acme.fr")
    ctx.as_user(vid, "v@acme.fr")
    r = await ctx.client.patch("/api/v1/org", headers=H, json={"siren": "1"})
    assert r.status_code == 403


async def test_patch_org_settings_merges(ctx):
    r = await ctx.client.patch(
        "/api/v1/org/settings", headers=H, json={"di_threshold": 0.9}
    )
    assert r.status_code == 200
    settings = r.json()["settings"]
    assert settings["di_threshold"] == 0.9
    # Existing keys preserved.
    assert "retention_days" in settings


# --- me ---------------------------------------------------------------------


async def test_get_me(ctx):
    r = await ctx.client.get("/api/v1/me", headers=H)
    assert r.status_code == 200
    assert r.json()["email"] == OWNER_EMAIL
    assert r.json()["first_name"] == "Alice"


async def test_patch_me_updates_first_name(ctx):
    r = await ctx.client.patch(
        "/api/v1/me", headers=H, json={"first_name": "Bob"}
    )
    assert r.status_code == 200
    assert r.json()["first_name"] == "Bob"


# --- members ----------------------------------------------------------------


async def test_list_members(ctx):
    await ctx.add_member(role="editor", email="ed@acme.fr")
    r = await ctx.client.get("/api/v1/org/members", headers=H)
    assert r.status_code == 200
    emails = {m["email"] for m in r.json()}
    assert {OWNER_EMAIL, "ed@acme.fr"} <= emails


async def test_change_member_role_ok(ctx):
    mid = await ctx.add_member(role="viewer", email="v@acme.fr")
    r = await ctx.client.patch(
        f"/api/v1/org/members/{mid}", headers=H, json={"role": "editor"}
    )
    assert r.status_code == 200
    assert r.json()["role"] == "editor"


async def test_cannot_demote_last_admin(ctx):
    # Owner is the only admin/owner -> demoting them is refused.
    r = await ctx.client.patch(
        f"/api/v1/org/members/{OWNER_ID}", headers=H, json={"role": "viewer"}
    )
    assert r.status_code == 403


async def test_non_admin_cannot_change_roles(ctx):
    vid = await ctx.add_member(role="viewer", email="v@acme.fr")
    other = await ctx.add_member(role="editor", email="ed@acme.fr")
    ctx.as_user(vid, "v@acme.fr")
    r = await ctx.client.patch(
        f"/api/v1/org/members/{other}", headers=H, json={"role": "viewer"}
    )
    assert r.status_code == 403


async def test_non_owner_admin_cannot_modify_owner(ctx):
    aid = await ctx.add_member(role="admin", email="adm@acme.fr")
    ctx.as_user(aid, "adm@acme.fr")
    r = await ctx.client.patch(
        f"/api/v1/org/members/{OWNER_ID}", headers=H, json={"role": "viewer"}
    )
    assert r.status_code == 403


# --- invitations ------------------------------------------------------------


async def test_create_invitation_returns_url_no_email(ctx):
    r = await ctx.client.post(
        "/api/v1/org/invitations",
        headers=H,
        json={"email": "new@acme.fr", "role": "editor"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email_sent"] is False
    assert body["invite_url"].endswith(
        f"/invitations/{await _token_of(ctx, body['invitation']['id'])}"
    )
    assert body["invitation"]["status"] == "pending"
    assert body["invitation"]["role"] == "editor"


async def test_create_invitation_sends_email_when_configured(ctx, monkeypatch):
    import app.routers.org as org_router
    monkeypatch.setattr(org_router, "send_invitation_email", _make_email_mock(True))
    r = await ctx.client.post(
        "/api/v1/org/invitations",
        headers=H,
        json={"email": "mail@acme.fr", "role": "viewer"},
    )
    assert r.status_code == 200
    assert r.json()["email_sent"] is True


async def test_create_invitation_non_admin_403(ctx):
    vid = await ctx.add_member(role="viewer", email="v@acme.fr")
    ctx.as_user(vid, "v@acme.fr")
    r = await ctx.client.post(
        "/api/v1/org/invitations",
        headers=H,
        json={"email": "x@acme.fr", "role": "editor"},
    )
    assert r.status_code == 403


async def test_list_invitations_pending_only(ctx):
    await ctx.client.post(
        "/api/v1/org/invitations",
        headers=H,
        json={"email": "p@acme.fr", "role": "viewer"},
    )
    r = await ctx.client.get("/api/v1/org/invitations", headers=H)
    assert r.status_code == 200
    assert any(i["email"] == "p@acme.fr" for i in r.json())


async def test_revoke_invitation(ctx):
    created = await ctx.client.post(
        "/api/v1/org/invitations",
        headers=H,
        json={"email": "r@acme.fr", "role": "viewer"},
    )
    inv_id = created.json()["invitation"]["id"]
    r = await ctx.client.delete(f"/api/v1/org/invitations/{inv_id}", headers=H)
    assert r.status_code == 204
    listed = await ctx.client.get("/api/v1/org/invitations", headers=H)
    assert all(i["id"] != inv_id for i in listed.json())


async def _token_of(ctx, inv_id):
    async with ctx.sm() as s:
        inv = (
            await s.execute(
                select(Invitation).where(Invitation.id == uuid.UUID(inv_id))
            )
        ).scalar_one()
        return inv.token
