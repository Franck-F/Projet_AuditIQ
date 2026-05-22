import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.core.errors import APIError
from app.integrations.storage import get_storage  # used by ctx fixture
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


async def test_submit_then_compute_m1_is_done(ctx):
    """submit_audit + compute_m1_audit produces a done audit (replaces the
    former run_m1_audit wrapper test now that the wrapper is deleted)."""
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        body = AuditCreate(dataset_id=ds.id, title="M1 submit+compute",
                           protected_attribute="genre",
                           decision_column="embauche",
                           favorable_value="oui")
        pending = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id, body=body,
            llm_provider=None,
        )
        audit = await audit_service._load_audit(session, pending.id)
        await audit_service.compute_m1_audit(
            session, audit, body, llm_provider=None,
        )
        await session.commit()
        out = await audit_service.get_audit(session, pending.id, org_id=org_id)
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


async def test_run_audit_job_concurrency_is_bounded(ctx, monkeypatch):
    """Prove the semaphore caps concurrency at audit_max_concurrency=1.

    Strategy (Event-based, no sleep):
    - Force the cap to 1 via env var + clear settings/semaphore caches.
    - Submit two M1 audits.
    - Patch compute_m1_audit so the FIRST call sets a 'started' event and
      then awaits a 'release' event before delegating — holding the single
      semaphore slot.
    - Launch both jobs as concurrent tasks.
    - After the first job signals it has started, assert job 2 is still
      'pending' (not 'running'), proving it cannot acquire the slot.
    - Release job 1; gather both; assert both end as 'done'.
    """
    import asyncio

    from app.core.config import get_settings
    from app.services.audit_service import run_audit_job

    sm, org_id, user_id, upload = ctx

    # ── Force concurrency cap to 1 ────────────────────────────────────────
    monkeypatch.setenv("AUDIT_MAX_CONCURRENCY", "1")
    get_settings.cache_clear()
    monkeypatch.setattr(audit_service, "_audit_semaphore", None)

    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()

    # ── Submit two independent audits (both pending) ───────────────────────
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)

    body = AuditCreate(
        dataset_id=ds.id, title="M1",
        protected_attribute="genre",
        decision_column="embauche",
        favorable_value="oui",
    )

    async with sm() as session:
        out1 = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id,
            body=body, llm_provider=None,
        )
    async with sm() as session:
        out2 = await audit_service.submit_audit(
            session, org_id=org_id, user_id=user_id,
            body=body, llm_provider=None,
        )

    # ── Wrap compute_m1_audit to gate the first call ───────────────────────
    real_compute = audit_service.compute_m1_audit
    first_started = asyncio.Event()
    release = asyncio.Event()
    call_count = 0

    async def _gated_compute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            first_started.set()       # signal: first job has the slot
            await release.wait()      # hold the slot until the test releases it
        return await real_compute(*args, **kwargs)

    monkeypatch.setattr(audit_service, "compute_m1_audit", _gated_compute)

    # ── Launch both jobs concurrently ─────────────────────────────────────
    task1 = asyncio.create_task(run_audit_job(out1.id, body, None, session_maker=sm))
    task2 = asyncio.create_task(run_audit_job(out2.id, body, None, session_maker=sm))

    # Wait until job 1 has entered compute (holds the semaphore slot)
    await first_started.wait()

    # ── Assert job 2 is still pending (blocked outside the semaphore) ─────
    async with sm() as session:
        status2 = (
            await audit_service.get_audit(session, out2.id, org_id=org_id)
        ).status
    assert status2 == "pending", (
        f"Expected job2 to still be 'pending' while job1 holds the only "
        f"semaphore slot, but got '{status2}'"
    )

    # ── Release the gate; wait for both to finish ─────────────────────────
    release.set()
    await asyncio.gather(task1, task2)

    # ── Assert both audits ended as 'done' ────────────────────────────────
    async with sm() as session:
        done1 = await audit_service.get_audit(session, out1.id, org_id=org_id)
        done2 = await audit_service.get_audit(session, out2.id, org_id=org_id)

    assert done1.status == "done", f"job1 ended as '{done1.status}'"
    assert done2.status == "done", f"job2 ended as '{done2.status}'"

    # ── Restore caches so other tests are unaffected ──────────────────────
    get_settings.cache_clear()
