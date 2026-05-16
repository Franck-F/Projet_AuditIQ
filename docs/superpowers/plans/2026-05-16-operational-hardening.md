# Operational Hardening Implementation Plan (Plan 2D)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four operational/security gaps carried forward from Plan-2A/2B/2C reviews: reject `API_CORS_ORIGINS=*` outside dev, disable Swagger/OpenAPI outside dev, add SlowAPI rate limiting with an RFC 7807 429, and make lazy org/user provisioning safe under concurrent first-requests.

**Architecture:** All changes are in the API foundation: `core/config.py` (CORS-`*` validator + rate-limit setting), `main.py` (env-gated docs + SlowAPI wiring), new `core/ratelimit.py` (Limiter + 429 handler), `core/deps.py` (`_provision` IntegrityError recovery). No new product surface; tests on SQLite + httpx ASGI.

**Tech Stack:** FastAPI, pydantic-settings, SlowAPI (already a dep), SQLAlchemy 2 async. `uv` from `apps/api`. pnpm/uv repo — never `npm install`.

---

## File Structure

```
apps/api/app/
├── core/config.py      # MODIFY: + api_rate_limit_default; CORS-* guard in validator
├── core/ratelimit.py   # NEW: limiter + RFC7807 RateLimitExceeded handler
├── core/deps.py        # MODIFY: _provision IntegrityError → rollback + re-query
└── main.py             # MODIFY: env-gated docs/openapi; SlowAPI state+middleware+handler
apps/api/tests/api/
  test_config_cors_guard.py · test_swagger_off.py · test_ratelimit.py
  · test_provision_race.py
```

Conventions: Conventional Commits; commit messages end with a blank line then
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`; use
`git -c core.autocrlf=false commit`. Never `git push` (controller integrates).

---

### Task 1: Reject `API_CORS_ORIGINS=*` outside development

**Files:**
- Modify: `apps/api/app/core/config.py`
- Test: `apps/api/tests/api/test_config_cors_guard.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_config_cors_guard.py`:

```python
import pytest
from pydantic import ValidationError

from app.core.config import Settings

_PROD = {
    "api_env": "production",
    "supabase_url": "https://p.supabase.co",
    "supabase_db_url": "postgresql+asyncpg://u:p@h:5432/d",
    "supabase_service_role_key": "k",
}


def test_wildcard_cors_rejected_outside_dev():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, api_cors_origins="*", **_PROD)


def test_wildcard_cors_allowed_in_dev():
    s = Settings(_env_file=None, api_env="development", api_cors_origins="*")
    assert s.cors_origins == ["*"]


def test_explicit_cors_ok_in_prod():
    s = Settings(_env_file=None, api_cors_origins="https://app.auditiq.fr",
                 **_PROD)
    assert s.cors_origins == ["https://app.auditiq.fr"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_config_cors_guard.py -q`
Expected: FAIL — `test_wildcard_cors_rejected_outside_dev` does not raise.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/core/config.py`, in `_require_secrets_outside_dev`, replace the
final `return self` of the non-dev path so the method ends like this (keep the
existing `if self.api_env.lower() == "development": return self` and the
`missing` block exactly as they are; only add the CORS check before the final
`return self`):

```python
        if missing:
            raise ValueError(
                "Variables requises hors environnement de développement "
                f"manquantes : {', '.join(missing)}"
            )
        if "*" in self.cors_origins:
            raise ValueError(
                "API_CORS_ORIGINS='*' est interdit hors développement "
                "(incompatible avec allow_credentials=True)."
            )
        return self
```

Also add the rate-limit setting now (used by Task 3) — add this field
immediately after the `gemini_model: str = "gemini-1.5-pro"` line:

```python
    api_rate_limit_default: str = "60/minute"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_config_cors_guard.py tests/api/test_config.py tests/api/test_config_storage.py tests/api/test_config_gemini.py -q`
Expected: PASS (all green — the new guard + the existing config tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/config.py apps/api/tests/api/test_config_cors_guard.py
git -c core.autocrlf=false commit -m "feat(api): reject wildcard CORS outside dev; rate-limit setting

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Disable Swagger/OpenAPI outside development

**Files:**
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/api/test_swagger_off.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_swagger_off.py`:

```python
import httpx
import pytest

from app.core import config
from app.main import create_app

_PROD_ENV = {
    "API_ENV": "production",
    "SUPABASE_URL": "https://p.supabase.co",
    "SUPABASE_DB_URL": "postgresql+asyncpg://u:p@h:5432/d",
    "SUPABASE_SERVICE_ROLE_KEY": "k",
    "API_CORS_ORIGINS": "https://app.auditiq.fr",
}


@pytest.fixture
def _clear_settings_cache():
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


async def test_docs_disabled_in_production(monkeypatch, _clear_settings_cache):
    for k, v in _PROD_ENV.items():
        monkeypatch.setenv(k, v)
    config.get_settings.cache_clear()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        assert (await c.get("/api/v1/docs")).status_code == 404
        assert (await c.get("/api/v1/openapi.json")).status_code == 404


async def test_docs_enabled_in_dev(_clear_settings_cache):
    config.get_settings.cache_clear()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        assert (await c.get("/api/v1/openapi.json")).status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_swagger_off.py -q`
Expected: FAIL — `test_docs_disabled_in_production` gets 200 on `/api/v1/openapi.json`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/main.py`, replace the `FastAPI(...)` construction inside
`create_app()`. Find:

```python
    app = FastAPI(
        title="AuditIQ API",
        version="0.1.0",
        docs_url=f"{API_PREFIX}/docs",
        openapi_url=f"{API_PREFIX}/openapi.json",
    )
```

Replace with:

```python
    _dev = settings.api_env.lower() == "development"
    app = FastAPI(
        title="AuditIQ API",
        version="0.1.0",
        docs_url=f"{API_PREFIX}/docs" if _dev else None,
        redoc_url=f"{API_PREFIX}/redoc" if _dev else None,
        openapi_url=f"{API_PREFIX}/openapi.json" if _dev else None,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_swagger_off.py -q`
Expected: PASS (2 passed). Re-run `uv run pytest tests/api/test_app.py -q` —
dev-mode app tests still pass (docs enabled in dev/test where `api_env` defaults
to `development`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/main.py apps/api/tests/api/test_swagger_off.py
git -c core.autocrlf=false commit -m "feat(api): disable Swagger/OpenAPI outside development

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: SlowAPI rate limiting + RFC 7807 429

**Files:**
- Create: `apps/api/app/core/ratelimit.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/api/test_ratelimit.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_ratelimit.py`:

```python
import httpx
import pytest

from app.core import config
from app.main import create_app


@pytest.fixture
def _clear_settings_cache():
    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


async def test_rate_limit_returns_429_problem(monkeypatch, _clear_settings_cache):
    monkeypatch.setenv("API_RATE_LIMIT_DEFAULT", "2/minute")
    config.get_settings.cache_clear()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        r1 = await c.get("/api/v1/health")
        r2 = await c.get("/api/v1/health")
        r3 = await c.get("/api/v1/health")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    body = r3.json()
    assert body["title"] == "Too Many Requests"
    assert body["status"] == 429
    assert r3.headers["content-type"].startswith("application/problem+json")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_ratelimit.py -q`
Expected: FAIL — third request returns 200 (no limiter), or
`ModuleNotFoundError: No module named 'app.core.ratelimit'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/core/ratelimit.py`:

```python
from __future__ import annotations

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.errors import Problem

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[lambda: get_settings().api_rate_limit_default],
)


def rate_limit_handler(_: Request, exc: Exception) -> Response:
    detail = exc.detail if isinstance(exc, RateLimitExceeded) else "limite atteinte"
    problem = Problem(
        title="Too Many Requests",
        status=429,
        detail=f"Limite de débit dépassée ({detail}).",
    )
    return JSONResponse(
        status_code=429,
        content=problem.model_dump(exclude_none=True),
        media_type="application/problem+json",
    )
```

In `apps/api/app/main.py`, add imports (with the other `app.core` imports):

```python
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.ratelimit import limiter, rate_limit_handler
```

Then inside `create_app()`, immediately after `register_exception_handlers(app)`,
add:

```python
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_ratelimit.py -q`
Expected: PASS (1 passed). `httpx.ASGITransport` presents a stable client
(`127.0.0.1`), so `get_remote_address` yields a consistent key and the 3rd call
exceeds `2/minute`. Re-run `uv run pytest tests/api/test_app.py tests/api/test_datasets_router.py tests/api/test_audits_router.py tests/api/test_dashboard_router.py -q` — all green (default `60/minute` is far above per-test request counts).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/ratelimit.py apps/api/app/main.py apps/api/tests/api/test_ratelimit.py
git -c core.autocrlf=false commit -m "feat(api): SlowAPI rate limiting with RFC 7807 429

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Concurrent-provision race recovery

**Files:**
- Modify: `apps/api/app/core/deps.py`
- Test: `apps/api/tests/api/test_provision_race.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_provision_race.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_provision_race.py -q`
Expected: FAIL — second `_provision` raises `sqlalchemy.exc.IntegrityError`
(duplicate `users.id` PK / `email` unique).

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/core/deps.py`, add imports (with the other imports):

```python
from sqlalchemy.exc import IntegrityError
```

(`select` and `User` are already imported in deps.py from Plan 2A.)

Replace the whole `_provision` function with:

```python
async def _provision(session: AsyncSession, uid: uuid.UUID, email: str) -> User:
    domain = email.split("@")[-1] if "@" in email else "organisation"
    org = Organization(name=domain)
    session.add(org)
    await session.flush()
    user = User(id=uid, org_id=org.id, email=email, role="owner")
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        # A concurrent first-request already created this user; the orphan
        # org from this losing transaction is discarded by the rollback.
        await session.rollback()
        existing = (
            await session.execute(select(User).where(User.id == uid))
        ).scalar_one_or_none()
        if existing is None:
            raise
        return existing
    return user
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_provision_race.py -q`
Expected: PASS (1 passed). Re-run `uv run pytest tests/api/test_deps.py tests/api/test_app.py -q` — existing provisioning tests still green (happy path: no IntegrityError, returns the new user).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/deps.py apps/api/tests/api/test_provision_race.py
git -c core.autocrlf=false commit -m "fix(api): recover from concurrent org/user provisioning race

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full gate, lint, type-check, docs

**Files:**
- Modify: `apps/api/README.md`

- [ ] **Step 1: Full suite** — from `apps/api`: `uv run pytest -q`
Expected: PASS, 0 failed (engine + 2A + 2B + 2C + the 4 new 2D tests). If any
fail, fix the implementation (never weaken tests).

- [ ] **Step 2: Lint** — `uv run ruff check app tests` → `All checks passed!`.
  The `lambda: get_settings()...` default-limit callable and the SlowAPI handler
  signature are intentional; `# noqa: B008` only on FastAPI `Depends` (none added
  here). Fix any real issue minimally.

- [ ] **Step 3: Type-check** — `uv run mypy app` → `Success: no issues found`.
  SlowAPI ships partial types; if mypy strict flags an unavoidable SlowAPI
  boundary (e.g. `Limiter`/`RateLimitExceeded.detail`), add a narrowly-scoped
  `# type: ignore[<code>]` ONLY on that line with a one-line justification — do
  not change behavior.

- [ ] **Step 4: Update README**

In `apps/api/README.md`, under the `#### Interpretation & dashboard (Plan 2C)`
block, append:

```markdown

#### Operational hardening (Plan 2D)

Outside `API_ENV=development`: `API_CORS_ORIGINS=*` is rejected at startup and
Swagger/OpenAPI (`/api/v1/docs`,`/redoc`,`/openapi.json`) are disabled. All
routes are rate-limited (`API_RATE_LIMIT_DEFAULT`, default `60/minute`) — over
the limit returns RFC 7807 `429`. Lazy org/user provisioning recovers from a
concurrent first-request race (IntegrityError → rollback → re-read).
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/README.md
git -c core.autocrlf=false commit -m "docs(api): document operational hardening (Plan 2D)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Coverage (Plan-2A/2B/2C carry-forwards + spec §5/§8 ops):**
- CORS `*` outside dev rejected → Task 1 (validator extended; tests prod-raise / dev-ok / explicit-prod-ok).
- Swagger/OpenAPI off outside dev → Task 2 (env-gated `docs_url`/`redoc_url`/`openapi_url`; prod 404 / dev 200).
- SlowAPI rate limiting + 429 (spec §5/§8 `60/min` default) → Task 3 (`core/ratelimit.py` + middleware; RFC 7807 429; deterministic test via `2/minute`).
- Concurrent-provision race (Plan-2A Task-8 / Plan-2B carry-forward) → Task 4 (`_provision` IntegrityError → rollback → re-query; no orphan org; happy path unchanged).
- All four were explicitly recorded as Plan-2D carry-forwards; none deferred further.

**2. Placeholder scan:** every step ships complete code + exact command/expected output. No TBD/TODO.

**3. Type consistency:** `Problem` reused from `core/errors`; `limiter`/`rate_limit_handler` defined in `core/ratelimit` and imported identically in `main`; `api_rate_limit_default` Settings field added in Task 1 and consumed by the Task-3 limiter callable; `_provision(session, uid, email) -> User` signature unchanged (only its body hardened) so `get_current_user` callers are unaffected. `get_settings.cache_clear()` is valid (lru_cache) and used consistently in the env-dependent tests.
