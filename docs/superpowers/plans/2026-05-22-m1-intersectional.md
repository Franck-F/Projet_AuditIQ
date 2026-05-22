# M1 Intersectional Fairness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, backward-compatible 2-way intersectional (crossed protected-attribute) analysis to the merged M1 audit — engine→DTO→service→interpretation→web→reporting.

**Architecture:** Sub-project #2 of 3 (spec `docs/superpowers/specs/2026-05-22-m1-intersectional-design.md`). `M1Config` gains an optional second protected attribute; a new pure module `intersectional.py` (reusing `metrics.py` helpers) computes the crossed-subgroup matrix + the two marginal DIs; `run_m1` composes it and attaches an optional `M1Result.intersectional` field that is `None` when single-attribute → existing M1 output byte-identical. When two attributes are given, the global M1 verdict is driven by the worst crossed-cell Disparate Impact.

**Tech Stack:** Python 3.12, pandas, frozen dataclasses (pure `audit_engine`), Pydantic v2, FastAPI, pytest, Next.js + Vitest, uv, pnpm `@auditiq/web`.

---

## Scope

One cohesive backward-compatible vertical. Sub-project #3 (async-reframed) is a separate later cycle — OUT of scope. **In:** `apps/api/app/audit_engine/{types,intersectional,__init__}.py`, `apps/api/app/audit_engine/m1_supervised.py`, `apps/api/app/schemas/audit.py`, `apps/api/app/services/audit_service.py`, `apps/api/app/interpretation/m1.py` + its prompt, `apps/web/lib/api/audits.ts`, `apps/web/app/app/audits/nouveau/page.tsx`, `apps/web/app/app/audits/[id]/page.tsx`, `apps/api/app/reporting/{excel,html}.py`, and the matching tests.

Commands — api from `apps/api`: `uv run python -m pytest`, `uv run python -m ruff check`, `uv run python -m mypy app`. web from repo root: `pnpm --filter @auditiq/web {test,typecheck,lint}` (lint = `eslint .`). **Commit RULE:** plain `git add` + `git commit -m "..."` — NEVER `-c core.autocrlf=false` (it whole-file-CRLF-churns edited files). Identity `Franck F <franck-dilane1.fambou@epitech.digital>`; **at execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`** and **cherry-pick BOTH the plan and the spec doc into the worktree** (the worktree branches from origin/main which lacks local-main-only doc commits). NEVER add a Co-Authored-By/Claude trailer.

**Subagent-driven gotcha (from sub-project #1):** a task's commit can be orphaned if a later task branches from a stale HEAD. Before the final review/PR, run `git --no-pager log --oneline origin/main..HEAD` and confirm exactly one commit per task (+ fixes + plan + spec); spot-check each task's signature file is in `git diff --stat origin/main..HEAD`.

**KNOWN-FLAKY:** `apps/web/__tests__/connexion.test.tsx` (async sign-in) times out under heavy parallel load but passes 2/2 in isolation; web auth is untouched here. If a full web run shows ONLY connexion failing, re-run `pnpm --filter @auditiq/web exec vitest run connexion` isolated — green-in-isolation = PASS, not a regression.

## File Structure

- `audit_engine/types.py` — `M1Config` + `secondary_protected_attribute: str | None = None`, `secondary_privileged_value: object | None = None`; new frozen `IntersectionalCell`, `IntersectionalResult`; `M1Result` + `intersectional: IntersectionalResult | None = None`.
- `audit_engine/intersectional.py` (new) — pure `run_intersectional(df, config) -> IntersectionalResult`.
- `audit_engine/m1_supervised.py` — `run_m1` composes `run_intersectional` when a secondary attribute is set.
- `audit_engine/__init__.py` — export the new public symbol(s).
- `app/schemas/audit.py` — `AuditCreate` + 2 optional fields + validator; `M1MetricsOut` + `intersectional`; new `IntersectionalOut`/`IntersectionalCellOut`.
- `app/services/audit_service.py` — `run_m1_audit` passes + maps; `get_audit` round-trips.
- `app/interpretation/m1.py` + `prompts/m1_fr.md` — marginal-vs-intersection contrast.
- `apps/web/lib/api/audits.ts` — M1 types gain optional intersectional fields.
- `apps/web/app/app/audits/nouveau/page.tsx` — M1 form optional secondary protected-attribute select.
- `apps/web/app/app/audits/[id]/page.tsx` — conditional subgroup-matrix section in the M1 view.
- `app/reporting/excel.py` + `html.py` — conditional M1 intersectional section.

Read first (authoritative over snippets where they differ — these are the POST-#18 files): `audit_engine/types.py` (`M1Config`/`GroupStat`/`M1Result` with sub-project #1's optional fields), `audit_engine/metrics.py` (`selection_rate`, `pick_reference`, `disparate_impacts`, `demographic_parity_diff`, `decide_verdict`, `risk_score`, `gap_verdict`, `group_confusion`, `truelabel_metrics`/`TrueLabelMetrics`, `VERDICT_*`, the `_ROUND` value), `audit_engine/m1_supervised.py` (`run_m1` incl. the sub-project-#1 EO block + the `df[[pa,dc]].dropna()` idiom), `app/schemas/audit.py` (`AuditCreate`/`_per_module`/`M1MetricsOut`/`GroupStatOut`/`Verdict`), `app/services/audit_service.py` (`run_m1_audit`/`_to_metrics_out`/`get_audit`), `app/interpretation/m1.py` + `prompts/m1_fr.md`, the M1 branches of `reporting/{excel,html}.py`, `apps/web/lib/api/audits.ts` M1 types, the M1 form/result in the two web pages, the `__tests__` idioms.

---

### Task 1: Engine types — secondary-attribute config + intersectional dataclasses

**Files:**
- Modify: `apps/api/app/audit_engine/types.py`
- Test: `apps/api/tests/audit_engine/test_types.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/audit_engine/test_types.py`:

```python
def test_m1config_secondary_attribute_optional_default_none():
    from app.audit_engine.types import M1Config

    c = M1Config(protected_attribute="g", decision_column="d",
                 favorable_value="oui")
    assert c.secondary_protected_attribute is None
    assert c.secondary_privileged_value is None
    c2 = M1Config(protected_attribute="g", decision_column="d",
                  favorable_value="oui", secondary_protected_attribute="o",
                  secondary_privileged_value="fr")
    assert c2.secondary_protected_attribute == "o"
    assert c2.secondary_privileged_value == "fr"


def test_intersectional_dataclasses():
    from app.audit_engine.types import (
        IntersectionalCell, IntersectionalResult, M1Result,
    )

    cell = IntersectionalCell(
        primary_value="femme", secondary_value="etrangere", n=20,
        favorable=4, selection_rate=0.2, disparate_impact=0.4,
        verdict="fail",
    )
    assert cell.tpr is None and cell.fpr is None
    r = IntersectionalResult(
        cells=(cell,), reference_primary="homme",
        reference_secondary="francaise", worst_primary="femme",
        worst_secondary="etrangere", disparate_impact=0.4,
        demographic_parity_diff=0.3, verdict="fail", risk_score=70,
        marginal_di=(0.85, 0.88),
    )
    assert r.equal_opportunity_diff is None
    assert r.equalized_odds_diff is None
    assert r.demographic_parity_verdict is None
    assert r.equal_opportunity_verdict is None
    assert r.equalized_odds_verdict is None
    assert r.warnings == ()
    assert r.reason is None
    res = M1Result(
        groups=(), reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10,
    )
    assert res.intersectional is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_types.py -k "secondary or intersectional" -v`
Expected: FAIL — `M1Config` has no `secondary_protected_attribute`; `IntersectionalCell`/`IntersectionalResult` undefined.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/types.py`:
- Add to `M1Config` (after the sub-project-#1 `ground_truth_column` field, keeping all existing fields/order):

```python
    secondary_protected_attribute: str | None = None
    secondary_privileged_value: object | None = None
```

- Add two new frozen dataclasses (place them after `M1Result`, before the M2 types; `from __future__ import annotations` is already at the top):

```python
@dataclass(frozen=True)
class IntersectionalCell:
    primary_value: str
    secondary_value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float
    verdict: str
    tpr: float | None = None
    fpr: float | None = None


@dataclass(frozen=True)
class IntersectionalResult:
    cells: tuple[IntersectionalCell, ...]
    reference_primary: str
    reference_secondary: str
    worst_primary: str
    worst_secondary: str
    disparate_impact: float
    demographic_parity_diff: float
    verdict: str
    risk_score: int
    marginal_di: tuple[float, float]
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: str | None = None
    equal_opportunity_verdict: str | None = None
    equalized_odds_verdict: str | None = None
    warnings: tuple[str, ...] = ()
    reason: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "cells", tuple(self.cells))
        object.__setattr__(self, "warnings", tuple(self.warnings))
        object.__setattr__(self, "marginal_di", tuple(self.marginal_di))
```

- Add to `M1Result` (after sub-project #1's `truelabel_reason` field, keeping `__post_init__`):

```python
    intersectional: IntersectionalResult | None = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_types.py -v`
Expected: PASS (new + all existing type tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_types.py
git commit -m "feat(engine): intersectional config + result dataclasses"
```

---

### Task 2: Pure `run_intersectional`

**Files:**
- Create: `apps/api/app/audit_engine/intersectional.py`
- Test: `apps/api/tests/audit_engine/test_intersectional.py`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/audit_engine/test_intersectional.py`:

```python
import pandas as pd

from app.audit_engine.intersectional import run_intersectional
from app.audit_engine.types import M1Config


def _cfg(**kw):
    base = dict(protected_attribute="genre", decision_column="d",
                favorable_value="oui", secondary_protected_attribute="orig")
    base.update(kw)
    return M1Config(**base)


def test_crossed_cells_and_worst_cell():
    # homme×fr high rate ; femme×etr low rate
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 40,
        "orig": (["fr"] * 20 + ["etr"] * 20) + (["fr"] * 20 + ["etr"] * 20),
        "d": (["oui"] * 18 + ["non"] * 2 + ["oui"] * 14 + ["non"] * 6)
        + (["oui"] * 12 + ["non"] * 8 + ["oui"] * 4 + ["non"] * 16),
    })
    r = run_intersectional(df, _cfg(privileged_value="h",
                                    secondary_privileged_value="fr"))
    assert len(r.cells) == 4
    assert (r.reference_primary, r.reference_secondary) == ("h", "fr")
    # worst = femme×etr (lowest rate)
    assert (r.worst_primary, r.worst_secondary) == ("f", "etr")
    assert r.disparate_impact == min(c.disparate_impact for c in r.cells)
    assert r.verdict in ("pass", "warn", "fail")
    assert len(r.marginal_di) == 2
    assert r.reason is None


def test_reference_falls_back_to_max_rate_cell_when_no_privileged():
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 40,
        "orig": (["fr"] * 20 + ["etr"] * 20) * 2,
        "d": (["oui"] * 19 + ["non"] + ["oui"] * 10 + ["non"] * 10)
        + (["oui"] * 10 + ["non"] * 10 + ["oui"] * 5 + ["non"] * 15),
    })
    r = run_intersectional(df, _cfg())  # no privileged values
    # reference = the max-selection-rate cell (h×fr here)
    assert (r.reference_primary, r.reference_secondary) == ("h", "fr")


def test_sparse_cell_excluded_with_warning_never_raises():
    # f×etr has only n=3 -> below min_group_error (5) -> excluded + warning
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 23,
        "orig": (["fr"] * 20 + ["etr"] * 20) + (["fr"] * 20 + ["etr"] * 3),
        "d": (["oui"] * 15 + ["non"] * 5) * 2 + (["oui"] * 10 + ["non"] * 10)
        + ["oui", "non", "oui"],
    })
    r = run_intersectional(df, _cfg())
    assert any("etr" in w for w in r.warnings)
    assert all(not (c.primary_value == "f" and c.secondary_value == "etr")
               for c in r.cells)


def test_fewer_than_two_usable_cells_sets_reason():
    # almost everything sparse -> <2 usable cells
    df = pd.DataFrame({
        "genre": ["h"] * 30 + ["f"] * 8,
        "orig": (["fr"] * 28 + ["etr"] * 2) + (["fr"] * 4 + ["etr"] * 4),
        "d": (["oui"] * 20 + ["non"] * 10) + ["oui", "non"]
        + ["oui", "non", "oui", "non"] * 2,
    })
    r = run_intersectional(df, _cfg())
    assert r.reason is not None
    # never raised


def test_equal_opportunity_per_cell_when_ground_truth():
    df = pd.DataFrame({
        "genre": ["h"] * 40 + ["f"] * 40,
        "orig": (["fr"] * 20 + ["etr"] * 20) * 2,
        "d": (["oui"] * 12 + ["non"] * 8) * 4,
        "reel": (["oui"] * 10 + ["non"] * 10) * 4,
    })
    r = run_intersectional(df, _cfg(ground_truth_column="reel"))
    assert r.equal_opportunity_diff is not None
    assert r.equalized_odds_diff is not None
    assert any(c.tpr is not None for c in r.cells)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/audit_engine/test_intersectional.py -v`
Expected: FAIL — `ModuleNotFoundError: app.audit_engine.intersectional`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/app/audit_engine/intersectional.py`:

```python
"""Pure 2-way intersectional fairness analysis. No I/O. Never raises for
crossed-cell sparsity — degenerate cells are skipped with a warning."""
from __future__ import annotations

import pandas as pd

from .metrics import (
    decide_verdict,
    gap_verdict,
    group_confusion,
    risk_score,
    truelabel_metrics,
)
from .types import IntersectionalCell, IntersectionalResult, M1Config

_ROUND = 4


def _marginal_di(pa: pd.Series, fav_mask: pd.Series) -> float:
    """Min disparate impact of one attribute audited alone (max-rate ref)."""
    rates: dict[str, float] = {}
    for g in sorted(pa.unique()):
        m = pa == g
        n = int(m.sum())
        if n == 0:
            continue
        rates[g] = int((m & fav_mask).sum()) / n
    if not rates:
        return 1.0
    ref = max(rates.values())
    if ref == 0.0:
        return 1.0
    return round(min(r / ref for r in rates.values()), _ROUND)


def run_intersectional(
    df: pd.DataFrame, config: M1Config
) -> IntersectionalResult:
    """Cross config.protected_attribute x config.secondary_protected_attribute.

    Pure. Crossed cells with n < config.min_group_error are excluded with a
    warning; n < config.min_group_warn adds a low-confidence warning; fewer
    than 2 usable cells -> reason set, metrics None. Never raises here (the
    caller validates column presence).
    """
    pa = config.protected_attribute
    sa = config.secondary_protected_attribute
    dc = config.decision_column
    gt = config.ground_truth_column
    assert sa is not None  # caller guarantees

    cols = [pa, sa, dc] + ([gt] if gt is not None else [])
    clean = df[cols].dropna()
    p_str = clean[pa].astype(str)
    s_str = clean[sa].astype(str)
    fav = str(config.favorable_value)
    fav_mask = clean[dc].astype(str) == fav

    warnings: list[str] = []
    raw: dict[tuple[str, str], dict[str, int]] = {}
    for pv in sorted(p_str.unique()):
        for sv in sorted(s_str.unique()):
            mask = (p_str == pv) & (s_str == sv)
            n = int(mask.sum())
            if n == 0:
                continue
            if n < config.min_group_error:
                warnings.append(
                    f"Sous-groupe « {pv} × {sv} » : effectif insuffisant "
                    f"(n={n} < {config.min_group_error}) — exclu de "
                    f"l'analyse intersectionnelle."
                )
                continue
            if n < config.min_group_warn:
                warnings.append(
                    f"Sous-groupe « {pv} × {sv} » : effectif faible "
                    f"(n={n} < {config.min_group_warn}) — résultat peu "
                    f"concluant pour ce sous-groupe."
                )
            raw[(pv, sv)] = {"n": n, "fav": int((mask & fav_mask).sum())}

    marginal = (
        _marginal_di(p_str, fav_mask),
        _marginal_di(s_str, fav_mask),
    )

    if len(raw) < 2:
        return IntersectionalResult(
            cells=(), reference_primary="", reference_secondary="",
            worst_primary="", worst_secondary="", disparate_impact=1.0,
            demographic_parity_diff=0.0, verdict="warn", risk_score=0,
            marginal_di=marginal, warnings=tuple(warnings),
            reason=(
                "Analyse intersectionnelle non calculable : moins de 2 "
                "sous-groupes croisés exploitables après exclusion des "
                "cellules à effectif insuffisant."
            ),
        )

    rates = {k: v["fav"] / v["n"] for k, v in raw.items()}

    # reference cell
    ref_key: tuple[str, str] | None = None
    if (
        config.privileged_value is not None
        and config.secondary_privileged_value is not None
    ):
        cand = (str(config.privileged_value),
                str(config.secondary_privileged_value))
        if cand in rates:
            ref_key = cand
    if ref_key is None:
        max_rate = max(rates.values())
        ref_key = sorted(k for k, r in rates.items() if r == max_rate)[0]
    ref_rate = rates[ref_key]

    # optional per-cell true-label confusion
    tpr_map: dict[tuple[str, str], float] = {}
    fpr_map: dict[tuple[str, str], float] = {}
    eo_diff = eodds_diff = None
    dp_verdict = eo_verdict = eodds_verdict = None
    if gt is not None:
        true_mask = clean[gt].astype(str) == fav
        confusion: dict[str, dict[str, int]] = {}
        for (pv, sv) in raw:
            m = (p_str == pv) & (s_str == sv)
            confusion[f"{pv}|{sv}"] = group_confusion(
                list(fav_mask[m]), list(true_mask[m])
            )
        tl = truelabel_metrics(confusion, None)
        warnings.extend(tl.skipped)
        for key, val in tl.tpr.items():
            pv, sv = key.split("|", 1)
            tpr_map[(pv, sv)] = val
        for key, val in tl.fpr.items():
            pv, sv = key.split("|", 1)
            fpr_map[(pv, sv)] = val
        eo_diff = (
            round(tl.eo_diff, _ROUND) if tl.eo_diff is not None else None
        )
        eodds_diff = (
            round(tl.eodds_diff, _ROUND)
            if tl.eodds_diff is not None else None
        )

    cells: list[IntersectionalCell] = []
    di_by_key: dict[tuple[str, str], float] = {}
    for key in sorted(raw):
        di = 1.0 if ref_rate == 0.0 else rates[key] / ref_rate
        di_by_key[key] = round(di, _ROUND)
        has_small = raw[key]["n"] < config.min_group_warn
        cells.append(
            IntersectionalCell(
                primary_value=key[0], secondary_value=key[1],
                n=raw[key]["n"], favorable=raw[key]["fav"],
                selection_rate=round(rates[key], _ROUND),
                disparate_impact=round(di, _ROUND),
                verdict=decide_verdict(
                    di, config.di_fail_below, config.di_warn_below,
                    has_small,
                ),
                tpr=(round(tpr_map[key], _ROUND) if key in tpr_map
                     else None),
                fpr=(round(fpr_map[key], _ROUND) if key in fpr_map
                     else None),
            )
        )

    worst_di = min(di_by_key.values())
    worst_key = sorted(k for k, d in di_by_key.items()
                       if d == worst_di)[0]
    dpd = round(max(rates.values()) - min(rates.values()), _ROUND)
    has_small_any = any(v["n"] < config.min_group_warn
                        for v in raw.values())
    verdict = decide_verdict(worst_di, config.di_fail_below,
                             config.di_warn_below, has_small_any)
    score = risk_score(worst_di, 0.0)
    if eo_diff is not None:
        eo_verdict = gap_verdict(eo_diff, config.di_fail_below,
                                 config.di_warn_below)
    if eodds_diff is not None:
        eodds_verdict = gap_verdict(eodds_diff, config.di_fail_below,
                                    config.di_warn_below)
    dp_verdict = gap_verdict(dpd, config.di_fail_below,
                             config.di_warn_below)

    return IntersectionalResult(
        cells=tuple(cells),
        reference_primary=ref_key[0], reference_secondary=ref_key[1],
        worst_primary=worst_key[0], worst_secondary=worst_key[1],
        disparate_impact=round(worst_di, _ROUND),
        demographic_parity_diff=dpd,
        verdict=verdict, risk_score=score, marginal_di=marginal,
        equal_opportunity_diff=eo_diff, equalized_odds_diff=eodds_diff,
        demographic_parity_verdict=dp_verdict,
        equal_opportunity_verdict=eo_verdict,
        equalized_odds_verdict=eodds_verdict,
        warnings=tuple(warnings), reason=None,
    )
```

> Read the REAL `metrics.py` to confirm the exact signatures of `decide_verdict`, `risk_score`, `gap_verdict`, `group_confusion`, `truelabel_metrics` and `TrueLabelMetrics`'s field names (`tpr`/`fpr`/`eo_diff`/`eodds_diff`/`skipped`) — they were delivered in sub-project #1. Adapt the snippet ONLY if the real names differ; the maths (TPR/FPR/EO/EOdds) must not change.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/audit_engine/test_intersectional.py -v`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/intersectional.py apps/api/tests/audit_engine/test_intersectional.py
git commit -m "feat(engine): pure run_intersectional (2-way crossed-subgroup analysis)"
```

---

### Task 3: Compose `run_intersectional` into `run_m1`

**Files:**
- Modify: `apps/api/app/audit_engine/m1_supervised.py`
- Test: `apps/api/tests/audit_engine/test_m1_supervised.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/audit_engine/test_m1_supervised.py` (reuse the file's existing pandas/`M1Config`/`run_m1` imports):

```python
def test_run_m1_without_secondary_attribute_is_byte_identical():
    import pandas as pd
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 30 + ["non"] * 10) + (["oui"] * 12 + ["non"] * 28),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui")
    r = run_m1(df, cfg)
    assert r.intersectional is None
    assert r.verdict in ("pass", "warn", "fail")


def test_run_m1_with_secondary_attribute_attaches_intersectional():
    import pandas as pd
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["h"] * 40 + ["f"] * 40,
        "o": (["fr"] * 20 + ["etr"] * 20) * 2,
        "d": (["oui"] * 18 + ["non"] * 2 + ["oui"] * 14 + ["non"] * 6)
        + (["oui"] * 12 + ["non"] * 8 + ["oui"] * 3 + ["non"] * 17),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", privileged_value="h",
                   secondary_protected_attribute="o",
                   secondary_privileged_value="fr")
    r = run_m1(df, cfg)
    assert r.intersectional is not None
    assert len(r.intersectional.cells) == 4
    # global verdict/risk are driven by the intersectional worst cell
    assert r.verdict == r.intersectional.verdict
    assert r.risk_score == r.intersectional.risk_score


def test_run_m1_intersectional_contrast_marginals_pass_cross_fails():
    """Gender Shades scenario: each attribute alone is compliant, but a
    crossed cell is not -> intersectional verdict fail."""
    import pandas as pd
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["h"] * 60 + ["f"] * 60,
        "o": (["fr"] * 30 + ["etr"] * 30) + (["fr"] * 30 + ["etr"] * 30),
        "d": (["oui"] * 29 + ["non"] + ["oui"] * 9 + ["non"] * 21)
        + (["oui"] * 21 + ["non"] * 9 + ["oui"] + ["non"] * 29),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui",
                   secondary_protected_attribute="o")
    r = run_m1(df, cfg)
    assert r.intersectional is not None
    assert r.intersectional.verdict == "fail"
    # both marginal DIs are far less severe than the crossed worst DI
    assert min(r.intersectional.marginal_di) > r.intersectional.disparate_impact


def test_run_m1_missing_secondary_column_raises():
    import pandas as pd
    import pytest
    from app.audit_engine.errors import DatasetValidationError
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({"g": ["a"] * 10 + ["b"] * 10,
                       "d": ["oui", "non"] * 10})
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui",
                   secondary_protected_attribute="absent")
    with pytest.raises(DatasetValidationError):
        run_m1(df, cfg)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/audit_engine/test_m1_supervised.py -k "secondary or intersectional or contrast" -v`
Expected: FAIL — `run_m1` ignores the secondary attribute; `M1Result.intersectional` stays `None`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/m1_supervised.py`:
- Add to the imports: `from .intersectional import run_intersectional`.
- Just before the final `return M1Result(...)` (after the sub-project-#1 EO block, keeping ALL existing logic), insert:

```python
    intersectional = None
    sa = config.secondary_protected_attribute
    if sa is not None:
        if sa not in df.columns:
            raise DatasetValidationError(
                f"Colonne attribut protégé secondaire « {sa} » absente "
                f"du jeu de données.",
                field="secondary_protected_attribute",
            )
        if sa == config.protected_attribute:
            raise DatasetValidationError(
                "L'attribut protégé secondaire doit différer du primaire.",
                field="secondary_protected_attribute",
            )
        intersectional = run_intersectional(df, config)
```

- Change the final `return M1Result(...)`: when `intersectional is not None`, the global `verdict`/`risk_score` come from it (D5); otherwise unchanged. Replace the `verdict=`/`risk_score=` arguments and add `intersectional=`:

```python
    return M1Result(
        groups=tuple(group_stats),
        reference_value=reference,
        disparate_impact=round(overall_di, _ROUND),
        demographic_parity_diff=round(dpd, _ROUND),
        worst_group=worst_group,
        verdict=(intersectional.verdict if intersectional is not None
                 else verdict),
        risk_score=(intersectional.risk_score if intersectional is not None
                    else score),
        warnings=tuple(warnings),
        equal_opportunity_diff=eo_diff,
        equalized_odds_diff=eodds_diff,
        demographic_parity_verdict=dp_verdict,
        equal_opportunity_verdict=eo_verdict,
        equalized_odds_verdict=eodds_verdict,
        truelabel_reason=tl_reason,
        intersectional=intersectional,
    )
```
(Read the REAL post-#1 `return M1Result(...)` — keep every existing kwarg exactly; only `verdict`/`risk_score` become conditional and `intersectional=` is added. The pre-existing local names `verdict`, `score`, `overall_di`, `dpd`, `warnings`, `worst_group`, `reference`, `group_stats`, and the sub-project-#1 `eo_diff`/`eodds_diff`/`dp_verdict`/`eo_verdict`/`eodds_verdict`/`tl_reason` are unchanged. When `sa is None`, `intersectional` stays `None` and the result is byte-identical to today.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/audit_engine/test_m1_supervised.py -v`
Expected: PASS (new + ALL existing M1 engine tests — the byte-identical test is the regression guard).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/m1_supervised.py apps/api/tests/audit_engine/test_m1_supervised.py
git commit -m "feat(engine): run_m1 composes intersectional analysis (byte-identical when absent)"
```

---

### Task 4: Engine exports

**Files:**
- Modify: `apps/api/app/audit_engine/__init__.py`
- Test: `apps/api/tests/audit_engine/test_public_api.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/audit_engine/test_public_api.py`:

```python
def test_intersectional_symbols_exported():
    import app.audit_engine as ae

    assert hasattr(ae, "run_intersectional")
    assert hasattr(ae, "IntersectionalResult")
    assert hasattr(ae, "IntersectionalCell")
    assert hasattr(ae, "run_m1")
    assert hasattr(ae, "M1Result")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_public_api.py -k intersectional -v`
Expected: FAIL — symbols not exported.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/__init__.py`: add `from .intersectional import run_intersectional`; add `IntersectionalCell, IntersectionalResult` to the existing `from .types import (...)` block (alphabetical, matching the file's style); append `"IntersectionalCell"`, `"IntersectionalResult"`, `"run_intersectional"` to `__all__`. Do not change existing exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_public_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/__init__.py apps/api/tests/audit_engine/test_public_api.py
git commit -m "feat(engine): export intersectional symbols"
```

---

### Task 5: DTO — secondary-attribute config + `M1MetricsOut.intersectional`

**Files:**
- Modify: `apps/api/app/schemas/audit.py`
- Test: `apps/api/tests/api/test_schemas_m1.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_schemas_m1.py`:

```python
def test_m1_accepts_optional_secondary_attribute():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", protected_attribute="genre",
        decision_column="embauche", favorable_value="oui",
        secondary_protected_attribute="origine",
        secondary_privileged_value="francaise",
    )
    assert a.secondary_protected_attribute == "origine"
    assert a.secondary_privileged_value == "francaise"


def test_secondary_attribute_must_differ_and_is_m1_only():
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            protected_attribute="genre", decision_column="d",
            favorable_value="oui",
            secondary_protected_attribute="genre",  # == primary
        )
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M2",
            decision_column="d", favorable_value="oui",
            secondary_protected_attribute="origine",  # not allowed for M2
        )


def test_m1_metrics_out_optional_intersectional():
    m = M1MetricsOut(
        groups=[], reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10, warnings=[],
    )
    assert m.intersectional is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_schemas_m1.py -k "secondary or intersectional" -v`
Expected: FAIL — `secondary_protected_attribute` unknown / `intersectional` missing.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/schemas/audit.py` (read the real `AuditCreate`, `_per_module`, `M1MetricsOut`, `GroupStatOut`, `Verdict`):
- `AuditCreate`: add `secondary_protected_attribute: str | None = None` and `secondary_privileged_value: str | None = None`.
- `_per_module` **M1 branch**: if `secondary_protected_attribute is not None` and it equals `protected_attribute`, `decision_column`, or `ground_truth_column` → `raise ValueError("module M1 : 'secondary_protected_attribute' doit différer de l'attribut protégé, de la colonne décision et de la colonne vérité-terrain.")`. **M2 and M3 branches**: add `secondary_protected_attribute`/`secondary_privileged_value` to the existing forbidden-fields check + message. Keep all existing M1/M2/M3 rules unchanged.
- Add two new models near `M1MetricsOut`:

```python
class IntersectionalCellOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_value: str
    secondary_value: str
    n: int
    favorable: int
    selection_rate: float
    disparate_impact: float
    verdict: Verdict
    tpr: float | None = None
    fpr: float | None = None


class IntersectionalOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cells: list[IntersectionalCellOut]
    reference_primary: str
    reference_secondary: str
    worst_primary: str
    worst_secondary: str
    disparate_impact: float
    demographic_parity_diff: float
    verdict: Verdict
    risk_score: int
    marginal_di: list[float]
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: Verdict | None = None
    equal_opportunity_verdict: Verdict | None = None
    equalized_odds_verdict: Verdict | None = None
    warnings: list[str] = []
    reason: str | None = None
```
- `M1MetricsOut`: add `intersectional: IntersectionalOut | None = None`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_schemas_m1.py tests/api/test_schemas_m2.py tests/api/test_schemas_m3.py -v`
Expected: PASS (new + existing schema tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_m1.py
git commit -m "feat(api): intersectional DTO + secondary-attribute validator"
```

---

### Task 6: Service — pass secondary attribute + map intersectional, round-trip

**Files:**
- Modify: `apps/api/app/services/audit_service.py`
- Test: `apps/api/tests/api/test_audit_service_m1.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_audit_service_m1.py` (reuse the file's existing `ctx`/upload fixture idiom from sub-project #1):

```python
async def test_run_m1_audit_with_secondary_attribute_roundtrip(ctx):
    sm, org_id, user_id, upload = ctx
    csv = (
        "genre,origine,embauche\n"
        + "h,fr,oui\n" * 18 + "h,fr,non\n" * 2
        + "h,etr,oui\n" * 12 + "h,etr,non\n" * 8
        + "f,fr,oui\n" * 12 + "f,fr,non\n" * 8
        + "f,etr,oui\n" * 3 + "f,etr,non\n" * 17
    ).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        from app.schemas.audit import AuditCreate, M1MetricsOut
        out = await audit_service.run_m1_audit(
            session, org_id=org_id, user_id=user_id,
            body=AuditCreate(
                dataset_id=ds.id, title="M1 intersection",
                protected_attribute="genre", decision_column="embauche",
                favorable_value="oui",
                secondary_protected_attribute="origine",
            ),
            llm_provider=None,
        )
    assert out.status == "done"
    assert isinstance(out.metrics, M1MetricsOut)
    assert out.metrics.intersectional is not None
    assert len(out.metrics.intersectional.cells) == 4
    async with sm() as session:
        fetched = await audit_service.get_audit(session, out.id,
                                                org_id=org_id)
    assert isinstance(fetched.metrics, M1MetricsOut)
    assert fetched.metrics.intersectional is not None


async def test_run_m1_audit_without_secondary_attribute_unchanged(ctx):
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "h,oui\n" * 20 + "h,non\n" * 20
           + "f,oui\n" * 10 + "f,non\n" * 30).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        from app.schemas.audit import AuditCreate, M1MetricsOut
        out = await audit_service.run_m1_audit(
            session, org_id=org_id, user_id=user_id,
            body=AuditCreate(dataset_id=ds.id, title="M1 plain",
                             protected_attribute="genre",
                             decision_column="embauche",
                             favorable_value="oui"),
            llm_provider=None,
        )
    assert out.status == "done"
    assert isinstance(out.metrics, M1MetricsOut)
    assert out.metrics.intersectional is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_audit_service_m1.py -k secondary -v`
Expected: FAIL — `run_m1_audit` doesn't pass/map the secondary attribute.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/services/audit_service.py` (read the real `run_m1_audit`, `_to_metrics_out`, `get_audit` M1 branch):
- When building `M1Config`, pass `secondary_protected_attribute=body.secondary_protected_attribute` and `secondary_privileged_value=body.secondary_privileged_value`.
- In `_to_metrics_out`, map `M1Result.intersectional` → `M1MetricsOut.intersectional` when present: build `IntersectionalOut` from the `IntersectionalResult` (each `IntersectionalCell` → `IntersectionalCellOut`; `cast(Verdict, ...)` on the verdict strings exactly like the existing M1 verdict mapping; `marginal_di` → `list(...)`; `warnings` → `list(...)`). When `M1Result.intersectional is None`, the mapped DTO field is `None` — no behaviour change.
- `get_audit` M1 branch already `model_validate`s the persisted metrics → the new `intersectional` field round-trips once `M1MetricsOut` declares it (Task 5). Verify; if it reconstructs field-by-field, add `intersectional` there too.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_audit_service_m1.py tests/api/test_audit_service_m2.py tests/api/test_audit_service_m3.py -v`
Expected: PASS (new + existing M1/M2/M3 service tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/tests/api/test_audit_service_m1.py
git commit -m "feat(api): run_m1_audit passes secondary attribute + maps intersectional"
```

---

### Task 7: Interpretation — marginal-vs-intersection contrast

**Files:**
- Modify: `apps/api/app/interpretation/m1.py`
- Modify: `apps/api/app/interpretation/prompts/m1_fr.md`
- Test: `apps/api/tests/api/test_interpret_m1.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_interpret_m1.py`:

```python
async def test_interpret_m1_fallback_mentions_intersectional_contrast():
    from app.audit_engine.types import (
        IntersectionalCell, IntersectionalResult, M1Result,
    )
    from app.interpretation.m1 import interpret_m1

    inter = IntersectionalResult(
        cells=(IntersectionalCell("f", "etr", 20, 3, 0.15, 0.3, "fail"),),
        reference_primary="h", reference_secondary="fr",
        worst_primary="f", worst_secondary="etr", disparate_impact=0.3,
        demographic_parity_diff=0.35, verdict="fail", risk_score=80,
        marginal_di=(0.86, 0.9),
    )
    r = M1Result(
        groups=(), reference_value="h", disparate_impact=0.3,
        demographic_parity_diff=0.35, worst_group="f", verdict="fail",
        risk_score=80, warnings=(), intersectional=inter,
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "intersection" in blob or "sous-groupe" in blob
    assert "etr" in blob  # worst crossed subgroup named


async def test_interpret_m1_no_intersectional_unchanged_shape():
    from app.audit_engine.types import GroupStat, M1Result
    from app.interpretation.m1 import interpret_m1

    r = M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0),
                GroupStat("b", 40, 12, 0.3, 0.6)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="fail",
        risk_score=70, warnings=(),
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "intersection" not in blob
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_interpret_m1.py -k "intersectional or unchanged_shape" -v`
Expected: FAIL — fallback/prompt don't mention the intersectional contrast.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/interpretation/m1.py` (read the real module + `prompts/m1_fr.md`):
- Extend `_fallback`: when `result.intersectional is not None`, add to the narrative/disclaimers — the **marginal-vs-intersection contrast** (each attribute alone vs the worst crossed subgroup: name `worst_primary × worst_secondary`, its DI, and that the marginal DIs `marginal_di` look far less severe), and the sparsity caveat ("les sous-groupes croisés à effectif insuffisant sont exclus ; l'analyse intersectionnelle est indicative sur de petits jeux de données"). When `intersectional is None` the fallback is byte-identical to today (and to sub-project #1's behaviour).
- Extend `m1_fr.md`: include the intersectional fields in the rendered metrics JSON and add a STRICT instruction block to explain the marginal-vs-intersection contrast + sparsity limits ONLY when present. Keep brace-safety (`{{`/`}}` for literal JSON braces).
- Preserve the exact "never raises → deterministic fallback" try/except contract.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_interpret_m1.py -v`
Expected: PASS (new + existing M1 interpretation tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/interpretation/m1.py apps/api/app/interpretation/prompts/m1_fr.md apps/api/tests/api/test_interpret_m1.py
git commit -m "feat(api): M1 interpretation covers the marginal-vs-intersection contrast"
```

---

### Task 8: Web API types

**Files:**
- Modify: `apps/web/lib/api/audits.ts`
- Test: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audits-api.test.ts` (reuse the file's real mock idiom):

```typescript
it('createAudit M1 can include a secondary protected attribute', async () => {
  post.mockResolvedValueOnce({ data: { id: 'm1-x', module: 'M1' } });
  await createAudit({
    dataset_id: 'd1', title: 't', protected_attribute: 'genre',
    decision_column: 'embauche', favorable_value: 'oui',
    privileged_value: null, secondary_protected_attribute: 'origine',
  } as Parameters<typeof createAudit>[0]);
  const body = post.mock.calls.at(-1)![1];
  expect(body.secondary_protected_attribute).toBe('origine');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run audits-api`
Expected: FAIL — the M1 create type has no `secondary_protected_attribute`.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/lib/api/audits.ts` (read the real M1 create type + `M1MetricsOut`): add optional `secondary_protected_attribute?: string | null` and `secondary_privileged_value?: string | null` to the M1 `AuditCreate` type; add an `IntersectionalCellOut` type (`primary_value: string`, `secondary_value: string`, `n`/`favorable`/`selection_rate`/`disparate_impact: number`, `verdict: Verdict`, `tpr?: number | null`, `fpr?: number | null`) and an `IntersectionalOut` type (`cells: IntersectionalCellOut[]`, `reference_primary`/`reference_secondary`/`worst_primary`/`worst_secondary: string`, `disparate_impact`/`demographic_parity_diff: number`, `verdict: Verdict`, `risk_score: number`, `marginal_di: number[]`, `equal_opportunity_diff?`/`equalized_odds_diff?: number | null`, `demographic_parity_verdict?`/`equal_opportunity_verdict?`/`equalized_odds_verdict?: Verdict | null`, `warnings: string[]`, `reason?: string | null`); add `intersectional?: IntersectionalOut | null` to `M1MetricsOut`. M2/M3 types untouched. `createAudit` posts the body as-is.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run audits-api` then `pnpm --filter @auditiq/web typecheck`
Expected: PASS + typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): M1 intersectional API types"
```

---

### Task 9: Web wizard — optional secondary protected-attribute select (M1 only)

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Test: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/nouveau-page.test.tsx` (reuse the real M1 flow idiom; mirror the existing sub-project-#1 M1-GT test setup):

```typescript
it('M1: optional secondary protected attribute is sent', async () => {
  const user = userEvent.setup();
  (createAudit as unknown as Mock).mockResolvedValueOnce({ id: 'm1-x' });
  render(<NouveauPage />);
  // drive the EXACT existing M1 happy-path (module choice -> CSV -> form),
  // then select the optional secondary attribute before submit:
  // ... mirror the existing M1 test setup verbatim ...
  await user.selectOptions(
    screen.getByLabelText(/2e attribut|attribut.*intersection/i), 'origine',
  );
  await user.click(screen.getByRole('button', { name: /lancer|créer/i }));
  await waitFor(() => expect(createAudit as unknown as Mock).toHaveBeenCalled());
  const body = (createAudit as unknown as Mock).mock.calls.at(-1)![0];
  expect(body.secondary_protected_attribute).toBe('origine');
});
```
(Read the existing M1 wizard tests and reproduce the exact setup; reconcile the label regex with the label you implement. Confirm an existing M1 test WITHOUT selecting it still omits `secondary_protected_attribute` and passes.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run nouveau-page`
Expected: FAIL — no secondary-attribute select in the M1 form.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/audits/nouveau/page.tsx` (read the real `M1Form`/`M1Schema`): add an **optional** select "2e attribut protégé (analyse intersectionnelle) — facultatif" (and, optionally, a secondary privileged-value select) to `M1Form` ONLY, populated from the dataset columns (same source as the existing M1 selects), bound to a new optional zod field `secondary_protected_attribute: z.string().optional()` (+ `secondary_privileged_value: z.string().optional()`). On submit, include `secondary_protected_attribute`/`secondary_privileged_value` in the M1 `createAudit` body only when non-empty (use the conditional-spread pattern from sub-project #1's T10 so the no-select payload is byte-identical). Touch ONLY `M1Form`/`M1Schema`; M2/M3 forms + the choice-first flow byte-unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run nouveau-page` then full `pnpm --filter @auditiq/web test`
Expected: PASS (new + existing M1/M2/M3 wizard tests; connexion-flake-aware).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): optional secondary protected attribute in M1 wizard"
```

---

### Task 10: Web result page — conditional subgroup-matrix section

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx`
- Test: `apps/web/__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audit-result-page.test.tsx` (reuse the M1 render idiom):

```typescript
it('M1 result shows the intersectional subgroup matrix when present', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'm1-x', code: 'AUD-2026-060', title: 'M1', status: 'done',
      module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
      decision_column: 'embauche', favorable_value: 'oui',
      privileged_value: 'h', created_at: '2026-05-22T00:00:00Z',
      completed_at: '2026-05-22T00:00:00Z',
      metrics: {
        groups: [{ value: 'h', n: 40, favorable: 28, selection_rate: 0.7,
          disparate_impact: 1.0 }, { value: 'f', n: 40, favorable: 22,
          selection_rate: 0.55, disparate_impact: 0.79 }],
        reference_value: 'h', disparate_impact: 0.3,
        demographic_parity_diff: 0.35, worst_group: 'f', verdict: 'fail',
        risk_score: 80, warnings: [],
        intersectional: {
          cells: [
            { primary_value: 'h', secondary_value: 'fr', n: 20,
              favorable: 18, selection_rate: 0.9, disparate_impact: 1.0,
              verdict: 'pass' },
            { primary_value: 'f', secondary_value: 'etr', n: 20,
              favorable: 3, selection_rate: 0.15, disparate_impact: 0.3,
              verdict: 'fail' },
          ],
          reference_primary: 'h', reference_secondary: 'fr',
          worst_primary: 'f', worst_secondary: 'etr',
          disparate_impact: 0.3, demographic_parity_diff: 0.35,
          verdict: 'fail', risk_score: 80, marginal_di: [0.86, 0.9],
          warnings: [], reason: null,
        },
      },
      interpretation: null, pre_check: [], config: {},
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'm1-x' }} />);
  expect(await screen.findByText(/intersection|sous-groupe/i))
    .toBeInTheDocument();
  expect(screen.getAllByText(/etr/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/0\.86|0\.9/).length).toBeGreaterThan(0); // marginal DI
});

it('M1 result WITHOUT intersectional is unchanged (no matrix)', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'm1', code: 'AUD-2026-061', title: 'M1', status: 'done',
      module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
      decision_column: 'embauche', favorable_value: 'oui',
      privileged_value: 'h', created_at: '2026-05-22T00:00:00Z',
      completed_at: '2026-05-22T00:00:00Z',
      metrics: {
        groups: [{ value: 'h', n: 40, favorable: 28, selection_rate: 0.7,
          disparate_impact: 1.0 }, { value: 'f', n: 40, favorable: 22,
          selection_rate: 0.55, disparate_impact: 0.79 }],
        reference_value: 'h', disparate_impact: 0.79,
        demographic_parity_diff: 0.15, worst_group: 'f', verdict: 'warn',
        risk_score: 40, warnings: [],
      },
      interpretation: null, pre_check: [], config: {},
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'm1' }} />);
  expect(await screen.findByText('AUD-2026-061')).toBeInTheDocument();
  expect(screen.queryByText(/sous-groupe.*crois|matrice/i))
    .not.toBeInTheDocument();
});
```
(Match the real page render/`useAudit` idiom; reconcile the heading regexes with the headings you implement.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run audit-result-page`
Expected: FAIL — no intersectional section rendered.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/audits/[id]/page.tsx` (read the real M1 view branch): inside the M1 render branch, **after the existing M1 block** (and after sub-project #1's EO section), add a section rendered ONLY when `m.intersectional != null`: a **subgroup matrix** — render `intersectional.cells` as a table (or a primary×secondary grid) with each cell showing selection rate / DI / a traffic light (reuse the existing `StatusBadge`), the worst cell (`worst_primary × worst_secondary`) highlighted, the two **marginal DIs** (`marginal_di[0]`, `marginal_di[1]`) shown side by side for the contrast, the intersectional EO/Equalized Odds when present, and `warnings`/`reason` when set. When `m.intersectional` is absent the M1 view is byte-identical to today. Do not touch the M2/M3 views or the discriminator. The cell values are server-controlled and rendered as plain JSX text children (React auto-escapes them) — never inject raw HTML.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run audit-result-page` then full `pnpm --filter @auditiq/web test`
Expected: PASS (new + existing M1/M2/M3 result tests; connexion-flake-aware).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/app/audits/[id]/page.tsx" apps/web/__tests__/audit-result-page.test.tsx
git commit -m "feat(web): conditional intersectional subgroup matrix in M1 result"
```

---

### Task 11: Reporting — conditional M1 intersectional section (Excel + HTML)

**Files:**
- Modify: `apps/api/app/reporting/excel.py`
- Modify: `apps/api/app/reporting/html.py`
- Test: `apps/api/tests/api/test_excel_report.py`, `apps/api/tests/api/test_report_html.py`

- [ ] **Step 1: Write the failing tests**

Append M1+intersectional fixtures/tests to `test_excel_report.py` and `test_report_html.py`, mirroring the existing M1 report tests but with `metrics.intersectional` populated (cells, marginal_di, worst cell). Assert: the report contains the crossed subgroup values and the marginal-DI numbers; an `<b>`-style hostile `primary_value` is `_e`-escaped in the HTML; and a variant with `intersectional` absent produces a report with NO intersectional section but identical existing M1 content. Reproduce the file's existing M1 `AuditOut` builder verbatim and add the optional `intersectional` field; follow the existing M1 excel/html test assertions for the present/absent pair.

```python
def test_excel_m1_intersectional_section_present_and_absent():
    from app.reporting.excel import build_excel_report
    import io
    from openpyxl import load_workbook
    # build M1 AuditOut WITH metrics.intersectional -> wb1 ; WITHOUT -> wb0
    # assert a crossed value (e.g. "etr") in text(wb1) and not in text(wb0)
    # assert existing M1 cells (Disparate Impact) present in BOTH
    ...
```
(Replace the `...` by copying this file's existing M1 excel-test fixture/assertions and adding the intersectional assertions. Do the symmetric present/absent + HTML-escaping pair in `test_report_html.py`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_excel_report.py tests/api/test_report_html.py -k "m1 and intersection" -v`
Expected: FAIL — no intersectional section in the M1 report branch.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/reporting/excel.py` and `html.py` (read the real M1 branch): in the M1 detail branch, **after the existing M1 + sub-project-#1 EO output**, add an intersectional block rendered ONLY when `m.intersectional is not None`: the crossed-subgroup matrix (per-cell primary×secondary, n, rate, DI, verdict), the worst cell, the two marginal DIs labelled for contrast, intersectional EO/EOdds when present, and `warnings`/`reason` when set. HTML: every dynamic value through the existing `_e` escape helper. When absent → the M1 report is byte-identical. No `apps/pdf` change (PDF via the HTML path). Do not touch the M2/M3 report branches.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_excel_report.py tests/api/test_report_html.py -v`
Expected: PASS (new + existing M1/M2/M3 report tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/reporting/excel.py apps/api/app/reporting/html.py apps/api/tests/api/test_excel_report.py apps/api/tests/api/test_report_html.py
git commit -m "feat(api): conditional M1 intersectional section in Excel/HTML reports"
```

---

### Task 12: Full gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: API suite** — `cd apps/api && uv run python -m pytest -q` → PASS, 0 failed (the byte-identical/no-secondary tests are the regression guard).
- [ ] **Step 2: API lint + types** — `uv run python -m ruff check app tests` (clean) ; `uv run python -m mypy app` (`Success`). Likely fixups: `cast(Verdict, ...)` in the `_to_metrics_out` intersectional mapping; the optional nested `M1Result.intersectional`/`M1MetricsOut.intersectional` narrowing. Apply minimal precise fixes; never blanket `Any`.
- [ ] **Step 3: Web gate** — `pnpm --filter @auditiq/web test` (0 fail; connexion-flake-aware — re-run connexion isolated if only it fails) ; `pnpm --filter @auditiq/web typecheck` (clean) ; `pnpm --filter @auditiq/web lint` (exit 0, 0 errors).
- [ ] **Step 4: Scope + identity + chain sanity** — `git --no-pager diff --name-only origin/main..HEAD` confined to the in-scope files (+ plan + spec docs). `git --no-pager log --oneline origin/main..HEAD` — confirm **one commit per task** (T1–T11 + plan + spec); spot-check each task's signature file is in `git diff --stat origin/main..HEAD` (the subagent-driven orphaned-commit guard). `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — ONLY `franck-dilane1.fambou@epitech.digital` (else report the offending commits — controller normalizes via filter-branch before PR). No 142/142 whole-file CRLF churn.
- [ ] **Step 5: Commit any gate fixes** — `git add -A && git commit -m "chore: gate fixups for M1 intersectional"` (skip if Steps 1–3 already clean).

---

## Self-Review

**1. Spec coverage:** D1 extend-M1 → Tasks 1,3,5,6 (no new module). D2 exactly-2 → Task 1 (one optional secondary field), Task 2 (single cross). D3 sparsity skip+warn / <2→reason / never-raise / single-attr unchanged → Task 2 (`run_intersectional`) + Task 3 (single-attr path raises only for the missing/duplicate-secondary-column edge; `run_intersectional` never raises). D4 full metric set per cell + EO/EOdds + reference convention → Task 2. D5 worst-cell drives verdict + marginal DIs → Task 2 (`verdict`/`risk_score` from worst DI, `marginal_di`) + Task 3 (`run_m1` takes `intersectional.verdict`/`risk_score`). D6 pure `intersectional.py` composed in `run_m1`, optional `M1Result.intersectional` → Tasks 2,3. Architecture §1 engine → T1–T4; §2 DTO/service → T5,T6; §3 interpretation → T7; §4 web → T8,T9,T10; §5 reporting → T11. Acceptance 1 (matrix + marginals + EO) → T2/T6/T10; 2 (byte-identical absent) → T3/T6/T10/T11 byte-identical tests + T12; 3 (sparsity non-blocking) → T2; 4 (contrast: marginals pass, cross fails) → T3 `test_run_m1_intersectional_contrast_marginals_pass_cross_fails`; 5 (interpretation never raises) → T7; 6 (gates) → T12.

**2. Placeholder scan:** No TBD/"handle errors". Task 11 Step 1 has a `...`/"copy the existing M1 report fixture verbatim" instruction — a deliberate bounded reuse instruction (the M1 report-test fixture is large and file-specific; copying it is more reliable than re-deriving), identical to the proven sub-project-#1 Task-12 style. Tasks 5–11 say "read the real X" — precise intended-change specs against real anchors, the proven M2/M3/sub-#1 style, not vague placeholders. Task 9/10 instruct mirroring the real existing M1 test setup verbatim (sub-project #1's T10/T11 idiom).

**3. Type consistency:** `M1Config.secondary_protected_attribute`/`secondary_privileged_value` (T1) ↔ used by `run_m1`/`run_intersectional` (T2,T3) ↔ set by `run_m1_audit` from `AuditCreate` (T5,T6) ↔ web type (T8,T9). `IntersectionalCell`/`IntersectionalResult` (T1) ↔ produced by `run_intersectional` (T2) ↔ attached by `run_m1` (T3) ↔ exported (T4) ↔ mapped to `IntersectionalOut`/`IntersectionalCellOut` (T5,T6) ↔ web `IntersectionalOut` (T8) ↔ rendered (T10,T11). Field names are identical across the engine dataclass and the DTO (`primary_value`, `secondary_value`, `n`, `favorable`, `selection_rate`, `disparate_impact`, `verdict`, `tpr`, `fpr`; `cells`, `reference_primary/secondary`, `worst_primary/secondary`, `disparate_impact`, `demographic_parity_diff`, `verdict`, `risk_score`, `marginal_di`, `equal_opportunity_diff`, `equalized_odds_diff`, `*_verdict`, `warnings`, `reason`). `metrics.py` helpers reused by `run_intersectional` (`decide_verdict`, `risk_score`, `gap_verdict`, `group_confusion`, `truelabel_metrics`) are the real sub-project-#1 names — Task 2 instructs verifying them against the real `metrics.py`. `run_m1`'s pre-existing locals (`verdict`, `score`, `overall_di`, `dpd`, `warnings`, `worst_group`, `reference`, `group_stats`, the #1 `eo_*`/`tl_reason`) are reused, not redefined.
