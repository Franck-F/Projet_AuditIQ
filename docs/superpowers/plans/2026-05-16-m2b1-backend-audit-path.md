# M2-B1 — Backend M2 Audit Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-merged pure M2 engine into the API: persist M2 audits, expose them via `POST /audits` (module-dispatched) and `GET /audits/{id}`, add the M2 French interpretation with deterministic fallback, and surface the shared IQR pre-check on both M1 and M2.

**Architecture:** Extend the delivered M1 backend (services/routers/schemas/migrations) — no new layer. A single `AuditCreate` model gains a `module` discriminator (default `"M1"`, backward-compatible with the shipped M1 web client) + per-module validation. `audit_service` gains `run_m2_audit` mirroring `run_m1_audit`, and a shared `iqr_precheck` hook feeds both. Synchronous, like M1.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic, pandas, pytest/respx. `app.audit_engine.run_m2/M2Config/M2Result/iqr_precheck` already on `main`. No new dependency.

---

## Scope

Plan **M2-B1** of the M2 decomposition. M2-A (pure engine) is merged. **In:** migration `0002` (audits.protected_attribute nullable, audits.config jsonb, audit_results.pre_check jsonb) + model updates; M2 DTOs + module discriminator + validation; `interpret_m2` + `prompts/m2_fr.md` + fallback; `audit_service.run_m2_audit` + IQR hook into `run_m1_audit` **and** `run_m2_audit`; `get_audit` module-aware; router dispatch. **Out (M2-C):** `reports` table, `storage_bucket_reports`, Excel/Puppeteer. **Out (M2-B2):** all `apps/web` changes. M2-B1 ships a fully API-testable M2 audit; M1 path stays byte-behavior-identical except it now also returns `pre_check`.

Run all commands from `apps/api/`. Runner `uv run python -m pytest` (dev extra: `uv sync --extra dev` once). Commit `git -c core.autocrlf=false commit` (author Franck F preconfigured; **never** add a Co-Authored-By/Claude trailer).

## File Structure

- Modify `app/models/audit.py` — `protected_attribute` → nullable; add `config` (JSON, nullable).
- Modify `app/models/audit_result.py` — add `pre_check` (JSON, nullable).
- Create `migrations/versions/0002_m2.py` — the additive migration (revision `0002`, down_revision `0001`).
- Modify `app/schemas/audit.py` — `M2ConfigIn`, `FeatureContributionOut`, `ClusterStatOut`, `M2MetricsOut`; `AuditCreate` gains `module`/`config`, `protected_attribute` optional, model-validator; `AuditOut.metrics` becomes `M1MetricsOut | M2MetricsOut | None`, add `pre_check`, `config`.
- Create `app/interpretation/prompts/m2_fr.md` — versioned FR prompt.
- Create `app/interpretation/m2.py` — `interpret_m2(result, *, provider)` + deterministic `_fallback`.
- Modify `app/services/audit_service.py` — `_to_m2_metrics_out`, `run_m2_audit`, `_run_iqr` helper, hook into `run_m1_audit`, module-aware `get_audit`, `_audit_out` gains `pre_check`/`config`.
- Modify `app/routers/audits.py` — `create_audit` dispatches on `body.module`.
- Tests: `tests/api/test_migration_0002.py`, `tests/api/test_schemas_m2.py`, `tests/api/test_interpret_m2.py`, `tests/api/test_audit_service_m2.py`, extend `tests/api/test_audits_router.py`.

Patterns to follow (read first): `app/services/audit_service.py`, `app/interpretation/m1.py`, `app/interpretation/prompts/m1_fr.md`, `app/schemas/audit.py`, `migrations/versions/0001_initial.py`, `tests/api/test_audit_service.py`, `tests/api/test_audits_router.py`, `tests/api/test_migrations.py`. Conventions: `from __future__ import annotations`; Pydantic `ConfigDict(extra="forbid")`; services raise engine `DatasetValidationError` (router already maps → RFC 7807 422); `_JSON = sa.JSON().with_variant(JSONB, "postgresql")` in migrations; deterministic LLM fallback never raises.

---

### Task 1: Migration 0002 + model columns

**Files:**
- Modify: `app/models/audit.py`
- Modify: `app/models/audit_result.py`
- Create: `migrations/versions/0002_m2.py`
- Test: `tests/api/test_migration_0002.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_migration_0002.py`:

```python
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_0002_adds_m2_columns_and_is_reversible(tmp_path, monkeypatch):
    db = tmp_path / "m2.db"
    monkeypatch.setenv("SUPABASE_DB_URL", f"sqlite+aiosqlite:///{db}")
    cfg = Config("alembic.ini")

    command.upgrade(cfg, "head")
    insp = inspect(create_engine(f"sqlite:///{db}"))
    audit_cols = {c["name"]: c for c in insp.get_columns("audits")}
    ar_cols = {c["name"] for c in insp.get_columns("audit_results")}
    assert "config" in audit_cols
    assert audit_cols["protected_attribute"]["nullable"] is True
    assert "pre_check" in ar_cols

    command.downgrade(cfg, "0001")
    insp2 = inspect(create_engine(f"sqlite:///{db}"))
    audit_cols2 = {c["name"] for c in insp2.get_columns("audits")}
    ar_cols2 = {c["name"] for c in insp2.get_columns("audit_results")}
    assert "config" not in audit_cols2
    assert "pre_check" not in ar_cols2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_migration_0002.py -v`
Expected: FAIL — `command.upgrade` errors / no `0002` revision found.

- [ ] **Step 3: Write minimal implementation**

Create `migrations/versions/0002_m2.py`:

```python
"""m2: nullable protected_attribute, audit config, pre_check

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

_JSON = sa.JSON().with_variant(JSONB, "postgresql")


def upgrade() -> None:
    with op.batch_alter_table("audits") as b:
        b.alter_column("protected_attribute", existing_type=sa.String(255),
                        nullable=True)
        b.add_column(sa.Column("config", _JSON, nullable=True))
    with op.batch_alter_table("audit_results") as b:
        b.add_column(sa.Column("pre_check", _JSON, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("audit_results") as b:
        b.drop_column("pre_check")
    with op.batch_alter_table("audits") as b:
        b.drop_column("config")
        b.alter_column("protected_attribute", existing_type=sa.String(255),
                        nullable=False)
```

In `app/models/audit.py` change the `protected_attribute` line to nullable and add `config` (place `config` right after `privileged_value`):

```python
    protected_attribute: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
```
```python
    config: Mapped[dict[str, object] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
```
Add the imports needed at the top of `app/models/audit.py`: `from sqlalchemy import JSON` (extend the existing `from sqlalchemy import ...` line) and `from sqlalchemy.dialects.postgresql import JSONB`.

In `app/models/audit_result.py` add (mirror the existing `metrics`/`interpretation` column style in that file; nullable):

```python
    pre_check: Mapped[dict[str, object] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
```
Add the same two imports to `app/models/audit_result.py` if not already present.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_migration_0002.py tests/api/test_migrations.py -v`
Expected: PASS (new + the existing 0001 migration test still green).

- [ ] **Step 5: Commit**

```bash
git add app/models/audit.py app/models/audit_result.py migrations/versions/0002_m2.py tests/api/test_migration_0002.py
git -c core.autocrlf=false commit -m "feat(api): migration 0002 — M2 audit columns"
```

---

### Task 2: M2 DTOs + module discriminator

**Files:**
- Modify: `app/schemas/audit.py`
- Test: `tests/api/test_schemas_m2.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_schemas_m2.py`:

```python
import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, M2MetricsOut


def test_m1_create_defaults_module_and_requires_protected_attribute():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t",
        protected_attribute="genre", decision_column="d", favorable_value="oui",
    )
    assert a.module == "M1"
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            decision_column="d", favorable_value="oui",  # no protected_attribute
        )


def test_m2_create_requires_decision_and_forbids_protected_attribute():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", module="M2",
        decision_column="embauche", favorable_value="oui",
        config={"k": 4, "deviation_pp": 25.0},
    )
    assert a.module == "M2"
    assert a.protected_attribute is None
    assert a.config is not None and a.config.k == 4
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M2",
            protected_attribute="genre",  # not allowed for M2
            decision_column="d", favorable_value="oui",
        )


def test_m2_metrics_out_shape():
    m = M2MetricsOut(
        n=100, k=2, global_positive_rate=0.5, chi2=12.0, p_value=0.001, dof=1,
        clusters=[{"id": 0, "n": 50, "positive_rate": 0.2,
                   "deviation_pp": -30.0, "is_deviant": True,
                   "top_features": [{"name": "age", "std_diff": 1.2,
                                     "direction": "above"}]}],
        deviant_cluster_ids=[0], verdict="fail", risk_score=80, warnings=[],
    )
    assert m.clusters[0].top_features[0].name == "age"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_schemas_m2.py -v`
Expected: FAIL — `ImportError: cannot import name 'M2MetricsOut'`.

- [ ] **Step 3: Write minimal implementation**

In `app/schemas/audit.py`, add after `M1MetricsOut` (keep all existing classes unchanged) and modify `AuditCreate`/`AuditOut` as shown.

Add new models:

```python
class M2ConfigIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features: list[str] | None = None
    k: int = 5
    deviation_pp: float = 20.0
    chi2_alpha: float = 0.05


class FeatureContributionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    std_diff: float
    direction: str


class ClusterStatOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    n: int
    positive_rate: float
    deviation_pp: float
    is_deviant: bool
    top_features: list[FeatureContributionOut]


class M2MetricsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    n: int
    k: int
    global_positive_rate: float
    chi2: float
    p_value: float
    dof: int
    clusters: list[ClusterStatOut]
    deviant_cluster_ids: list[int]
    verdict: Verdict
    risk_score: int
    warnings: list[str]
```

Replace the `AuditCreate` class with (note: `module` discriminator + optional `protected_attribute` + `config`; `extra="forbid"` kept):

```python
class AuditCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: uuid.UUID
    title: str
    module: Literal["M1", "M2"] = "M1"
    protected_attribute: str | None = None
    decision_column: str
    favorable_value: str
    privileged_value: str | None = None
    config: M2ConfigIn | None = None

    @model_validator(mode="after")
    def _per_module(self) -> "AuditCreate":
        if self.module == "M1":
            if not self.protected_attribute:
                raise ValueError(
                    "module M1 : 'protected_attribute' est requis."
                )
            if self.config is not None:
                raise ValueError("module M1 : 'config' n'est pas accepté.")
        else:  # M2
            if self.protected_attribute is not None:
                raise ValueError(
                    "module M2 : 'protected_attribute' ne s'applique pas "
                    "(détection non supervisée)."
                )
            if self.privileged_value is not None:
                raise ValueError(
                    "module M2 : 'privileged_value' ne s'applique pas."
                )
        return self
```

Add the imports at the top of `app/schemas/audit.py` (extend existing import lines): `from typing import Literal` (already present for `Verdict`), and `from pydantic import BaseModel, ConfigDict, model_validator` (add `model_validator`).

Replace `AuditOut`'s `metrics` field and add two fields:

```python
    metrics: M1MetricsOut | M2MetricsOut | None = None
    pre_check: list[str] = []
    config: dict[str, object] | None = None
```
(Keep every other `AuditOut` field unchanged. `AuditOut` keeps `from_attributes=True, extra="forbid"`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_schemas_m2.py tests/api/test_audits_router.py tests/api/test_audit_service.py -v`
Expected: PASS (new + existing M1 schema/usage still green — `module` defaults to "M1", `protected_attribute` still effectively required for M1).

- [ ] **Step 5: Commit**

```bash
git add app/schemas/audit.py tests/api/test_schemas_m2.py
git -c core.autocrlf=false commit -m "feat(api): M2 DTOs + module discriminator"
```

---

### Task 3: M2 interpretation + prompt + fallback

**Files:**
- Create: `app/interpretation/prompts/m2_fr.md`
- Create: `app/interpretation/m2.py`
- Test: `tests/api/test_interpret_m2.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_interpret_m2.py`:

```python
import json

import pytest

from app.audit_engine import M2Config, run_m2
from app.interpretation.m2 import interpret_m2


def _result():
    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(42)
    a = pd.DataFrame({"f1": rng.normal(-5, 0.5, 120),
                      "f2": rng.normal(-5, 0.5, 120),
                      "y": (["1"] * 108) + (["0"] * 12)})
    b = pd.DataFrame({"f1": rng.normal(5, 0.5, 120),
                      "f2": rng.normal(5, 0.5, 120),
                      "y": (["1"] * 12) + (["0"] * 108)})
    return run_m2(pd.concat([a, b], ignore_index=True),
                  M2Config(decision_column="y", positive_value="1", k=2))


async def test_interpret_m2_fallback_when_no_provider():
    out = await interpret_m2(_result(), provider=None)
    assert out.provider == "fallback"
    assert out.model == "deterministic"
    assert "AI Act" in " ".join(out.ai_act_anchors)
    assert out.narrative
    assert out.disclaimers


class _FakeProvider:
    name = "fake"
    model = "fake-1"

    async def complete(self, prompt: str, *, as_json: bool = False) -> str:
        return json.dumps({"narrative": "Texte FR.",
                           "ai_act_anchors": ["AI Act, article 10"],
                           "disclaimers": ["Aide à l'analyse."]})


async def test_interpret_m2_uses_provider_then_falls_back_on_error():
    out = await interpret_m2(_result(), provider=_FakeProvider())
    assert out.provider == "fake"
    assert out.narrative == "Texte FR."

    class _Boom:
        name = "boom"
        model = "x"

        async def complete(self, prompt: str, *, as_json: bool = False) -> str:
            raise RuntimeError("LLM down")

    out2 = await interpret_m2(_result(), provider=_Boom())
    assert out2.provider == "fallback"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_interpret_m2.py -v`
Expected: FAIL — `ModuleNotFoundError: app.interpretation.m2`.

- [ ] **Step 3: Write minimal implementation**

Create `app/interpretation/prompts/m2_fr.md`:

```markdown
# Prompt M2 — interprétation détection non supervisée (FR) — v1

Tu expliques à des non-spécialistes, en français clair, un audit M2
(détection non supervisée : clustering des dossiers, comparaison du taux de
décision favorable par cluster, test du Khi-deux, clusters déviants et leurs
features dominantes). Métriques techniques au format JSON :

{metrics_json}

Consignes STRICTES :
- Explique simplement (3–6 phrases) : y a-t-il des groupes de dossiers traités
  différemment, et quelles caractéristiques les distinguent (proxies possibles).
- Cite les ancrages : AI Act article 9 (gestion des risques) et article 10
  (qualité/gouvernance des données) ; Code du travail L.1132-1 si des features
  déviantes peuvent être des proxys de critères protégés.
- N'emploie JAMAIS de formulation absolue (« certifié conforme », « garanti »,
  « 100 % »). C'est un signal à approfondir, pas une preuve de discrimination.
- Termine par les limites de l'analyse.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{{"narrative": "<texte FR>", "ai_act_anchors": ["..."], "disclaimers": ["..."]}}
```

Create `app/interpretation/m2.py`:

```python
from __future__ import annotations

import json
from importlib import resources

from app.audit_engine import M2Result
from app.interpretation.base import LLMProvider
from app.schemas.audit import InterpretationOut

_AI_ACT_ANCHORS = [
    "AI Act, article 9 (système de gestion des risques)",
    "AI Act, article 10 (qualité et gouvernance des données)",
    "Code du travail L.1132-1 (discrimination indirecte / proxys)",
]
_DISCLAIMERS = [
    "Signal statistique à approfondir : ni une preuve de discrimination, ni "
    "une certification.",
    "Les clusters et leurs features dominantes appellent un examen manuel.",
    "Analyse non supervisée : aucun attribut sensible n'est utilisé.",
]


def load_prompt_template() -> str:
    return (
        resources.files("app.interpretation.prompts")
        .joinpath("m2_fr.md")
        .read_text(encoding="utf-8")
    )


def _metrics_json(result: M2Result) -> str:
    return json.dumps(
        {
            "verdict": result.verdict,
            "risk_score": result.risk_score,
            "p_value": result.p_value,
            "chi2": result.chi2,
            "global_positive_rate": result.global_positive_rate,
            "deviant_cluster_ids": list(result.deviant_cluster_ids),
            "clusters": [
                {
                    "id": c.id,
                    "n": c.n,
                    "positive_rate": c.positive_rate,
                    "deviation_pp": c.deviation_pp,
                    "is_deviant": c.is_deviant,
                    "top_features": [
                        {"name": f.name, "std_diff": f.std_diff,
                         "direction": f.direction}
                        for f in c.top_features
                    ],
                }
                for c in result.clusters
            ],
            "warnings": list(result.warnings),
        },
        ensure_ascii=False,
    )


def _fallback(result: M2Result) -> InterpretationOut:
    verdicts = {
        "fail": "des écarts de traitement significatifs entre groupes de "
        "dossiers ont été détectés",
        "warn": "un signal d'écart de traitement, à confirmer, a été détecté",
        "pass": "aucun écart de traitement significatif n'a été détecté",
    }
    phrase = verdicts.get(result.verdict, result.verdict)
    n_dev = len(result.deviant_cluster_ids)
    narrative = (
        f"Sur {result.k} groupes de dossiers analysés sans attribut sensible, "
        f"{phrase}. {n_dev} cluster(s) s'écarte(nt) nettement de la moyenne "
        f"(p={result.p_value}). Score de risque agrégé : "
        f"{result.risk_score}/100. Verdict : {result.verdict}. "
        f"Les caractéristiques distinctives des clusters déviants peuvent "
        f"être des proxys de critères protégés et méritent un examen manuel."
    )
    return InterpretationOut(
        narrative=narrative,
        ai_act_anchors=list(_AI_ACT_ANCHORS),
        disclaimers=list(_DISCLAIMERS),
        provider="fallback",
        model="deterministic",
    )


async def interpret_m2(
    result: M2Result, *, provider: LLMProvider | None
) -> InterpretationOut:
    if provider is None:
        return _fallback(result)
    try:
        prompt = load_prompt_template().format(metrics_json=_metrics_json(result))
        raw = await provider.complete(prompt, as_json=True)
        data = json.loads(raw)
        return InterpretationOut(
            narrative=str(data["narrative"]),
            ai_act_anchors=[str(a) for a in data.get("ai_act_anchors", [])]
            or list(_AI_ACT_ANCHORS),
            disclaimers=[str(d) for d in data.get("disclaimers", [])]
            or list(_DISCLAIMERS),
            provider=provider.name,
            model=provider.model,
        )
    except Exception:  # noqa: BLE001 — any LLM/parse failure → safe fallback
        return _fallback(result)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_interpret_m2.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/interpretation/m2.py app/interpretation/prompts/m2_fr.md tests/api/test_interpret_m2.py
git -c core.autocrlf=false commit -m "feat(api): M2 interpretation + FR prompt + fallback"
```

---

### Task 4: `audit_service.run_m2_audit` + shared IQR hook

**Files:**
- Modify: `app/services/audit_service.py`
- Test: `tests/api/test_audit_service_m2.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_audit_service_m2.py`:

```python
import io
import uuid

import numpy as np
import pandas as pd
import pytest

from app.integrations.storage import MemoryStorage
from app.schemas.audit import AuditCreate, M2MetricsOut
from app.services import audit_service


def _csv() -> bytes:
    rng = np.random.default_rng(42)
    a = pd.DataFrame({"f1": rng.normal(-5, 0.5, 120),
                      "f2": rng.normal(-5, 0.5, 120),
                      "embauche": (["oui"] * 108) + (["non"] * 12)})
    b = pd.DataFrame({"f1": rng.normal(5, 0.5, 120),
                      "f2": rng.normal(5, 0.5, 120),
                      "embauche": (["oui"] * 12) + (["non"] * 108)})
    buf = io.BytesIO()
    pd.concat([a, b], ignore_index=True).to_csv(buf, index=False)
    return buf.getvalue()


async def test_run_m2_audit_persists_and_returns(session, seeded_org_user):
    org_id, user_id = seeded_org_user
    store = MemoryStorage()
    ds = await audit_service.create_dataset_for_test(  # see note below
        session, store, org_id=org_id, user_id=user_id, raw=_csv()
    ) if hasattr(audit_service, "create_dataset_for_test") else None
    from app.services.dataset_service import create_dataset

    dataset = await create_dataset(
        session, store, org_id=org_id, user_id=user_id,
        filename="r.csv", raw=_csv(), retention_days=30,
    )
    out = await audit_service.run_m2_audit(
        session, store, org_id=org_id, user_id=user_id,
        body=AuditCreate(
            dataset_id=dataset.id, title="Smoke M2", module="M2",
            decision_column="embauche", favorable_value="oui",
            config={"k": 2},
        ),
        llm_provider=None,
    )
    assert out.module == "M2"
    assert out.status == "done"
    assert isinstance(out.metrics, M2MetricsOut)
    assert out.metrics.verdict == "fail"
    assert out.interpretation is not None
    assert out.interpretation.provider == "fallback"

    fetched = await audit_service.get_audit(session, out.id, org_id=org_id)
    assert isinstance(fetched.metrics, M2MetricsOut)
    assert fetched.module == "M2"
```

> Use the same `session` / `seeded_org_user` fixtures the existing
> `tests/api/test_audit_service.py` uses. Read that file first and reuse its
> conftest fixtures verbatim (do not invent new fixture names). Delete the
> dead `create_dataset_for_test` probe line if those helpers differ — keep only
> the real `create_dataset` + `run_m2_audit` flow.

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_audit_service_m2.py -v`
Expected: FAIL — `AttributeError: module 'app.services.audit_service' has no attribute 'run_m2_audit'`.

- [ ] **Step 3: Write minimal implementation**

In `app/services/audit_service.py`:

Add imports (extend existing import block):

```python
from app.audit_engine import M2Config, M2Result, iqr_precheck, run_m2
from app.interpretation.m2 import interpret_m2
from app.schemas.audit import (
    ClusterStatOut,
    FeatureContributionOut,
    M2MetricsOut,
)
```

Add an IQR helper and an M2 metrics mapper:

```python
def _run_iqr(
    df: pd.DataFrame, *, group_column: str | None,
    numeric_columns: list[str] | None,
) -> list[str]:
    return list(
        iqr_precheck(
            df, group_column=group_column, numeric_columns=numeric_columns
        ).warnings
    )


def _to_m2_metrics_out(r: M2Result) -> M2MetricsOut:
    return M2MetricsOut(
        n=r.n, k=r.k, global_positive_rate=r.global_positive_rate,
        chi2=r.chi2, p_value=r.p_value, dof=r.dof,
        clusters=[
            ClusterStatOut(
                id=c.id, n=c.n, positive_rate=c.positive_rate,
                deviation_pp=c.deviation_pp, is_deviant=c.is_deviant,
                top_features=[
                    FeatureContributionOut(
                        name=f.name, std_diff=f.std_diff,
                        direction=f.direction,
                    )
                    for f in c.top_features
                ],
            )
            for c in r.clusters
        ],
        deviant_cluster_ids=list(r.deviant_cluster_ids),
        verdict=cast(Verdict, r.verdict),
        risk_score=r.risk_score,
        warnings=list(r.warnings),
    )
```

Change `_audit_out` to also carry `pre_check` and `config`, and accept the M2 metrics union. Replace `_audit_out` with:

```python
def _audit_out(
    audit: Audit,
    metrics: M1MetricsOut | M2MetricsOut | None,
    interpretation: InterpretationOut | None = None,
    pre_check: list[str] | None = None,
) -> AuditOut:
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
        interpretation=interpretation,
        pre_check=pre_check or [],
        config=audit.config,
    )
```

In `run_m1_audit`, after `df = pd.read_csv(io.BytesIO(raw))` compute the pre-check and pass it through. Add right after that line:

```python
    pre_check = _run_iqr(
        df, group_column=body.protected_attribute, numeric_columns=None
    )
```
and persist it + return it: in the `AuditResult(...)` constructor add `pre_check=pre_check,`, and change the final `return _audit_out(audit, metrics_out, interpretation)` to `return _audit_out(audit, metrics_out, interpretation, pre_check)`.

Add `run_m2_audit` (mirrors `run_m1_audit`; note `module="M2"`, `protected_attribute=None`, `config` persisted, IQR uses numeric features):

```python
async def run_m2_audit(
    session: AsyncSession,
    storage: Storage,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: AuditCreate,
    llm_provider: LLMProvider | None,
) -> AuditOut:
    dataset: Dataset = await get_dataset(session, body.dataset_id, org_id=org_id)
    cfg_in = body.config
    config_payload = (
        cfg_in.model_dump() if cfg_in is not None else None
    )

    audit = Audit(
        code=await _next_code(session, org_id),
        org_id=org_id,
        dataset_id=dataset.id,
        module="M2",
        title=body.title,
        status="running",
        protected_attribute=None,
        decision_column=body.decision_column,
        favorable_value=body.favorable_value,
        privileged_value=None,
        config=config_payload,
        created_by=user_id,
    )
    session.add(audit)
    await session.flush()

    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))

    feats = cfg_in.features if cfg_in is not None else None
    m2_cfg = M2Config(
        decision_column=body.decision_column,
        positive_value=body.favorable_value,
        feature_columns=tuple(feats) if feats else None,
        k=cfg_in.k if cfg_in is not None else 5,
        deviation_pp=cfg_in.deviation_pp if cfg_in is not None else 20.0,
        chi2_alpha=cfg_in.chi2_alpha if cfg_in is not None else 0.05,
    )
    numeric_cols = [
        c for c in df.columns
        if c != body.decision_column
        and pd.api.types.is_numeric_dtype(df[c])
    ]
    pre_check = _run_iqr(df, group_column=None, numeric_columns=numeric_cols)

    # run_m2 may raise DatasetValidationError — propagates → router 422.
    result = run_m2(df, m2_cfg)
    metrics_out = _to_m2_metrics_out(result)
    interpretation = await interpret_m2(result, provider=llm_provider)
    session.add(
        AuditResult(
            audit_id=audit.id,
            metrics=metrics_out.model_dump(),
            verdict=result.verdict,
            risk_score=result.risk_score,
            interpretation=interpretation.model_dump(),
            pre_check=pre_check,
        )
    )
    audit.status = "done"
    audit.completed_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await session.commit()
    return _audit_out(audit, metrics_out, interpretation, pre_check)
```

Make `get_audit` module-aware. Replace the `metrics = ...` line in `get_audit` with:

```python
    metrics: M1MetricsOut | M2MetricsOut | None
    if result is None:
        metrics = None
    elif audit.module == "M2":
        metrics = M2MetricsOut.model_validate(result.metrics)
    else:
        metrics = M1MetricsOut.model_validate(result.metrics)
    pre_check = list(result.pre_check) if result and result.pre_check else []
```
and change the final return to `return _audit_out(audit, metrics, interpretation, pre_check)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audit_service_m2.py tests/api/test_audit_service.py -v`
Expected: PASS (new M2 + existing M1 service tests still green; M1 now also returns `pre_check`).

- [ ] **Step 5: Commit**

```bash
git add app/services/audit_service.py tests/api/test_audit_service_m2.py
git -c core.autocrlf=false commit -m "feat(api): run_m2_audit + shared IQR pre-check hook"
```

---

### Task 5: Router module dispatch

**Files:**
- Modify: `app/routers/audits.py`
- Test: `tests/api/test_audits_router.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/api/test_audits_router.py` (reuse the file's existing client/auth/storage fixtures — read it first; the M2 dataset must be uploaded through the same path the existing M1 router test uses, then audited with `module="M2"`):

```python
async def test_post_audits_m2_path(client, m2_dataset_id):
    r = await client.post("/api/v1/audits", json={
        "dataset_id": str(m2_dataset_id), "title": "M2 via API",
        "module": "M2", "decision_column": "embauche",
        "favorable_value": "oui", "config": {"k": 2},
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["module"] == "M2"
    assert body["status"] == "done"
    assert body["metrics"]["verdict"] in ("fail", "warn", "pass")
    assert "pre_check" in body


async def test_post_audits_m2_bad_config_is_422(client, m2_dataset_id):
    r = await client.post("/api/v1/audits", json={
        "dataset_id": str(m2_dataset_id), "title": "bad",
        "module": "M2", "decision_column": "embauche",
        "favorable_value": "oui", "config": {"k": 999},
    })
    assert r.status_code == 422
```

> Add a `m2_dataset_id` fixture next to the existing dataset fixture in this
> test module: upload (via the same MemoryStorage override + `POST /datasets`)
> a CSV with numeric `f1,f2` + `embauche` (oui/non) two-blob data (reuse the
> `_csv()` shape from Task 4). If the existing M1 router test already has a
> dataset-upload helper, parametrize/extend it rather than duplicating.

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_audits_router.py -k m2 -v`
Expected: FAIL — M2 audits return M1-shaped result / `run_m1` raises because `protected_attribute` is None.

- [ ] **Step 3: Write minimal implementation**

In `app/routers/audits.py`, replace the body of `create_audit` to dispatch on module (keep the decorator, signature, and dependencies exactly as they are):

```python
@router.post("", response_model=AuditOut, status_code=201)
async def create_audit(
    body: AuditCreate,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
    llm_provider: LLMProvider | None = Depends(get_llm_provider_dep),  # noqa: B008
) -> AuditOut:
    if body.module == "M2":
        return await audit_service.run_m2_audit(
            session, storage, org_id=user.org_id, user_id=user.id,
            body=body, llm_provider=llm_provider,
        )
    return await audit_service.run_m1_audit(
        session, storage, org_id=user.org_id, user_id=user.id,
        body=body, llm_provider=llm_provider,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audits_router.py -v`
Expected: PASS (existing M1 router tests + the 2 new M2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/routers/audits.py tests/api/test_audits_router.py
git -c core.autocrlf=false commit -m "feat(api): POST /audits dispatches M1/M2 by module"
```

---

### Task 6: Full API gate

**Files:** None (verification + minimal fixups only)

- [ ] **Step 1: Full API suite**

Run: `uv run python -m pytest -q`
Expected: PASS, 0 failed (prior suite + all new M2-B1 tests; M1 behavior unchanged besides the additive `pre_check` field).

- [ ] **Step 2: Lint**

Run: `uv run python -m ruff check app tests`
Expected: `All checks passed!` — fix any reported line minimally, re-run.

- [ ] **Step 3: Type-check (strict)**

Run: `uv run python -m mypy app`
Expected: `Success: no issues found`. Likely fixups: the `AuditOut.metrics` union may need `M1MetricsOut | M2MetricsOut | None` consistently in `_audit_out`/`get_audit` signatures (already specified); `audit.config` is `dict | None` matching `AuditOut.config`. Apply minimal typed fixes until clean. Do not weaken types with `Any` unless unavoidable.

- [ ] **Step 4: Commit any gate fixes**

```bash
git add -A
git -c core.autocrlf=false commit -m "chore(api): lint/type fixups for M2-B1"
```
(Skip if Steps 2–3 were already clean.)

---

## Self-Review

**1. Spec coverage (spec §3 data model, §6 service/router, §5 IQR):**
- §3 `audits.protected_attribute` nullable + `config jsonb`; `audit_results` gains `pre_check` (chosen over stuffing it into `metrics` to keep `metrics` jsonb "unchanged" as the spec requires) → Task 1. `reports` table + `storage_bucket_reports` are correctly **deferred to M2-C** (only the report layer needs them; migrations are independent revisions) — noted in Scope.
- §6 `POST /audits` module-dispatched; `run_m2_audit` synchronous mirroring `run_m1_audit`; `interpret_m2` with deterministic fallback (never raises) → Tasks 3,4,5. DTO "discriminated by module": implemented as a single `AuditCreate` + `module` default `"M1"` + model-validator instead of a strict Pydantic discriminated union — deliberate, to stay backward compatible with the already-merged M1 web client that posts no `module` (documented in Architecture/Scope; substance of the spec met).
- §5 IQR pre-check wired into **both** `run_m1_audit` (group_column = protected_attribute) and `run_m2_audit` (numeric feature columns), non-blocking, surfaced as `AuditOut.pre_check` and persisted → Task 4.
- M2 metrics persisted in `audit_results.metrics` jsonb and re-served module-aware in `get_audit` → Task 4.

**2. Placeholder scan:** No TBD/“handle errors”. Tasks 4/5 tests explicitly instruct reusing the existing test fixtures verbatim (read `tests/api/test_audit_service.py` / `tests/api/test_audits_router.py`) rather than inventing fixture names — this is a concrete instruction, not a placeholder, because the exact existing fixture names must be honored and duplicating them here risks drift. The dead `create_dataset_for_test` probe line in the Task-4 test is explicitly flagged for deletion.

**3. Type consistency:** `AuditCreate` fields (`module: Literal["M1","M2"]="M1"`, `protected_attribute: str|None`, `config: M2ConfigIn|None`) used identically in Tasks 2,4,5. `M2MetricsOut`/`ClusterStatOut`/`FeatureContributionOut` shapes match `M2Result`/`ClusterStat`/`FeatureContribution` from the merged engine (verified field-for-field). `_audit_out(... pre_check)` and `get_audit` metrics union consistent across Task 4. `audit.config` (`dict|None`) ↔ `AuditOut.config` (`dict[str,object]|None`) consistent. Reuses existing `cast`, `Verdict`, `InterpretationOut`, `LLMProvider`, `get_dataset` already imported/proven in M1. `M2MetricsOut` mirrors the engine `M2Result` field-for-field with no extra fields (YAGNI — the M2 web result page renders clusters/p-value/characterization per spec, no `worst_group`).
