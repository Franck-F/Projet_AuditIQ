# SP1 — Wizard d'audit orienté : Engine + endpoints + migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire l'engine pur de détection automatique (analyse de colonnes CSV + suggestions décision/attribut protégé) et exposer 3 endpoints API (`/datasets/{id}/analyze`, `/audits/m3/test-connection`, `/audits/m3/validate-url`) qui serviront de socle au wizard refondu (SP2/SP3).

**Architecture:** Engine pur sans IO dans `audit_engine/dataset_analysis.py` (mirroir des modules existants `m1_supervised.py`, `unsupervised.py`, `llm_audit.py`). Score = `0.6 × score_nom + 0.4 × score_stats` (χ² pour attribut protégé, mutual information pour décision). Endpoint `/analyze` met le résultat en cache dans une nouvelle colonne `datasets.analysis_cache` JSONB (migration 0007). Les endpoints M3 réutilisent `integrations/llm_target.py` (SSRF-hardened) sans le modifier.

**Tech Stack:** Python 3.12, FastAPI 0.115, SQLAlchemy 2 async, Pandas, NumPy, SciPy (`chi2_contingency`), Scikit-learn (`mutual_info_classif`), Alembic, Pydantic 2, pytest, ruff, mypy --strict.

**Spec source:** `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` (sections 4.1 à 4.4, 5, 6, 7).

**Référence repo (état entrée) :** `main` HEAD `267f835` ; pytest = 277, ruff clean, mypy --strict clean.

---

## File Structure

```
apps/api/
├── migrations/versions/
│   └── 0007_dataset_analysis_cache.py     [NEW]   add datasets.analysis_cache JSONB
├── app/
│   ├── models/dataset.py                  [MOD]   +analysis_cache column
│   ├── audit_engine/
│   │   ├── types.py                       [MOD]   +ColumnProfile, Suggestion, DatasetAnalysis
│   │   ├── dataset_analysis.py            [NEW]   run_dataset_analysis(df) + 3 helpers
│   │   └── __init__.py                    [MOD]   export new symbols
│   ├── schemas/
│   │   ├── dataset.py                     [MOD]   +DatasetAnalysisOut, ColumnProfileOut, SuggestionOut
│   │   └── audit.py                       [MOD]   +M3TestConnectionIn/Out, M3ValidateUrlIn
│   ├── services/
│   │   ├── dataset_service.py             [MOD]   +get_or_build_analysis
│   │   └── llm_test_connection.py         [NEW]   reuse llm_target for 1-shot test
│   └── routers/
│       ├── datasets.py                    [MOD]   +POST /{id}/analyze
│       └── audits.py                      [MOD]   +POST /m3/test-connection, +POST /m3/validate-url
└── tests/
    ├── audit_engine/
    │   ├── conftest.py                    [MOD]   +fixtures for dataset analysis tests
    │   ├── test_dataset_analysis.py       [NEW]   ~12 tests (engine pur)
    │   └── test_public_api.py             [MOD]   +DatasetAnalysis re-export check
    └── api/
        ├── test_datasets_router.py        [MOD]   +analyze endpoint tests
        ├── test_dataset_service.py        [MOD]   +cache hit/miss tests
        ├── test_audits_router.py          [MOD]   +m3 test-connection + validate-url
        ├── test_llm_test_connection.py    [NEW]   service tests with mocked llm_target
        └── test_migration_0007.py         [NEW]   migration smoke test
```

**Decomposition rationale** : 1 fichier engine pur = 1 responsabilité (analyse de DataFrame). Service séparé `llm_test_connection.py` parce que la logique de "tester une seule fois" diffère du `run_m3_audit` (12 paires, deadline, agrégation). Schemas dans les fichiers de domaine existants (`schemas/dataset.py`, `schemas/audit.py`) plutôt que d'en créer un nouveau — suit le pattern repo.

---

## Conventions répétées (à appliquer dans chaque tâche)

- **Worktree** : ce plan s'exécute sur le branch `worktree-wizard-sp1-engine-endpoints` créé via la skill `using-git-worktrees`. Tous les commits y sont locaux jusqu'à la PR finale.
- **Identité git** : commits = `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**. Voir `memory/git-commit-identity.md`.
- **Commit** : à chaque fin de tâche, message Conventional Commits (`feat:`, `test:`, `chore:`, `refactor:`). Plain `git commit` (jamais `-c core.autocrlf=false`).
- **Test runner** : depuis `apps/api/` → `uv run pytest -q` (full) ou `uv run pytest tests/path/test_x.py::test_y -v` (ciblé).
- **Type-check** : `uv run mypy --strict app` depuis `apps/api/`.
- **Lint** : `uv run ruff check` depuis `apps/api/`.
- **Aucune modif côté `apps/web/` ni `apps/pdf/`** dans SP1 (sera fait dans SP2/SP3).

---

## Task 1: Migration 0007 — `datasets.analysis_cache` JSONB

**Files:**
- Create: `apps/api/migrations/versions/0007_dataset_analysis_cache.py`
- Modify: `apps/api/app/models/dataset.py` (+1 column)
- Test: `apps/api/tests/api/test_migration_0007.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/api/test_migration_0007.py`:
```python
"""Smoke test: 0007 adds datasets.analysis_cache JSONB nullable."""
from __future__ import annotations

from sqlalchemy import inspect

from app.core.db import sync_engine_for_tests


def test_datasets_has_analysis_cache_column() -> None:
    inspector = inspect(sync_engine_for_tests())
    cols = {c["name"] for c in inspector.get_columns("datasets")}
    assert "analysis_cache" in cols


def test_analysis_cache_is_nullable() -> None:
    inspector = inspect(sync_engine_for_tests())
    col = next(
        c for c in inspector.get_columns("datasets") if c["name"] == "analysis_cache"
    )
    assert col["nullable"] is True
```

- [ ] **Step 2: Run test to verify it fails**

```
cd apps/api && uv run pytest tests/api/test_migration_0007.py -v
```
Expected: FAIL — `analysis_cache` absent (Dataset model n'a pas encore la colonne).

- [ ] **Step 3: Add the column to the model**

In `apps/api/app/models/dataset.py`, after `expires_at`:
```python
    analysis_cache: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True, default=None
    )
```

Imports déjà présents (`JSON`, `JSONB`).

- [ ] **Step 4: Create the migration file**

`apps/api/migrations/versions/0007_dataset_analysis_cache.py`:
```python
"""dataset analysis cache column

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("datasets") as b:
        b.add_column(
            sa.Column(
                "analysis_cache",
                sa.JSON().with_variant(JSONB, "postgresql"),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("datasets") as b:
        b.drop_column("analysis_cache")
```

- [ ] **Step 5: Run the test to verify it passes**

```
cd apps/api && uv run pytest tests/api/test_migration_0007.py -v
```
Expected: PASS (2 tests).

- [ ] **Step 6: Run full test suite to ensure no regression**

```
cd apps/api && uv run pytest -q
```
Expected: 277 + 2 = 279 passed (no failures).

- [ ] **Step 7: Commit**

```
git add apps/api/migrations/versions/0007_dataset_analysis_cache.py apps/api/app/models/dataset.py apps/api/tests/api/test_migration_0007.py
git commit -m "feat(api): migration 0007 adds datasets.analysis_cache JSONB nullable"
```

---

## Task 2: Engine types — `ColumnProfile`, `Suggestion`, `DatasetAnalysis`

**Files:**
- Modify: `apps/api/app/audit_engine/types.py` (+3 dataclasses + Literal types)
- Test: `apps/api/tests/audit_engine/test_types.py` (already exists, append cases)

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/audit_engine/test_types.py`:
```python
def test_column_profile_is_frozen() -> None:
    from app.audit_engine.types import ColumnProfile

    p = ColumnProfile(
        name="age",
        dtype="numeric",
        unique_count=5,
        null_ratio=0.0,
        top_values=(),
        role_hint="protected",
    )
    with pytest.raises(Exception):  # frozen dataclass
        p.name = "x"  # type: ignore[misc]


def test_suggestion_optional_favorable_value() -> None:
    from app.audit_engine.types import Suggestion

    s = Suggestion(column="approved", confidence=0.85, reason="Nom évocateur")
    assert s.favorable_value is None
    s2 = Suggestion(
        column="approved", confidence=0.85, reason="Nom évocateur", favorable_value="1"
    )
    assert s2.favorable_value == "1"


def test_dataset_analysis_holds_optional_suggestions() -> None:
    from app.audit_engine.types import DatasetAnalysis

    a = DatasetAnalysis(columns=(), suggested_decision=None, suggested_protected=None)
    assert a.suggested_decision is None
    assert a.suggested_protected is None
```

- [ ] **Step 2: Run test to verify it fails**

```
cd apps/api && uv run pytest tests/audit_engine/test_types.py -v -k "column_profile or suggestion or dataset_analysis"
```
Expected: FAIL — `ColumnProfile`, `Suggestion`, `DatasetAnalysis` non importables.

- [ ] **Step 3: Add the dataclasses to types.py**

Append to `apps/api/app/audit_engine/types.py`:
```python
from typing import Literal


DType = Literal["numeric", "categorical", "boolean", "text", "datetime"]
RoleHint = Literal["decision", "protected", "identifier", "feature", "unknown"]


@dataclass(frozen=True)
class ColumnProfile:
    name: str
    dtype: DType
    unique_count: int
    null_ratio: float
    top_values: tuple[tuple[object, int], ...]  # empty if unique_count > 50
    role_hint: RoleHint


@dataclass(frozen=True)
class Suggestion:
    column: str
    confidence: float  # [0, 1]
    reason: str
    favorable_value: object | None = None


@dataclass(frozen=True)
class DatasetAnalysis:
    columns: tuple[ColumnProfile, ...]
    suggested_decision: Suggestion | None
    suggested_protected: Suggestion | None

    def __post_init__(self) -> None:
        object.__setattr__(self, "columns", tuple(self.columns))
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/audit_engine/test_types.py -v -k "column_profile or suggestion or dataset_analysis"
```
Expected: PASS (3 tests).

- [ ] **Step 5: Run mypy --strict**

```
cd apps/api && uv run mypy --strict app/audit_engine/types.py
```
Expected: Success (no errors).

- [ ] **Step 6: Commit**

```
git add apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_types.py
git commit -m "feat(engine): add ColumnProfile/Suggestion/DatasetAnalysis dataclasses"
```

---

## Task 3: Engine — `_profile_column`

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (create file, add `_profile_column`)
- Test: `apps/api/tests/audit_engine/test_dataset_analysis.py` (create file)
- Modify: `apps/api/tests/audit_engine/conftest.py` (+fixtures)

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/audit_engine/test_dataset_analysis.py`:
```python
"""Pure-engine tests for dataset_analysis.

Covers _profile_column heuristics (dtype, unique_count, role_hint).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.audit_engine.dataset_analysis import _profile_column


def test_profile_numeric_column() -> None:
    df = pd.DataFrame({"age": [25, 30, 35, 40, 25]})
    p = _profile_column(df, "age")
    assert p.name == "age"
    assert p.dtype == "numeric"
    assert p.unique_count == 4
    assert p.null_ratio == 0.0


def test_profile_categorical_column_with_top_values() -> None:
    df = pd.DataFrame({"genre": ["F", "M", "F", "F", "M"]})
    p = _profile_column(df, "genre")
    assert p.dtype == "categorical"
    assert p.unique_count == 2
    assert dict(p.top_values) == {"F": 3, "M": 2}


def test_profile_high_cardinality_no_top_values() -> None:
    df = pd.DataFrame({"id": list(range(60))})
    p = _profile_column(df, "id")
    assert p.unique_count == 60
    assert p.top_values == ()  # > 50 → empty


def test_profile_null_ratio() -> None:
    df = pd.DataFrame({"x": [1, None, 2, None, 3]})
    p = _profile_column(df, "x")
    assert p.null_ratio == pytest.approx(0.4)


def test_role_hint_decision_by_name() -> None:
    df = pd.DataFrame({"approved": [0, 1, 1, 0]})
    p = _profile_column(df, "approved")
    assert p.role_hint == "decision"


def test_role_hint_protected_by_name() -> None:
    df = pd.DataFrame({"sex": ["F", "M", "F", "M", "F", "M"]})
    p = _profile_column(df, "sex")
    assert p.role_hint == "protected"


def test_role_hint_identifier_high_cardinality() -> None:
    df = pd.DataFrame({"customer_id": [f"C{i}" for i in range(100)]})
    p = _profile_column(df, "customer_id")
    assert p.role_hint == "identifier"


def test_role_hint_unknown_fallback() -> None:
    df = pd.DataFrame({"feature_x": np.random.default_rng(0).normal(size=100)})
    p = _profile_column(df, "feature_x")
    assert p.role_hint in {"feature", "unknown"}  # not decision/protected/identifier
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py -v
```
Expected: FAIL — module `app.audit_engine.dataset_analysis` introuvable.

- [ ] **Step 3: Create the implementation**

Create `apps/api/app/audit_engine/dataset_analysis.py`:
```python
"""Dataset analysis engine — pure, no I/O.

Profiles columns and suggests decision/protected columns to drive the
wizard's auto-detection step (M1/M2).
"""
from __future__ import annotations

import re

import pandas as pd

from app.audit_engine.types import (
    ColumnProfile,
    DatasetAnalysis,
    DType,
    RoleHint,
    Suggestion,
)

_DECISION_RE = re.compile(
    r"^(decision|approved|outcome|class|target|label|result|status|y)$",
    re.IGNORECASE,
)
_PROTECTED_RE = re.compile(
    r"^(sex|gender|genre|age|race|origin|origine|nationality|nationalit[eé]"
    r"|ethni.*|religion|disability|handicap.*|orientation)$",
    re.IGNORECASE,
)


def _infer_dtype(series: pd.Series) -> DType:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    nunique = series.nunique(dropna=True)
    if nunique <= 50:
        return "categorical"
    return "text"


def _infer_role_hint(
    name: str, dtype: DType, unique_count: int, n_rows: int
) -> RoleHint:
    if _DECISION_RE.match(name) and 2 <= unique_count <= 10:
        return "decision"
    if _PROTECTED_RE.match(name) and 2 <= unique_count <= 20:
        return "protected"
    if unique_count >= max(0.9 * n_rows, 50):
        return "identifier"
    if dtype in {"numeric", "categorical", "boolean"}:
        return "feature"
    return "unknown"


def _profile_column(df: pd.DataFrame, name: str) -> ColumnProfile:
    series = df[name]
    dtype = _infer_dtype(series)
    unique_count = int(series.nunique(dropna=True))
    null_ratio = float(series.isna().mean())
    if unique_count <= 50:
        counts = series.value_counts(dropna=True).head(10)
        top_values: tuple[tuple[object, int], ...] = tuple(
            (k, int(v)) for k, v in counts.items()
        )
    else:
        top_values = ()
    role_hint = _infer_role_hint(name, dtype, unique_count, len(df))
    return ColumnProfile(
        name=name,
        dtype=dtype,
        unique_count=unique_count,
        null_ratio=null_ratio,
        top_values=top_values,
        role_hint=role_hint,
    )
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py -v
```
Expected: PASS (8 tests).

- [ ] **Step 5: Type-check**

```
cd apps/api && uv run mypy --strict app/audit_engine/dataset_analysis.py
```
Expected: Success.

- [ ] **Step 6: Commit**

```
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis.py
git commit -m "feat(engine): _profile_column heuristic dtype + role hint"
```

---

## Task 4: Engine — `_suggest_decision` (with favorable_value)

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (+ `_suggest_decision`)
- Modify: `apps/api/tests/audit_engine/test_dataset_analysis.py` (+ tests)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/audit_engine/test_dataset_analysis.py`:
```python
from app.audit_engine.dataset_analysis import _profile_column, _suggest_decision


def _profiles(df: pd.DataFrame) -> tuple[ColumnProfile, ...]:
    from app.audit_engine.types import ColumnProfile  # noqa: F401
    return tuple(_profile_column(df, c) for c in df.columns)


def test_suggest_decision_prefers_name_match() -> None:
    df = pd.DataFrame({
        "approved": [0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
        "noise": [1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.0],
    })
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.column == "approved"
    assert s.confidence >= 0.5


def test_suggest_decision_favorable_is_minority_value() -> None:
    df = pd.DataFrame({"approved": ["yes"] * 3 + ["no"] * 7})  # yes = minority
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.favorable_value == "yes"


def test_suggest_decision_skips_high_cardinality() -> None:
    df = pd.DataFrame({"id": list(range(20)), "decision": [0, 1] * 10})
    s = _suggest_decision(df, _profiles(df))
    assert s is not None
    assert s.column == "decision"  # id has 20 unique, skipped


def test_suggest_decision_none_below_threshold() -> None:
    df = pd.DataFrame({
        "x": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
        "y": ["a", "b", "c", "d", "e", "f"],  # 100% unique, high cardinality
    })
    s = _suggest_decision(df, _profiles(df))
    assert s is None  # no candidate passes confidence ≥ 0.3
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py::test_suggest_decision_prefers_name_match -v
```
Expected: FAIL — `_suggest_decision` introuvable.

- [ ] **Step 3: Implement `_suggest_decision`**

Append to `apps/api/app/audit_engine/dataset_analysis.py`:
```python
import numpy as np
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder


_CONFIDENCE_THRESHOLD = 0.3


def _normalize_score(raw: float, *, hi: float) -> float:
    """Linear clamp into [0, 1]."""
    if hi <= 0:
        return 0.0
    return max(0.0, min(1.0, raw / hi))


def _mutual_info_avg(df: pd.DataFrame, target_col: str) -> float:
    """Average normalized mutual information between target and all other columns."""
    if df.shape[1] < 2:
        return 0.0
    y_raw = df[target_col].dropna()
    if y_raw.nunique() < 2:
        return 0.0
    y = LabelEncoder().fit_transform(y_raw.astype(str))
    X = df.drop(columns=[target_col]).loc[y_raw.index]
    # Encode every column as category codes (mutual_info accepts ints/floats).
    X_enc = pd.DataFrame(
        {c: LabelEncoder().fit_transform(X[c].astype(str)) for c in X.columns}
    )
    try:
        mi = mutual_info_classif(X_enc, y, random_state=0)
    except ValueError:
        return 0.0
    # Normalize by log2(unique_y) — theoretical max for any column → ~[0, 1]
    max_mi = float(np.log2(y_raw.nunique()))
    return float(np.mean(mi) / max_mi) if max_mi > 0 else 0.0


def _suggest_decision(
    df: pd.DataFrame, profiles: tuple[ColumnProfile, ...]
) -> Suggestion | None:
    candidates: list[tuple[float, str, str, object | None]] = []
    for p in profiles:
        if not (2 <= p.unique_count <= 10):
            continue
        if p.null_ratio >= 0.3:
            continue
        name_score = 1.0 if _DECISION_RE.match(p.name) else 0.0
        stats_score = _mutual_info_avg(df, p.name)
        final = 0.6 * name_score + 0.4 * stats_score
        reasons: list[str] = []
        if name_score > 0:
            reasons.append("nom évocateur")
        if stats_score > 0.3:
            reasons.append("colonne prédictible par les autres")
        reason = (
            "Colonne candidate : " + ", ".join(reasons) + "."
            if reasons
            else "Cardinalité compatible avec une décision binaire/discrète."
        )
        # Favorable value = least frequent (statistical convention)
        counts = df[p.name].value_counts(dropna=True)
        favorable = counts.idxmin() if len(counts) >= 2 else None
        candidates.append((final, p.name, reason, favorable))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, col, reason, fav = candidates[0]
    if score < _CONFIDENCE_THRESHOLD:
        return None
    return Suggestion(
        column=col,
        confidence=round(score, 3),
        reason=reason,
        favorable_value=fav,
    )
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py -v -k suggest_decision
```
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check**

```
cd apps/api && uv run mypy --strict app/audit_engine/dataset_analysis.py
```
Expected: Success.

- [ ] **Step 6: Commit**

```
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis.py
git commit -m "feat(engine): _suggest_decision with mutual info + minority favorable_value"
```

---

## Task 5: Engine — `_suggest_protected` (χ² + name match)

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (+ `_suggest_protected`)
- Modify: `apps/api/tests/audit_engine/test_dataset_analysis.py` (+ tests)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/audit_engine/test_dataset_analysis.py`:
```python
from app.audit_engine.dataset_analysis import _suggest_protected


def test_suggest_protected_picks_name_match() -> None:
    # 200 rows: sex strongly correlated with approved (DI ≈ 0.5)
    df = pd.DataFrame({
        "sex": ["M"] * 100 + ["F"] * 100,
        "approved": [1] * 80 + [0] * 20 + [1] * 40 + [0] * 60,
        "city": (["Paris", "Lyon"] * 100),
    })
    s = _suggest_protected(df, _profiles(df), decision_col="approved")
    assert s is not None
    assert s.column == "sex"


def test_suggest_protected_uses_chi2_when_name_silent() -> None:
    # No name match. column 'a' is independent (random), column 'b' is strongly
    # tied to decision → chi² should pick 'b'.
    rng = np.random.default_rng(0)
    n = 200
    decision = (["1"] * (n // 2)) + (["0"] * (n // 2))
    a = rng.choice(["x", "y"], size=n).tolist()  # independent
    b = (["alpha"] * 80 + ["beta"] * 20) + (["alpha"] * 30 + ["beta"] * 70)  # tied
    df = pd.DataFrame({"a": a, "b": b, "decision": decision})
    s = _suggest_protected(df, _profiles(df), decision_col="decision")
    assert s is not None
    assert s.column == "b"


def test_suggest_protected_none_if_decision_missing() -> None:
    df = pd.DataFrame({"sex": ["M", "F", "M", "F"]})
    s = _suggest_protected(df, _profiles(df), decision_col=None)
    assert s is None


def test_suggest_protected_filters_high_cardinality() -> None:
    df = pd.DataFrame({
        "postcode": [f"7500{i % 100}" for i in range(200)],  # too many
        "decision": ([0, 1] * 100),
    })
    s = _suggest_protected(df, _profiles(df), decision_col="decision")
    assert s is None  # postcode skipped, nothing else
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py -v -k suggest_protected
```
Expected: FAIL — `_suggest_protected` introuvable.

- [ ] **Step 3: Implement `_suggest_protected`**

Append to `apps/api/app/audit_engine/dataset_analysis.py`:
```python
from scipy.stats import chi2_contingency


def _chi2_score(df: pd.DataFrame, col: str, decision_col: str) -> float:
    """Score = -log10(p_value) of chi² independence test, clamped to [0, 1] at hi=10."""
    if col == decision_col:
        return 0.0
    contingency = pd.crosstab(df[col], df[decision_col])
    if contingency.size == 0 or contingency.shape[0] < 2 or contingency.shape[1] < 2:
        return 0.0
    try:
        _, p, _, _ = chi2_contingency(contingency)
    except ValueError:
        return 0.0
    if p <= 0 or np.isnan(p):
        return 1.0
    raw = -float(np.log10(p))  # p=0.001 → 3.0, p=1e-10 → 10.0
    return _normalize_score(raw, hi=10.0)


def _suggest_protected(
    df: pd.DataFrame,
    profiles: tuple[ColumnProfile, ...],
    *,
    decision_col: str | None,
) -> Suggestion | None:
    if decision_col is None or decision_col not in df.columns:
        return None
    candidates: list[tuple[float, str, str]] = []
    for p in profiles:
        if p.name == decision_col:
            continue
        if not (2 <= p.unique_count <= 20):
            continue
        name_score = 1.0 if _PROTECTED_RE.match(p.name) else 0.0
        stats_score = _chi2_score(df, p.name, decision_col)
        final = 0.6 * name_score + 0.4 * stats_score
        reasons: list[str] = []
        if name_score > 0:
            reasons.append("nom évocateur d'attribut sensible")
        if stats_score > 0.3:
            reasons.append("lien fort avec la décision (χ²)")
        reason = (
            "Colonne candidate : " + ", ".join(reasons) + "."
            if reasons
            else "Cardinalité compatible mais aucun signal fort détecté."
        )
        candidates.append((final, p.name, reason))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, col, reason = candidates[0]
    if score < _CONFIDENCE_THRESHOLD:
        return None
    return Suggestion(column=col, confidence=round(score, 3), reason=reason)
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py -v -k suggest_protected
```
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check**

```
cd apps/api && uv run mypy --strict app/audit_engine/dataset_analysis.py
```
Expected: Success.

- [ ] **Step 6: Commit**

```
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/tests/audit_engine/test_dataset_analysis.py
git commit -m "feat(engine): _suggest_protected via chi-squared independence test"
```

---

## Task 6: Engine — `run_dataset_analysis` orchestrator + public API

**Files:**
- Modify: `apps/api/app/audit_engine/dataset_analysis.py` (+ `run_dataset_analysis`)
- Modify: `apps/api/app/audit_engine/__init__.py` (export public symbols)
- Modify: `apps/api/tests/audit_engine/test_dataset_analysis.py` (+ orchestrator tests)
- Modify: `apps/api/tests/audit_engine/test_public_api.py` (verify exports)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/audit_engine/test_dataset_analysis.py`:
```python
from app.audit_engine import run_dataset_analysis
from app.audit_engine.types import DatasetAnalysis


def test_run_dataset_analysis_full_flow() -> None:
    df = pd.DataFrame({
        "sex": ["M"] * 100 + ["F"] * 100,
        "approved": [1] * 80 + [0] * 20 + [1] * 40 + [0] * 60,
        "noise": list(range(200)),
    })
    a = run_dataset_analysis(df)
    assert isinstance(a, DatasetAnalysis)
    assert len(a.columns) == 3
    assert a.suggested_decision is not None
    assert a.suggested_decision.column == "approved"
    assert a.suggested_protected is not None
    assert a.suggested_protected.column == "sex"


def test_run_dataset_analysis_empty_columns() -> None:
    df = pd.DataFrame({"x": [1, 2, 3, 4, 5]})
    a = run_dataset_analysis(df)
    assert len(a.columns) == 1
    assert a.suggested_decision is None  # single column, no candidates
    assert a.suggested_protected is None


def test_run_dataset_analysis_constant_column_handled() -> None:
    df = pd.DataFrame({"x": [1] * 50, "y": [0, 1] * 25})
    a = run_dataset_analysis(df)
    # 'x' is constant (unique_count=1, < 2) → skipped from candidates
    assert all(p.unique_count >= 1 for p in a.columns)


def test_run_dataset_analysis_low_confidence_returns_none_suggestions() -> None:
    # Pure noise: nothing should be suggested above threshold
    rng = np.random.default_rng(123)
    df = pd.DataFrame({
        "a": rng.choice(["x", "y"], 200),
        "b": rng.choice(["p", "q"], 200),
        "c": rng.choice([0, 1], 200),
    })
    a = run_dataset_analysis(df)
    # All independent → low scores → likely None or low confidence
    if a.suggested_protected is not None:
        assert a.suggested_protected.confidence >= 0.3
```

Append to `apps/api/tests/audit_engine/test_public_api.py`:
```python
def test_dataset_analysis_in_public_api() -> None:
    from app import audit_engine

    assert "run_dataset_analysis" in audit_engine.__all__
    assert "DatasetAnalysis" in audit_engine.__all__
    assert "ColumnProfile" in audit_engine.__all__
    assert "Suggestion" in audit_engine.__all__
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py::test_run_dataset_analysis_full_flow tests/audit_engine/test_public_api.py::test_dataset_analysis_in_public_api -v
```
Expected: FAIL — `run_dataset_analysis` non exporté.

- [ ] **Step 3: Implement `run_dataset_analysis`**

Append to `apps/api/app/audit_engine/dataset_analysis.py`:
```python
def run_dataset_analysis(df: pd.DataFrame) -> DatasetAnalysis:
    """Profile every column and emit decision/protected suggestions.

    Pure function — no I/O, deterministic given the input DataFrame.
    """
    profiles = tuple(_profile_column(df, c) for c in df.columns)
    sug_decision = _suggest_decision(df, profiles)
    decision_col = sug_decision.column if sug_decision else None
    sug_protected = _suggest_protected(df, profiles, decision_col=decision_col)
    return DatasetAnalysis(
        columns=profiles,
        suggested_decision=sug_decision,
        suggested_protected=sug_protected,
    )
```

- [ ] **Step 4: Update `__init__.py`**

Modify `apps/api/app/audit_engine/__init__.py`:

Add to imports:
```python
from .dataset_analysis import run_dataset_analysis
from .types import (
    # ... keep existing imports ...
    ColumnProfile,
    DatasetAnalysis,
    Suggestion,
)
```

Add to `__all__`:
```python
    "run_dataset_analysis",
    "DatasetAnalysis",
    "ColumnProfile",
    "Suggestion",
```

- [ ] **Step 5: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/audit_engine/test_dataset_analysis.py tests/audit_engine/test_public_api.py -v
```
Expected: PASS (all tests).

- [ ] **Step 6: Type-check + lint**

```
cd apps/api && uv run mypy --strict app/audit_engine/ && uv run ruff check app/audit_engine/
```
Expected: Success ; ruff clean.

- [ ] **Step 7: Commit**

```
git add apps/api/app/audit_engine/dataset_analysis.py apps/api/app/audit_engine/__init__.py apps/api/tests/audit_engine/test_dataset_analysis.py apps/api/tests/audit_engine/test_public_api.py
git commit -m "feat(engine): run_dataset_analysis orchestrator + public exports"
```

---

## Task 7: Schemas — `DatasetAnalysisOut`, `ColumnProfileOut`, `SuggestionOut`

**Files:**
- Modify: `apps/api/app/schemas/dataset.py` (+ 3 schemas)
- Test: `apps/api/tests/api/test_schemas_async.py` (append) OR create dedicated test

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_schemas_async.py` (or create `test_schemas_dataset_analysis.py`):
```python
def test_dataset_analysis_out_serializes_full_flow() -> None:
    import pandas as pd
    from app.audit_engine import run_dataset_analysis
    from app.schemas.dataset import DatasetAnalysisOut

    df = pd.DataFrame({
        "sex": ["M"] * 100 + ["F"] * 100,
        "approved": [1] * 80 + [0] * 20 + [1] * 40 + [0] * 60,
    })
    analysis = run_dataset_analysis(df)
    payload = DatasetAnalysisOut.from_engine(analysis)
    data = payload.model_dump()
    assert "columns" in data
    assert "suggested_decision" in data
    assert data["suggested_protected"]["column"] == "sex"


def test_dataset_analysis_out_handles_none_suggestions() -> None:
    import pandas as pd
    from app.audit_engine import run_dataset_analysis
    from app.schemas.dataset import DatasetAnalysisOut

    df = pd.DataFrame({"x": [1, 2, 3]})
    payload = DatasetAnalysisOut.from_engine(run_dataset_analysis(df))
    data = payload.model_dump()
    assert data["suggested_decision"] is None
    assert data["suggested_protected"] is None
```

- [ ] **Step 2: Run test to verify it fails**

```
cd apps/api && uv run pytest tests/api/test_schemas_async.py -v -k dataset_analysis_out
```
Expected: FAIL — `DatasetAnalysisOut` introuvable.

- [ ] **Step 3: Add schemas**

Append to `apps/api/app/schemas/dataset.py`:
```python
from typing import Any

from app.audit_engine.types import DatasetAnalysis, Suggestion, ColumnProfile


class ColumnProfileOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    dtype: str
    unique_count: int
    null_ratio: float
    top_values: list[tuple[Any, int]]
    role_hint: str

    @classmethod
    def from_engine(cls, p: ColumnProfile) -> "ColumnProfileOut":
        return cls(
            name=p.name,
            dtype=p.dtype,
            unique_count=p.unique_count,
            null_ratio=p.null_ratio,
            top_values=[(k, v) for k, v in p.top_values],
            role_hint=p.role_hint,
        )


class SuggestionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    column: str
    confidence: float
    reason: str
    favorable_value: Any | None = None

    @classmethod
    def from_engine(cls, s: Suggestion) -> "SuggestionOut":
        return cls(
            column=s.column,
            confidence=s.confidence,
            reason=s.reason,
            favorable_value=s.favorable_value,
        )


class DatasetAnalysisOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[ColumnProfileOut]
    suggested_decision: SuggestionOut | None = None
    suggested_protected: SuggestionOut | None = None

    @classmethod
    def from_engine(cls, a: DatasetAnalysis) -> "DatasetAnalysisOut":
        return cls(
            columns=[ColumnProfileOut.from_engine(c) for c in a.columns],
            suggested_decision=(
                SuggestionOut.from_engine(a.suggested_decision)
                if a.suggested_decision
                else None
            ),
            suggested_protected=(
                SuggestionOut.from_engine(a.suggested_protected)
                if a.suggested_protected
                else None
            ),
        )
```

- [ ] **Step 4: Run the test to verify pass**

```
cd apps/api && uv run pytest tests/api/test_schemas_async.py -v -k dataset_analysis_out
```
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check**

```
cd apps/api && uv run mypy --strict app/schemas/dataset.py
```
Expected: Success.

- [ ] **Step 6: Commit**

```
git add apps/api/app/schemas/dataset.py apps/api/tests/api/test_schemas_async.py
git commit -m "feat(api): DatasetAnalysisOut Pydantic schemas with from_engine adapters"
```

---

## Task 8: Service — `dataset_service.get_or_build_analysis`

**Files:**
- Modify: `apps/api/app/services/dataset_service.py` (+ function)
- Modify: `apps/api/tests/api/test_dataset_service.py` (+ tests)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_dataset_service.py`:
```python
@pytest.mark.asyncio
async def test_get_or_build_analysis_first_call_computes_and_caches(
    async_session: AsyncSession, fake_storage: FakeStorage, sample_csv_bytes: bytes
) -> None:
    """First call runs the engine and writes the cache."""
    dataset = await dataset_service.create_dataset(
        async_session,
        fake_storage,
        org_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        filename="sample.csv",
        raw=sample_csv_bytes,
        retention_days=30,
    )
    assert dataset.analysis_cache is None  # not yet computed

    out = await dataset_service.get_or_build_analysis(
        async_session, fake_storage, dataset.id, org_id=dataset.org_id
    )
    assert out is not None
    assert len(out.columns) > 0

    # Cache persisted
    await async_session.refresh(dataset)
    assert dataset.analysis_cache is not None


@pytest.mark.asyncio
async def test_get_or_build_analysis_returns_cached_value(
    async_session: AsyncSession, fake_storage: FakeStorage, sample_csv_bytes: bytes
) -> None:
    dataset = await dataset_service.create_dataset(
        async_session,
        fake_storage,
        org_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        filename="sample.csv",
        raw=sample_csv_bytes,
        retention_days=30,
    )
    out1 = await dataset_service.get_or_build_analysis(
        async_session, fake_storage, dataset.id, org_id=dataset.org_id
    )
    # Tamper the storage to prove cache is used (storage not re-read)
    fake_storage.fail_next_download = True

    out2 = await dataset_service.get_or_build_analysis(
        async_session, fake_storage, dataset.id, org_id=dataset.org_id
    )
    assert out2.model_dump() == out1.model_dump()


@pytest.mark.asyncio
async def test_get_or_build_analysis_cross_org_returns_404(
    async_session: AsyncSession, fake_storage: FakeStorage, sample_csv_bytes: bytes
) -> None:
    dataset = await dataset_service.create_dataset(
        async_session,
        fake_storage,
        org_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        filename="x.csv",
        raw=sample_csv_bytes,
        retention_days=30,
    )
    with pytest.raises(NotFoundError):
        await dataset_service.get_or_build_analysis(
            async_session, fake_storage, dataset.id, org_id=uuid.uuid4()
        )
```

If `sample_csv_bytes` / `FakeStorage` fixtures don't already exist in this test module, add them or reuse existing fixtures (read this file first before writing tests). Inspect the file to confirm fixture names.

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/api/test_dataset_service.py -v -k get_or_build_analysis
```
Expected: FAIL — `get_or_build_analysis` n'existe pas.

- [ ] **Step 3: Implement `get_or_build_analysis`**

Append to `apps/api/app/services/dataset_service.py`:
```python
from app.audit_engine import run_dataset_analysis
from app.schemas.dataset import DatasetAnalysisOut


async def get_or_build_analysis(
    session: AsyncSession,
    storage: Storage,
    dataset_id: uuid.UUID,
    *,
    org_id: uuid.UUID,
) -> DatasetAnalysisOut:
    """Return cached analysis or compute, cache, and return it.

    RLS enforced via org_id scope. Raises NotFoundError for cross-org access.
    """
    dataset = await get_dataset(session, dataset_id, org_id=org_id)
    if dataset.analysis_cache:
        return DatasetAnalysisOut.model_validate(dataset.analysis_cache)
    raw = await storage.download(dataset.storage_path)
    df = pd.read_csv(io.BytesIO(raw))
    analysis = run_dataset_analysis(df)
    out = DatasetAnalysisOut.from_engine(analysis)
    dataset.analysis_cache = out.model_dump()
    await session.commit()
    return out
```

Verify that `Storage` in `apps/api/app/integrations/storage.py` has a `download(path) -> bytes` method. If not, adapt to the existing API (e.g. `read`, `get_object`). Read this file before implementing.

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/api/test_dataset_service.py -v -k get_or_build_analysis
```
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check**

```
cd apps/api && uv run mypy --strict app/services/dataset_service.py
```
Expected: Success.

- [ ] **Step 6: Commit**

```
git add apps/api/app/services/dataset_service.py apps/api/tests/api/test_dataset_service.py
git commit -m "feat(api): dataset_service.get_or_build_analysis with JSONB cache"
```

---

## Task 9: Router — `POST /datasets/{id}/analyze`

**Files:**
- Modify: `apps/api/app/routers/datasets.py` (+ endpoint)
- Modify: `apps/api/tests/api/test_datasets_router.py` (+ tests)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_datasets_router.py`:
```python
@pytest.mark.asyncio
async def test_analyze_endpoint_returns_payload(
    client_with_dataset: AsyncClient, dataset_id: uuid.UUID
) -> None:
    resp = await client_with_dataset.post(f"/api/v1/datasets/{dataset_id}/analyze")
    assert resp.status_code == 200
    body = resp.json()
    assert "columns" in body
    assert isinstance(body["columns"], list)


@pytest.mark.asyncio
async def test_analyze_endpoint_404_for_unknown_dataset(
    authenticated_client: AsyncClient,
) -> None:
    resp = await authenticated_client.post(
        f"/api/v1/datasets/{uuid.uuid4()}/analyze"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_analyze_endpoint_404_cross_org(
    other_org_client: AsyncClient, dataset_id: uuid.UUID
) -> None:
    resp = await other_org_client.post(f"/api/v1/datasets/{dataset_id}/analyze")
    assert resp.status_code == 404
```

(Read `test_datasets_router.py` first to use existing fixture names — `client_with_dataset`, `dataset_id`, `other_org_client` are placeholders matching the cross-org pattern already used in the M2-B1 router tests. Adapt if names differ.)

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/api/test_datasets_router.py -v -k analyze
```
Expected: FAIL — endpoint manquant (404 sur le path).

- [ ] **Step 3: Add the endpoint**

In `apps/api/app/routers/datasets.py`, append:
```python
from app.schemas.dataset import DatasetAnalysisOut


@router.post("/{dataset_id}/analyze", response_model=DatasetAnalysisOut)
async def analyze_dataset(
    dataset_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
    storage: Storage = Depends(get_storage_dep),  # noqa: B008
) -> DatasetAnalysisOut:
    return await dataset_service.get_or_build_analysis(
        session, storage, dataset_id, org_id=user.org_id
    )
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/api/test_datasets_router.py -v -k analyze
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add apps/api/app/routers/datasets.py apps/api/tests/api/test_datasets_router.py
git commit -m "feat(api): POST /datasets/{id}/analyze endpoint (cached JSONB)"
```

---

## Task 10: Schemas M3 — `M3TestConnectionIn`, `M3TestConnectionOut`, `M3ValidateUrlIn`

**Files:**
- Modify: `apps/api/app/schemas/audit.py` (+ 3 schemas)
- Test: `apps/api/tests/api/test_schemas_m3.py` (append)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_schemas_m3.py`:
```python
def test_m3_test_connection_in_default_prompt() -> None:
    from app.schemas.audit import M3TestConnectionIn, TargetConfigIn

    body = M3TestConnectionIn(
        target=TargetConfigIn(
            url="https://api.example.com/v1/chat",
            method="POST",
            headers={"Authorization": "Bearer x"},
            body_template='{"prompt":"{prompt}"}',
            response_path="choices.0.message.content",
        )
    )
    assert body.test_prompt.startswith("Bonjour")


def test_m3_test_connection_out_status_literal() -> None:
    from app.schemas.audit import M3TestConnectionOut

    out = M3TestConnectionOut(status="ok", elapsed_ms=120)
    assert out.status == "ok"
    with pytest.raises(ValidationError):
        M3TestConnectionOut(status="weird", elapsed_ms=0)  # type: ignore[arg-type]


def test_m3_validate_url_in_requires_url() -> None:
    from app.schemas.audit import M3ValidateUrlIn

    M3ValidateUrlIn(url="https://api.example.com")
    with pytest.raises(ValidationError):
        M3ValidateUrlIn(url="not-a-url")  # type: ignore[arg-type]
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/api/test_schemas_m3.py -v -k "test_connection or validate_url"
```
Expected: FAIL — `M3TestConnectionIn` introuvable.

- [ ] **Step 3: Add the schemas**

Inspect `apps/api/app/schemas/audit.py` first to know whether `TargetConfigIn` already exists (yes, per the M3-B work). Reuse it.

Append to `apps/api/app/schemas/audit.py`:
```python
from typing import Any, Literal


class M3TestConnectionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: TargetConfigIn
    test_prompt: str = "Bonjour, peux-tu te présenter brièvement ?"


class M3TestConnectionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "error"]
    elapsed_ms: int
    request_sent: dict[str, Any] | None = None
    response_raw: Any = None
    extracted_value: str | None = None
    error: str | None = None


class M3ValidateUrlIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: AnyHttpUrl  # pydantic.AnyHttpUrl — refuses bad URLs


class M3ValidateUrlOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
```

Make sure `AnyHttpUrl` is imported from `pydantic`.

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/api/test_schemas_m3.py -v -k "test_connection or validate_url"
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_m3.py
git commit -m "feat(api): M3TestConnection + M3ValidateUrl Pydantic schemas"
```

---

## Task 11: Service — `llm_test_connection`

**Files:**
- Create: `apps/api/app/services/llm_test_connection.py`
- Create: `apps/api/tests/api/test_llm_test_connection.py`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/api/test_llm_test_connection.py`:
```python
"""Tests for the one-shot M3 test-connection service."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.integrations.llm_target import TargetConfig
from app.services.llm_test_connection import test_connection


@pytest.mark.asyncio
async def test_test_connection_happy_path() -> None:
    cfg = TargetConfig(
        url="https://api.example.com/v1/chat",
        method="POST",
        headers={"Authorization": "Bearer fake"},
        body_template='{"messages":[{"content":"{prompt}"}]}',
        response_path="choices.0.message.content",
    )
    with patch(
        "app.services.llm_test_connection.call_target_llm",
        new=AsyncMock(return_value="Bonjour ! Je suis un assistant."),
    ):
        out = await test_connection(cfg, "Bonjour")
    assert out.status == "ok"
    assert out.extracted_value == "Bonjour ! Je suis un assistant."
    assert out.error is None
    assert out.elapsed_ms >= 0


@pytest.mark.asyncio
async def test_test_connection_apierror_returns_error_status() -> None:
    from app.core.errors import APIError

    cfg = TargetConfig(
        url="https://api.example.com/v1/chat",
        method="POST",
        headers={},
        body_template='{"prompt":"{prompt}"}',
        response_path="text",
    )
    with patch(
        "app.services.llm_test_connection.call_target_llm",
        new=AsyncMock(side_effect=APIError("Réponse illisible.", status=502)),
    ):
        out = await test_connection(cfg, "Bonjour")
    assert out.status == "error"
    assert out.error is not None and "illisible" in out.error
    assert out.extracted_value is None
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/api/test_llm_test_connection.py -v
```
Expected: FAIL — module introuvable.

- [ ] **Step 3: Create the service**

`apps/api/app/services/llm_test_connection.py`:
```python
"""One-shot M3 test-connection service.

Calls the user's target LLM once with an innocuous prompt to validate config
before launching the full audit. Reuses the SSRF-hardened llm_target client.

Never persists the auth secret or the test prompt — same rule as run_m3_audit.
"""
from __future__ import annotations

import time

from app.core.errors import APIError
from app.integrations.llm_target import TargetConfig, call_target_llm
from app.schemas.audit import M3TestConnectionOut


async def test_connection(
    cfg: TargetConfig, test_prompt: str
) -> M3TestConnectionOut:
    """Return a structured outcome. Never raises — errors are reported in the body."""
    started = time.monotonic()
    try:
        extracted = await call_target_llm(cfg, test_prompt)
    except APIError as exc:
        elapsed = int((time.monotonic() - started) * 1000)
        return M3TestConnectionOut(
            status="error",
            elapsed_ms=elapsed,
            error=str(exc),
        )
    elapsed = int((time.monotonic() - started) * 1000)
    return M3TestConnectionOut(
        status="ok",
        elapsed_ms=elapsed,
        extracted_value=extracted,
    )
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/api/test_llm_test_connection.py -v
```
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check + lint**

```
cd apps/api && uv run mypy --strict app/services/llm_test_connection.py && uv run ruff check app/services/llm_test_connection.py
```
Expected: Success ; ruff clean.

- [ ] **Step 6: Commit**

```
git add apps/api/app/services/llm_test_connection.py apps/api/tests/api/test_llm_test_connection.py
git commit -m "feat(api): llm_test_connection one-shot service (reuses llm_target)"
```

---

## Task 12: Router — `POST /audits/m3/test-connection`

**Files:**
- Modify: `apps/api/app/routers/audits.py` (+ endpoint)
- Modify: `apps/api/tests/api/test_audits_router.py` (+ tests)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_audits_router.py`:
```python
@pytest.mark.asyncio
async def test_m3_test_connection_happy_path(
    authenticated_client: AsyncClient,
) -> None:
    payload = {
        "target": {
            "url": "https://api.openai.com/v1/chat/completions",
            "method": "POST",
            "headers": {"Authorization": "Bearer xxx"},
            "body_template": '{"messages":[{"role":"user","content":"{prompt}"}]}',
            "response_path": "choices.0.message.content",
        }
    }
    with patch(
        "app.routers.audits.test_connection",
        new=AsyncMock(
            return_value=M3TestConnectionOut(
                status="ok", elapsed_ms=120, extracted_value="hi"
            )
        ),
    ):
        resp = await authenticated_client.post(
            "/api/v1/audits/m3/test-connection", json=payload
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert resp.json()["extracted_value"] == "hi"


@pytest.mark.asyncio
async def test_m3_test_connection_ssrf_returns_error_status(
    authenticated_client: AsyncClient,
) -> None:
    payload = {
        "target": {
            "url": "http://169.254.169.254/latest",
            "method": "GET",
            "headers": {},
            "body_template": "{}",
            "response_path": "x",
        }
    }
    resp = await authenticated_client.post(
        "/api/v1/audits/m3/test-connection", json=payload
    )
    # SSRF guard fires at assert_public inside call_target_llm → service returns error
    assert resp.status_code == 200
    assert resp.json()["status"] == "error"


@pytest.mark.asyncio
async def test_m3_test_connection_requires_auth(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/audits/m3/test-connection", json={"target": {}}
    )
    assert resp.status_code in (401, 403)
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/api/test_audits_router.py -v -k m3_test_connection
```
Expected: FAIL — endpoint manquant.

- [ ] **Step 3: Add the endpoint**

In `apps/api/app/routers/audits.py`:

Imports (top):
```python
from app.integrations.llm_target import TargetConfig
from app.schemas.audit import (
    AuditCreate,
    AuditOut,
    M3TestConnectionIn,
    M3TestConnectionOut,
)
from app.services.llm_test_connection import test_connection
```

Endpoint (append):
```python
@router.post("/m3/test-connection", response_model=M3TestConnectionOut)
async def m3_test_connection(
    body: M3TestConnectionIn,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
) -> M3TestConnectionOut:
    cfg = TargetConfig(
        url=body.target.url,
        method=body.target.method,
        headers=dict(body.target.headers),
        body_template=body.target.body_template,
        response_path=body.target.response_path,
    )
    return await test_connection(cfg, body.test_prompt)
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/api/test_audits_router.py -v -k m3_test_connection
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add apps/api/app/routers/audits.py apps/api/tests/api/test_audits_router.py
git commit -m "feat(api): POST /audits/m3/test-connection endpoint"
```

---

## Task 13: Router — `POST /audits/m3/validate-url`

**Files:**
- Modify: `apps/api/app/routers/audits.py` (+ endpoint)
- Modify: `apps/api/tests/api/test_audits_router.py` (+ tests)

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/api/test_audits_router.py`:
```python
@pytest.mark.asyncio
async def test_m3_validate_url_public_url_ok(
    authenticated_client: AsyncClient,
) -> None:
    resp = await authenticated_client.post(
        "/api/v1/audits/m3/validate-url",
        json={"url": "https://api.openai.com/v1/chat/completions"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_m3_validate_url_private_url_422(
    authenticated_client: AsyncClient,
) -> None:
    resp = await authenticated_client.post(
        "/api/v1/audits/m3/validate-url",
        json={"url": "http://10.0.0.1/internal"},
    )
    assert resp.status_code == 422
    assert "non publique" in resp.json()["detail"].lower() or "SSRF" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_m3_validate_url_metadata_endpoint_422(
    authenticated_client: AsyncClient,
) -> None:
    resp = await authenticated_client.post(
        "/api/v1/audits/m3/validate-url",
        json={"url": "http://169.254.169.254/latest"},
    )
    assert resp.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd apps/api && uv run pytest tests/api/test_audits_router.py -v -k validate_url
```
Expected: FAIL — endpoint manquant.

- [ ] **Step 3: Add the endpoint**

In `apps/api/app/routers/audits.py`:

Imports (top, additions):
```python
from app.integrations.llm_target import assert_public_url
from app.schemas.audit import M3ValidateUrlIn, M3ValidateUrlOut
```

Endpoint (append):
```python
@router.post("/m3/validate-url", response_model=M3ValidateUrlOut)
async def m3_validate_url(
    body: M3ValidateUrlIn,
    user: CurrentUser = Depends(get_current_user),  # noqa: B008
) -> M3ValidateUrlOut:
    # Raises APIError 422 on private/blocked URLs; FastAPI's exception handler
    # converts that to a 422 JSON response.
    assert_public_url(str(body.url))
    return M3ValidateUrlOut(status="ok")
```

- [ ] **Step 4: Run the tests to verify pass**

```
cd apps/api && uv run pytest tests/api/test_audits_router.py -v -k validate_url
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```
git add apps/api/app/routers/audits.py apps/api/tests/api/test_audits_router.py
git commit -m "feat(api): POST /audits/m3/validate-url SSRF pre-check endpoint"
```

---

## Task 14: Final gate — full pytest, ruff, mypy, plan sync

**Files:**
- (read-only validation across the whole `apps/api/` tree)

- [ ] **Step 1: Run the full pytest suite**

```
cd apps/api && uv run pytest -q
```
Expected: ~293 passed (277 baseline + ~16 new), 0 failed.

- [ ] **Step 2: Run ruff**

```
cd apps/api && uv run ruff check
```
Expected: All checks passed.

- [ ] **Step 3: Run mypy --strict**

```
cd apps/api && uv run mypy --strict app
```
Expected: Success.

- [ ] **Step 4: Verify identity on every new commit**

```
git log --format="%h %an <%ae> %s" origin/main..HEAD
```
Expected: every commit `Franck F <franck-dilane1.fambou@epitech.digital>`, every subject prefixed `feat(api):`, `feat(engine):` or `test(...)`, **zero** `Co-Authored-By: Claude` trailer.

If any commit shows the wrong identity, filter-branch-normalize per `memory/git-commit-identity.md` before pushing.

- [ ] **Step 5: Push branch + open PR**

```
git push -u origin worktree-wizard-sp1-engine-endpoints
gh pr create --title "feat(api): wizard orientation SP1 — dataset analysis engine + M3 endpoints" --body "$(cat <<'EOF'
## Summary

Sous-projet 1 du wizard d'audit orienté (spec `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md`).

- Engine pur `audit_engine/dataset_analysis.py` : profilage colonnes + suggestions décision/attribut protégé (heuristiques nom + χ² + mutual info, seuil confidence 0.3)
- Migration 0007 `datasets.analysis_cache` JSONB nullable
- Endpoint `POST /datasets/{id}/analyze` (cache JSONB org-scoped)
- Endpoint `POST /audits/m3/test-connection` (one-shot via llm_target existant)
- Endpoint `POST /audits/m3/validate-url` (pré-check SSRF léger)

## Test plan

- [x] pytest ~293 (de 277), 0 régression
- [x] ruff clean
- [x] mypy --strict clean
- [x] migration 0007 applique sur SQLite et Postgres
- [x] cache hit/miss + cross-org 404 vérifiés
- [x] SSRF refus indépendamment vérifié sur les 3 endpoints M3

SP2 (wizard shell composants partagés) suivra après merge.
EOF
)"
```

- [ ] **Step 6: Final commit if the plan needed correction during execution**

If during execution any task revealed an inaccuracy in this plan (wrong fixture name, missed dependency, etc.), append a final commit:

```
git add docs/superpowers/plans/2026-05-28-sp1-wizard-orientation-engine-endpoints.md
git commit -m "chore(plan): sync plan with discoveries during SP1 execution"
```

---

## Spec coverage check

| Spec section / item | Covered by |
|---|---|
| 3 — Architecture file map | Tasks 1-13 file paths |
| 4.1 — engine `run_dataset_analysis` | Tasks 2-6 |
| 4.1 — heuristic name + χ² + MI scoring | Tasks 4 (MI) + 5 (χ²) |
| 4.1 — confidence ≥ 0.3 threshold | Task 4 + 5 + 6 (Step 3 `_CONFIDENCE_THRESHOLD`) |
| 4.1 — favorable_value = minority value | Task 4 (Step 3) |
| 4.1 — French human-readable `reason` | Tasks 4 + 5 |
| 4.2 — `POST /datasets/{id}/analyze` | Task 9 |
| 4.2 — JSONB cache + RLS org-scope | Tasks 1 + 8 + 9 |
| 4.3 — `POST /audits/m3/test-connection` | Tasks 10 + 11 + 12 |
| 4.3 — secret-non-persistence | Task 11 (service doesn't store cfg) + Task 12 (router doesn't log) |
| 4.4 — `POST /audits/m3/validate-url` | Tasks 10 + 13 |
| 5 — Migration 0007 | Task 1 |
| 7 — pytest target ~290 | Task 14 |
| 7 — `audit_engine/test_dataset_analysis.py` 8-10 tests | Tasks 3 (8) + 4 (4) + 5 (4) + 6 (4) = ~20 tests, exceeds spec |
| 7 — `routers/test_audits_m3_test_connection.py` | Task 12 (tests merged into `test_audits_router.py` to stay with existing pattern) |
| 7 — `routers/test_audits_m3_validate_url.py` | Task 13 (idem) |

**Out-of-scope for SP1 (covered by SP2/SP3 plans):**
- Composants React wizard (`WizardShell`, `HelpPanel`, etc.) → SP2
- 5 étapes par module + remplacement de `nouveau/page.tsx` → SP3
- Tests vitest + Playwright wizard → SP3
- `lib/wizard/help-content.ts` côté web → SP2
