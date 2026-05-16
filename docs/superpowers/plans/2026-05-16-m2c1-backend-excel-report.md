# M2-C1 — Backend Excel Compliance Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a transversal (M1+M2) downloadable **Excel** compliance report: `GET /audits/{id}/report.xlsx`, generated on demand from a persisted audit, cached in Supabase Storage + a `reports` table.

**Architecture:** Extend the delivered API. New `reporting/excel.py` (pure `AuditOut → bytes` via OpenPyXL), a `Report` model + Alembic `0003`, a `reports` Storage bucket accessor, a thin report service (cache-or-build), and one router endpoint. No Node, no LLM. PDF + web buttons are M2-C2/M2-C3 (out of scope here).

**Tech Stack:** FastAPI, SQLAlchemy 2 async, Alembic, OpenPyXL (already in `apps/api/pyproject.toml`), pytest. Reuses the existing `Storage` abstraction, `audit_service.get_audit` (org-scoped, module-aware), RFC 7807 errors.

---

## Scope

Plan **M2-C1** of the M2-C decomposition. M2 slice (engine→API→web) merged. **In:** migration `0003` (`reports` table + RLS), `Report` model, `Settings.storage_bucket_reports` + `get_report_storage()`, `reporting/excel.py`, report service (cache-or-build to Storage + `reports` row), `GET /audits/{id}/report.xlsx`. **Out:** PDF / `apps/pdf` Puppeteer microservice / `pdf_client` (M2-C2); web download buttons (M2-C3). M2-C1 ships a working, pytest-testable Excel report for any M1 *or* M2 audit. `openpyxl>=3.1.5` is **already declared** — do NOT add it.

Run from `apps/api/`. Runner `uv run python -m pytest` (dev extra synced). Commit `git -c core.autocrlf=false commit` (author Franck F preconfigured; **never** add a Co-Authored-By/Claude trailer).

## File Structure

- Create `migrations/versions/0003_reports.py` — `reports` table + index + RLS (rev `0003`, down_revision `0002`).
- Create `app/models/report.py` — `Report` model (mirrors `Dataset` style).
- Modify `app/models/__init__.py` — import + `__all__` add `Report`.
- Modify `app/core/config.py` — add `storage_bucket_reports: str = "reports"`.
- Modify `app/integrations/storage.py` — add `get_report_storage()` (lru_cached, reports bucket).
- Create `app/reporting/__init__.py` (empty) and `app/reporting/excel.py` — `build_excel_report(audit: AuditOut) -> bytes`.
- Create `app/services/report_service.py` — `get_or_build_excel(session, storage, audit_id, *, org_id) -> tuple[bytes, str]`.
- Modify `app/routers/audits.py` — `GET /audits/{audit_id}/report.xlsx`.
- Tests: `tests/api/test_migration_0003.py`, `tests/api/test_excel_report.py`, `tests/api/test_report_service.py`, extend `tests/api/test_audits_router.py`.

Patterns to follow (read first): `app/models/dataset.py`, `app/models/__init__.py`, `migrations/versions/0001_initial.py` & `0002_m2.py`, `app/core/config.py`, `app/integrations/storage.py`, `app/services/audit_service.py` (`get_audit`), `app/routers/audits.py`, `app/core/errors.py` (`APIError`/`NotFoundError`), `app/schemas/audit.py` (`AuditOut`, `M1MetricsOut`, `M2MetricsOut`), `tests/api/test_migration_0002.py`, `tests/api/test_audit_service_m2.py`, `tests/api/test_audits_router.py`. Conventions: `_JSON = sa.JSON().with_variant(JSONB,"postgresql")`; RLS Postgres-only `DO $$ … undefined_object … $$`; `@lru_cache` storage accessors; services org-scoped; `NotFoundError` → RFC 7807 404.

---

### Task 1: Migration 0003 + Report model

**Files:**
- Create: `app/models/report.py`
- Modify: `app/models/__init__.py`
- Create: `migrations/versions/0003_reports.py`
- Test: `tests/api/test_migration_0003.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_migration_0003.py`:

```python
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0003_creates_reports_table_and_is_reversible(tmp_path, monkeypatch):
    db = tmp_path / "r.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    cols = {c["name"] for c in insp.get_columns("reports")}
    assert {"id", "audit_id", "format", "storage_path", "created_at"} <= cols

    command.downgrade(cfg, "0002")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    assert "reports" not in insp2.get_table_names()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_migration_0003.py -v`
Expected: FAIL — no `0003` revision / `reports` table.

- [ ] **Step 3: Write minimal implementation**

Create `migrations/versions/0003_reports.py`:

```python
"""reports table

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "audit_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("audits.id"),
            nullable=False,
        ),
        sa.Column("format", sa.String(8), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_reports_audit_id", "reports", ["audit_id"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE reports ENABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE reports FORCE ROW LEVEL SECURITY")
        op.execute(
            "DO $$ BEGIN "
            "CREATE POLICY no_direct_access ON reports FOR ALL "
            "TO anon, authenticated USING (false) WITH CHECK (false); "
            "EXCEPTION WHEN undefined_object THEN NULL; END $$"
        )


def downgrade() -> None:
    op.drop_table("reports")
```

Create `app/models/report.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True
    )
    format: Mapped[str] = mapped_column(String(8), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

In `app/models/__init__.py` add `from app.models.report import Report` and add `"Report"` to `__all__`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_migration_0003.py tests/api/test_migrations.py tests/api/test_migration_0002.py -v`
Expected: PASS (new + existing migration tests).

- [ ] **Step 5: Commit**

```bash
git add app/models/report.py app/models/__init__.py migrations/versions/0003_reports.py tests/api/test_migration_0003.py
git -c core.autocrlf=false commit -m "feat(api): migration 0003 — reports table"
```

---

### Task 2: Settings.storage_bucket_reports + get_report_storage()

**Files:**
- Modify: `app/core/config.py`
- Modify: `app/integrations/storage.py`
- Test: `tests/api/test_report_storage.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_report_storage.py`:

```python
from app.core.config import Settings
from app.integrations.storage import MemoryStorage, get_report_storage


def test_settings_has_reports_bucket_default():
    s = Settings(_env_file=None)
    assert s.storage_bucket_reports == "reports"


def test_settings_reports_bucket_env_override(monkeypatch):
    monkeypatch.setenv("STORAGE_BUCKET_REPORTS", "rpt")
    assert Settings(_env_file=None).storage_bucket_reports == "rpt"


async def test_get_report_storage_is_cached_singleton(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("API_ENV", "development")
    get_settings.cache_clear()
    get_report_storage.cache_clear()
    try:
        st = get_report_storage()
        assert isinstance(st, MemoryStorage)
        assert get_report_storage() is st
        await st.upload("o/a.xlsx", b"xl", "application/octet-stream")
        assert await get_report_storage().download("o/a.xlsx") == b"xl"
    finally:
        get_report_storage.cache_clear()
        get_settings.cache_clear()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_report_storage.py -v`
Expected: FAIL — `Settings` has no `storage_bucket_reports` / `get_report_storage` missing.

- [ ] **Step 3: Write minimal implementation**

In `app/core/config.py`, add to the `Settings` field block next to `storage_bucket` (read the file; add directly below the existing `storage_bucket` line):

```python
    storage_bucket_reports: str = "reports"
```

In `app/integrations/storage.py`, add (mirror the existing `get_storage` exactly, but use the reports bucket):

```python
@lru_cache
def get_report_storage() -> Storage:
    # Singleton: same rationale as get_storage(); uses the reports bucket.
    s = get_settings()
    key = s.supabase_service_role_key.get_secret_value()
    if s.api_env.lower() == "development" or not key:
        return MemoryStorage()
    return SupabaseStorage(
        url=s.supabase_url,
        service_role_key=key,
        bucket=s.storage_bucket_reports,
    )
```

(`lru_cache`, `MemoryStorage`, `SupabaseStorage`, `get_settings` are already imported in that file from the `get_storage` implementation.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_report_storage.py tests/api/test_config.py tests/api/test_storage.py -v`
Expected: PASS (new + existing config/storage tests).

- [ ] **Step 5: Commit**

```bash
git add app/core/config.py app/integrations/storage.py tests/api/test_report_storage.py
git -c core.autocrlf=false commit -m "feat(api): reports Storage bucket + setting"
```

---

### Task 3: `reporting/excel.py` — build_excel_report

**Files:**
- Create: `app/reporting/__init__.py`
- Create: `app/reporting/excel.py`
- Test: `tests/api/test_excel_report.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_excel_report.py`:

```python
import datetime
import io
import uuid

from openpyxl import load_workbook

from app.reporting.excel import build_excel_report
from app.schemas.audit import (
    AuditOut,
    ClusterStatOut,
    GroupStatOut,
    InterpretationOut,
    M1MetricsOut,
    M2MetricsOut,
)

_NOW = datetime.datetime(2026, 5, 16, tzinfo=datetime.timezone.utc)


def _interp() -> InterpretationOut:
    return InterpretationOut(
        narrative="Texte.",
        ai_act_anchors=["AI Act, article 10"],
        disclaimers=["Aide à l'analyse."],
        provider="fallback",
        model="deterministic",
    )


def _m1_audit() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-001", title="Recrutement", status="done",
        module="M1", dataset_id=uuid.uuid4(), protected_attribute="genre",
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M1MetricsOut(
            groups=[GroupStatOut(value="F", n=100, favorable=30,
                                 selection_rate=0.3, disparate_impact=0.6)],
            reference_value="H", disparate_impact=0.6,
            demographic_parity_diff=0.2, worst_group="F", verdict="fail",
            risk_score=80, warnings=[],
        ),
        interpretation=_interp(), pre_check=["Déséquilibre groupe F."],
        config=None,
    )


def _m2_audit() -> AuditOut:
    return AuditOut(
        id=uuid.uuid4(), code="AUD-2026-002", title="Détection", status="done",
        module="M2", dataset_id=uuid.uuid4(), protected_attribute=None,
        decision_column="embauche", favorable_value="oui", privileged_value=None,
        created_at=_NOW, completed_at=_NOW,
        metrics=M2MetricsOut(
            n=240, k=2, global_positive_rate=0.5, chi2=88.1, p_value=0.0001,
            dof=1,
            clusters=[ClusterStatOut(id=0, n=120, positive_rate=0.1,
                                     deviation_pp=-40, is_deviant=True,
                                     top_features=[])],
            deviant_cluster_ids=[0], verdict="fail", risk_score=88, warnings=[],
        ),
        interpretation=_interp(), pre_check=[], config={"k": 2},
    )


def _sheets(b: bytes) -> list[str]:
    return load_workbook(io.BytesIO(b)).sheetnames


def test_build_excel_m1_has_sheets_and_not_a_certificate():
    b = build_excel_report(_m1_audit())
    assert isinstance(b, bytes) and len(b) > 0
    wb = load_workbook(io.BytesIO(b))
    assert "Résumé" in wb.sheetnames
    assert "Détail" in wb.sheetnames
    assert "Conformité" in wb.sheetnames
    text = " ".join(
        str(c.value)
        for ws in wb.worksheets
        for row in ws.iter_rows()
        for c in row
        if c.value is not None
    )
    assert "n'est pas un certificat" in text
    assert "AUD-2026-001" in text
    assert "Disparate Impact" in text


def test_build_excel_m2_renders_cluster_detail():
    b = build_excel_report(_m2_audit())
    wb = load_workbook(io.BytesIO(b))
    text = " ".join(
        str(c.value)
        for ws in wb.worksheets
        for row in ws.iter_rows()
        for c in row
        if c.value is not None
    )
    assert "AUD-2026-002" in text
    assert "p-value" in text or "Khi-deux" in text
    assert "n'est pas un certificat" in text
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_excel_report.py -v`
Expected: FAIL — `ModuleNotFoundError: app.reporting.excel`.

- [ ] **Step 3: Write minimal implementation**

Create `app/reporting/__init__.py` (empty file, just `"""Reporting layer (Excel now; PDF in M2-C2)."""`).

Create `app/reporting/excel.py`:

```python
"""Pure Excel compliance report: build_excel_report(AuditOut) -> bytes."""
from __future__ import annotations

import io

from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet

from app.schemas.audit import AuditOut, M2MetricsOut

_VERDICT_FR = {
    "fail": "🔴 Critique",
    "warn": "🟠 Vigilance",
    "pass": "🟢 Conforme",
}
_NOT_A_CERTIFICATE = (
    "Ce rapport est une aide à l'analyse documentée : il n'est pas un "
    "certificat de conformité ni un avis juridique."
)
_AI_ACT_MAP = [
    ("Article 9 — système de gestion des risques", "Risque agrégé / verdict"),
    ("Article 10 — qualité et gouvernance des données", "Pré-vérifications / groupes"),
    ("Article 11 — documentation technique", "Ce rapport (trace documentée)"),
]
_FR_LAW = (
    "Références droit français : Code du travail L.1132-1 ; Défenseur des "
    "droits ; CNIL ; ACPR (selon le contexte d'usage)."
)


def _rows(ws: Worksheet, rows: list[list[object]]) -> None:
    for r in rows:
        ws.append(r)


def build_excel_report(audit: AuditOut) -> bytes:
    wb = Workbook()
    summary = wb.active
    summary.title = "Résumé"
    m = audit.metrics
    verdict = m.verdict if m is not None else "—"
    risk = m.risk_score if m is not None else "—"
    _rows(
        summary,
        [
            ["Rapport de conformité AuditIQ"],
            [],
            ["Audit", audit.code or str(audit.id)],
            ["Titre", audit.title],
            ["Module", audit.module],
            ["Statut", audit.status],
            ["Verdict", _VERDICT_FR.get(verdict, verdict)],
            ["Score de risque", f"{risk}/100"],
            [],
            [_NOT_A_CERTIFICATE],
        ],
    )

    detail = wb.create_sheet("Détail")
    if m is None:
        _rows(detail, [["Résultats indisponibles pour cet audit."]])
    elif isinstance(m, M2MetricsOut):
        _rows(
            detail,
            [
                ["Module 2 — détection non supervisée"],
                ["Test du Khi-deux (p-value)", m.p_value],
                ["χ²", m.chi2, "ddl", m.dof],
                ["Taux favorable global", m.global_positive_rate],
                ["Clusters déviants", f"{len(m.deviant_cluster_ids)} / {m.k}"],
                [],
                ["Cluster", "Effectif", "Taux fav.", "Écart (pts)", "Déviant"],
            ],
        )
        for c in m.clusters:
            detail.append(
                [c.id, c.n, c.positive_rate, c.deviation_pp,
                 "oui" if c.is_deviant else "non"]
            )
    else:  # M1MetricsOut
        _rows(
            detail,
            [
                ["Module 1 — audit supervisé"],
                ["Disparate Impact", m.disparate_impact],
                ["Demographic Parity (écart)", m.demographic_parity_diff],
                ["Groupe le plus défavorisé", m.worst_group],
                ["Référence", m.reference_value],
                [],
                ["Groupe", "Effectif", "Favorables", "Taux", "DI"],
            ],
        )
        for g in m.groups:
            detail.append(
                [g.value, g.n, g.favorable, g.selection_rate,
                 g.disparate_impact]
            )

    conformity = wb.create_sheet("Conformité")
    _rows(
        conformity,
        [
            ["Mise en regard AI Act"],
            ["Article", "Élément du rapport"],
            *[[a, b] for a, b in _AI_ACT_MAP],
            [],
            [_FR_LAW],
            [],
            ["Pré-vérifications"],
            *([[w] for w in audit.pre_check] or [["Aucune."]]),
            [],
            ["Limites"],
            *(
                [[d] for d in audit.interpretation.disclaimers]
                if audit.interpretation is not None
                else [["—"]]
            ),
            [],
            [_NOT_A_CERTIFICATE],
        ],
    )

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_excel_report.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/reporting/__init__.py app/reporting/excel.py tests/api/test_excel_report.py
git -c core.autocrlf=false commit -m "feat(api): Excel compliance report builder (M1+M2)"
```

---

### Task 4: report_service — cache-or-build

**Files:**
- Create: `app/services/report_service.py`
- Test: `tests/api/test_report_service.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_report_service.py` (reuse the `ctx` fixture pattern from `tests/api/test_audit_service_m2.py` — read it; replicate the exact fixture/helpers it uses to seed an org/user, create a dataset via `dataset_service.create_dataset`, and run an audit via `audit_service.run_m1_audit`; then):

```python
import io

from openpyxl import load_workbook

from app.integrations.storage import MemoryStorage
from app.models import Report
from app.services import report_service
from sqlalchemy import select


async def test_get_or_build_excel_builds_then_caches(ctx):
    # `ctx` provides: session_maker `sm`, org_id, user_id, a done audit_id
    sm, org_id, audit_id = ctx
    store = MemoryStorage()
    async with sm() as session:
        b1, name = await report_service.get_or_build_excel(
            session, store, audit_id, org_id=org_id
        )
        assert name.endswith(".xlsx")
        assert load_workbook(io.BytesIO(b1)).sheetnames
        rows = (
            await session.execute(select(Report).where(Report.audit_id == audit_id))
        ).scalars().all()
        assert len(rows) == 1 and rows[0].format == "xlsx"
    async with sm() as session:
        b2, _ = await report_service.get_or_build_excel(
            session, store, audit_id, org_id=org_id
        )
        assert b2 == b1  # served from cache, identical bytes
        rows = (
            await session.execute(select(Report).where(Report.audit_id == audit_id))
        ).scalars().all()
        assert len(rows) == 1  # no duplicate report row
```

> Read `tests/api/test_audit_service_m2.py` and reproduce its exact `ctx` fixture (org/user seed + a completed audit). Shape the fixture so it yields `(session_maker, org_id, audit_id)` for a **done** M1 audit (run `audit_service.run_m1_audit` with the two-blob/recruitment CSV pattern already used there). Keep the assertions above intact.

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_report_service.py -v`
Expected: FAIL — `AttributeError: module 'app.services.report_service' has no attribute 'get_or_build_excel'`.

- [ ] **Step 3: Write minimal implementation**

Create `app/services/report_service.py`:

```python
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.storage import Storage
from app.models import Report
from app.reporting.excel import build_excel_report
from app.services.audit_service import get_audit

_XLSX = "xlsx"


async def get_or_build_excel(
    session: AsyncSession,
    storage: Storage,
    audit_id: uuid.UUID,
    *,
    org_id: uuid.UUID,
) -> tuple[bytes, str]:
    """Return (xlsx_bytes, filename). Builds once, then serves from cache.

    `get_audit` enforces org scoping (raises NotFoundError for another org).
    """
    audit = await get_audit(session, audit_id, org_id=org_id)
    existing = (
        await session.execute(
            select(Report).where(
                Report.audit_id == audit_id, Report.format == _XLSX
            )
        )
    ).scalar_one_or_none()
    filename = f"{audit.code or audit.id}.xlsx"
    if existing is not None:
        return await storage.download(existing.storage_path), filename

    data = build_excel_report(audit)
    path = f"{org_id}/{audit_id}.xlsx"
    await storage.upload(
        path,
        data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    session.add(Report(audit_id=audit_id, format=_XLSX, storage_path=path))
    await session.commit()
    return data, filename
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_report_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/report_service.py tests/api/test_report_service.py
git -c core.autocrlf=false commit -m "feat(api): report service (cache-or-build Excel)"
```

---

### Task 5: Router — GET /audits/{id}/report.xlsx

**Files:**
- Modify: `app/routers/audits.py`
- Test: `tests/api/test_audits_router.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/api/test_audits_router.py` (reuse the file's existing client/auth/storage-override fixtures and the way it creates a done audit — read it; the report storage must be overridden too, see Step 3 dependency name `get_report_storage_dep`):

```python
async def test_get_audit_report_xlsx(client, m1_done_audit_id):
    r = await client.get(f"/api/v1/audits/{m1_done_audit_id}/report.xlsx")
    assert r.status_code == 200, r.text
    assert (
        r.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "attachment" in r.headers["content-disposition"]
    assert r.content[:2] == b"PK"  # xlsx is a zip


async def test_get_audit_report_unknown_is_404(client):
    import uuid

    r = await client.get(f"/api/v1/audits/{uuid.uuid4()}/report.xlsx")
    assert r.status_code == 404
```

> Use the existing helper that produces a completed M1 audit in this test module (the M1 end-to-end test already creates one — extract/reuse its dataset+audit setup as an `m1_done_audit_id` fixture; do not invent a new auth path). Override `get_report_storage_dep` to a shared `MemoryStorage()` the same way the module overrides `get_storage_dep`.

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_audits_router.py -k report -v`
Expected: FAIL — route `GET /audits/{id}/report.xlsx` does not exist (404 with no handler / wrong shape).

- [ ] **Step 3: Write minimal implementation**

In `app/routers/audits.py` add imports (extend existing): `from fastapi import Response`; `from app.integrations.storage import get_report_storage`; `from app.services import report_service`. Add a report-storage dependency near `get_storage_dep`:

```python
def get_report_storage_dep() -> Storage:
    return get_report_storage()
```

Add the endpoint (after `get_audit`):

```python
@router.get("/{audit_id}/report.xlsx")
async def get_audit_report_xlsx(
    audit_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_report_storage_dep),  # noqa: B008
) -> Response:
    data, filename = await report_service.get_or_build_excel(
        session, storage, audit_id, org_id=user.org_id
    )
    return Response(
        content=data,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
```

(`Storage` is already imported in this router for `get_storage_dep`; `uuid`, `Depends`, `get_current_user`, `get_session`, `CurrentUser` already imported. `get_or_build_excel` raises `NotFoundError` via `get_audit` for an unknown/foreign audit → existing RFC 7807 handler maps to 404.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audits_router.py -v`
Expected: PASS (existing M1/M2 router tests + 2 new report tests).

- [ ] **Step 5: Commit**

```bash
git add app/routers/audits.py tests/api/test_audits_router.py
git -c core.autocrlf=false commit -m "feat(api): GET /audits/{id}/report.xlsx"
```

---

### Task 6: Full API gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: Full API suite**

Run: `uv run python -m pytest -q`
Expected: PASS, 0 failed (prior suite + all new M2-C1 tests; no M1/M2 regression).

- [ ] **Step 2: Lint**

Run: `uv run python -m ruff check app tests`
Expected: `All checks passed!` — fix any reported line minimally, re-run.

- [ ] **Step 3: Type-check (strict)**

Run: `uv run python -m mypy app`
Expected: `Success: no issues found`. Likely fixups: `build_excel_report` `m` is `M1MetricsOut | M2MetricsOut | None` — narrow with `isinstance(m, M2MetricsOut)` (already used) and the `else` is `M1MetricsOut` (mypy narrows by exclusion since the union has exactly those two members + None handled first); `Worksheet.append` typing; `Response` import. Apply minimal typed fixes; never blanket `Any`.

- [ ] **Step 4: Commit any gate fixes**

```bash
git add -A
git -c core.autocrlf=false commit -m "chore(api): lint/type fixups for M2-C1"
```
(Skip if Steps 2–3 already clean.)

---

## Self-Review

**1. Spec coverage (§3 data model, §7 reporting, §9 errors):**
- §3 `reports` table (id, audit_id FK, format, storage_path, created_at) + RLS deny + `storage_bucket_reports` setting → Tasks 1, 2. (`reports` table was explicitly deferred from M2-B1 to here — now delivered.)
- §7 Excel via OpenPyXL in-process: exec summary (verdict feu + risk), per-module detail (M1 DI/DP/groups OR M2 clusters/χ²), AI Act art. 9/10/11 ↔ report mapping + FR law refs, **"n'est pas un certificat"** on summary AND conformity sheets → Task 3. Transversal M1+M2 verified by two builder tests.
- §7 generated on demand, cached (Storage bucket `reports` + `reports` row), org-scoped via `get_audit` → Tasks 4, 5.
- §9 unknown/foreign audit → `NotFoundError` → RFC 7807 404 (Task 5 test). PDF-microservice 502 path is **M2-C2** (correctly out of scope; this plan has no PDF).
- §13 mémoire ReportLab→Puppeteer reconciliation note: lives in the spec already; no code action in M2-C1 (PDF is M2-C2). Not a gap.

**2. Placeholder scan:** No TBD/"handle errors". Tasks 4/5 instruct reproducing the *real* existing `ctx`/router fixtures verbatim (concrete instruction — the exact fixture names must be honored, reproducing them here risks drift) and keep the assertions intact. No code step lacks code.

**3. Type consistency:** `Report(audit_id, format, storage_path)` model fields used identically in Tasks 1, 4. `build_excel_report(audit: AuditOut) -> bytes` (Task 3) called by `report_service.get_or_build_excel(... ) -> tuple[bytes, str]` (Task 4), called by the router (Task 5) — signatures consistent. `get_report_storage()` (Task 2) used by router dep (Task 5). `AuditOut`/`M1MetricsOut`/`M2MetricsOut`/`ClusterStatOut`/`GroupStatOut`/`InterpretationOut` consumed in Task 3 match the merged schemas field-for-field. Reuses proven `get_audit` (org-scoped, module-aware) and the `Storage` Protocol. `_XLSX="xlsx"` constant consistent. openpyxl already a declared dependency (verified in `pyproject.toml`) — no dependency task needed.
