# M1 Audit Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, I/O-free M1 supervised fairness audit engine (`apps/api/app/audit_engine/`) that turns a `pandas.DataFrame` + config into a typed `M1Result` (Disparate Impact / 4-5 rule, Demographic Parity, per-group selection rates, verdict, risk score).

**Architecture:** Pure functions, zero I/O, zero framework deps. `m1_supervised.run_m1` validates input then delegates math to `metrics.py`. Pandas is used only to extract per-group counts in `m1_supervised`; `metrics.py` operates on plain dicts so the math is trivially unit-testable. This is Plan 1 of 3 (engine → API → web); it produces a self-contained, fully tested library.

**Tech Stack:** Python 3.10+, pandas, pytest. Package manager: `uv` (fallback: venv + pip). This is a **pnpm/uv** repo — never `npm install`.

---

## File Structure

```
apps/api/app/audit_engine/
├── __init__.py          # public API re-exports
├── errors.py            # AuditEngineError, DatasetValidationError
├── types.py             # M1Config, GroupStat, M1Result (frozen dataclasses)
├── metrics.py           # pure: selection_rate, pick_reference, disparate_impacts,
│                         #        demographic_parity_diff, decide_verdict, risk_score
└── m1_supervised.py     # run_m1(df, config) -> M1Result (validation + orchestration)

apps/api/tests/audit_engine/
├── __init__.py
├── conftest.py          # DataFrame fixtures (recruitment / fair / warn / small-sample)
├── test_metrics.py      # pure metric unit tests
├── test_validation.py   # DatasetValidationError cases
└── test_m1_supervised.py# end-to-end engine on named fixtures + edges
```

Verdict bands (spec §5, 4-5 rule): `fail` DI < 0.80 · `warn` 0.80 ≤ DI < 0.90 (or any group n<30 while DI would pass) · `pass` DI ≥ 0.90.

---

### Task 1: Python environment + package scaffold

**Files:**
- Create: `apps/api/app/audit_engine/__init__.py` (empty for now)
- Create: `apps/api/tests/audit_engine/__init__.py` (empty)

- [ ] **Step 1: Create the Python environment and install dev deps**

Run from `apps/api` (PowerShell). Prefer `uv`; if `uv` is missing use the venv fallback.

```powershell
# preferred
uv sync --extra dev
# fallback if 'uv' is not installed:
# python -m venv .venv ; .\.venv\Scripts\python -m pip install -e ".[dev]"
```

Expected: dependencies install, including `pytest`, `pandas`, `ruff`, `mypy`.

- [ ] **Step 2: Create empty package + test package markers**

Create `apps/api/app/audit_engine/__init__.py` with a single line:

```python
"""AuditIQ M1 audit engine — pure, no I/O."""
```

Create `apps/api/tests/audit_engine/__init__.py` as an empty file (0 bytes).

- [ ] **Step 3: Verify the toolchain runs**

Run from `apps/api`:

```powershell
uv run pytest -q
```

Expected: pytest collects 0 tests and exits 0 (`no tests ran`). If using the venv fallback, run `.\.venv\Scripts\python -m pytest -q`.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/app/audit_engine/__init__.py apps/api/tests/audit_engine/__init__.py
git -c core.autocrlf=false commit -m "chore(engine): scaffold audit_engine package + test env

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Errors and result types

**Files:**
- Create: `apps/api/app/audit_engine/errors.py`
- Create: `apps/api/app/audit_engine/types.py`
- Test: `apps/api/tests/audit_engine/test_types.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/audit_engine/test_types.py`:

```python
from dataclasses import FrozenInstanceError

import pytest

from app.audit_engine.errors import AuditEngineError, DatasetValidationError
from app.audit_engine.types import GroupStat, M1Config, M1Result


def test_dataset_validation_error_carries_field():
    err = DatasetValidationError("colonne absente", field="protected_attribute")
    assert isinstance(err, AuditEngineError)
    assert err.message == "colonne absente"
    assert err.field == "protected_attribute"


def test_m1config_defaults_follow_4_5_rule():
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
    )
    assert cfg.privileged_value is None
    assert cfg.di_fail_below == 0.80
    assert cfg.di_warn_below == 0.90
    assert cfg.min_group_error == 5
    assert cfg.min_group_warn == 30


def test_result_is_frozen_and_defaults_warnings():
    g = GroupStat(value="Femmes", n=200, favorable=72, selection_rate=0.36,
                  disparate_impact=0.72)
    res = M1Result(
        groups=[g], reference_value="Hommes", disparate_impact=0.72,
        demographic_parity_diff=0.14, worst_group="Femmes", verdict="fail",
        risk_score=55,
    )
    assert res.warnings == ()
    with pytest.raises(FrozenInstanceError):
        res.verdict = "pass"  # type: ignore[misc]
    assert isinstance(res.groups, tuple)
    with pytest.raises(AttributeError):
        res.groups.append(g)  # type: ignore[attr-defined]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/audit_engine/test_types.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.audit_engine.errors'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/audit_engine/errors.py`:

```python
class AuditEngineError(Exception):
    """Base error for the pure audit engine. No I/O, no framework deps."""


class DatasetValidationError(AuditEngineError):
    """Input data/config can't be audited. Caller maps this to HTTP 422."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.field = field
```

Create `apps/api/app/audit_engine/types.py`:

```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class M1Config:
    protected_attribute: str
    decision_column: str
    favorable_value: object
    privileged_value: object | None = None
    di_fail_below: float = 0.80
    di_warn_below: float = 0.90
    min_group_error: int = 5
    min_group_warn: int = 30


@dataclass(frozen=True)
class GroupStat:
    value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float


@dataclass(frozen=True)
class M1Result:
    groups: tuple[GroupStat, ...]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: str
    risk_score: int
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "groups", tuple(self.groups))
        object.__setattr__(self, "warnings", tuple(self.warnings))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/audit_engine/test_types.py -q`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```powershell
git add apps/api/app/audit_engine/errors.py apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_types.py
git -c core.autocrlf=false commit -m "feat(engine): M1 errors and frozen result types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Pure metrics — selection rate, reference, disparate impact, parity

**Files:**
- Create: `apps/api/app/audit_engine/metrics.py`
- Test: `apps/api/tests/audit_engine/test_metrics.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/audit_engine/test_metrics.py`:

```python
import pytest

from app.audit_engine.metrics import (
    VERDICT_FAIL,
    VERDICT_PASS,
    VERDICT_WARN,
    decide_verdict,
    demographic_parity_diff,
    disparate_impacts,
    pick_reference,
    risk_score,
    selection_rate,
)


def test_selection_rate_basic():
    assert selection_rate(72, 200) == 0.36


def test_selection_rate_zero_n_raises():
    with pytest.raises(ValueError):
        selection_rate(0, 0)


def test_pick_reference_uses_privileged_when_given():
    assert pick_reference({"A": 0.4, "B": 0.6}, "A") == "A"


def test_pick_reference_max_rate_with_deterministic_tiebreak():
    # tie at 0.6 -> smallest label wins
    assert pick_reference({"Groupe B": 0.6, "Groupe A": 0.6}, None) == "Groupe A"
    assert pick_reference({"H": 0.5, "F": 0.36}, None) == "H"


def test_disparate_impacts_ratio_to_reference():
    di, warns = disparate_impacts({"H": 0.5, "F": 0.36}, "H")
    assert di["H"] == 1.0
    assert di["F"] == pytest.approx(0.72)
    assert warns == []


def test_disparate_impacts_zero_reference_rate_is_neutral_with_warning():
    di, warns = disparate_impacts({"A": 0.0, "B": 0.0}, "A")
    assert di == {"A": 1.0, "B": 1.0}
    assert len(warns) == 1 and "non calculable" in warns[0]


def test_demographic_parity_diff():
    assert demographic_parity_diff({"A": 0.5, "B": 0.36}) == pytest.approx(0.14)


@pytest.mark.parametrize(
    "di,small,expected",
    [
        (0.72, False, VERDICT_FAIL),
        (0.79, False, VERDICT_FAIL),
        (0.80, False, VERDICT_WARN),
        (0.85, False, VERDICT_WARN),
        (0.90, False, VERDICT_PASS),
        (1.00, False, VERDICT_PASS),
        (0.95, True, VERDICT_WARN),  # small sample downgrades pass -> warn
    ],
)
def test_decide_verdict_bands(di, small, expected):
    assert decide_verdict(di, 0.80, 0.90, small) == expected


@pytest.mark.parametrize(
    "di,imbalance,expected",
    [
        (1.00, 0.0, 0),
        (0.90, 0.0, 20),
        (0.85, 0.0, 35),
        (0.80, 0.0, 50),
        (0.72, 0.0, 55),
        (0.00, 0.0, 100),
        (1.00, 0.9, 9),
    ],
)
def test_risk_score_piecewise(di, imbalance, expected):
    assert risk_score(di, imbalance) == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/audit_engine/test_metrics.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.audit_engine.metrics'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/audit_engine/metrics.py`:

```python
from __future__ import annotations

VERDICT_PASS = "pass"
VERDICT_WARN = "warn"
VERDICT_FAIL = "fail"


def selection_rate(favorable: int, n: int) -> float:
    if n <= 0:
        raise ValueError("n must be > 0")
    return favorable / n


def pick_reference(rates: dict[str, float], privileged_value: str | None) -> str:
    if privileged_value is not None:
        return privileged_value
    max_rate = max(rates.values())
    return sorted(g for g, r in rates.items() if r == max_rate)[0]


def disparate_impacts(
    rates: dict[str, float], reference: str
) -> tuple[dict[str, float], list[str]]:
    ref_rate = rates[reference]
    if ref_rate == 0.0:
        return (
            dict.fromkeys(rates, 1.0),
            [
                f"Taux de sélection nul pour le groupe de référence "
                f"« {reference} » — Disparate Impact non calculable, "
                f"traité comme neutre (1.0)."
            ],
        )
    return ({g: r / ref_rate for g, r in rates.items()}, [])


def demographic_parity_diff(rates: dict[str, float]) -> float:
    return max(rates.values()) - min(rates.values())


def decide_verdict(
    di: float, fail_below: float, warn_below: float, has_small_group: bool
) -> str:
    if di < fail_below:
        return VERDICT_FAIL
    if di < warn_below:
        return VERDICT_WARN
    return VERDICT_WARN if has_small_group else VERDICT_PASS


def risk_score(di: float, size_imbalance: float) -> int:
    d = min(max(di, 0.0), 1.0)
    if d >= 0.90:
        base = (1.0 - d) / 0.10 * 20.0
    elif d >= 0.80:
        base = 20.0 + (0.90 - d) / 0.10 * 30.0
    else:
        base = 50.0 + (0.80 - d) / 0.80 * 50.0
    return int(min(100, max(0, round(base + size_imbalance * 10.0))))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/audit_engine/test_metrics.py -q`
Expected: PASS (all parametrized cases green).

- [ ] **Step 5: Commit**

```powershell
git add apps/api/app/audit_engine/metrics.py apps/api/tests/audit_engine/test_metrics.py
git -c core.autocrlf=false commit -m "feat(engine): pure fairness metrics (DI, parity, verdict, risk)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: DataFrame fixtures

**Files:**
- Create: `apps/api/tests/audit_engine/conftest.py`

- [ ] **Step 1: Create the fixtures**

Create `apps/api/tests/audit_engine/conftest.py`:

```python
import pandas as pd
import pytest


def _df(rows: list[tuple[str, int, int]]) -> pd.DataFrame:
    """rows = list of (group_label, n, favorable_count). Decision is 'oui'/'non'."""
    records = []
    for label, n, fav in rows:
        records += [{"genre": label, "decision": "oui"}] * fav
        records += [{"genre": label, "decision": "non"}] * (n - fav)
    return pd.DataFrame.from_records(records)


@pytest.fixture
def recruitment_df() -> pd.DataFrame:
    # Hommes sr=0.50, Femmes sr=0.36 -> DI 0.72 -> fail
    return _df([("Hommes", 200, 100), ("Femmes", 200, 72)])


@pytest.fixture
def fair_df() -> pd.DataFrame:
    # both sr=0.60 -> DI 1.0 -> pass
    return _df([("Groupe A", 150, 90), ("Groupe B", 150, 90)])


@pytest.fixture
def warn_df() -> pd.DataFrame:
    # sr 0.50 vs 0.425 -> DI 0.85 -> warn
    return _df([("GroupA", 200, 100), ("GroupB", 200, 85)])


@pytest.fixture
def small_sample_df() -> pd.DataFrame:
    # both sr=0.60 (DI 1.0) but GroupB n=20 < 30 -> warn + warning
    return _df([("GroupA", 200, 120), ("GroupB", 20, 12)])
```

- [ ] **Step 2: Verify fixtures import cleanly**

Run: `uv run pytest tests/audit_engine -q`
Expected: PASS — existing tests still green, no collection errors from `conftest.py`.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/tests/audit_engine/conftest.py
git -c core.autocrlf=false commit -m "test(engine): DataFrame fixtures for M1 scenarios

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `run_m1` — happy paths on named fixtures

**Files:**
- Create: `apps/api/app/audit_engine/m1_supervised.py`
- Test: `apps/api/tests/audit_engine/test_m1_supervised.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/audit_engine/test_m1_supervised.py`:

```python
import pytest

from app.audit_engine.m1_supervised import run_m1
from app.audit_engine.types import M1Config

CFG = M1Config(
    protected_attribute="genre",
    decision_column="decision",
    favorable_value="oui",
)


def _by_value(result):
    return {g.value: g for g in result.groups}


def test_recruitment_case_is_fail(recruitment_df):
    r = run_m1(recruitment_df, CFG)
    assert r.reference_value == "Hommes"
    assert r.disparate_impact == 0.72
    assert r.worst_group == "Femmes"
    assert r.demographic_parity_diff == 0.14
    assert r.verdict == "fail"
    assert r.risk_score == 55
    assert r.warnings == ()
    g = _by_value(r)
    assert g["Femmes"].selection_rate == 0.36
    assert g["Femmes"].n == 200
    assert g["Femmes"].favorable == 72
    assert g["Hommes"].disparate_impact == 1.0


def test_fair_case_is_pass(fair_df):
    r = run_m1(fair_df, CFG)
    assert r.disparate_impact == 1.0
    assert r.demographic_parity_diff == 0.0
    assert r.verdict == "pass"
    assert r.risk_score == 0
    assert r.reference_value == "Groupe A"


def test_warn_band_case(warn_df):
    r = run_m1(warn_df, CFG)
    assert r.disparate_impact == 0.85
    assert r.verdict == "warn"
    assert r.risk_score == 35
    assert r.worst_group == "GroupB"


def test_small_sample_downgrades_to_warn(small_sample_df):
    r = run_m1(small_sample_df, CFG)
    assert r.disparate_impact == 1.0
    assert r.verdict == "warn"
    assert r.risk_score == 9
    assert any("Effectif faible" in w and "GroupB" in w for w in r.warnings)


def test_privileged_value_override(recruitment_df):
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
        privileged_value="Femmes",
    )
    r = run_m1(recruitment_df, cfg)
    assert r.reference_value == "Femmes"
    # Hommes sr 0.5 / Femmes sr 0.36 = 1.388..., Femmes DI = 1.0; min DI = 1.0
    assert r.disparate_impact == 1.0
    assert r.verdict == "pass"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/audit_engine/test_m1_supervised.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.audit_engine.m1_supervised'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/audit_engine/m1_supervised.py`:

```python
"""Pure M1 supervised fairness audit: run_m1(df, config) -> M1Result. No I/O."""
from __future__ import annotations

import pandas as pd

from .errors import DatasetValidationError
from .metrics import (
    decide_verdict,
    demographic_parity_diff,
    disparate_impacts,
    pick_reference,
    risk_score,
    selection_rate,
)
from .types import GroupStat, M1Config, M1Result

_ROUND = 4


def run_m1(df: pd.DataFrame, config: M1Config) -> M1Result:
    """Run the M1 supervised fairness audit.

    Pure: no I/O, no LLM. Validates the dataframe/config then computes
    Disparate Impact (4/5 rule), Demographic Parity, per-group selection
    rates, a verdict and a 0-100 risk score.

    Value-comparison contract: the protected and decision columns are
    compared as strings via ``astype(str)``. ``favorable_value`` and
    ``privileged_value`` are matched using ``str(value)``. Callers must
    therefore pass these in a form that equals ``str()`` of the column's
    values (e.g. for a float column holding 1.0, pass "1.0", not 1).
    Normalising numeric/boolean columns is the responsibility of the
    caller / input layer, not this engine.

    Raises:
        DatasetValidationError: if the data or config cannot be audited.
    """
    pa = config.protected_attribute
    dc = config.decision_column

    if pa not in df.columns:
        raise DatasetValidationError(
            f"Colonne attribut protégé « {pa} » absente du jeu de données.",
            field="protected_attribute",
        )
    if dc not in df.columns:
        raise DatasetValidationError(
            f"Colonne de décision « {dc} » absente du jeu de données.",
            field="decision_column",
        )

    clean = df[[pa, dc]].dropna()
    if clean.empty:
        raise DatasetValidationError(
            "Aucune ligne exploitable après suppression des valeurs manquantes.",
            field=None,
        )

    pa_str = clean[pa].astype(str)
    dc_str = clean[dc].astype(str)

    decision_values = sorted(dc_str.unique())
    if len(decision_values) != 2:
        raise DatasetValidationError(
            f"La colonne de décision doit être binaire (2 valeurs), "
            f"trouvé {len(decision_values)} : {decision_values}.",
            field="decision_column",
        )
    fav = str(config.favorable_value)
    if fav not in decision_values:
        raise DatasetValidationError(
            f"Valeur favorable « {fav} » absente de la colonne de décision "
            f"(valeurs : {decision_values}).",
            field="favorable_value",
        )

    groups = sorted(pa_str.unique())
    if len(groups) < 2:
        raise DatasetValidationError(
            f"L'attribut protégé doit avoir au moins 2 groupes, trouvé "
            f"{len(groups)}.",
            field="protected_attribute",
        )

    privileged = (
        str(config.privileged_value) if config.privileged_value is not None else None
    )
    if privileged is not None and privileged not in groups:
        raise DatasetValidationError(
            f"Groupe privilégié « {privileged} » absent de l'attribut "
            f"protégé (groupes : {groups}).",
            field="privileged_value",
        )

    counts: dict[str, int] = {}
    favs: dict[str, int] = {}
    warnings: list[str] = []
    for g in groups:
        mask = pa_str == g
        n = int(mask.sum())
        if n < config.min_group_error:
            raise DatasetValidationError(
                f"Effectif insuffisant (n={n} < {config.min_group_error}) "
                f"pour le groupe « {g} » — audit non fiable.",
                field="protected_attribute",
            )
        if n < config.min_group_warn:
            warnings.append(
                f"Effectif faible (n={n} < {config.min_group_warn}) pour le "
                f"groupe « {g} » — résultat peu concluant."
            )
        counts[g] = n
        favs[g] = int((mask & (dc_str == fav)).sum())

    rates = {g: selection_rate(favs[g], counts[g]) for g in groups}
    reference = pick_reference(rates, privileged)
    di_map, di_warnings = disparate_impacts(rates, reference)
    warnings.extend(di_warnings)

    overall_di = min(di_map.values())
    worst_group = sorted(g for g, d in di_map.items() if d == overall_di)[0]
    dpd = demographic_parity_diff(rates)

    has_small = any(counts[g] < config.min_group_warn for g in groups)
    verdict = decide_verdict(
        overall_di, config.di_fail_below, config.di_warn_below, has_small
    )

    max_n = max(counts.values())
    min_n = min(counts.values())
    size_imbalance = 1.0 - (min_n / max_n) if max_n > 0 else 0.0
    score = risk_score(overall_di, size_imbalance)

    group_stats = [
        GroupStat(
            value=g,
            n=counts[g],
            favorable=favs[g],
            selection_rate=round(rates[g], _ROUND),
            disparate_impact=round(di_map[g], _ROUND),
        )
        for g in groups
    ]

    return M1Result(
        groups=tuple(group_stats),
        reference_value=reference,
        disparate_impact=round(overall_di, _ROUND),
        demographic_parity_diff=round(dpd, _ROUND),
        worst_group=worst_group,
        verdict=verdict,
        risk_score=score,
        warnings=tuple(warnings),
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/audit_engine/test_m1_supervised.py -q`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```powershell
git add apps/api/app/audit_engine/m1_supervised.py apps/api/tests/audit_engine/test_m1_supervised.py
git -c core.autocrlf=false commit -m "feat(engine): run_m1 orchestration with happy-path coverage

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `run_m1` — validation error cases

**Files:**
- Test: `apps/api/tests/audit_engine/test_validation.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/audit_engine/test_validation.py`:

```python
import pandas as pd
import pytest

from app.audit_engine.errors import DatasetValidationError
from app.audit_engine.m1_supervised import run_m1
from app.audit_engine.types import M1Config

CFG = M1Config(
    protected_attribute="genre",
    decision_column="decision",
    favorable_value="oui",
)


def _df(records):
    return pd.DataFrame.from_records(records)


def test_missing_protected_column():
    df = _df([{"decision": "oui"}, {"decision": "non"}])
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "protected_attribute"


def test_missing_decision_column():
    df = _df([{"genre": "H"}, {"genre": "F"}])
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "decision_column"


def test_decision_not_binary():
    df = _df(
        [{"genre": "H", "decision": v} for v in ("oui", "non", "peut-etre")] * 3
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "decision_column"


def test_favorable_value_not_in_decision():
    df = _df([{"genre": "H", "decision": "0"}, {"genre": "F", "decision": "1"}] * 5)
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "favorable_value"


def test_single_group():
    df = _df(
        [{"genre": "H", "decision": "oui"}, {"genre": "H", "decision": "non"}] * 5
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, CFG)
    assert e.value.field == "protected_attribute"


def test_group_too_small_raises():
    rec = (
        [{"genre": "H", "decision": "oui"}] * 100
        + [{"genre": "H", "decision": "non"}] * 100
        + [{"genre": "F", "decision": "oui"}] * 2
        + [{"genre": "F", "decision": "non"}] * 1
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(_df(rec), CFG)
    assert e.value.field == "protected_attribute"
    assert "n=3" in e.value.message


def test_privileged_value_absent():
    df = _df(
        [{"genre": "H", "decision": "oui"}, {"genre": "F", "decision": "non"}] * 5
    )
    cfg = M1Config(
        protected_attribute="genre",
        decision_column="decision",
        favorable_value="oui",
        privileged_value="Autre",
    )
    with pytest.raises(DatasetValidationError) as e:
        run_m1(df, cfg)
    assert e.value.field == "privileged_value"
```

- [ ] **Step 2: Run test to verify it fails or passes per case**

Run: `uv run pytest tests/audit_engine/test_validation.py -q`
Expected: All PASS (validation is already implemented in Task 5). If any fail, fix `m1_supervised.py` until green — do not weaken the tests.

- [ ] **Step 3: No new implementation expected**

Validation logic was implemented in Task 5. Only add code here if a test reveals a gap (e.g., adjust an error `field` to match the asserted value). Keep messages French and PII-free.

- [ ] **Step 4: Run the full engine suite**

Run: `uv run pytest tests/audit_engine -q`
Expected: PASS (all tests across types/metrics/m1/validation).

- [ ] **Step 5: Commit**

```powershell
git add apps/api/tests/audit_engine/test_validation.py apps/api/app/audit_engine/m1_supervised.py
git -c core.autocrlf=false commit -m "test(engine): validation error cases for run_m1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Public API, lint, type-check

**Files:**
- Modify: `apps/api/app/audit_engine/__init__.py`
- Test: `apps/api/tests/audit_engine/test_public_api.py`

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/audit_engine/test_public_api.py`:

```python
from app import audit_engine as ae


def test_public_surface():
    assert {
        "run_m1",
        "M1Config",
        "M1Result",
        "GroupStat",
        "AuditEngineError",
        "DatasetValidationError",
    }.issubset(set(ae.__all__))
    # importable directly from the package root
    assert ae.run_m1 is not None
    assert (
        ae.M1Config(  # constructible
            protected_attribute="g", decision_column="d", favorable_value="o"
        )
        is not None
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/audit_engine/test_public_api.py -q`
Expected: FAIL — `AttributeError: module 'app.audit_engine' has no attribute '__all__'`.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/api/app/audit_engine/__init__.py` with:

```python
"""AuditIQ M1 audit engine — pure, no I/O."""

from .errors import AuditEngineError, DatasetValidationError
from .m1_supervised import run_m1
from .types import GroupStat, M1Config, M1Result

__all__ = [
    "run_m1",
    "M1Config",
    "M1Result",
    "GroupStat",
    "AuditEngineError",
    "DatasetValidationError",
]
```

- [ ] **Step 4: Run test, lint, and type-check**

Run from `apps/api`:

```powershell
uv run pytest tests/audit_engine -q
uv run ruff check app/audit_engine tests/audit_engine
uv run mypy app/audit_engine
```

Expected: pytest all PASS; `ruff` reports no errors; `mypy` reports `Success: no issues found`. Fix any reported issues without weakening tests.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/app/audit_engine/__init__.py apps/api/tests/audit_engine/test_public_api.py
git -c core.autocrlf=false commit -m "feat(engine): public API surface for audit_engine

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Self-Review (completed by plan author)

**Spec coverage (spec §5):** column existence → Task 6; binary decision → Task 6; ≥2 groups → Task 6; n<5 error / n<30 warn → Tasks 5–6; selection rate → Task 3/5; reference (privileged or max-rate) → Task 3/5 (`test_privileged_value_override`); Disparate Impact + worst → Task 3/5; Demographic Parity → Task 3/5; verdict 4-5 bands → Task 3 (`test_decide_verdict_bands`); risk_score piecewise → Task 3 (`test_risk_score_piecewise`); typed `M1Result` no I/O → Task 2/5; named fixtures (recruitment fail, fair pass, warn 0.85, edge cases) → Tasks 4–6. All spec §5 requirements map to a task.

**Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `M1Config` fields (`di_fail_below`/`di_warn_below`/`min_group_error`/`min_group_warn`), `GroupStat`/`M1Result` fields, and `metrics.py` signatures (`decide_verdict(di, fail_below, warn_below, has_small_group)`, `risk_score(di, size_imbalance)`) are used identically across Tasks 2, 3, 5, 6, 7. Hand-computed expected values (recruitment risk 55, warn risk 35, small-sample risk 9, fair risk 0) match the `risk_score` formula in Task 3.

**Out of scope (Plans 2–3):** persistence, Supabase auth/JWKS, Storage, Gemini interpretation, routers, web — intentionally excluded; this plan ships a self-contained tested library.
