# API Foundation & Auth Implementation Plan (Plan 2A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the AuditIQ FastAPI foundation — typed config, async SQLAlchemy, structured logging, RFC 7807 errors, Supabase JWKS JWT verification with lazy org/user provisioning, the 5 persistence models, an Alembic migration (with Postgres RLS), and `health` + `auth/me` endpoints — producing a runnable, authenticated API with a database.

**Architecture:** Layered per spec §2/§7 — `core/` (config, db, logging, errors, security, deps), `models/` (SQLAlchemy 2 declarative, portable types), `migrations/` (Alembic, RLS emitted only on PostgreSQL), `routers/` (health, auth). Tests run on **SQLite (aiosqlite)** via `Base.metadata.create_all`; production/dev uses Supabase Postgres via asyncpg. Org isolation is enforced in the service layer (Plan 2B); RLS policies are defense-in-depth (spec §6, ADR 0002). This is Plan 2A of the API; Plan 2B adds datasets/audit/interpretation/dashboard.

**Tech Stack:** FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2 async, asyncpg, Alembic, PyJWT[crypto], structlog, httpx, pytest (+pytest-asyncio auto), aiosqlite. Package manager: `uv` (run from `apps/api`). pnpm/uv repo — never `npm install`.

---

## File Structure

```
apps/api/
├── alembic.ini                         # Alembic config (script_location=migrations)
├── pyproject.toml                      # + aiosqlite dev dep
├── app/
│   ├── core/
│   │   ├── config.py                   # Settings (pydantic-settings) + get_settings()
│   │   ├── logging.py                  # configure_logging() / get_logger()
│   │   ├── errors.py                   # Problem, APIError + subclasses, handlers
│   │   ├── db.py                       # Base, make_engine, get_session
│   │   ├── security.py                 # JWKS client, verify_token, resolve_signing_key
│   │   └── deps.py                     # get_current_user (lazy org/user provisioning)
│   ├── models/
│   │   ├── __init__.py                 # re-exports Base + 5 models
│   │   ├── organization.py · user.py · dataset.py · audit.py · audit_result.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── auth.py                     # CurrentUser
│   ├── routers/
│   │   ├── __init__.py · health.py · auth.py
│   └── main.py                         # create_app()
├── migrations/
│   ├── env.py · script.py.mako
│   └── versions/0001_initial.py        # tables + RLS (postgresql only)
└── tests/api/
    ├── __init__.py · test_config.py · test_logging.py · test_errors.py
    ├── test_db.py · test_models.py · test_migrations.py · test_security.py
    ├── test_deps.py · test_app.py
```

Commit convention: Conventional Commits; every commit message ends with a blank line then
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Use
`git -c core.autocrlf=false commit -m "<subject>` … (Windows LF). **Never `git push`** — integration is handled by the controller.

---

### Task 1: Config + dev deps + test package

**Files:**
- Modify: `apps/api/pyproject.toml` (add `aiosqlite` dev dep)
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/tests/api/__init__.py` (empty)
- Test: `apps/api/tests/api/test_config.py`

- [ ] **Step 1: Add aiosqlite dev dependency**

In `apps/api/pyproject.toml`, in `[project.optional-dependencies]` `dev = [ ... ]`, add this line after `"respx>=0.21.1",`:

```toml
  "aiosqlite>=0.20.0",
```

- [ ] **Step 2: Install**

Run from `apps/api`:

```bash
uv sync --extra dev
```

Expected: resolves and installs `aiosqlite`.

- [ ] **Step 3: Create the test package marker**

Create `apps/api/tests/api/__init__.py` as an empty (0-byte) file.

- [ ] **Step 4: Write the failing test**

Create `apps/api/tests/api/test_config.py`:

```python
from app.core.config import Settings, get_settings


def test_defaults_are_safe_for_dev():
    s = Settings(_env_file=None)
    assert s.api_env == "development"
    assert s.supabase_db_url.startswith("sqlite+aiosqlite")
    assert s.cors_origins == ["http://localhost:3000"]


def test_env_override_and_derived_urls(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://proj.supabase.co/")
    monkeypatch.setenv("API_CORS_ORIGINS", "http://a.com, http://b.com")
    s = Settings(_env_file=None)
    assert s.jwks_url == "https://proj.supabase.co/auth/v1/.well-known/jwks.json"
    assert s.cors_origins == ["http://a.com", "http://b.com"]


def test_get_settings_is_cached():
    assert get_settings() is get_settings()
```

- [ ] **Step 5: Run test to verify it fails**

Run: `uv run pytest tests/api/test_config.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.config'`.

- [ ] **Step 6: Write minimal implementation**

Create `apps/api/app/core/config.py`:

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    api_env: str = "development"
    supabase_url: str = "https://example.supabase.co"
    supabase_db_url: str = "sqlite+aiosqlite:///./auditiq_dev.db"
    supabase_service_role_key: str = ""
    api_cors_origins: str = "http://localhost:3000"
    api_log_level: str = "info"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 7: Run test to verify it passes**

Run: `uv run pytest tests/api/test_config.py -q`
Expected: PASS (3 passed).

- [ ] **Step 8: Commit**

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/app/core/config.py apps/api/tests/api/__init__.py apps/api/tests/api/test_config.py
git -c core.autocrlf=false commit -m "feat(api): typed settings + aiosqlite test dep

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Structured logging

**Files:**
- Create: `apps/api/app/core/logging.py`
- Test: `apps/api/tests/api/test_logging.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_logging.py`:

```python
import structlog

from app.core.logging import configure_logging, get_logger


def test_logging_emits_structured_event():
    configure_logging()
    with structlog.testing.capture_logs() as logs:
        get_logger("test").info("hello", rows=3)
    assert logs[0]["event"] == "hello"
    assert logs[0]["rows"] == 3
    assert logs[0]["log_level"] == "info"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_logging.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.logging'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/core/logging.py`:

```python
import logging
import sys
from typing import cast

import structlog
import structlog.typing

from app.core.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.api_log_level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.EventRenamer("message"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = "auditiq") -> structlog.typing.FilteringBoundLogger:
    return cast(structlog.typing.FilteringBoundLogger, structlog.get_logger(name))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_logging.py -q`
Expected: PASS (1 passed). `structlog.testing.capture_logs` intercepts before the
configured processors, so the raw `event`/`log_level` keys are asserted.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/logging.py apps/api/tests/api/test_logging.py
git -c core.autocrlf=false commit -m "feat(api): structlog JSON logging config

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: RFC 7807 errors

**Files:**
- Create: `apps/api/app/core/errors.py`
- Test: `apps/api/tests/api/test_errors.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_errors.py`:

```python
import httpx
import pytest
from fastapi import FastAPI

from app.core.errors import AuthError, NotFoundError, register_exception_handlers


@pytest.fixture
def client():
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/missing")
    async def _missing() -> dict[str, str]:
        raise NotFoundError("dataset introuvable")

    @app.get("/secret")
    async def _secret() -> dict[str, str]:
        raise AuthError()

    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://t")


async def test_not_found_problem(client):
    async with client as c:
        r = await c.get("/missing")
    assert r.status_code == 404
    body = r.json()
    assert body["title"] == "Not Found"
    assert body["status"] == 404
    assert body["detail"] == "dataset introuvable"
    assert "fields" not in body


async def test_auth_error_problem(client):
    async with client as c:
        r = await c.get("/secret")
    assert r.status_code == 401
    assert r.json()["title"] == "Unauthorized"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_errors.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.errors'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/core/errors.py`:

```python
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class Problem(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    fields: dict[str, str] | None = None


class APIError(Exception):
    status: int = 500
    title: str = "Internal Server Error"

    def __init__(
        self,
        detail: str | None = None,
        *,
        fields: dict[str, str] | None = None,
        title: str | None = None,
        status: int | None = None,
    ) -> None:
        self.detail = detail
        self.fields = fields
        if title is not None:
            self.title = title
        if status is not None:
            self.status = status
        super().__init__(detail or self.title)

    def to_problem(self) -> Problem:
        return Problem(
            title=self.title,
            status=self.status,
            detail=self.detail,
            fields=self.fields,
        )


class NotFoundError(APIError):
    status = 404
    title = "Not Found"


class AuthError(APIError):
    status = 401
    title = "Unauthorized"


class ValidationProblemError(APIError):
    status = 422
    title = "Validation Error"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def _api_error(_: Request, exc: APIError) -> JSONResponse:
        problem = exc.to_problem()
        return JSONResponse(
            status_code=problem.status,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = {
            ".".join(str(p) for p in e["loc"] if p != "body"): e["msg"]
            for e in exc.errors()
        }
        problem = Problem(
            title="Validation Error",
            status=422,
            detail="La requête est invalide.",
            fields=fields,
        )
        return JSONResponse(
            status_code=422,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_errors.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/errors.py apps/api/tests/api/test_errors.py
git -c core.autocrlf=false commit -m "feat(api): RFC 7807 problem responses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Async DB layer

**Files:**
- Create: `apps/api/app/core/db.py`
- Test: `apps/api/tests/api/test_db.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_db.py`:

```python
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import make_engine


async def test_engine_executes_select(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'x.db'}"
    eng = make_engine(url)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    async with sm() as s:
        result = await s.execute(text("select 1"))
        assert result.scalar_one() == 1
    await eng.dispose()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_db.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.db'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/core/db.py`:

```python
from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> AsyncEngine:
    return create_async_engine(url, future=True, pool_pre_ping=True)


@lru_cache
def _sessionmaker() -> async_sessionmaker[AsyncSession]:
    engine = make_engine(get_settings().supabase_db_url)
    return async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _sessionmaker()() as session:
        yield session
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_db.py -q`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/db.py apps/api/tests/api/test_db.py
git -c core.autocrlf=false commit -m "feat(api): async SQLAlchemy engine + session dependency

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Persistence models

**Files:**
- Create: `apps/api/app/models/__init__.py`
- Create: `apps/api/app/models/organization.py`, `user.py`, `dataset.py`, `audit.py`, `audit_result.py`
- Test: `apps/api/tests/api/test_models.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_models.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_models.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/models/organization.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _default_settings() -> dict[str, object]:
    return {"llm_provider": "gemini", "di_threshold": 0.8, "retention_days": 30}


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    settings: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=_default_settings,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

Create `apps/api/app/models/user.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    # id == Supabase auth user id (not auto-generated)
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    first_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="owner")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

Create `apps/api/app/models/dataset.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    columns: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ready")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

Create `apps/api/app/models/audit.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)
    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("datasets.id"), nullable=False
    )
    module: Mapped[str] = mapped_column(String(8), nullable=False, default="M1")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    protected_attribute: Mapped[str] = mapped_column(String(255), nullable=False)
    decision_column: Mapped[str] = mapped_column(String(255), nullable=False)
    favorable_value: Mapped[str] = mapped_column(String(255), nullable=False)
    privileged_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

Create `apps/api/app/models/audit_result.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AuditResult(Base):
    __tablename__ = "audit_results"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True
    )
    metrics: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    interpretation: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

Create `apps/api/app/models/__init__.py`:

```python
from app.core.db import Base
from app.models.audit import Audit
from app.models.audit_result import AuditResult
from app.models.dataset import Dataset
from app.models.organization import Organization
from app.models.user import User

__all__ = ["Base", "Organization", "User", "Dataset", "Audit", "AuditResult"]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_models.py -q`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/models/
git add apps/api/tests/api/test_models.py
git -c core.autocrlf=false commit -m "feat(api): SQLAlchemy models (org/user/dataset/audit/result)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Alembic migration with conditional RLS

**Files:**
- Create: `apps/api/alembic.ini`
- Create: `apps/api/migrations/env.py`, `apps/api/migrations/script.py.mako`
- Create: `apps/api/migrations/versions/0001_initial.py`
- Test: `apps/api/tests/api/test_migrations.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_migrations.py`:

```python
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_upgrade_then_downgrade_on_sqlite(tmp_path, monkeypatch):
    db = tmp_path / "mig.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    assert {
        "organizations",
        "users",
        "datasets",
        "audits",
        "audit_results",
    } <= set(insp.get_table_names())

    command.downgrade(cfg, "base")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    assert "organizations" not in insp2.get_table_names()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_migrations.py -q`
Expected: FAIL — `FileNotFoundError`/`No config file 'alembic.ini' found`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/alembic.ini`:

```ini
[alembic]
script_location = migrations
prepend_sys_path = .

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARNING
handlers = console
qualname =

[logger_sqlalchemy]
level = WARNING
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

Create `apps/api/migrations/script.py.mako`:

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

Create `apps/api/migrations/env.py`:

```python
import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401  (registers tables on Base.metadata)
from app.core.config import get_settings
from app.core.db import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _url() -> str:
    return os.environ.get("SUPABASE_DB_URL") or get_settings().supabase_db_url


def _do_run(connection: Connection) -> None:
    context.configure(
        connection=connection, target_metadata=target_metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()


async def _run_online() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as conn:
        await conn.run_sync(_do_run)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(
        url=_url(), target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(_run_online())
```

Create `apps/api/migrations/versions/0001_initial.py`:

```python
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-15
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

_JSON = sa.JSON().with_variant(JSONB, "postgresql")
_TABLES = ("organizations", "users", "datasets", "audits", "audit_results")


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("settings", _JSON, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("first_name", sa.String(120), nullable=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_org_id", "users", ["org_id"])
    op.create_table(
        "datasets",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "uploaded_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("columns", _JSON, nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_datasets_org_id", "datasets", ["org_id"])
    op.create_table(
        "audits",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(32), nullable=True, unique=True),
        sa.Column(
            "org_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "dataset_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("datasets.id"),
            nullable=False,
        ),
        sa.Column("module", sa.String(8), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("protected_attribute", sa.String(255), nullable=False),
        sa.Column("decision_column", sa.String(255), nullable=False),
        sa.Column("favorable_value", sa.String(255), nullable=False),
        sa.Column("privileged_value", sa.String(255), nullable=True),
        sa.Column(
            "created_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_audits_org_id", "audits", ["org_id"])
    op.create_table(
        "audit_results",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "audit_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("audits.id"),
            nullable=False,
        ),
        sa.Column("metrics", _JSON, nullable=False),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("interpretation", _JSON, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_audit_results_audit_id", "audit_results", ["audit_id"])

    # RLS is PostgreSQL-only (Supabase). The API connects as the owner role
    # (RLS-exempt) and enforces org scoping in the service layer (spec §6 /
    # ADR 0002). These deny-all policies are defense-in-depth for any direct
    # anon/authenticated Supabase access.
    if op.get_bind().dialect.name == "postgresql":
        for table in _TABLES:
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
            op.execute(
                f"CREATE POLICY no_direct_access ON {table} FOR ALL "
                f"TO anon, authenticated USING (false) WITH CHECK (false)"
            )


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.drop_table(table)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_migrations.py -q`
Expected: PASS (1 passed). The migration creates all tables on SQLite; the RLS
block is skipped because `dialect.name != "postgresql"`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/alembic.ini apps/api/migrations/ apps/api/tests/api/test_migrations.py
git -c core.autocrlf=false commit -m "feat(api): Alembic initial migration + Postgres RLS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Supabase JWKS JWT verification

**Files:**
- Create: `apps/api/app/core/security.py`
- Test: `apps/api/tests/api/test_security.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_security.py`:

```python
import datetime

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.errors import AuthError
from app.core.security import verify_token


@pytest.fixture
def keypair():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return priv, priv.public_key()


def _token(priv, **over):
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    payload = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "email": "u@acme.fr",
        "aud": "authenticated",
        "exp": now + datetime.timedelta(hours=1),
        "iat": now,
    }
    payload.update(over)
    return jwt.encode(payload, priv, algorithm="RS256")


def test_verify_valid_token(keypair):
    priv, pub = keypair
    claims = verify_token(_token(priv), key=pub)
    assert claims["sub"] == "11111111-1111-1111-1111-111111111111"
    assert claims["email"] == "u@acme.fr"


def test_expired_token_raises_auth_error(keypair):
    priv, pub = keypair
    past = datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(
        hours=2
    )
    with pytest.raises(AuthError):
        verify_token(_token(priv, exp=past), key=pub)


def test_wrong_audience_raises(keypair):
    priv, pub = keypair
    with pytest.raises(AuthError):
        verify_token(_token(priv, aud="other"), key=pub)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_security.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.security'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/core/security.py`:

```python
from __future__ import annotations

from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient

from app.core.config import get_settings
from app.core.errors import AuthError

_ALGORITHMS = ["RS256", "ES256"]
_AUDIENCE = "authenticated"


@lru_cache
def get_jwks_client() -> PyJWKClient:
    return PyJWKClient(get_settings().jwks_url)


def resolve_signing_key(token: str, *, jwks_client: PyJWKClient | None = None) -> Any:
    client = jwks_client or get_jwks_client()
    try:
        return client.get_signing_key_from_jwt(token).key
    except jwt.PyJWTError as exc:
        raise AuthError("Jeton invalide (clé de signature introuvable).") from exc


def verify_token(token: str, *, key: Any) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            key,
            algorithms=_ALGORITHMS,
            audience=_AUDIENCE,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthError("Jeton invalide ou expiré.") from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_security.py -q`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/security.py apps/api/tests/api/test_security.py
git -c core.autocrlf=false commit -m "feat(api): Supabase JWKS JWT verification

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Auth dependency + lazy org/user provisioning

**Files:**
- Create: `apps/api/app/schemas/__init__.py` (empty), `apps/api/app/schemas/auth.py`
- Create: `apps/api/app/core/deps.py`
- Test: `apps/api/tests/api/test_deps.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_deps.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_deps.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.deps'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/schemas/__init__.py` as an empty (0-byte) file.

Create `apps/api/app/schemas/auth.py`:

```python
from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class CurrentUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    org_id: uuid.UUID
    role: str
```

Create `apps/api/app/core/deps.py`:

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import AuthError
from app.core.security import resolve_signing_key, verify_token
from app.models import Organization, User
from app.schemas.auth import CurrentUser


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("En-tête Authorization Bearer manquant ou invalide.")
    return authorization.split(" ", 1)[1].strip()


async def _provision(session: AsyncSession, uid: uuid.UUID, email: str) -> User:
    domain = email.split("@")[-1] if "@" in email else "organisation"
    org = Organization(name=domain)
    session.add(org)
    await session.flush()
    user = User(id=uid, org_id=org.id, email=email, role="owner")
    session.add(user)
    await session.commit()
    return user


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(get_session),
) -> CurrentUser:
    token = _bearer(authorization)
    key = resolve_signing_key(token)
    claims = verify_token(token, key=key)
    sub = claims.get("sub")
    email = claims.get("email")
    if not sub or not email:
        raise AuthError("Jeton sans 'sub' ou 'email'.")
    uid = uuid.UUID(str(sub))
    user = (
        await session.execute(select(User).where(User.id == uid))
    ).scalar_one_or_none()
    if user is None:
        user = await _provision(session, uid, str(email))
    return CurrentUser.model_validate(user)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_deps.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/ apps/api/app/core/deps.py apps/api/tests/api/test_deps.py
git -c core.autocrlf=false commit -m "feat(api): auth dependency with lazy org/user provisioning

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Routers + app wiring + integration tests

**Files:**
- Create: `apps/api/app/routers/__init__.py` (empty), `apps/api/app/routers/health.py`, `apps/api/app/routers/auth.py`
- Create: `apps/api/app/main.py`
- Test: `apps/api/tests/api/test_app.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_app.py`:

```python
import uuid

import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.main import create_app


@pytest.fixture
async def app_client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'app.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps,
        "verify_token",
        lambda token, *, key: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "claire@acme.fr",
        },
    )

    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
        yield client
    await eng.dispose()


async def test_health_ok(app_client):
    r = await app_client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_me_requires_auth(app_client):
    r = await app_client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["title"] == "Unauthorized"


async def test_me_provisions_then_is_idempotent(app_client):
    r = await app_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "claire@acme.fr"
    assert body["role"] == "owner"
    assert uuid.UUID(body["id"]) == uuid.UUID(
        "11111111-1111-1111-1111-111111111111"
    )
    r2 = await app_client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer x"}
    )
    assert r2.status_code == 200
    assert r2.json()["org_id"] == body["org_id"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_app.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/routers/__init__.py` as an empty (0-byte) file.

Create `apps/api/app/routers/health.py`:

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

Create `apps/api/app/routers/auth.py`:

```python
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUser)
async def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    return user
```

Create `apps/api/app/main.py`:

```python
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.routers import auth, health

API_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(
        title="AuditIQ API",
        version="0.1.0",
        docs_url=f"{API_PREFIX}/docs",
        openapi_url=f"{API_PREFIX}/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(health.router, prefix=API_PREFIX)
    app.include_router(auth.router, prefix=API_PREFIX)
    return app


app = create_app()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_app.py -q`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/routers/ apps/api/app/main.py apps/api/tests/api/test_app.py
git -c core.autocrlf=false commit -m "feat(api): app wiring + health and auth/me endpoints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Full-suite gate, lint, type-check, docs

**Files:**
- Modify: `apps/api/README.md` (env note)

- [ ] **Step 1: Run the entire test suite**

Run from `apps/api`:

```bash
uv run pytest -q
```

Expected: PASS — all `tests/audit_engine` (40) **and** all `tests/api` tests green,
0 failed. If any fail, fix the implementation (never weaken tests) and re-run.

- [ ] **Step 2: Lint**

Run from `apps/api`:

```bash
uv run ruff check app tests
```

Expected: `All checks passed!`. Fix any reported issue minimally without changing
behavior or weakening tests, then re-run until clean.

- [ ] **Step 3: Type-check**

Run from `apps/api`:

```bash
uv run mypy app
```

Expected: `Success: no issues found`. (`pyproject.toml` excludes `migrations/` and
`tests/` from mypy.) Fix typing issues minimally; do not add `# type: ignore`
without a specific reason.

- [ ] **Step 4: Document the env contract**

In `apps/api/README.md`, under the `## Run` section, add this note immediately
after the fenced run block:

```markdown
### Environment

`Settings` reads `apps/api/.env` (working dir = `apps/api`). Required keys for a
real run (defaults are SQLite/dev-safe so tests need no secrets):

- `SUPABASE_URL` — e.g. `https://jiwexpgcfhnsugouzzvg.supabase.co` (used to derive
  the public JWKS URL `…/auth/v1/.well-known/jwks.json`; no secret needed).
- `SUPABASE_DB_URL` — `postgresql+asyncpg://…` (Supabase Postgres).
- `SUPABASE_SERVICE_ROLE_KEY` — used by Plan 2B (Storage); keep server-side only.

Consolidate all API secrets into `apps/api/.env` (not the repo-root `.env`).
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/README.md
git -c core.autocrlf=false commit -m "docs(api): document apps/api/.env contract

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (spec §2/§3/§5/§7/§8):**
- §2 layering (core/models/schemas/routers; services/integrations/interpretation are Plan 2B) → Tasks 1–9.
- §3 data model — `organizations`, `users`, `datasets`, `audits`, `audit_results` with the exact columns (settings jsonb, expires_at, code, status, metrics/interpretation jsonb) → Task 5; migration mirrors them → Task 6.
- §7 auth — Supabase JWT verified via **public JWKS** with PyJWT (`verify_token`/`resolve_signing_key`) → Task 7; `get_current_user` loads/creates the `users` row and exposes `org_id` (lazy provisioning replaces the signup-trigger for the slice) → Task 8; RLS policies written in the migration, Postgres-only, with the service-layer-scoping decision documented (ADR 0002 rationale in the migration comment) → Task 6.
- §7 web/SSO and service-layer org scoping enforcement → Plan 2B (noted, not a gap here).
- §8 errors — RFC 7807 `Problem` envelope (`type/title/status/detail/fields`) + handlers → Task 3; structlog JSON, no PII (config only; message hygiene is per-call in 2B) → Task 2.
- §9 testing — async tests on SQLite, fake-JWT/auth override, httpx ASGI, RFC7807 shape assertions → Tasks 1–9; SlowAPI rate-limiting is explicitly deferred to Plan 2B.

**2. Placeholder scan:** every step ships complete code and an exact command with expected output. No TBD/TODO. SlowAPI, services, integrations, interpretation, datasets/audits/dashboard routers are *out of scope for 2A by design* (Plan 2B), not placeholders.

**3. Type consistency:** `Settings`/`get_settings`, `Base`/`make_engine`/`get_session`, `Problem`/`APIError`/`NotFoundError`/`AuthError`/`register_exception_handlers`, models `Organization/User/Dataset/Audit/AuditResult` (and `app.models` re-export), `verify_token(token, *, key)` / `resolve_signing_key(token, *, jwks_client=None)`, `_bearer`/`_provision`/`get_current_user`, `CurrentUser`, `create_app`/`API_PREFIX` are used identically across tasks. The Alembic `0001_initial` columns match the Task 5 models exactly (name/type/nullable/index/unique). Tests monkeypatch `deps.verify_token`/`deps.resolve_signing_key` (the names `get_current_user` actually calls), which is why they are imported into `deps` by name.

**Carry-forward (Plan 2B) — recorded, not gaps here:** numeric/boolean column normalization before `run_m1`; export a `verdict` Literal/constants alongside DTOs; map `audit_engine.DatasetValidationError` (`.field` may be `None`) to the RFC 7807 envelope; never recompute the verdict band from the rounded `disparate_impact`; SlowAPI rate limits (`60/min`, `10/min` on auth/upload); service-layer `org_id` scoping on every query.
