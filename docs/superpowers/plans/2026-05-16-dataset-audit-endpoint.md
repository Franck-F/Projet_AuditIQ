# Dataset Upload + M1 Audit Endpoint Implementation Plan (Plan 2B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated user upload a CSV and run a real, persisted, org-scoped M1 fairness audit through the API: `POST /datasets` (multipart → stored + parsed) then `POST /audits` (column mapping → `audit_engine.run_m1` → `Audit`+`AuditResult` rows) then `GET /audits/{id}`.

**Architecture:** Builds on merged Plan 1 (pure `app.audit_engine`) + Plan 2A (config/db/auth/errors/models). New layers per spec §2: `integrations/storage.py` (injectable `Storage` protocol — `MemoryStorage` for tests/dev, `SupabaseStorage` for prod), `services/` (`dataset_service`, `audit_service` — orchestration only, no math, every query org-scoped), `schemas/` (Pydantic DTOs incl. a `Verdict` Literal), `routers/` (datasets, audits). Interpretation/dashboard are Plan 2C; operational hardening is Plan 2D.

**Tech Stack:** FastAPI (`UploadFile`), Pydantic v2, SQLAlchemy 2 async, pandas, the merged `app.audit_engine`. Tests on SQLite (aiosqlite) + `MemoryStorage`, no network. `uv` from `apps/api`. pnpm/uv repo — never `npm install`.

---

## File Structure

```
apps/api/app/
├── integrations/__init__.py
├── integrations/storage.py     # Storage (Protocol), MemoryStorage, SupabaseStorage, get_storage
├── services/__init__.py
├── services/dataset_service.py # create_dataset(), get_dataset() — org-scoped
├── services/audit_service.py   # run_m1_audit(), get_audit() — normalize + run_m1 + persist
├── schemas/dataset.py          # DatasetOut
├── schemas/audit.py            # Verdict, GroupStatOut, M1MetricsOut, AuditCreate, AuditOut
├── core/config.py              # MODIFY: + storage_bucket, max_upload_mb, retention_days_default
├── core/errors.py              # MODIFY: + handler audit_engine.DatasetValidationError -> 422
├── routers/datasets.py         # POST /datasets, GET /datasets/{id}
├── routers/audits.py           # POST /audits, GET /audits/{id}
└── main.py                     # MODIFY: include datasets+audits routers
apps/api/tests/api/
  test_storage.py · test_dataset_service.py · test_audit_service.py
  · test_datasets_router.py · test_audits_router.py · test_engine_error_handler.py
```

Conventions (unchanged): Conventional Commits; every commit ends with a blank line then
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`; use
`git -c core.autocrlf=false commit`. **Never `git push`** (controller integrates). Tests via SQLite; `auth` overridden the same way as Plan 2A (`monkeypatch deps.resolve_signing_key/verify_token`, `dependency_overrides[get_session]`).

---

### Task 1: Storage abstraction

**Files:**
- Create: `apps/api/app/integrations/__init__.py` (empty), `apps/api/app/integrations/storage.py`
- Test: `apps/api/tests/api/test_storage.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_storage.py`:

```python
import pytest

from app.integrations.storage import MemoryStorage


async def test_memory_storage_roundtrip():
    s = MemoryStorage()
    await s.upload("org/x.csv", b"a,b\n1,2\n", "text/csv")
    assert await s.download("org/x.csv") == b"a,b\n1,2\n"


async def test_memory_storage_missing_raises_keyerror():
    s = MemoryStorage()
    with pytest.raises(KeyError):
        await s.download("nope")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_storage.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.integrations.storage'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/integrations/__init__.py` as an empty (0-byte) file.

Create `apps/api/app/integrations/storage.py`:

```python
from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.core.config import get_settings


@runtime_checkable
class Storage(Protocol):
    async def upload(self, path: str, data: bytes, content_type: str) -> None: ...

    async def download(self, path: str) -> bytes: ...


class MemoryStorage:
    """In-process storage for tests and local dev. Not persistent."""

    def __init__(self) -> None:
        self._blobs: dict[str, bytes] = {}

    async def upload(self, path: str, data: bytes, content_type: str) -> None:
        self._blobs[path] = data

    async def download(self, path: str) -> bytes:
        return self._blobs[path]


class SupabaseStorage:
    """Supabase Storage bucket access using the service-role key."""

    def __init__(self, *, url: str, service_role_key: str, bucket: str) -> None:
        from supabase import create_client

        self._client = create_client(url, service_role_key)
        self._bucket = bucket

    async def upload(self, path: str, data: bytes, content_type: str) -> None:
        self._client.storage.from_(self._bucket).upload(
            path, data, {"content-type": content_type, "upsert": "true"}
        )

    async def download(self, path: str) -> bytes:
        return self._client.storage.from_(self._bucket).download(path)


def get_storage() -> Storage:
    s = get_settings()
    key = s.supabase_service_role_key.get_secret_value()
    if s.api_env.lower() == "development" or not key:
        return MemoryStorage()
    return SupabaseStorage(
        url=s.supabase_url, service_role_key=key, bucket=s.storage_bucket
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_storage.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/integrations/ apps/api/tests/api/test_storage.py
git -c core.autocrlf=false commit -m "feat(api): injectable Storage (memory + supabase)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Config additions for storage/upload

**Files:**
- Modify: `apps/api/app/core/config.py`
- Test: `apps/api/tests/api/test_config_storage.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_config_storage.py`:

```python
from app.core.config import Settings


def test_storage_defaults():
    s = Settings(_env_file=None)
    assert s.storage_bucket == "datasets"
    assert s.max_upload_mb == 10
    assert s.retention_days_default == 30
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_config_storage.py -q`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'storage_bucket'`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/core/config.py`, add these three fields to the `Settings` class immediately after the `api_log_level: str = "info"` line:

```python
    storage_bucket: str = "datasets"
    max_upload_mb: int = 10
    retention_days_default: int = 30
```

Do not change anything else in `config.py` (keep the validator, properties, `get_settings`).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_config_storage.py -q`
Expected: PASS (1 passed). Also run `uv run pytest tests/api/test_config.py -q` — the 6 Plan-2A config tests must still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/config.py apps/api/tests/api/test_config_storage.py
git -c core.autocrlf=false commit -m "feat(api): storage/upload settings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Audit/dataset DTO schemas (incl. Verdict Literal)

**Files:**
- Create: `apps/api/app/schemas/dataset.py`, `apps/api/app/schemas/audit.py`
- Test: `apps/api/tests/api/test_schemas_audit.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_schemas_audit.py`:

```python
import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, GroupStatOut, M1MetricsOut


def test_audit_create_rejects_extra_fields():
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(),
            title="T",
            protected_attribute="genre",
            decision_column="decision",
            favorable_value="oui",
            surprise="x",
        )


def test_m1_metrics_out_shape():
    m = M1MetricsOut(
        groups=[GroupStatOut(value="F", n=10, favorable=4, selection_rate=0.4,
                             disparate_impact=0.8)],
        reference_value="H",
        disparate_impact=0.8,
        demographic_parity_diff=0.1,
        worst_group="F",
        verdict="warn",
        risk_score=35,
        warnings=[],
    )
    assert m.verdict == "warn"
    with pytest.raises(ValidationError):
        M1MetricsOut(
            groups=[], reference_value="H", disparate_impact=1.0,
            demographic_parity_diff=0.0, worst_group="H", verdict="nope",
            risk_score=0, warnings=[],
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_schemas_audit.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.audit'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/schemas/dataset.py`:

```python
from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class DatasetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    filename: str
    row_count: int
    columns: list[str]
    status: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None
```

Create `apps/api/app/schemas/audit.py`:

```python
from __future__ import annotations

import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict

Verdict = Literal["pass", "warn", "fail"]


class AuditCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID
    title: str
    protected_attribute: str
    decision_column: str
    favorable_value: str
    privileged_value: str | None = None


class GroupStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float


class M1MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    groups: list[GroupStatOut]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: Verdict
    risk_score: int
    warnings: list[str]


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    code: str | None
    title: str
    status: str
    module: str
    dataset_id: uuid.UUID
    protected_attribute: str
    decision_column: str
    favorable_value: str
    privileged_value: str | None
    created_at: datetime.datetime
    completed_at: datetime.datetime | None
    metrics: M1MetricsOut | None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_schemas_audit.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/dataset.py apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_audit.py
git -c core.autocrlf=false commit -m "feat(api): dataset/audit DTOs with Verdict literal

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `dataset_service` — upload, parse, persist (org-scoped)

**Files:**
- Create: `apps/api/app/services/__init__.py` (empty), `apps/api/app/services/dataset_service.py`
- Test: `apps/api/tests/api/test_dataset_service.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_dataset_service.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_dataset_service.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.dataset_service'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/services/__init__.py` as an empty (0-byte) file.

Create `apps/api/app/services/dataset_service.py`:

```python
from __future__ import annotations

import datetime
import io
import uuid

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError, NotFoundError
from app.integrations.storage import Storage
from app.models import Dataset


def _parse_csv(raw: bytes) -> tuple[list[str], int]:
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:  # pandas raises many types for bad input
        raise APIError(
            "Fichier CSV illisible.",
            title="Invalid Dataset",
            status=422,
        ) from exc
    if df.shape[1] == 0 or df.empty:
        raise APIError(
            "Le CSV ne contient aucune donnée exploitable.",
            title="Invalid Dataset",
            status=422,
        )
    return [str(c) for c in df.columns], int(len(df))


async def create_dataset(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    filename: str,
    raw: bytes,
    retention_days: int,
) -> Dataset:
    columns, row_count = _parse_csv(raw)
    dataset_id = uuid.uuid4()
    storage_path = f"{org_id}/{dataset_id}.csv"
    await storage.upload(storage_path, raw, "text/csv")
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    dataset = Dataset(
        id=dataset_id,
        org_id=org_id,
        uploaded_by=user_id,
        filename=filename,
        storage_path=storage_path,
        row_count=row_count,
        columns=columns,
        status="ready",
        expires_at=now + datetime.timedelta(days=retention_days),
    )
    session.add(dataset)
    await session.commit()
    return dataset


async def get_dataset(
    session: AsyncSession, dataset_id: uuid.UUID, *, org_id: uuid.UUID
) -> Dataset:
    dataset = (
        await session.execute(
            select(Dataset).where(
                Dataset.id == dataset_id, Dataset.org_id == org_id
            )
        )
    ).scalar_one_or_none()
    if dataset is None:
        raise NotFoundError("Jeu de données introuvable.")
    return dataset
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_dataset_service.py -q`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/__init__.py apps/api/app/services/dataset_service.py apps/api/tests/api/test_dataset_service.py
git -c core.autocrlf=false commit -m "feat(api): dataset_service (upload/parse/persist, org-scoped)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `audit_service` — normalize, run_m1, persist (carry-forwards #1/#4)

**Files:**
- Create: `apps/api/app/services/audit_service.py`
- Test: `apps/api/tests/api/test_audit_service.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_audit_service.py`:

```python
import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import Base, make_engine
from app.core.errors import NotFoundError
from app.integrations.storage import MemoryStorage
from app.models import Organization, User
from app.services import audit_service, dataset_service
from app.schemas.audit import AuditCreate


@pytest.fixture
async def ctx(tmp_path):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
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


def _recruitment_csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["Hommes,oui"] * 100 + ["Hommes,non"] * 100
    rows += ["Femmes,oui"] * 72 + ["Femmes,non"] * 128
    return ("\n".join(rows) + "\n").encode()


async def test_run_m1_audit_recruitment_fail(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="r.csv",
            raw=_recruitment_csv(), retention_days=30,
        )
        body = AuditCreate(
            dataset_id=ds.id, title="Recrutement",
            protected_attribute="genre", decision_column="decision",
            favorable_value="oui",
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=org_id, user_id=uid, body=body
        )
    assert out.status == "done"
    assert out.metrics is not None
    assert out.metrics.verdict == "fail"
    assert out.metrics.disparate_impact == 0.72
    assert out.metrics.risk_score == 55
    assert out.code is not None and out.code.startswith("AUD-")


async def test_run_m1_audit_numeric_decision_column(ctx):
    # decision column is integer 1/0; favorable_value passed as "1" must match
    sm, org_id, uid = ctx
    store = MemoryStorage()
    rows = ["genre,decision"]
    rows += ["H,1"] * 100 + ["H,0"] * 100 + ["F,1"] * 72 + ["F,0"] * 128
    raw = ("\n".join(rows) + "\n").encode()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="n.csv",
            raw=raw, retention_days=30,
        )
        body = AuditCreate(
            dataset_id=ds.id, title="Num", protected_attribute="genre",
            decision_column="decision", favorable_value="1",
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=org_id, user_id=uid, body=body
        )
    assert out.metrics is not None
    assert out.metrics.disparate_impact == 0.72
    assert out.metrics.verdict == "fail"


async def test_run_m1_audit_invalid_mapping_raises_dataset_validation(ctx):
    from app.audit_engine import DatasetValidationError

    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="r.csv",
            raw=b"genre,decision\nH,oui\nF,non\n", retention_days=30,
        )
        body = AuditCreate(
            dataset_id=ds.id, title="Bad", protected_attribute="ABSENT",
            decision_column="decision", favorable_value="oui",
        )
        with pytest.raises(DatasetValidationError):
            await audit_service.run_m1_audit(
                s, store, org_id=org_id, user_id=uid, body=body
            )


async def test_get_audit_org_scoped(ctx):
    sm, org_id, uid = ctx
    store = MemoryStorage()
    async with sm() as s:
        ds = await dataset_service.create_dataset(
            s, store, org_id=org_id, user_id=uid, filename="r.csv",
            raw=_recruitment_csv(), retention_days=30,
        )
        out = await audit_service.run_m1_audit(
            s, store, org_id=org_id, user_id=uid,
            body=AuditCreate(
                dataset_id=ds.id, title="R", protected_attribute="genre",
                decision_column="decision", favorable_value="oui",
            ),
        )
        aid = out.id
    async with sm() as s:
        with pytest.raises(NotFoundError):
            await audit_service.get_audit(s, aid, org_id=uuid.uuid4())
        got = await audit_service.get_audit(s, aid, org_id=org_id)
        assert got.id == aid
        assert got.metrics is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_audit_service.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.audit_service'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/services/audit_service.py`:

```python
from __future__ import annotations

import datetime
import io
import uuid

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_engine import M1Config, run_m1
from app.core.errors import NotFoundError
from app.integrations.storage import Storage
from app.models import Audit, AuditResult, Dataset
from app.schemas.audit import AuditCreate, AuditOut, GroupStatOut, M1MetricsOut
from app.services.dataset_service import get_dataset


def _canonical_scalar(value: str, series: pd.Series) -> str:
    """Match the engine's astype(str) on a column whose dtype may be numeric.

    The pure engine compares ``series.astype(str)`` to ``str(config.value)``.
    For a numeric column, ``str(1.0)`` != ``str(1)``; coerce the user-supplied
    string through the column dtype so "1" matches a float column's "1.0".
    """
    if pd.api.types.is_numeric_dtype(series):
        try:
            coerced = pd.Series([value]).astype(series.dtype).iloc[0]
            return str(coerced)
        except (ValueError, TypeError):
            return value
    return value


async def _next_code(session: AsyncSession, org_id: uuid.UUID) -> str:
    year = datetime.datetime.now(tz=datetime.timezone.utc).year
    count = (
        await session.execute(
            select(func.count()).select_from(Audit).where(Audit.org_id == org_id)
        )
    ).scalar_one()
    return f"AUD-{year}-{count + 1:03d}"


def _to_metrics_out(result_obj) -> M1MetricsOut:
    return M1MetricsOut(
        groups=[
            GroupStatOut(
                value=g.value,
                n=g.n,
                favorable=g.favorable,
                selection_rate=g.selection_rate,
                disparate_impact=g.disparate_impact,
            )
            for g in result_obj.groups
        ],
        reference_value=result_obj.reference_value,
        disparate_impact=result_obj.disparate_impact,
        demographic_parity_diff=result_obj.demographic_parity_diff,
        worst_group=result_obj.worst_group,
        verdict=result_obj.verdict,
        risk_score=result_obj.risk_score,
        warnings=list(result_obj.warnings),
    )


def _audit_out(audit: Audit, metrics: M1MetricsOut | None) -> AuditOut:
    return AuditOut(
        id=audit.id,
        code=audit.code,
        title=audit.title,
        status=audit.status,
        module=audit.module,
        dataset_id=audit.dataset_id,
        protected_attribute=audit.protected_attribute,
        decision_column=audit.decision_column,
        favorable_value=audit.favorable_value,
        privileged_value=audit.privileged_value,
        created_at=audit.created_at,
        completed_at=audit.completed_at,
        metrics=metrics,
    )


async def run_m1_audit(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
) -> AuditOut:
    dataset: Dataset = await get_dataset(session, body.dataset_id, org_id=org_id)

    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=dataset.id,
        module="M1",
        title=body.title,
        status="running",
        protected_attribute=body.protected_attribute,
        decision_column=body.decision_column,
        favorable_value=body.favorable_value,
        privileged_value=body.privileged_value,
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()

    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))

    fav = body.favorable_value
    priv = body.privileged_value
    if body.decision_column in df.columns:
        fav = _canonical_scalar(body.favorable_value, df[body.decision_column])
    if priv is not None and body.protected_attribute in df.columns:
        priv = _canonical_scalar(priv, df[body.protected_attribute])

    # run_m1 may raise DatasetValidationError — let it propagate; the router
    # maps it to RFC 7807 422 (see core/errors.py handler).
    result = run_m1(
        df,
        M1Config(
            protected_attribute=body.protected_attribute,
            decision_column=body.decision_column,
            favorable_value=fav,
            privileged_value=priv,
        ),
    )

    metrics_out = _to_metrics_out(result)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation={},
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out)


async def get_audit(
    session: AsyncSession, audit_id: uuid.UUID, *, org_id: uuid.UUID
) -> AuditOut:
    audit = (
        await session.execute(
            select(Audit).where(Audit.id == audit_id, Audit.org_id == org_id)
        )
    ).scalar_one_or_none()
    if audit is None:
        raise NotFoundError("Audit introuvable.")
    result = (
        await session.execute(
            select(AuditResult).where(AuditResult.audit_id == audit_id)
        )
    ).scalar_one_or_none()
    metrics = (
        M1MetricsOut.model_validate(result.metrics) if result is not None else None
    )
    return _audit_out(audit, metrics)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_audit_service.py -q`
Expected: PASS (4 passed). The recruitment fixture reproduces the engine's
canonical case (DI 0.72, fail, risk 55); the numeric-column test proves the
`_canonical_scalar` carry-forward; org-scoping and `DatasetValidationError`
propagation are covered.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/tests/api/test_audit_service.py
git -c core.autocrlf=false commit -m "feat(api): audit_service — normalize + run_m1 + persist (org-scoped)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `DatasetValidationError` → RFC 7807 handler (carry-forward #3)

**Files:**
- Modify: `apps/api/app/core/errors.py`
- Test: `apps/api/tests/api/test_engine_error_handler.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_engine_error_handler.py`:

```python
import httpx
import pytest
from fastapi import FastAPI

from app.audit_engine import DatasetValidationError
from app.core.errors import register_exception_handlers


@pytest.fixture
def client():
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    async def _boom() -> dict[str, str]:
        raise DatasetValidationError(
            "Colonne « x » absente.", field="protected_attribute"
        )

    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://t")


async def test_dataset_validation_error_maps_to_422_problem(client):
    async with client as c:
        r = await c.get("/boom")
    assert r.status_code == 422
    body = r.json()
    assert body["title"] == "Dataset Validation Error"
    assert body["status"] == 422
    assert body["detail"] == "Colonne « x » absente."
    assert body["fields"] == {"protected_attribute": "Colonne « x » absente."}
    assert r.headers["content-type"].startswith("application/problem+json")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_engine_error_handler.py -q`
Expected: FAIL — 500 / no handler (response is not a 422 problem).

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/core/errors.py`, add this import at the top of the file with the
other imports (after `from pydantic import BaseModel`):

```python
from app.audit_engine import DatasetValidationError
```

Then, inside `register_exception_handlers(app)`, add a third handler immediately
after the `RequestValidationError` handler (same indentation level, still inside
the function):

```python
    @app.exception_handler(DatasetValidationError)
    async def _engine_validation(
        _: Request, exc: DatasetValidationError
    ) -> JSONResponse:
        problem = Problem(
            title="Dataset Validation Error",
            status=422,
            detail=exc.message,
            fields={exc.field: exc.message} if exc.field else None,
        )
        return JSONResponse(
            status_code=422,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_engine_error_handler.py -q`
Expected: PASS (1 passed). Re-run `uv run pytest tests/api/test_errors.py -q` —
the 3 Plan-2A error tests still pass (no regression).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/errors.py apps/api/tests/api/test_engine_error_handler.py
git -c core.autocrlf=false commit -m "feat(api): map engine DatasetValidationError to RFC 7807 422

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Datasets router (`POST /datasets`, `GET /datasets/{id}`)

**Files:**
- Create: `apps/api/app/routers/datasets.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/api/test_datasets_router.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_datasets_router.py`:

```python
import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations.storage import MemoryStorage
from app.main import create_app
from app.routers.datasets import get_storage_dep


@pytest.fixture
async def client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "c@acme.fr",
        },
    )
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_storage_dep] = lambda: store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c
    await eng.dispose()


async def test_upload_dataset(client):
    files = {"file": ("d.csv", b"genre,decision\nH,oui\nF,non\n", "text/csv")}
    r = await client.post(
        "/api/v1/datasets", files=files, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["row_count"] == 2
    assert body["columns"] == ["genre", "decision"]
    did = body["id"]
    g = await client.get(
        f"/api/v1/datasets/{did}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["id"] == did


async def test_upload_requires_auth(client):
    files = {"file": ("d.csv", b"a,b\n1,2\n", "text/csv")}
    r = await client.post("/api/v1/datasets", files=files)
    assert r.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_datasets_router.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.routers.datasets'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/routers/datasets.py`:

```python
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.errors import APIError
from app.integrations.storage import Storage, get_storage
from app.schemas.auth import CurrentUser
from app.schemas.dataset import DatasetOut
from app.services import dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


def get_storage_dep() -> Storage:
    return get_storage()


@router.post("", response_model=DatasetOut, status_code=201)
async def upload_dataset(
    file: UploadFile,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
) -> DatasetOut:
    raw = await file.read()
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise APIError(
            f"Fichier trop volumineux (max {get_settings().max_upload_mb} Mo).",
            title="Payload Too Large",
            status=413,
        )
    dataset = await dataset_service.create_dataset(
        session,
        storage,
        org_id=user.org_id,
        user_id=user.id,
        filename=file.filename or "dataset.csv",
        raw=raw,
        retention_days=get_settings().retention_days_default,
    )
    return DatasetOut.model_validate(dataset)


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(
    dataset_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> DatasetOut:
    dataset = await dataset_service.get_dataset(
        session, dataset_id, org_id=user.org_id
    )
    return DatasetOut.model_validate(dataset)
```

In `apps/api/app/main.py`, add the import and router include. Change the import
line `from app.routers import auth, health` to:

```python
from app.routers import auth, datasets, health
```

and add immediately after `app.include_router(auth.router, prefix=API_PREFIX)`:

```python
    app.include_router(datasets.router, prefix=API_PREFIX)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_datasets_router.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/routers/datasets.py apps/api/app/main.py apps/api/tests/api/test_datasets_router.py
git -c core.autocrlf=false commit -m "feat(api): datasets router (upload + get, org-scoped)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Audits router (`POST /audits`, `GET /audits/{id}`)

**Files:**
- Create: `apps/api/app/routers/audits.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/api/test_audits_router.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_audits_router.py`:

```python
import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core import deps
from app.core.db import Base, get_session, make_engine
from app.integrations.storage import MemoryStorage
from app.main import create_app
from app.routers.datasets import get_storage_dep


def _recruitment_csv() -> bytes:
    rows = ["genre,decision"]
    rows += ["Hommes,oui"] * 100 + ["Hommes,non"] * 100
    rows += ["Femmes,oui"] * 72 + ["Femmes,non"] * 128
    return ("\n".join(rows) + "\n").encode()


@pytest.fixture
async def client(tmp_path, monkeypatch):
    eng = make_engine(f"sqlite+aiosqlite:///{tmp_path / 'r.db'}")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(eng, expire_on_commit=False)
    store = MemoryStorage()

    async def _session_override():
        async with sm() as s:
            yield s

    monkeypatch.setattr(deps, "resolve_signing_key", lambda token: "k")
    monkeypatch.setattr(
        deps, "verify_token",
        lambda token, *, key, issuer=None: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "c@acme.fr",
        },
    )
    app = create_app()
    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_storage_dep] = lambda: store
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        yield c
    await eng.dispose()


async def _upload(client) -> str:
    files = {"file": ("r.csv", _recruitment_csv(), "text/csv")}
    r = await client.post(
        "/api/v1/datasets", files=files, headers={"Authorization": "Bearer x"}
    )
    assert r.status_code == 201
    return r.json()["id"]


async def test_run_audit_end_to_end(client):
    did = await _upload(client)
    r = await client.post(
        "/api/v1/audits",
        json={
            "dataset_id": did,
            "title": "Recrutement Q2",
            "protected_attribute": "genre",
            "decision_column": "decision",
            "favorable_value": "oui",
        },
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "done"
    assert body["metrics"]["verdict"] == "fail"
    assert body["metrics"]["disparate_impact"] == 0.72
    assert body["metrics"]["risk_score"] == 55
    aid = body["id"]
    g = await client.get(
        f"/api/v1/audits/{aid}", headers={"Authorization": "Bearer x"}
    )
    assert g.status_code == 200
    assert g.json()["metrics"]["worst_group"] == "Femmes"


async def test_run_audit_bad_mapping_returns_422_problem(client):
    did = await _upload(client)
    r = await client.post(
        "/api/v1/audits",
        json={
            "dataset_id": did,
            "title": "Bad",
            "protected_attribute": "ABSENT",
            "decision_column": "decision",
            "favorable_value": "oui",
        },
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 422
    assert r.json()["title"] == "Dataset Validation Error"
    assert r.headers["content-type"].startswith("application/problem+json")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/api/test_audits_router.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.routers.audits'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/routers/audits.py`:

```python
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.integrations.storage import Storage
from app.routers.datasets import get_storage_dep
from app.schemas.audit import AuditCreate, AuditOut
from app.schemas.auth import CurrentUser
from app.services import audit_service

router = APIRouter(prefix="/audits", tags=["audits"])


@router.post("", response_model=AuditOut, status_code=201)
async def create_audit(
    body: AuditCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
) -> AuditOut:
    return await audit_service.run_m1_audit(
        session, storage, org_id=user.org_id, user_id=user.id, body=body
    )


@router.get("/{audit_id}", response_model=AuditOut)
async def get_audit(
    audit_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> AuditOut:
    return await audit_service.get_audit(session, audit_id, org_id=user.org_id)
```

In `apps/api/app/main.py`, change `from app.routers import auth, datasets, health`
to:

```python
from app.routers import audits, auth, datasets, health
```

and add immediately after `app.include_router(datasets.router, prefix=API_PREFIX)`:

```python
    app.include_router(audits.router, prefix=API_PREFIX)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/api/test_audits_router.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/routers/audits.py apps/api/app/main.py apps/api/tests/api/test_audits_router.py
git -c core.autocrlf=false commit -m "feat(api): audits router — run M1 + fetch (org-scoped)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Full-suite gate, lint, type-check

**Files:** none (verification + docs only)

- [ ] **Step 1: Full suite**

Run from `apps/api`: `uv run pytest -q`
Expected: PASS, 0 failed — all Plan-1 engine tests (40), all Plan-2A api tests,
plus the new Plan-2B tests (storage 2, config_storage 1, schemas 2,
dataset_service 3, audit_service 4, engine_error_handler 1, datasets_router 2,
audits_router 2). If any fail, fix the implementation (never weaken tests).

- [ ] **Step 2: Lint**

Run: `uv run ruff check app tests`
Expected: `All checks passed!`. Fix any issue minimally; `# noqa: B008` is
acceptable only on FastAPI `Depends(...)` defaults (already used).

- [ ] **Step 3: Type-check**

Run: `uv run mypy app`
Expected: `Success: no issues found`. The `_to_metrics_out(result_obj)` /
`_canonical_scalar` boundaries with pandas/engine are dynamically typed; if mypy
strict flags an unavoidable pandas/`Any` boundary, add a narrowly-scoped
`# type: ignore[<code>]` ONLY on that line with a one-line justification — do not
change behavior or signatures.

- [ ] **Step 4: Update API README**

In `apps/api/README.md`, under the existing `### Environment` subsection, append:

```markdown

#### Datasets & audits (Plan 2B)

`POST /api/v1/datasets` (multipart `file`) stores the CSV (Supabase Storage in
prod, in-memory in dev/test) and persists a `datasets` row. `POST /api/v1/audits`
(`dataset_id` + column mapping) runs the pure M1 engine and persists
`audits`+`audit_results`. All queries are org-scoped at the service layer.
Interpretation (Gemini) and the dashboard are Plan 2C.
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/README.md
git -c core.autocrlf=false commit -m "docs(api): document datasets/audits endpoints (Plan 2B)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (spec §2/§3/§4 steps 2-4):**
- §4.2 `POST /datasets` multipart → Storage + parse headers/row_count + `expires_at` → Task 4 + Task 7.
- §4.3 `POST /audits` column mapping → Task 8; §4.4 `audit_service` create audit(running) → load CSV → `run_m1` → persist `audit_results` → done → Task 5.
- §5 engine inputs unchanged (pure engine consumed, not modified); `verdict` typed as `Literal` → Task 3 (carry-forward #2).
- §6/§7 service-layer `org_id` scoping on every query → Tasks 4, 5 (`get_dataset`/`get_audit`/`run_m1_audit` all filter `org_id`; tests assert cross-org `NotFoundError`).
- §8 `DatasetValidationError` → RFC 7807 422 envelope → Task 6 (carry-forward #3); engine string-compare contract handled by `_canonical_scalar` for numeric/bool columns → Task 5 (carry-forward #1, tested with an integer decision column).
- **Deferred (own plans, NOT gaps here):** interpretation/Gemini + `interpret_m1` + prompt-bank + `GET /dashboard/summary` → Plan 2C; SlowAPI rate limits, Swagger-off-in-prod, CORS `*` guard, concurrent-provision race → Plan 2D. `audit_results.interpretation` is intentionally persisted as `{}` until 2C.

**2. Placeholder scan:** every step ships complete code + an exact command with expected output. No TBD/TODO. Deferred items are scoped to named follow-up plans, not placeholders.

**3. Type consistency:** `Storage`/`MemoryStorage`/`SupabaseStorage`/`get_storage`/`get_storage_dep`; `Settings.storage_bucket/max_upload_mb/retention_days_default`; `DatasetOut`; `AuditCreate`/`AuditOut`/`M1MetricsOut`/`GroupStatOut`/`Verdict`; `dataset_service.create_dataset/get_dataset`; `audit_service.run_m1_audit/get_audit/_canonical_scalar`; engine `run_m1`/`M1Config`/`DatasetValidationError` (imported from `app.audit_engine`, the merged Plan-1 public API) are used identically across tasks. `AuditResult.metrics` is stored as `M1MetricsOut.model_dump()` and re-read via `M1MetricsOut.model_validate(...)` — symmetric. Router→service argument names (`org_id`/`user_id`/`body`/`storage`/`session`) match the service signatures.
