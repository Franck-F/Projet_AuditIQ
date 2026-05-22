import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.core.errors import APIError
from app.integrations.storage import get_storage
from app.models import Organization, User
from app.schemas.audit import AuditCreate, M1MetricsOut
from app.services import audit_service
from app.services.dataset_service import create_dataset


@pytest.fixture
async def ctx(tmp_path):
    """(session_maker, org_id, user_id, upload) — upload uses the cached
    application MemoryStorage so compute_mX_audit's default storage finds it.
    """
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    # The compute_mX default storage is the cached app singleton; the upload
    # fixture writes to that same singleton so the dataset is downloadable.
    store = get_storage()
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

    yield sm, org_id, uid, _upload
    await eng.dispose()


async def test_submit_audit_creates_pending_row(ctx):
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        out = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id,
            body=AuditCreate(dataset_id=ds.id, title="M1",
                             protected_attribute="genre",
                             decision_column="embauche",
                             favorable_value="oui"),
            llm_provider=None,
        )
    assert out.status == "pending"
    assert out.metrics is None
    assert out.error is None
    assert out.id is not None


async def test_submit_audit_rejects_missing_dataset_sync(ctx):
    sm, org_id, user_id, _ = ctx
    async with sm() as session:
        with pytest.raises(APIError):
            await audit_service.submit_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(dataset_id=uuid.uuid4(), title="M1",
                                 protected_attribute="g",
                                 decision_column="d", favorable_value="o"),
                llm_provider=None,
            )


async def test_submit_audit_rejects_m3_ssrf_target_sync(ctx):
    sm, org_id, user_id, _ = ctx
    async with sm() as session:
        with pytest.raises(APIError):
            await audit_service.submit_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(
                    title="M3", module="M3", lang="fr",
                    target={"url": "http://169.254.169.254/latest",
                            "method": "POST", "headers": {},
                            "body_template": "{prompt}",
                            "response_path": "a"}),
                llm_provider=None,
            )


async def test_submit_audit_m3_persists_no_secret(ctx, monkeypatch):
    sm, org_id, user_id, _ = ctx
    import app.integrations.llm_target as lt

    monkeypatch.setattr(lt, "_resolve_ips", lambda host: ["93.184.216.34"])
    async with sm() as session:
        out = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id,
            body=AuditCreate(
                title="Chatbot", module="M3", lang="fr",
                target={"url": "https://api.example.com/v1",
                        "method": "POST",
                        "headers": {"Authorization": "Bearer SECRET"},
                        "body_template": '{"p":"{prompt}"}',
                        "response_path": "a"}),
            llm_provider=None,
        )
    assert out.status == "pending"
    assert out.config is not None
    blob = str(out.config)
    assert "SECRET" not in blob and "Authorization" not in blob


async def test_compute_m1_audit_fills_the_row(ctx):
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        body = AuditCreate(dataset_id=ds.id, title="M1",
                           protected_attribute="genre",
                           decision_column="embauche",
                           favorable_value="oui")
        out = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id, body=body,
            llm_provider=None)
        audit = await audit_service._load_audit(session, out.id)
        await audit_service.compute_m1_audit(session, audit, body,
                                             llm_provider=None)
        await session.commit()
        done = await audit_service.get_audit(session, out.id,
                                             org_id=org_id)
    assert done.status == "done"
    assert isinstance(done.metrics, M1MetricsOut)


async def test_load_audit_missing_raises(ctx):
    sm, _org_id, _user_id, _ = ctx
    async with sm() as session:
        with pytest.raises(APIError):
            await audit_service._load_audit(session, uuid.uuid4())


async def test_run_m1_audit_wrapper_still_done(ctx):
    """The thin run_m1_audit wrapper preserves the synchronous done result."""
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        out = await audit_service.run_m1_audit(
            session, get_storage(), org_id=org_id, user_id=user_id,
            body=AuditCreate(dataset_id=ds.id, title="M1 wrapper",
                             protected_attribute="genre",
                             decision_column="embauche",
                             favorable_value="oui"),
            llm_provider=None,
        )
    assert out.status == "done"
    assert isinstance(out.metrics, M1MetricsOut)


async def test_run_audit_job_pending_to_done(ctx):
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        body = AuditCreate(dataset_id=ds.id, title="M1",
                           protected_attribute="genre",
                           decision_column="embauche",
                           favorable_value="oui")
        out = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id, body=body,
            llm_provider=None)
    # background job uses its OWN session maker
    await audit_service.run_audit_job(out.id, body, None,
                                      session_maker=sm)
    async with sm() as session:
        done = await audit_service.get_audit(session, out.id,
                                             org_id=org_id)
    assert done.status == "done"
    assert done.metrics is not None
    assert done.error is None


async def test_run_audit_job_failure_sets_failed_and_error(ctx, monkeypatch):
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        body = AuditCreate(dataset_id=ds.id, title="M1",
                           protected_attribute="genre",
                           decision_column="embauche",
                           favorable_value="oui")
        out = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id, body=body,
            llm_provider=None)

    async def _boom(*a, **k):
        raise RuntimeError("compute exploded")

    monkeypatch.setattr(audit_service, "compute_m1_audit", _boom)
    # must NOT raise even though the computation throws
    await audit_service.run_audit_job(out.id, body, None,
                                      session_maker=sm)
    async with sm() as session:
        failed = await audit_service.get_audit(session, out.id,
                                               org_id=org_id)
    assert failed.status == "failed"
    assert failed.error and "exploded" in failed.error
