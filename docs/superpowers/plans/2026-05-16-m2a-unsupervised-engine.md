# M2-A — Pure Unsupervised Engine + IQR Pre-check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AuditIQ's pure M2 unsupervised bias-detection engine (KMeans → χ² → deviant clusters → post-hoc proxy characterization → verdict) and the shared non-blocking IQR pre-check, with zero I/O and full TDD.

**Architecture:** New pure modules under `apps/api/app/audit_engine/` mirroring the delivered M1 engine (frozen dataclasses in `types.py`, thin orchestrator delegating to a metrics helper module, `DatasetValidationError` for bad input). No DB, no LLM, no framework. Deterministic via a fixed `random_state`.

**Tech Stack:** Python 3.12, pandas, numpy(<2), scikit-learn (`KMeans`, `StandardScaler`), scipy (`chi2_contingency`), pytest. All already in `apps/api/pyproject.toml`; no new dependency.

---

## Scope

This plan is **Plan M2-A** of the three-plan decomposition of the approved spec
`docs/superpowers/specs/2026-05-16-m2-unsupervised-detection-reporting-design.md`
(M2-B = persistence/API/web; M2-C = reporting layer). M2-A delivers working,
independently testable software: the pure engine + IQR pre-check, exactly the
way M1's pure engine shipped first.

Run all commands from `apps/api/`. Test runner: `uv run python -m pytest`
(pytest is the `dev` extra: run `uv sync --extra dev` once if pytest is missing).

## File Structure

- Create `app/audit_engine/unsupervised.py` — `run_m2(df, M2Config) -> M2Result`, orchestrator + validation. Pure.
- Create `app/audit_engine/unsupervised_metrics.py` — pure helpers: cluster rates, χ² wrapper, deviation, post-hoc characterization, verdict, risk score.
- Create `app/audit_engine/anomaly_iqr.py` — `iqr_precheck(...) -> IqrReport`. Pure, shared M1/M2.
- Modify `app/audit_engine/types.py` — add `M2Config`, `ClusterStat`, `FeatureContribution`, `M2Result`, `IqrReport` (same frozen-dataclass style as `M1Config`/`M1Result`).
- Modify `app/audit_engine/__init__.py` — export the new public symbols.
- Create `tests/audit_engine/test_unsupervised_metrics.py`, `tests/audit_engine/test_unsupervised.py`, `tests/audit_engine/test_anomaly_iqr.py`.
- Modify `tests/audit_engine/conftest.py` — add M2 fixtures.
- Modify `tests/audit_engine/test_public_api.py`, `tests/audit_engine/test_types.py`.

Established patterns to follow (read before starting): `app/audit_engine/m1_supervised.py`, `app/audit_engine/metrics.py`, `app/audit_engine/types.py`, `app/audit_engine/errors.py`, `tests/audit_engine/test_validation.py`, `tests/audit_engine/conftest.py`. Conventions: `from __future__ import annotations`; `@dataclass(frozen=True)`; rounding constant `_ROUND = 4`; reuse the existing `DatasetValidationError(message, *, field=...)`; helper functions are pure and individually unit-tested.

---

### Task 1: M2 + IQR types

**Files:**
- Modify: `app/audit_engine/types.py`
- Test: `tests/audit_engine/test_types.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/audit_engine/test_types.py`:

```python
def test_m2_types_are_frozen_and_coerce_sequences():
    from dataclasses import FrozenInstanceError

    from app.audit_engine.types import (
        ClusterStat,
        FeatureContribution,
        IqrReport,
        M2Config,
        M2Result,
    )

    cfg = M2Config(decision_column="y", positive_value="1", feature_columns=["a", "b"])
    assert cfg.feature_columns == ("a", "b")
    assert cfg.k == 5
    assert cfg.deviation_pp == 20.0
    assert cfg.chi2_alpha == 0.05
    assert cfg.random_state == 42

    fc = FeatureContribution(name="age", std_diff=1.23, direction="above")
    cs = ClusterStat(
        id=0, n=10, positive_rate=0.2, deviation_pp=-30.0,
        is_deviant=True, top_features=[fc],
    )
    assert cs.top_features == (fc,)

    res = M2Result(
        n=100, k=5, global_positive_rate=0.5, chi2=12.0, p_value=0.001, dof=4,
        clusters=[cs], deviant_cluster_ids=[0], verdict="fail", risk_score=80,
        warnings=["w"],
    )
    assert res.clusters == (cs,)
    assert res.deviant_cluster_ids == (0,)
    assert res.warnings == ("w",)
    with pytest.raises(FrozenInstanceError):
        res.verdict = "pass"  # type: ignore[misc]

    rep = IqrReport(warnings=["x"])
    assert rep.warnings == ("x",)
```

Ensure `import pytest` is present at the top of the file (it is in the existing file; add only if missing).

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_types.py::test_m2_types_are_frozen_and_coerce_sequences -v`
Expected: FAIL with `ImportError: cannot import name 'M2Config'`.

- [ ] **Step 3: Write minimal implementation**

Append to `app/audit_engine/types.py`:

```python
@dataclass(frozen=True)
class M2Config:
    decision_column: str
    positive_value: object
    feature_columns: tuple[str, ...] | None = None
    k: int = 5
    deviation_pp: float = 20.0
    chi2_alpha: float = 0.05
    random_state: int = 42
    min_rows_factor: int = 5
    min_rows_abs: int = 20
    min_cluster_warn: int = 30

    def __post_init__(self) -> None:
        if self.feature_columns is not None:
            object.__setattr__(
                self, "feature_columns", tuple(self.feature_columns)
            )


@dataclass(frozen=True)
class FeatureContribution:
    name: str
    std_diff: float
    direction: str  # "above" | "below"


@dataclass(frozen=True)
class ClusterStat:
    id: int
    n: int
    positive_rate: float
    deviation_pp: float
    is_deviant: bool
    top_features: tuple[FeatureContribution, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "top_features", tuple(self.top_features))


@dataclass(frozen=True)
class M2Result:
    n: int
    k: int
    global_positive_rate: float
    chi2: float
    p_value: float
    dof: int
    clusters: tuple[ClusterStat, ...]
    deviant_cluster_ids: tuple[int, ...]
    verdict: str
    risk_score: int
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "clusters", tuple(self.clusters))
        object.__setattr__(
            self, "deviant_cluster_ids", tuple(self.deviant_cluster_ids)
        )
        object.__setattr__(self, "warnings", tuple(self.warnings))


@dataclass(frozen=True)
class IqrReport:
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "warnings", tuple(self.warnings))
```

> Note: `IqrReport` carries only `warnings` (the non-blocking banner needs nothing more). The spec's `details` field is intentionally dropped (YAGNI); revisit only if a consumer needs structured detail.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_types.py -v`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/types.py tests/audit_engine/test_types.py
git -c core.autocrlf=false commit -m "feat(engine): M2 + IQR engine types"
```

---

### Task 2: Cluster positive rates + global rate

**Files:**
- Create: `app/audit_engine/unsupervised_metrics.py`
- Test: `tests/audit_engine/test_unsupervised_metrics.py`

- [ ] **Step 1: Write the failing test**

Create `tests/audit_engine/test_unsupervised_metrics.py`:

```python
import numpy as np

from app.audit_engine.unsupervised_metrics import cluster_positive_rates


def test_cluster_positive_rates_and_global():
    labels = np.array([0, 0, 0, 1, 1, 1])
    positive = np.array([1, 1, 0, 0, 0, 0])  # cluster0: 2/3, cluster1: 0/3
    rates, global_rate, sizes = cluster_positive_rates(labels, positive, k=2)
    assert rates == {0: 2 / 3, 1: 0.0}
    assert global_rate == 2 / 6
    assert sizes == {0: 3, 1: 3}


def test_cluster_positive_rates_handles_empty_cluster():
    labels = np.array([0, 0, 0, 0])
    positive = np.array([1, 0, 1, 0])
    rates, global_rate, sizes = cluster_positive_rates(labels, positive, k=3)
    # clusters 1 and 2 are empty -> rate 0.0, size 0
    assert rates == {0: 0.5, 1: 0.0, 2: 0.0}
    assert sizes == {0: 4, 1: 0, 2: 0}
    assert global_rate == 0.5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -v`
Expected: FAIL with `ModuleNotFoundError: app.audit_engine.unsupervised_metrics`.

- [ ] **Step 3: Write minimal implementation**

Create `app/audit_engine/unsupervised_metrics.py`:

```python
"""Pure helpers for the M2 unsupervised engine. No I/O."""
from __future__ import annotations

import numpy as np
from scipy.stats import chi2_contingency

from .metrics import VERDICT_FAIL, VERDICT_PASS, VERDICT_WARN
from .types import FeatureContribution


def cluster_positive_rates(
    labels: np.ndarray, positive: np.ndarray, k: int
) -> tuple[dict[int, float], float, dict[int, int]]:
    """Return (positive_rate_per_cluster, global_positive_rate, size_per_cluster).

    Empty clusters get rate 0.0 and size 0.
    """
    rates: dict[int, float] = {}
    sizes: dict[int, int] = {}
    for c in range(k):
        mask = labels == c
        n = int(mask.sum())
        sizes[c] = n
        rates[c] = float(positive[mask].mean()) if n > 0 else 0.0
    global_rate = float(positive.mean()) if positive.size > 0 else 0.0
    return rates, global_rate, sizes
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised_metrics.py tests/audit_engine/test_unsupervised_metrics.py
git -c core.autocrlf=false commit -m "feat(engine): per-cluster positive rate helper"
```

---

### Task 3: Chi-squared wrapper

**Files:**
- Modify: `app/audit_engine/unsupervised_metrics.py`
- Test: `tests/audit_engine/test_unsupervised_metrics.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/audit_engine/test_unsupervised_metrics.py`:

```python
from app.audit_engine.unsupervised_metrics import chi2_cluster_decision


def test_chi2_strong_association_low_p():
    labels = np.array([0] * 50 + [1] * 50)
    positive = np.array([1] * 45 + [0] * 5 + [0] * 45 + [1] * 5)
    chi2, p, dof = chi2_cluster_decision(labels, positive, k=2)
    assert dof == 1
    assert p < 0.05
    assert chi2 > 0


def test_chi2_no_association_high_p():
    labels = np.array([0, 1] * 50)
    positive = np.array([1, 1, 0, 0] * 25)
    chi2, p, dof = chi2_cluster_decision(labels, positive, k=2)
    assert p > 0.05


def test_chi2_degenerate_constant_decision_returns_neutral():
    labels = np.array([0] * 5 + [1] * 5)
    positive = np.array([1] * 10)  # decision constant -> no contingency
    chi2, p, dof = chi2_cluster_decision(labels, positive, k=2)
    assert chi2 == 0.0
    assert p == 1.0
    assert dof == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k chi2 -v`
Expected: FAIL with `ImportError: cannot import name 'chi2_cluster_decision'`.

- [ ] **Step 3: Write minimal implementation**

Append to `app/audit_engine/unsupervised_metrics.py`:

```python
def chi2_cluster_decision(
    labels: np.ndarray, positive: np.ndarray, k: int
) -> tuple[float, float, int]:
    """Chi-squared independence test on the [cluster x decision] table.

    Empty cluster rows and constant-decision tables are degenerate: return
    a neutral (chi2=0.0, p=1.0, dof=0) result rather than raising.
    """
    pos_counts = np.array([int(positive[labels == c].sum()) for c in range(k)])
    neg_counts = np.array(
        [int((labels == c).sum()) - int(positive[labels == c].sum())
         for c in range(k)]
    )
    table = np.vstack([pos_counts, neg_counts])  # 2 x k
    # Drop all-zero columns (empty clusters) so chi2 has no zero margins.
    table = table[:, table.sum(axis=0) > 0]
    if table.shape[1] < 2 or (table.sum(axis=1) == 0).any():
        return 0.0, 1.0, 0
    chi2, p, dof, _ = chi2_contingency(table)
    return float(chi2), float(p), int(dof)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k chi2 -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised_metrics.py tests/audit_engine/test_unsupervised_metrics.py
git -c core.autocrlf=false commit -m "feat(engine): chi-squared cluster/decision wrapper"
```

---

### Task 4: Deviation + deviant-cluster detection

**Files:**
- Modify: `app/audit_engine/unsupervised_metrics.py`
- Test: `tests/audit_engine/test_unsupervised_metrics.py`

- [ ] **Step 1: Write the failing test**

Append:

```python
from app.audit_engine.unsupervised_metrics import deviations


def test_deviations_in_percentage_points_and_flagging():
    rates = {0: 0.20, 1: 0.55, 2: 0.50}
    dev, deviant = deviations(rates, global_rate=0.50, deviation_pp=20.0)
    assert dev[0] == -30.0
    assert dev[1] == 5.0
    assert dev[2] == 0.0
    assert deviant == (0,)  # only |dev| > 20pp


def test_deviations_threshold_is_strict():
    rates = {0: 0.30, 1: 0.50}
    dev, deviant = deviations(rates, global_rate=0.50, deviation_pp=20.0)
    assert dev[0] == -20.0
    assert deviant == ()  # exactly 20pp is NOT > 20pp
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k deviations -v`
Expected: FAIL with `ImportError: cannot import name 'deviations'`.

- [ ] **Step 3: Write minimal implementation**

Append:

```python
def deviations(
    rates: dict[int, float], global_rate: float, deviation_pp: float
) -> tuple[dict[int, float], tuple[int, ...]]:
    """Per-cluster deviation in percentage points and the deviant cluster ids.

    A cluster is deviant iff abs(deviation) strictly exceeds `deviation_pp`.
    """
    dev = {c: round((r - global_rate) * 100.0, 4) for c, r in rates.items()}
    deviant = tuple(sorted(c for c, d in dev.items() if abs(d) > deviation_pp))
    return dev, deviant
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k deviations -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised_metrics.py tests/audit_engine/test_unsupervised_metrics.py
git -c core.autocrlf=false commit -m "feat(engine): cluster deviation detection"
```

---

### Task 5: Post-hoc top-3 feature characterization

**Files:**
- Modify: `app/audit_engine/unsupervised_metrics.py`
- Test: `tests/audit_engine/test_unsupervised_metrics.py`

- [ ] **Step 1: Write the failing test**

Append:

```python
from app.audit_engine.unsupervised_metrics import characterize_cluster


def test_characterize_returns_signed_top3_by_abs_std_diff():
    feature_names = ["a", "b", "c", "d"]
    global_mean = np.array([0.0, 0.0, 0.0, 0.0])
    global_std = np.array([1.0, 1.0, 1.0, 1.0])
    cluster_mean = np.array([3.0, -2.0, 0.5, 1.0])
    top = characterize_cluster(
        cluster_mean, global_mean, global_std, feature_names, top_n=3
    )
    assert [f.name for f in top] == ["a", "b", "d"]
    assert top[0].std_diff == 3.0 and top[0].direction == "above"
    assert top[1].std_diff == -2.0 and top[1].direction == "below"


def test_characterize_skips_constant_features():
    feature_names = ["const", "x"]
    top = characterize_cluster(
        np.array([5.0, 2.0]), np.array([5.0, 0.0]),
        np.array([0.0, 1.0]), feature_names, top_n=3,
    )
    # const feature has std 0 -> std_diff 0 -> not selected over x
    assert [f.name for f in top] == ["x"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k characterize -v`
Expected: FAIL with `ImportError: cannot import name 'characterize_cluster'`.

- [ ] **Step 3: Write minimal implementation**

Append:

```python
def characterize_cluster(
    cluster_mean: np.ndarray,
    global_mean: np.ndarray,
    global_std: np.ndarray,
    feature_names: list[str],
    top_n: int = 3,
) -> tuple[FeatureContribution, ...]:
    """Top-N features by |standardized difference| (cluster vs global).

    std_diff = (mean_cluster - mean_global) / std_global; a zero-variance
    feature contributes 0 and is effectively never selected.
    """
    contribs: list[FeatureContribution] = []
    for i, name in enumerate(feature_names):
        std = global_std[i]
        sd = 0.0 if std == 0.0 else float(
            (cluster_mean[i] - global_mean[i]) / std
        )
        if sd == 0.0:
            continue
        contribs.append(
            FeatureContribution(
                name=name,
                std_diff=round(sd, 4),
                direction="above" if sd > 0 else "below",
            )
        )
    contribs.sort(key=lambda f: abs(f.std_diff), reverse=True)
    return tuple(contribs[:top_n])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k characterize -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised_metrics.py tests/audit_engine/test_unsupervised_metrics.py
git -c core.autocrlf=false commit -m "feat(engine): post-hoc cluster characterization"
```

---

### Task 6: Verdict + risk score

**Files:**
- Modify: `app/audit_engine/unsupervised_metrics.py`
- Test: `tests/audit_engine/test_unsupervised_metrics.py`

- [ ] **Step 1: Write the failing test**

Append:

```python
from app.audit_engine.unsupervised_metrics import m2_risk_score, m2_verdict


def test_m2_verdict_bands():
    # significant AND a deviant cluster -> fail
    assert m2_verdict(p_value=0.01, alpha=0.05, n_deviant=1) == "fail"
    # significant only -> warn
    assert m2_verdict(p_value=0.01, alpha=0.05, n_deviant=0) == "warn"
    # deviant only -> warn
    assert m2_verdict(p_value=0.20, alpha=0.05, n_deviant=2) == "warn"
    # neither -> pass
    assert m2_verdict(p_value=0.20, alpha=0.05, n_deviant=0) == "pass"


def test_m2_risk_score_monotone_and_bounded():
    low = m2_risk_score(p_value=0.9, alpha=0.05, max_abs_dev_pp=1.0,
                         n_deviant=0, k=5)
    high = m2_risk_score(p_value=1e-6, alpha=0.05, max_abs_dev_pp=50.0,
                         n_deviant=5, k=5)
    assert 0 <= low <= 100
    assert 0 <= high <= 100
    assert high > low
    assert high == 100
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -k "verdict or risk" -v`
Expected: FAIL with `ImportError: cannot import name 'm2_verdict'`.

- [ ] **Step 3: Write minimal implementation**

Append:

```python
def m2_verdict(p_value: float, alpha: float, n_deviant: int) -> str:
    """fail = significant AND >=1 deviant; warn = exactly one; pass = none."""
    significant = p_value < alpha
    has_deviant = n_deviant > 0
    if significant and has_deviant:
        return VERDICT_FAIL
    if significant or has_deviant:
        return VERDICT_WARN
    return VERDICT_PASS


def m2_risk_score(
    p_value: float, alpha: float, max_abs_dev_pp: float, n_deviant: int, k: int
) -> int:
    """Deterministic 0-100. Weights: significance .50, magnitude .35, count .15.

    - sig = 1 - min(p/alpha, 1)            (0 when p>=alpha, ->1 as p->0)
    - mag = min(max_abs_dev_pp / 50, 1)    (50pp = max severity)
    - cnt = min(n_deviant / k, 1)
    """
    sig = 1.0 - min(p_value / alpha, 1.0) if alpha > 0 else 0.0
    mag = min(max_abs_dev_pp / 50.0, 1.0)
    cnt = min(n_deviant / k, 1.0) if k > 0 else 0.0
    score = 100.0 * (0.50 * sig + 0.35 * mag + 0.15 * cnt)
    return int(min(100, max(0, round(score))))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised_metrics.py -v`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised_metrics.py tests/audit_engine/test_unsupervised_metrics.py
git -c core.autocrlf=false commit -m "feat(engine): M2 verdict bands + risk score"
```

---

### Task 7: `run_m2` validation

**Files:**
- Create: `app/audit_engine/unsupervised.py`
- Test: `tests/audit_engine/test_unsupervised.py`

- [ ] **Step 1: Write the failing test**

Create `tests/audit_engine/test_unsupervised.py`:

```python
import numpy as np
import pandas as pd
import pytest

from app.audit_engine.errors import DatasetValidationError
from app.audit_engine.types import M2Config
from app.audit_engine.unsupervised import run_m2


def _num_df(n: int = 60, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "f1": rng.normal(size=n),
            "f2": rng.normal(size=n),
            "y": rng.integers(0, 2, size=n).astype(str),
        }
    )


def test_missing_decision_column():
    cfg = M2Config(decision_column="nope", positive_value="1")
    with pytest.raises(DatasetValidationError) as e:
        run_m2(_num_df(), cfg)
    assert e.value.field == "decision_column"


def test_decision_not_binary():
    df = _num_df()
    df.loc[0, "y"] = "2"  # 3 distinct values
    cfg = M2Config(decision_column="y", positive_value="1")
    with pytest.raises(DatasetValidationError) as e:
        run_m2(df, cfg)
    assert e.value.field == "decision_column"


def test_positive_value_absent():
    cfg = M2Config(decision_column="y", positive_value="favorable")
    with pytest.raises(DatasetValidationError) as e:
        run_m2(_num_df(), cfg)
    assert e.value.field == "positive_value"


def test_too_few_numeric_features():
    df = pd.DataFrame({"f1": [1.0, 2.0, 3.0, 4.0], "y": ["1", "0", "1", "0"]})
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    with pytest.raises(DatasetValidationError) as e:
        run_m2(df, cfg)
    assert e.value.field == "feature_columns"


def test_not_enough_rows_for_k():
    df = _num_df(n=15)  # 15 < max(5*5, 20)
    cfg = M2Config(decision_column="y", positive_value="1", k=5)
    with pytest.raises(DatasetValidationError) as e:
        run_m2(df, cfg)
    assert e.value.field is None
    assert "Effectif" in e.value.message
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised.py -v`
Expected: FAIL with `ModuleNotFoundError: app.audit_engine.unsupervised`.

- [ ] **Step 3: Write minimal implementation**

Create `app/audit_engine/unsupervised.py`:

```python
"""Pure M2 unsupervised bias detection: run_m2(df, config) -> M2Result.

No I/O, no LLM. Deterministic via M2Config.random_state.
"""
from __future__ import annotations

import pandas as pd

from .errors import DatasetValidationError
from .types import M2Config, M2Result

_ROUND = 4


def _validate(
    df: pd.DataFrame, config: M2Config
) -> tuple[pd.DataFrame, list[str], list[str]]:
    """Validate and return (clean_df, feature_columns, warnings)."""
    dc = config.decision_column
    warnings: list[str] = []

    if dc not in df.columns:
        raise DatasetValidationError(
            f"Colonne de décision « {dc} » absente du jeu de données.",
            field="decision_column",
        )

    if config.feature_columns is not None:
        requested = list(config.feature_columns)
        missing = [c for c in requested if c not in df.columns]
        if missing:
            raise DatasetValidationError(
                f"Colonnes de features absentes : {missing}.",
                field="feature_columns",
            )
        candidate = requested
    else:
        candidate = [c for c in df.columns if c != dc]

    numeric: list[str] = []
    dropped: list[str] = []
    for c in candidate:
        if c == dc:
            continue
        if pd.api.types.is_numeric_dtype(df[c]):
            numeric.append(c)
        else:
            dropped.append(c)
    if dropped:
        warnings.append(
            f"Colonnes non numériques exclues du clustering : {dropped}."
        )
    if len(numeric) < 2:
        raise DatasetValidationError(
            f"Au moins 2 features numériques requises, trouvé {len(numeric)}.",
            field="feature_columns",
        )

    clean = df[[*numeric, dc]].dropna()
    n_dropped = len(df) - len(clean)
    if n_dropped > 0:
        warnings.append(
            f"{n_dropped} ligne(s) retirée(s) pour valeurs manquantes."
        )

    n = len(clean)
    min_rows = max(config.min_rows_factor * config.k, config.min_rows_abs)
    if n < min_rows:
        raise DatasetValidationError(
            f"Effectif insuffisant (n={n} < {min_rows}) pour k={config.k} "
            f"clusters — audit non fiable.",
            field=None,
        )
    if not (2 <= config.k < n):
        raise DatasetValidationError(
            f"k doit vérifier 2 ≤ k < n ; reçu k={config.k}, n={n}.",
            field=None,
        )

    dc_str = clean[dc].astype(str)
    decision_values = sorted(dc_str.unique())
    if len(decision_values) != 2:
        raise DatasetValidationError(
            f"La colonne de décision doit être binaire (2 valeurs), "
            f"trouvé {len(decision_values)} : {decision_values}.",
            field="decision_column",
        )
    if str(config.positive_value) not in decision_values:
        raise DatasetValidationError(
            f"Valeur positive « {config.positive_value} » absente de la "
            f"colonne de décision (valeurs : {decision_values}).",
            field="positive_value",
        )

    return clean, numeric, warnings


def run_m2(df: pd.DataFrame, config: M2Config) -> M2Result:
    """Run the M2 unsupervised bias-detection audit. Pure. Raises
    DatasetValidationError if the data/config cannot be audited."""
    _clean, _features, _warnings = _validate(df, config)
    raise NotImplementedError  # pipeline added in Task 8
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised.py -v`
Expected: PASS (5 validation tests; the `NotImplementedError` is not reached).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised.py tests/audit_engine/test_unsupervised.py
git -c core.autocrlf=false commit -m "feat(engine): run_m2 input validation"
```

---

### Task 8: `run_m2` full pipeline

**Files:**
- Modify: `app/audit_engine/unsupervised.py`
- Modify: `tests/audit_engine/conftest.py`
- Test: `tests/audit_engine/test_unsupervised.py`

- [ ] **Step 1: Write the failing test**

Append M2 fixtures to `tests/audit_engine/conftest.py`:

```python
import numpy as np


@pytest.fixture
def m2_deviant_df() -> pd.DataFrame:
    # Two well-separated feature blobs; one block almost always negative.
    rng = np.random.default_rng(42)
    a = pd.DataFrame(
        {"f1": rng.normal(-5, 0.5, 120), "f2": rng.normal(-5, 0.5, 120),
         "y": (["1"] * 108) + (["0"] * 12)}  # ~0.90 positive
    )
    b = pd.DataFrame(
        {"f1": rng.normal(5, 0.5, 120), "f2": rng.normal(5, 0.5, 120),
         "y": (["1"] * 12) + (["0"] * 108)}  # ~0.10 positive
    )
    return pd.concat([a, b], ignore_index=True)


@pytest.fixture
def m2_homogeneous_df() -> pd.DataFrame:
    rng = np.random.default_rng(7)
    n = 200
    return pd.DataFrame(
        {"f1": rng.normal(0, 1, n), "f2": rng.normal(0, 1, n),
         "y": rng.choice(["1", "0"], size=n)}  # decision independent of features
    )
```

Append to `tests/audit_engine/test_unsupervised.py`:

```python
def test_run_m2_flags_deviant_blocks_as_fail(m2_deviant_df):
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    res = run_m2(m2_deviant_df, cfg)
    assert res.n == 240
    assert res.k == 2
    assert res.p_value < 0.05
    assert len(res.deviant_cluster_ids) >= 1
    assert res.verdict == "fail"
    assert 0 <= res.risk_score <= 100
    dev = next(
        c for c in res.clusters if c.id == res.deviant_cluster_ids[0]
    )
    assert len(dev.top_features) >= 1
    assert dev.top_features[0].name in ("f1", "f2")


def test_run_m2_homogeneous_is_pass(m2_homogeneous_df):
    cfg = M2Config(decision_column="y", positive_value="1", k=3)
    res = run_m2(m2_homogeneous_df, cfg)
    assert res.verdict == "pass"
    assert res.deviant_cluster_ids == ()


def test_run_m2_is_deterministic(m2_deviant_df):
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    a = run_m2(m2_deviant_df, cfg)
    b = run_m2(m2_deviant_df, cfg)
    assert a == b


def test_run_m2_non_numeric_feature_warns(m2_deviant_df):
    df = m2_deviant_df.copy()
    df["city"] = "Paris"
    cfg = M2Config(decision_column="y", positive_value="1", k=2)
    res = run_m2(df, cfg)
    assert any("non numériques" in w for w in res.warnings)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised.py -k "run_m2" -v`
Expected: FAIL with `NotImplementedError`.

- [ ] **Step 3: Write minimal implementation**

In `app/audit_engine/unsupervised.py`, replace the body of `run_m2` (keep `_validate`). Adjust the imports: extend the existing `from .types import M2Config, M2Result` line to also import `ClusterStat`, and add the sklearn + metrics imports. The top of the file becomes exactly:

```python
"""Pure M2 unsupervised bias detection: run_m2(df, config) -> M2Result.

No I/O, no LLM. Deterministic via M2Config.random_state.
"""
from __future__ import annotations

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from .errors import DatasetValidationError
from .types import ClusterStat, M2Config, M2Result
from .unsupervised_metrics import (
    characterize_cluster,
    chi2_cluster_decision,
    cluster_positive_rates,
    deviations,
    m2_risk_score,
    m2_verdict,
)

_ROUND = 4
```

(`_validate` is unchanged; only its `run_m2` caller below is replaced.)

Replace `run_m2` with:

```python
def run_m2(df: pd.DataFrame, config: M2Config) -> M2Result:
    """Run the M2 unsupervised bias-detection audit. Pure. Raises
    DatasetValidationError if the data/config cannot be audited."""
    clean, features, warnings = _validate(df, config)

    x = clean[features].to_numpy(dtype=float)
    positive = (
        clean[config.decision_column].astype(str)
        == str(config.positive_value)
    ).to_numpy()
    n = len(clean)

    x_scaled = StandardScaler().fit_transform(x)
    km = KMeans(
        n_clusters=config.k, random_state=config.random_state, n_init=10
    )
    labels = km.fit_predict(x_scaled)

    rates, global_rate, sizes = cluster_positive_rates(
        labels, positive, config.k
    )
    chi2, p_value, dof = chi2_cluster_decision(labels, positive, config.k)
    dev, deviant_ids = deviations(rates, global_rate, config.deviation_pp)

    for c in range(config.k):
        if 0 < sizes[c] < config.min_cluster_warn:
            warnings.append(
                f"Cluster {c} de faible effectif (n={sizes[c]} < "
                f"{config.min_cluster_warn}) — caractérisation peu concluante."
            )

    global_mean = x.mean(axis=0)
    global_std = x.std(axis=0)
    clusters: list[ClusterStat] = []
    for c in range(config.k):
        mask = labels == c
        if sizes[c] > 0:
            cluster_mean = x[mask].mean(axis=0)
            top = characterize_cluster(
                cluster_mean, global_mean, global_std, features, top_n=3
            )
        else:
            top = ()
        clusters.append(
            ClusterStat(
                id=c,
                n=sizes[c],
                positive_rate=round(rates[c], _ROUND),
                deviation_pp=dev[c],
                is_deviant=c in deviant_ids,
                top_features=top,
            )
        )

    max_abs_dev = max((abs(d) for d in dev.values()), default=0.0)
    verdict = m2_verdict(p_value, config.chi2_alpha, len(deviant_ids))
    score = m2_risk_score(
        p_value, config.chi2_alpha, max_abs_dev, len(deviant_ids), config.k
    )

    return M2Result(
        n=n,
        k=config.k,
        global_positive_rate=round(global_rate, _ROUND),
        chi2=round(chi2, _ROUND),
        p_value=round(p_value, 6),
        dof=dof,
        clusters=tuple(clusters),
        deviant_cluster_ids=tuple(deviant_ids),
        verdict=verdict,
        risk_score=score,
        warnings=tuple(warnings),
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_unsupervised.py -v`
Expected: PASS (all: 5 validation + 4 pipeline).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/unsupervised.py tests/audit_engine/test_unsupervised.py tests/audit_engine/conftest.py
git -c core.autocrlf=false commit -m "feat(engine): run_m2 full unsupervised pipeline"
```

---

### Task 9: IQR pre-check — group-imbalance mode (M1)

**Files:**
- Create: `app/audit_engine/anomaly_iqr.py`
- Test: `tests/audit_engine/test_anomaly_iqr.py`

- [ ] **Step 1: Write the failing test**

Create `tests/audit_engine/test_anomaly_iqr.py`:

```python
import pandas as pd

from app.audit_engine.anomaly_iqr import iqr_precheck
from app.audit_engine.types import IqrReport


def test_group_imbalance_is_flagged():
    df = pd.DataFrame(
        {"genre": ["H"] * 200 + ["F"] * 5, "y": ["1", "0"] * 102 + ["1"]}
    )
    rep = iqr_precheck(df, group_column="genre")
    assert isinstance(rep, IqrReport)
    assert any("déséquilibre" in w.lower() or "faible" in w.lower()
               for w in rep.warnings)


def test_balanced_groups_no_warning():
    df = pd.DataFrame({"genre": ["H"] * 100 + ["F"] * 100})
    rep = iqr_precheck(df, group_column="genre")
    assert rep.warnings == ()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_anomaly_iqr.py -v`
Expected: FAIL with `ModuleNotFoundError: app.audit_engine.anomaly_iqr`.

- [ ] **Step 3: Write minimal implementation**

Create `app/audit_engine/anomaly_iqr.py`:

```python
"""Shared non-blocking pre-audit checks (M1 + M2). Pure, no I/O."""
from __future__ import annotations

import pandas as pd

from .types import IqrReport


def iqr_precheck(
    df: pd.DataFrame,
    *,
    numeric_columns: list[str] | None = None,
    group_column: str | None = None,
    min_group_ratio: float = 0.05,
    min_group_abs: int = 30,
    outlier_row_pct: float = 0.05,
) -> IqrReport:
    """Return non-blocking pre-audit warnings.

    - group_column set (M1): flag group-size imbalance.
    - group_column None (M2): flag heavy per-feature outliers (Tukey IQR).
    """
    warnings: list[str] = []

    if group_column is not None and group_column in df.columns:
        counts = df[group_column].astype(str).value_counts()
        if not counts.empty:
            largest = int(counts.max())
            for label, n in counts.items():
                n = int(n)
                if n < min_group_abs or (
                    largest > 0 and n / largest < min_group_ratio
                ):
                    warnings.append(
                        f"Déséquilibre : groupe « {label} » de faible "
                        f"effectif (n={n}) — résultats à interpréter avec "
                        f"prudence."
                    )

    return IqrReport(warnings=tuple(warnings))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_anomaly_iqr.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/anomaly_iqr.py tests/audit_engine/test_anomaly_iqr.py
git -c core.autocrlf=false commit -m "feat(engine): IQR pre-check group-imbalance mode"
```

---

### Task 10: IQR pre-check — feature-outlier mode (M2)

**Files:**
- Modify: `app/audit_engine/anomaly_iqr.py`
- Test: `tests/audit_engine/test_anomaly_iqr.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/audit_engine/test_anomaly_iqr.py`:

```python
def test_feature_outliers_flagged_when_heavy():
    base = [10.0] * 95
    outliers = [1000.0] * 5  # 5% extreme values
    df = pd.DataFrame({"f1": base + outliers, "f2": [1.0] * 100})
    rep = iqr_precheck(df, numeric_columns=["f1", "f2"])
    assert any("f1" in w and "atypique" in w.lower() for w in rep.warnings)


def test_clean_numeric_no_warning():
    df = pd.DataFrame({"f1": list(range(100)), "f2": list(range(100))})
    rep = iqr_precheck(df, numeric_columns=["f1", "f2"])
    assert rep.warnings == ()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_anomaly_iqr.py -k outlier -v`
Expected: FAIL (`test_feature_outliers_flagged_when_heavy` fails — no outlier logic yet).

- [ ] **Step 3: Write minimal implementation**

In `app/audit_engine/anomaly_iqr.py`, add before `return IqrReport(...)`:

> **Plan correction (synced to shipped code, commit `95c0842`):** the earlier
> draft used `if iqr == 0: continue` and a strict `>` threshold. With the Task-10
> fixture (`[10.0]*95 + [1000.0]*5`) Q1=Q3=10 → IQR=0, so the column is a single
> mass point and Tukey fences collapse; skipping it would miss genuine outliers,
> and `5/100 = 0.05` is not `> 0.05`. The correct behavior on a degenerate IQR is
> to treat any value ≠ the mass point as atypical, and the threshold is
> "at-or-above" (`>=`). A fully constant column still yields 0 outliers (no false
> positive). This is the shipped, reviewed block:

```python
    cols = numeric_columns or []
    for col in cols:
        if col not in df.columns:
            continue
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        if len(s) < 4:
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            n_out = int((s != q1).sum())
        else:
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            n_out = int(((s < lo) | (s > hi)).sum())
        if len(s) > 0 and n_out / len(s) >= outlier_row_pct:
            warnings.append(
                f"Feature « {col} » : {n_out} valeurs atypiques "
                f"({n_out / len(s):.0%}) — vérifiez la qualité des données."
            )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_anomaly_iqr.py -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/anomaly_iqr.py tests/audit_engine/test_anomaly_iqr.py
git -c core.autocrlf=false commit -m "feat(engine): IQR pre-check feature-outlier mode"
```

---

### Task 11: Public API exports

**Files:**
- Modify: `app/audit_engine/__init__.py`
- Test: `tests/audit_engine/test_public_api.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/audit_engine/test_public_api.py`:

```python
def test_m2_public_api_surface():
    import app.audit_engine as ae

    for name in (
        "run_m2", "M2Config", "M2Result", "ClusterStat",
        "FeatureContribution", "iqr_precheck", "IqrReport",
    ):
        assert name in ae.__all__
        assert hasattr(ae, name)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_public_api.py::test_m2_public_api_surface -v`
Expected: FAIL with `AssertionError` (names not in `__all__`).

- [ ] **Step 3: Write minimal implementation**

Replace `app/audit_engine/__init__.py` with:

```python
"""AuditIQ audit engine — pure, no I/O. M1 supervised + M2 unsupervised."""

from .anomaly_iqr import iqr_precheck
from .errors import AuditEngineError, DatasetValidationError
from .m1_supervised import run_m1
from .types import (
    ClusterStat,
    FeatureContribution,
    GroupStat,
    IqrReport,
    M1Config,
    M1Result,
    M2Config,
    M2Result,
)
from .unsupervised import run_m2

__all__ = [
    "run_m1",
    "run_m2",
    "iqr_precheck",
    "M1Config",
    "M1Result",
    "GroupStat",
    "M2Config",
    "M2Result",
    "ClusterStat",
    "FeatureContribution",
    "IqrReport",
    "AuditEngineError",
    "DatasetValidationError",
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_public_api.py -v`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add app/audit_engine/__init__.py tests/audit_engine/test_public_api.py
git -c core.autocrlf=false commit -m "feat(engine): export M2 + IQR public API"
```

---

### Task 12: Full engine gate (suite + ruff + mypy)

**Files:**
- None (verification + fixes only)

- [ ] **Step 1: Run the full audit-engine test suite**

Run: `uv run python -m pytest tests/audit_engine -v`
Expected: PASS, 0 failed (all M1 tests still green + the new M2/IQR tests).

- [ ] **Step 2: Run the whole API suite (no regression)**

Run: `uv run python -m pytest -q`
Expected: PASS, 0 failed (≥ 113 prior + the new engine tests).

- [ ] **Step 3: Lint**

Run: `uv run python -m ruff check app/audit_engine tests/audit_engine`
Expected: `All checks passed!` — if not, fix the reported lines and re-run.

- [ ] **Step 4: Type-check (strict)**

Run: `uv run python -m mypy app/audit_engine`
Expected: `Success: no issues found`. Likely fix-ups if reported: add precise
types to numpy boundaries, e.g. annotate helper returns and cast
`labels`/`positive` as `np.ndarray`. Apply minimal typed fixes until clean.

- [ ] **Step 5: Commit any gate fixes**

```bash
git add -A
git -c core.autocrlf=false commit -m "chore(engine): lint/type fixups for M2 engine"
```

(If Steps 3–4 were already clean, skip the commit.)

---

## Self-Review

**1. Spec coverage (spec §4 + §5):**
- §4 input/`M2Config` → Task 1; validation rules (binary decision, ≥2 numeric features, `n ≥ 5k`/`n≥20`, NaN dropped, non-numeric warned) → Task 7; pipeline steps 1–7 (StandardScaler→KMeans→rates→χ²→deviation→characterization) → Tasks 2–5, 8; verdict bands + risk_score → Task 6; immutable dataclass output → Task 1; deterministic via `random_state` → Task 8 (`test_run_m2_is_deterministic`). Fixtures (deviant/homogeneous/borderline/degenerate) → conftest + Tasks 7–8. **Borderline "warn"** (deviation>20pp but p≥α, or p<α but no deviant) is covered at unit level by `test_m2_verdict_bands` (Task 6); an end-to-end borderline fixture is not added (the verdict logic is fully exercised in isolation — acceptable, DI-style band testing matches the M1 engine's approach).
- §5 IQR pre-check: group-imbalance mode (M1) → Task 9; feature-outlier mode (M2) → Task 10; pure, returns `IqrReport` → Task 1/9. Service wiring of IQR into `run_m1`/`run_m2` is **Plan M2-B** (this plan is the pure engine only — correct boundary).
- Out of scope here (correctly): migration, DTO, interpretation, service/router, reporting, web → Plans M2-B / M2-C.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases". Task 7 deliberately ships `run_m2` raising `NotImplementedError` after validation, with the validation tests not reaching it; Task 8 replaces it with the full body — this is an intentional two-step TDD build, not a placeholder (each step has complete code).

**3. Type consistency:** `M2Config(decision_column, positive_value, feature_columns, k, deviation_pp, chi2_alpha, random_state, min_rows_factor, min_rows_abs, min_cluster_warn)` used identically in Tasks 1/7/8. Helpers `cluster_positive_rates`, `chi2_cluster_decision`, `deviations`, `characterize_cluster`, `m2_verdict`, `m2_risk_score` defined in Tasks 2–6 and called with matching signatures in Task 8. `M2Result`/`ClusterStat`/`FeatureContribution`/`IqrReport` field names consistent across Tasks 1, 8, 9, 11. Reuses existing `DatasetValidationError(message, *, field=...)` and `VERDICT_*` constants from `metrics.py` (verified against `app/audit_engine/metrics.py`).
