# Asynchronous Audit Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `POST /audits` non-blocking: validate synchronously, return `202` + the audit id immediately, run the computation in a bounded in-process background task, and let the web client poll the audit status.

**Architecture:** Sub-project #3 of 3 (spec `docs/superpowers/specs/2026-05-22-async-audit-execution-design.md`). A generic synchronous `submit_audit` validates the request and inserts the `pending` audit row; a generic background `run_audit_job` (gated by an `asyncio.Semaphore`, using a fresh DB session) loads the row, sets `running`, dispatches by module to the relocated `compute_mX_audit` compute logic, and writes `done` or `failed`+`error`. The router schedules the job via `asyncio.create_task`. The web result page polls until the status is terminal. The audit *computation* is unchanged — only when it runs and how failures surface.

**Tech Stack:** FastAPI, SQLAlchemy 2 async + Alembic, Pydantic v2, `asyncio`, pytest, Next.js + TanStack Query + Vitest, uv, pnpm `@auditiq/web`.

---

## Scope

One cohesive backward-compatible vertical and the LAST deferred increment. **In:** `apps/api/app/core/config.py`, `migrations/versions/0005_*.py` + `app/models/audit.py`, `app/schemas/audit.py`, `app/services/audit_service.py`, `app/routers/audits.py`, `apps/web/lib/api/audits.ts`, `apps/web/app/app/audits/[id]/page.tsx` (+ its `useAudit` hook), and the matching tests. **Out:** APScheduler, scheduled/recurring re-audits, an external queue/worker, websockets/SSE, retry of `failed` audits, any change to the M1/M2/M3 audit *computation*.

Commands — api from `apps/api`: `uv run python -m pytest`, `uv run python -m ruff check`, `uv run python -m mypy app`. web from repo root: `pnpm --filter @auditiq/web {test,typecheck,lint}` (lint = `eslint .`). **Commit RULE:** plain `git add` + `git commit -m "..."` — NEVER `-c core.autocrlf=false`. Identity `Franck F <franck-dilane1.fambou@epitech.digital>`; **at execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`** and **cherry-pick BOTH the plan and the spec doc into the worktree**. NEVER add a Co-Authored-By/Claude trailer.

**Subagent-driven gotcha:** before the final review/PR, run `git --no-pager log --oneline origin/main..HEAD` and confirm exactly one commit per task (+ fixes + plan + spec); spot-check each task's signature file is in `git diff --stat origin/main..HEAD` — a task commit can be orphaned by a later task branching from a stale HEAD.

**KNOWN-FLAKY:** `apps/web/__tests__/connexion.test.tsx` times out under heavy parallel load, passes 2/2 in isolation, web auth untouched here. Only-connexion failure → re-run `pnpm --filter @auditiq/web exec vitest run connexion` isolated; green = PASS.

## File Structure

- `app/core/config.py` — `Settings.audit_max_concurrency: int = 3`.
- `migrations/versions/0005_audit_error.py` (new, down_revision `0004`) + `app/models/audit.py` — `audits.error` nullable column.
- `app/schemas/audit.py` — `AuditOut.error: str | None = None`.
- `app/services/audit_service.py` — generic `submit_audit`; background `run_audit_job` + a module-level `asyncio.Semaphore`; the current `run_m{1,2,3}_audit` relocated into `compute_m{1,2,3}_audit(session, audit, body)`.
- `app/routers/audits.py` — `POST /audits` → `202`, `submit_audit` then `asyncio.create_task(run_audit_job(...))`.
- `apps/web/lib/api/audits.ts` — `AuditOut.error?: string | null`.
- `apps/web/app/app/audits/[id]/page.tsx` (+ `useAudit` in `lib/query/use-audit.ts` or wherever it lives) — polling + running/failed render.

Read first (POST-#19 files, authoritative over snippets where they differ): `app/services/audit_service.py` (the three `run_m{1,2,3}_audit` — how each creates the `Audit` row via `_next_code`/`Audit(...)`/`session.add`/`flush`, computes, persists `AuditResult`, sets `status`/`completed_at`, commits, returns `_audit_out(...)`; `get_audit`; `_audit_out`; the `assert_public_url` import for M3; the `get_dataset` lookup for M1/M2), `app/routers/audits.py` (the `POST /audits` handler + module dispatch + `llm_provider` resolution), `app/models/audit.py` (`Audit` — `status` column), `app/schemas/audit.py` (`AuditOut`), `migrations/versions/0004_m3.py` (migration idiom), `apps/web/lib/api/audits.ts` (`AuditOut`, `createAudit`), the result page + `useAudit` hook, `apps/web/__tests__/audit-result-page.test.tsx` + `tests/api/test_audits_router.py` + `tests/api/test_audit_service_m{1,2,3}.py` idioms.

---

### Task 1: Settings — `audit_max_concurrency`

**Files:**
- Modify: `apps/api/app/core/config.py`
- Test: `apps/api/tests/api/test_config_async.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_config_async.py`:

```python
from app.core.config import Settings


def test_audit_max_concurrency_default():
    s = Settings(_env_file=None)
    assert s.audit_max_concurrency == 3


def test_audit_max_concurrency_env_override(monkeypatch):
    monkeypatch.setenv("AUDIT_MAX_CONCURRENCY", "5")
    s = Settings(_env_file=None)
    assert s.audit_max_concurrency == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_config_async.py -v`
Expected: FAIL — `Settings` has no `audit_max_concurrency`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/core/config.py`, add to `Settings` (next to the other `llm_*`/operational tunables):

```python
    audit_max_concurrency: int = 3
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_config_async.py tests/api/test_config.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/config.py apps/api/tests/api/test_config_async.py
git commit -m "feat(api): audit_max_concurrency setting"
```

---

### Task 2: Migration 0005 — `audits.error`

**Files:**
- Modify: `apps/api/app/models/audit.py`
- Create: `apps/api/migrations/versions/0005_audit_error.py`
- Test: `apps/api/tests/api/test_migration_0005.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_migration_0005.py`:

```python
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0005_adds_error_column_and_reverses(tmp_path, monkeypatch):
    db = tmp_path / "e.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    cols = {c["name"] for c in
            inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")}
    assert "error" in cols

    command.downgrade(cfg, "0004")
    cols2 = {c["name"] for c in
             inspect(create_engine(f"sqlite:///{db}")).get_columns("audits")}
    assert "error" not in cols2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_migration_0005.py -v`
Expected: FAIL — no `0005` revision.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/migrations/versions/0005_audit_error.py`:

```python
"""audit error message column

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.add_column(sa.Column("error", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.drop_column("error")
```

In `apps/api/app/models/audit.py`, add to the `Audit` model (next to `status`):

```python
    error: Mapped[str | None] = mapped_column(sa.String(), nullable=True)
```
(Match the file's real import alias for SQLAlchemy types — if it imports `from sqlalchemy import String`, use `String` instead of `sa.String`. Keep every other column unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_migration_0005.py tests/api/test_migration_0004.py -v`
Expected: PASS (new + existing migration tests; up→down→up clean).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/models/audit.py apps/api/migrations/versions/0005_audit_error.py apps/api/tests/api/test_migration_0005.py
git commit -m "feat(api): migration 0005 — audits.error column"
```

---

### Task 3: DTO — `AuditOut.error`

**Files:**
- Modify: `apps/api/app/schemas/audit.py`
- Test: `apps/api/tests/api/test_schemas_async.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_schemas_async.py`:

```python
import datetime
import uuid

from app.schemas.audit import AuditOut


def test_audit_out_error_defaults_none_and_accepts_str():
    base = dict(
        id=uuid.uuid4(), code="AUD-2026-001", title="t", status="pending",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute=None,
        decision_column=None, favorable_value=None, privileged_value=None,
        created_at=datetime.datetime.now(tz=datetime.timezone.utc),
        completed_at=None, metrics=None, interpretation=None, pre_check=[],
    )
    a = AuditOut(**base)
    assert a.error is None
    b = AuditOut(**{**base, "status": "failed", "error": "boom"})
    assert b.error == "boom"
```
(Reconcile the constructor kwargs with the REAL `AuditOut` required fields — read it; the point is `error` defaults to `None` and accepts a string.)

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_schemas_async.py -v`
Expected: FAIL — `AuditOut` has no `error`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/schemas/audit.py`, add to `AuditOut` (after `status`/near `completed_at`):

```python
    error: str | None = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_schemas_async.py tests/api/test_schemas_m1.py tests/api/test_schemas_m2.py tests/api/test_schemas_m3.py -v`
Expected: PASS (new + existing schema tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_async.py
git commit -m "feat(api): AuditOut.error field"
```

---

### Task 4: Service — `submit_audit` + `compute_m{1,2,3}_audit` split

**Files:**
- Modify: `apps/api/app/services/audit_service.py`
- Test: `apps/api/tests/api/test_audit_service_async.py`

This task splits each `run_m{1,2,3}_audit` into row-creation (moved into a generic `submit_audit`) + computation (`compute_mX_audit`). To keep the router and ALL existing tests green within this task, the existing `run_m{1,2,3}_audit` names are **kept as thin synchronous wrappers** (`submit_audit` then `compute_mX_audit`) — Task 6 removes them when the router switches to `202`.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/api/test_audit_service_async.py` (reuse the `ctx`/upload fixture idiom from `tests/api/test_audit_service_m1.py`):

```python
import pytest

from app.core.errors import APIError
from app.schemas.audit import AuditCreate
from app.services import audit_service


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
    import uuid as _uuid
    sm, org_id, user_id, _ = ctx
    async with sm() as session:
        with pytest.raises(APIError):
            await audit_service.submit_audit(
                session, org_id=org_id, user_id=user_id,
                body=AuditCreate(dataset_id=_uuid.uuid4(), title="M1",
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


async def test_compute_m1_audit_fills_the_row(ctx):
    sm, org_id, user_id, upload = ctx
    from app.schemas.audit import M1MetricsOut
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
```
(If the real M3 `AuditCreate` requires `dataset_id`, pass a dummy `uuid4()` — the M3 validator made it optional; match the real DTO. `_load_audit` is a small helper added in Step 3; if the file already has an internal audit-by-id loader, reuse it and adjust the test.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_audit_service_async.py -v`
Expected: FAIL — `submit_audit`/`compute_m1_audit`/`_load_audit` undefined.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/services/audit_service.py` (read the real `run_m{1,2,3}_audit` first):

1. Add a generic **`submit_audit`** that does ONLY validation + row creation:

```python
async def submit_audit(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    """Validate the request synchronously and create the pending audit row.

    Raises APIError (-> RFC 7807) for an invalid request BEFORE any row is
    created. Does NOT compute anything.
    """
    if body.module in ("M1", "M2"):
        # raises APIError 404 if the dataset is missing / not in this org
        await get_dataset(session, body.dataset_id, org_id=org_id)
    if body.module == "M3":
        assert body.target is not None  # AuditCreate._per_module guarantees
        assert_public_url(body.target.url)  # raises APIError 422 on SSRF
    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=(body.dataset_id if body.module in ("M1", "M2")
                    else None),
        module=body.module,
        title=body.title,
        status="pending",
        protected_attribute=body.protected_attribute,
        decision_column=body.decision_column,
        favorable_value=body.favorable_value,
        privileged_value=body.privileged_value,
        config=_audit_config_for(body),
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()
    await session.commit()
    return _audit_out(audit, None, None, [])
```
> Read the real `run_m{1,2,3}_audit` to copy EXACTLY how each builds its `Audit(...)` row (column set, the `config` jsonb content per module, `_next_code`, `created_by`/`created_by_id` — use the real field names). The three modules build the row slightly differently (M1/M2 have `dataset_id`+columns, M3 has `target` config without secrets and null dataset columns) — `submit_audit` must reproduce each module's row exactly as today. If the per-module row differs enough that one generic builder is awkward, a small per-module `_build_audit_row(body, ...)` helper dispatched by `body.module` is acceptable — keep it in this file. `_audit_config_for(body)` stands for "whatever the real services persist into `audits.config` for that module" (M3: `{target without secrets, bank_version, lang}`; M1/M2: their existing config) — reproduce the real logic; do NOT persist M3 target secrets. `_audit_out(audit, None, None, [])` must yield `status="pending"`, `metrics=None`, `error=None` — match the real `_audit_out` signature.

2. Add `_load_audit(session, audit_id) -> Audit` (a plain ORM fetch by id, no org filter — used by the background job; raise `APIError` 404 if absent) — or reuse an existing internal loader.

3. Refactor each `run_m{1,2,3}_audit` body into **`compute_m{1,2,3}_audit(session, audit, body, *, llm_provider)`**: everything the current `run_mX_audit` does AFTER the row is created — run the engine / `run_intersectional` / LLM calls / interpretation, build the metrics DTO, persist the `AuditResult`, set `audit.status = "done"` and `audit.completed_at`. They take the already-created `audit` row, do NOT create it, do NOT commit (the caller commits). They keep the exact computation.

4. Keep the existing **`run_m{1,2,3}_audit`** names as thin synchronous wrappers so the router + existing tests stay green until Task 6:

```python
async def run_m1_audit(session, *, org_id, user_id, body, llm_provider):
    out = await submit_audit(session, org_id=org_id, user_id=user_id,
                             body=body, llm_provider=llm_provider)
    audit = await _load_audit(session, out.id)
    await compute_m1_audit(session, audit, body, llm_provider=llm_provider)
    await session.commit()
    return await get_audit(session, out.id, org_id=org_id)
```
(and the analogous `run_m2_audit`/`run_m3_audit`). This preserves today's synchronous behaviour exactly — existing service/router tests must stay green.

`get_audit` is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_audit_service_async.py tests/api/test_audit_service_m1.py tests/api/test_audit_service_m2.py tests/api/test_audit_service_m3.py tests/api/test_audits_router.py -v`
Expected: PASS — new async-service tests + ALL existing M1/M2/M3 service & router tests (the wrappers keep them green).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/tests/api/test_audit_service_async.py
git commit -m "feat(api): split audit services into submit_audit + compute_mX_audit"
```

---

### Task 5: Service — `run_audit_job` background runner

**Files:**
- Modify: `apps/api/app/services/audit_service.py`
- Test: `apps/api/tests/api/test_audit_service_async.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_audit_service_async.py`:

```python
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
```
(`run_audit_job`'s real signature must accept the background session maker — see Step 3. Adapt the `session_maker=sm` kwarg to whatever name Step 3 uses.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_audit_service_async.py -k run_audit_job -v`
Expected: FAIL — `run_audit_job` undefined.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/services/audit_service.py`, add a module-level semaphore and `run_audit_job` (read the real session-maker the app uses — `async_session_maker` / `get_sessionmaker()` / the `app/core/db.py` factory — and use it as the default):

```python
import asyncio

from app.core.config import get_settings

_audit_semaphore: asyncio.Semaphore | None = None


def _get_audit_semaphore() -> asyncio.Semaphore:
    global _audit_semaphore
    if _audit_semaphore is None:
        _audit_semaphore = asyncio.Semaphore(
            get_settings().audit_max_concurrency
        )
    return _audit_semaphore


_COMPUTE = {
    "M1": "compute_m1_audit",
    "M2": "compute_m2_audit",
    "M3": "compute_m3_audit",
}


async def run_audit_job(
    audit_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
    *,
    session_maker: Callable[[], AsyncSession] = <REAL_APP_SESSION_MAKER>,
) -> None:
    """Background runner. Bounded by the audit semaphore. Uses a fresh
    DB session (the request session is closed once 202 is sent). Never
    propagates: any failure -> status='failed' + error message.
    """
    async with _get_audit_semaphore():
        async with session_maker() as session:
            try:
                audit = await _load_audit(session, audit_id)
                audit.status = "running"
                await session.commit()
                compute = {
                    "M1": compute_m1_audit,
                    "M2": compute_m2_audit,
                    "M3": compute_m3_audit,
                }[audit.module]
                await compute(session, audit, body,
                              llm_provider=llm_provider)
                await session.commit()
            except Exception as exc:  # noqa: BLE001 — async job must not crash
                await session.rollback()
                try:
                    audit = await _load_audit(session, audit_id)
                    audit.status = "failed"
                    audit.error = str(exc) or exc.__class__.__name__
                    await session.commit()
                except Exception:  # noqa: BLE001 — last-resort
                    await session.rollback()
```
> Replace `<REAL_APP_SESSION_MAKER>` with the actual application async-session factory (read `app/core/db.py` / how routers obtain a session). The dict literal inside the function references `compute_m1_audit`/`compute_m2_audit`/`compute_m3_audit` defined in Task 4 — keep both: the module-level `_COMPUTE` name map is not needed if the inline dict is used; pick ONE (the inline dict is simpler — drop `_COMPUTE`). `Callable`/`AsyncSession` import per the file's existing imports. The `except Exception` is intentional and broad — a background job must never crash the event loop; the `# noqa: BLE001` documents it. Resetting `audit.error` and `audit.status` on failure must use a re-loaded row after `rollback()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_audit_service_async.py tests/api/test_audit_service_m1.py tests/api/test_audit_service_m2.py tests/api/test_audit_service_m3.py -v`
Expected: PASS — `run_audit_job` happy path + failure path + existing service tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/tests/api/test_audit_service_async.py
git commit -m "feat(api): run_audit_job background runner (bounded, failure-safe)"
```

---

### Task 6: Router — `POST /audits` returns `202`, schedules the job

**Files:**
- Modify: `apps/api/app/routers/audits.py`
- Modify: `apps/api/app/services/audit_service.py` (remove the now-unused sync `run_m{1,2,3}_audit` wrappers)
- Test: `apps/api/tests/api/test_audits_router.py`

- [ ] **Step 1: Update the failing tests**

In `apps/api/tests/api/test_audits_router.py`: the existing M1/M2/M3 `POST /audits` tests assert `201` + a `done` `AuditOut`. Update each to the async contract — `POST /audits` now returns **`202`** with `status="pending"`; to assert the computed result the test drives the job deterministically. Pattern (apply to the M1 happy-path test, and analogously M2/M3):

```python
async def test_post_audits_m1_is_async(client, ctx_ids, monkeypatch):
    # capture the scheduled background job instead of fire-and-forget
    scheduled = []
    import app.routers.audits as audits_router
    real_create_task = audits_router.asyncio.create_task

    def _capture(coro):
        scheduled.append(coro)
        # wrap in a completed task so nothing actually fires async
        return real_create_task(_noop())

    async def _noop():
        return None
    monkeypatch.setattr(audits_router.asyncio, "create_task", _capture)

    r = await client.post("/api/v1/audits", json={...M1 body...})
    assert r.status_code == 202
    assert r.json()["status"] == "pending"
    assert r.json()["metrics"] is None
    # now run the captured job to completion, deterministically
    for coro in scheduled:
        await coro
    audit_id = r.json()["id"]
    r2 = await client.get(f"/api/v1/audits/{audit_id}")
    assert r2.status_code == 200
    assert r2.json()["status"] == "done"
```
> Adapt to the real `test_audits_router.py` fixtures (`client`, auth, the existing M1/M2/M3 request bodies — reuse them verbatim). The key changes: expected status `201`→`202`; the immediate body is `pending` with `metrics: null`; the final assertions move behind running the captured background coroutine. The M3 SSRF-rejection test stays `422` (now raised synchronously by `submit_audit` before the row is created). If monkeypatching `create_task` is awkward with the real router structure, an equally valid pattern: assert the `202`+`pending`, then call `audit_service.run_audit_job(audit_id, <body>, None, session_maker=...)` directly, then `GET`. Use whichever matches the file's existing async-test idiom.

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_audits_router.py -v`
Expected: FAIL — the endpoint still returns `201` + a `done` audit.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/routers/audits.py` (read the real `POST /audits` handler):
- Change the decorator `status_code` from `201` to `202` (keep `response_model=AuditOut`).
- Replace the per-module dispatch (`if body.module == "M2": return await run_m2_audit(...)` etc.) with a single path: `out = await audit_service.submit_audit(session, org_id=user.org_id, user_id=user.id, body=body, llm_provider=llm_provider)` (this raises `APIError` → RFC 7807 for an invalid request); then `asyncio.create_task(audit_service.run_audit_job(out.id, body, llm_provider))` (the in-memory `body` carries the M3 secret to the job without persistence); then `return out` (the `pending` `AuditOut`). Add `import asyncio` if not present.
- In `apps/api/app/services/audit_service.py`, delete the three thin `run_m{1,2,3}_audit` wrappers added in Task 4 — they are now unused (`grep` confirms no remaining references in `app/`; the router uses `submit_audit`+`run_audit_job`). Keep `submit_audit`/`compute_m{1,2,3}_audit`/`run_audit_job`/`get_audit`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_audits_router.py -q` then `uv run python -m pytest -q`
Expected: PASS — router async contract + the FULL suite (no regression).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/routers/audits.py apps/api/app/services/audit_service.py apps/api/tests/api/test_audits_router.py
git commit -m "feat(api): POST /audits returns 202 + schedules the background job"
```

---

### Task 7: Web — `AuditOut.error` type

**Files:**
- Modify: `apps/web/lib/api/audits.ts`
- Test: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audits-api.test.ts`:

```typescript
it('fetchAudit surfaces a failed audit error', async () => {
  get.mockResolvedValueOnce({ data: {
    id: 'a1', code: null, title: 't', status: 'failed', module: 'M1',
    error: 'compute exploded', metrics: null, interpretation: null,
    pre_check: [], created_at: '2026-05-22T00:00:00Z', completed_at: null,
  } });
  const a = await fetchAudit('a1');
  expect(a.status).toBe('failed');
  expect(a.error).toBe('compute exploded');
});
```
(Match the file's real mock idiom and the real `fetchAudit` name/import.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run audits-api`
Expected: FAIL — `AuditOut` has no `error` (TS) / assertion fails.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/lib/api/audits.ts`, add to the `AuditOut` type: `error?: string | null;` (near `status`). No other change — `createAudit` already returns `AuditOut`; a `202` is a 2xx so axios resolves normally.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run audits-api` then `pnpm --filter @auditiq/web typecheck`
Expected: PASS + typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): AuditOut.error type"
```

---

### Task 8: Web — result page polling + running/failed states

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx`
- Modify: the `useAudit` hook (read where it lives — `apps/web/lib/query/use-audit.ts` or similar)
- Test: `apps/web/__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/__tests__/audit-result-page.test.tsx`:

```typescript
it('shows the running state while the audit is pending/running', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'r1', code: 'AUD-2026-070', title: 'Chatbot', status: 'running',
      module: 'M3', dataset_id: null, protected_attribute: null,
      decision_column: null, favorable_value: null, privileged_value: null,
      created_at: '2026-05-22T00:00:00Z', completed_at: null,
      metrics: null, interpretation: null, error: null, pre_check: [],
      config: {},
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'r1' }} />);
  expect(await screen.findByText(/analyse en cours|en cours/i))
    .toBeInTheDocument();
});

it('shows the failure panel when the audit failed', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'r2', code: 'AUD-2026-071', title: 'Chatbot', status: 'failed',
      module: 'M3', dataset_id: null, protected_attribute: null,
      decision_column: null, favorable_value: null, privileged_value: null,
      created_at: '2026-05-22T00:00:00Z', completed_at: null,
      metrics: null, interpretation: null,
      error: 'Le LLM cible est injoignable.', pre_check: [], config: {},
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'r2' }} />);
  expect(await screen.findByText(/injoignable/i)).toBeInTheDocument();
  expect(screen.queryByText(/score de risque/i)).not.toBeInTheDocument();
});
```
(Match the real page render/`useAudit` mock idiom from the existing result-page tests.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @auditiq/web exec vitest run audit-result-page`
Expected: FAIL — no running/failed rendering.

- [ ] **Step 3: Write minimal implementation**

- `useAudit` hook: add a `refetchInterval` to the TanStack Query options — a function `(query) => { const s = query.state.data?.status; return (s === 'pending' || s === 'running') ? 2000 : false; }` (poll every 2 s while non-terminal, stop on `done`/`failed`). Read the real hook to match its `useQuery` shape.
- `app/app/audits/[id]/page.tsx`: in the render, BEFORE the existing done-rendering, branch on `data.status`:
  - `pending` or `running` → an "Analyse en cours…" panel (a spinner/`role="status"` + a message; optionally module-aware, e.g. M3 → "Interrogation du chatbot cible…").
  - `failed` → an error panel (`role="alert"`) showing `data.error` (fallback text if `error` is null).
  - `done` (or otherwise) → the existing result view, completely unchanged (M1/M2/M3 + the sub-project #1/#2 sections).
  The existing `done` rendering is reached only when `status === 'done'` — wrap it so a non-done audit never tries to render `metrics` (which is `null` until done).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @auditiq/web exec vitest run audit-result-page` then full `pnpm --filter @auditiq/web test`
Expected: PASS (new running/failed tests + existing done-state M1/M2/M3 result tests; connexion-flake-aware).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/app/audits/[id]/page.tsx" apps/web/lib/query/use-audit.ts apps/web/__tests__/audit-result-page.test.tsx
git commit -m "feat(web): poll audit status + running/failed result states"
```
(Adjust the `use-audit.ts` path to the real hook location.)

---

### Task 9: Full gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: API suite** — `cd apps/api && uv run python -m pytest -q` → PASS, 0 failed. The existing M1/M2/M3 service/router tests (reworked for the async contract in Tasks 4/6) + the new async tests are the regression guard that the *computation* is unchanged.
- [ ] **Step 2: API lint + types** — `uv run python -m ruff check app tests` (clean) ; `uv run python -m mypy app` (`Success`). Likely fixups: the `run_audit_job` broad-`except` `# noqa: BLE001`; `Callable`/`asyncio` imports; the session-maker default. Apply minimal precise fixes.
- [ ] **Step 3: Web gate** — `pnpm --filter @auditiq/web test` (0 fail; connexion-flake-aware) ; `pnpm --filter @auditiq/web typecheck` (clean) ; `pnpm --filter @auditiq/web lint` (exit 0, 0 errors).
- [ ] **Step 4: Scope + identity + chain sanity** — `git --no-pager diff --name-only origin/main..HEAD` confined to the in-scope files (+ plan + spec docs). `git --no-pager log --oneline origin/main..HEAD` — confirm one commit per task (T1–T8 + plan + spec); spot-check each task's signature file is in `git diff --stat origin/main..HEAD`. `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — ONLY `franck-dilane1.fambou@epitech.digital`. No 142/142 whole-file CRLF churn.
- [ ] **Step 5: Commit any gate fixes** — `git add -A && git commit -m "chore: gate fixups for async audit execution"` (skip if Steps 1–3 already clean).

---

## Self-Review

**1. Spec coverage:** D1 uniform all-module async → Tasks 4 (`submit_audit` generic), 6 (router single path). D2 web redirect + poll → Task 8 (`useAudit` `refetchInterval`, result-page states; the wizard already redirects). D3 bounded concurrency → Task 1 (`audit_max_concurrency`) + Task 5 (`_audit_semaphore`). D4 approach A — `submit_audit` + `run_audit_job` + `compute_mX_audit` → Tasks 4, 5. D5 sync validation → `202`; failure → `failed`+`error` → Task 4 (`submit_audit` validates incl. SSRF pre-flight + dataset, raises before row creation) + Task 5 (`run_audit_job` `except` → `failed`+`error`) + Task 2 (`error` column) + Task 3 (`AuditOut.error`). Migration/model §1 → Task 2; service §2 → Tasks 4,5; router §3 → Task 6; DTO §4 → Task 3; settings §5 → Task 1; web §6 → Tasks 7,8. Acceptance 1 (`202`+pending) → Task 6; 2 (sync `4xx`, no row) → Task 4 tests; 3 (`pending→running→done`, metrics unchanged) → Task 5 + Task 9 regression; 4 (`failed`+`error`, never stuck) → Task 5; 5 (bounded) → Task 5 semaphore; 6 (web polls/states) → Task 8; 7 (gates, byte-equivalent) → Task 9. The M3 secret-in-memory point → Task 6 (router passes `body` to `run_audit_job`) + Task 5 (`run_audit_job` takes `body`).

**2. Placeholder scan:** No TBD/"handle errors". `<REAL_APP_SESSION_MAKER>` and `_audit_config_for(body)` are explicit "read the real X and substitute" markers, each with a precise instruction of what the real thing is — the same proven style as prior plans (the engineer reads the real `app/core/db.py` session factory / the real per-module `config` jsonb). Task 6's test snippet `{...M1 body...}` instructs reusing the file's existing M1/M2/M3 request bodies verbatim. Tasks 4/6/8 say "read the real X" — precise intended-change specs against real anchors, not vague placeholders.

**3. Type consistency:** `submit_audit(session, *, org_id, user_id, body, llm_provider) -> AuditOut` (Task 4) ↔ called by the router (Task 6). `compute_m{1,2,3}_audit(session, audit, body, *, llm_provider)` (Task 4) ↔ dispatched in `run_audit_job` (Task 5). `run_audit_job(audit_id, body, llm_provider, *, session_maker)` (Task 5) ↔ `asyncio.create_task(run_audit_job(out.id, body, llm_provider))` in the router (Task 6, default session_maker). `_load_audit` (Task 4) ↔ used by `run_audit_job` (Task 5). `audits.error` column (Task 2) ↔ `Audit.error` (Task 2) ↔ `AuditOut.error` (Task 3) ↔ web `AuditOut.error` (Task 7) ↔ rendered (Task 8). `audit_max_concurrency` (Task 1) ↔ `_get_audit_semaphore` (Task 5). Statuses `pending`/`running`/`done`/`failed` consistent across model, service, DTO, web. The thin `run_m{1,2,3}_audit` wrappers exist only between Task 4 and Task 6 (added in 4, deleted in 6) — no dangling reference after Task 6.
