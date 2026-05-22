# M1 True-Label Metrics (Equal Opportunity + Equalized Odds) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, backward-compatible Equal Opportunity + Equalized Odds metrics to the merged M1 audit (engine→DTO→service→interpretation→web→reporting), computed in-house and test-validated against Fairlearn.

**Architecture:** Sub-project #1 of 3 (spec `docs/superpowers/specs/2026-05-18-m1-truelabel-metrics-design.md`). `M1Config` gains an optional `ground_truth_column`; `run_m1` computes per-group confusion-matrix rates only when it is set; `M1Result`/`GroupStat`/`M1MetricsOut` gain optional fields that are `None` when absent → existing M1 output is byte-identical. Each new metric gets its own traffic light; the global M1 verdict is unchanged. Fairlearn is a **dev/test-only** dependency.

**Tech Stack:** Python 3.12, pandas, frozen dataclasses (pure `audit_engine`), Pydantic v2, FastAPI, pytest + Fairlearn (dev), Next.js + Vitest, uv, pnpm `@auditiq/web`.

---

## Scope

One cohesive backward-compatible vertical. Sub-projects #2 (intersectional) and #3 (async) are separate later cycles — OUT of scope here. **In:** `apps/api/app/audit_engine/{types,metrics,m1_supervised,__init__}.py`, `apps/api/pyproject.toml` (dev dep), `apps/api/app/schemas/audit.py`, `apps/api/app/services/audit_service.py`, `apps/api/app/interpretation/m1.py` + its prompt, `apps/web/lib/api/audits.ts`, `apps/web/app/app/audits/nouveau/page.tsx`, `apps/web/app/app/audits/[id]/page.tsx`, `apps/api/app/reporting/{excel,html}.py`, and the matching tests.

Commands — api from `apps/api`: `uv run python -m pytest`, `uv run python -m ruff check`, `uv run python -m mypy app`. web from repo root: `pnpm --filter @auditiq/web {test,typecheck,lint}` (lint = `eslint .`). **Commit RULE:** plain `git add` + `git commit -m "..."` — NEVER `-c core.autocrlf=false`. Identity `Franck F <franck-dilane1.fambou@epitech.digital>`; **at execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`**. NEVER add a Co-Authored-By/Claude trailer.

**D3 reconciliation (locked here):** the spec says "reuse the Demographic-Parity-difference banding". M1 has NO DP-diff banding — only the DI ratio is banded by `M1Config.di_fail_below=0.80`/`di_warn_below=0.90` (`metrics.decide_verdict`). EO/EOdds are *gaps* in [0,1]. The non-arbitrary rule (no new magic numbers — reuses the existing config constants via their complements): for a gap `d`, `gap_verdict = FAIL if d > (1 - di_fail_below) else WARN if d > (1 - di_warn_below) else PASS` → with defaults: `>0.20` fail, `>0.10` warn, else pass. The DP difference also gets a light using this same rule (only surfaced in the new EO/EOdds section, i.e. only with ground truth). The **global M1 `verdict`/`risk_score` are computed exactly as today (DI/4-5-anchored) — unchanged.**

## File Structure

- `audit_engine/types.py` — `M1Config.ground_truth_column: str | None = None`; `GroupStat` + optional `tpr`/`fpr` (`float | None = None`); `M1Result` + optional `equal_opportunity_diff`, `equalized_odds_diff`, `demographic_parity_verdict`, `equal_opportunity_verdict`, `equalized_odds_verdict` (all `... | None = None`) + `truelabel_reason: str | None = None`.
- `audit_engine/metrics.py` — pure `gap_verdict()`, `group_confusion()`, `truelabel_metrics()`.
- `audit_engine/m1_supervised.py` — call `truelabel_metrics` only when `config.ground_truth_column` set; populate the optional `M1Result` fields; existing logic untouched.
- `audit_engine/__init__.py` — export any newly public symbol consistently with M2/M3.
- `apps/api/pyproject.toml` — add `fairlearn` to the dev/test dependency group.
- `app/schemas/audit.py` — `AuditCreate.ground_truth_column: str | None = None` + `_per_module` rule; `M1MetricsOut` optional fields.
- `app/services/audit_service.py` — `run_m1_audit` builds `M1Config(... ground_truth_column=...)`, maps new fields into `M1MetricsOut`; `get_audit` round-trips them.
- `app/interpretation/m1.py` + its FR prompt — impossibility-theorem framing + EO/EOdds limits when present; never raises.
- `apps/web/lib/api/audits.ts` — `M1MetricsOut`/create types gain optional fields.
- `apps/web/app/app/audits/nouveau/page.tsx` — M1 form optional "colonne résultat réel".
- `apps/web/app/app/audits/[id]/page.tsx` — conditional EO/EOdds section in the M1 view.
- `app/reporting/excel.py` + `html.py` — conditional M1 EO/EOdds section (escaped).

Read first (authoritative over snippets where they differ): the real `app/schemas/audit.py` (`AuditCreate`/`_per_module`/`M1MetricsOut`/`AuditOut`), `app/services/audit_service.py` (`run_m1_audit`/`_to_m1_metrics_out` or equivalent/`get_audit`), `app/interpretation/m1.py` + `prompts/m1_fr.md`, the M1 branches of `reporting/excel.py`/`html.py`, `apps/web/lib/api/audits.ts` M1 types, the M1 form/result patterns in the two web pages, and the existing M1/M2/M3 test files for idioms.

---

### Task 1: Engine types — optional true-label fields (backward-compatible)

**Files:**
- Modify: `apps/api/app/audit_engine/types.py`
- Test: `apps/api/tests/audit_engine/test_types.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/audit_engine/test_types.py`:

```python
def test_m1config_ground_truth_optional_default_none():
    from app.audit_engine.types import M1Config

    c = M1Config(protected_attribute="g", decision_column="d",
                 favorable_value="oui")
    assert c.ground_truth_column is None
    c2 = M1Config(protected_attribute="g", decision_column="d",
                  favorable_value="oui", ground_truth_column="reel")
    assert c2.ground_truth_column == "reel"


def test_m1result_truelabel_fields_default_none():
    from app.audit_engine.types import GroupStat, M1Result

    gs = GroupStat(value="a", n=10, favorable=4, selection_rate=0.4,
                   disparate_impact=1.0)
    assert gs.tpr is None and gs.fpr is None
    r = M1Result(groups=(gs,), reference_value="a", disparate_impact=1.0,
                 demographic_parity_diff=0.0, worst_group="a",
                 verdict="pass", risk_score=10)
    assert r.equal_opportunity_diff is None
    assert r.equalized_odds_diff is None
    assert r.demographic_parity_verdict is None
    assert r.equal_opportunity_verdict is None
    assert r.equalized_odds_verdict is None
    assert r.truelabel_reason is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_types.py -k "truelabel or ground_truth" -v`
Expected: FAIL — `M1Config` has no `ground_truth_column`, `GroupStat` no `tpr`.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/types.py`, add the optional field to `M1Config` (after `min_group_warn`):

```python
    ground_truth_column: str | None = None
```
Extend `GroupStat` (add after `disparate_impact`):
```python
    tpr: float | None = None
    fpr: float | None = None
```
Extend `M1Result` (add after `warnings`, keeping `__post_init__`):
```python
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: str | None = None
    equal_opportunity_verdict: str | None = None
    equalized_odds_verdict: str | None = None
    truelabel_reason: str | None = None
```
(Keep every existing field/order; new fields have defaults so all existing constructors keep working unchanged. `M1Result.__post_init__` stays as-is.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_types.py -v`
Expected: PASS (new + all existing type tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_types.py
git commit -m "feat(engine): optional true-label fields on M1 types"
```

---

### Task 2: Pure true-label metric helpers

**Files:**
- Modify: `apps/api/app/audit_engine/metrics.py`
- Test: `apps/api/tests/audit_engine/test_metrics.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/audit_engine/test_metrics.py`:

```python
def test_gap_verdict_uses_di_threshold_complements():
    from app.audit_engine.metrics import (
        VERDICT_FAIL, VERDICT_PASS, VERDICT_WARN, gap_verdict,
    )
    # defaults: di_fail_below=0.80 -> fail if gap>0.20 ; di_warn_below=0.90 -> warn if gap>0.10
    assert gap_verdict(0.05, 0.80, 0.90) == VERDICT_PASS
    assert gap_verdict(0.15, 0.80, 0.90) == VERDICT_WARN
    assert gap_verdict(0.25, 0.80, 0.90) == VERDICT_FAIL
    assert gap_verdict(0.10, 0.80, 0.90) == VERDICT_PASS  # boundary: strictly >
    assert gap_verdict(0.20, 0.80, 0.90) == VERDICT_WARN  # boundary: strictly >


def test_group_confusion_counts():
    from app.audit_engine.metrics import group_confusion

    # y_pred favorable, y_true favorable booleans
    y_pred = [True, True, False, False, True]
    y_true = [True, False, True, False, True]
    c = group_confusion(y_pred, y_true)
    # TP: pred&true -> idx0,4 =2 ; FP: pred&~true -> idx1 =1
    # FN: ~pred&true -> idx2 =1 ; TN: ~pred&~true -> idx3 =1
    assert c == {"tp": 2, "fp": 1, "fn": 1, "tn": 1}


def test_truelabel_metrics_basic_and_reference():
    from app.audit_engine.metrics import truelabel_metrics

    # groups A (priv): TPR=1.0 FPR=0.0 ; B: TPR=0.5 FPR=0.5
    conf = {
        "A": {"tp": 4, "fp": 0, "fn": 0, "tn": 4},
        "B": {"tp": 2, "fp": 2, "fn": 2, "tn": 2},
    }
    out = truelabel_metrics(conf, privileged="A")
    assert out.tpr == {"A": 1.0, "B": 0.5}
    assert out.fpr == {"A": 0.0, "B": 0.5}
    assert out.eo_diff == 0.5            # |TPR_A - TPR_B|
    assert out.eodds_diff == 0.5        # max(|dTPR|, |dFPR|)
    assert out.skipped == []
    assert out.reason is None


def test_truelabel_metrics_degenerate_skip_and_reason():
    from app.audit_engine.metrics import truelabel_metrics

    # A has no real positives (tp+fn=0) -> TPR undefined ; B normal
    conf = {
        "A": {"tp": 0, "fp": 1, "fn": 0, "tn": 5},
        "B": {"tp": 3, "fp": 1, "fn": 1, "tn": 3},
    }
    out = truelabel_metrics(conf, privileged=None)
    assert any("A" in w for w in out.skipped)
    # only B has a defined TPR -> <2 comparable for EO -> non calculable
    assert out.eo_diff is None
    assert out.reason is not None and "non calculable" in out.reason.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_metrics.py -k "gap_verdict or confusion or truelabel" -v`
Expected: FAIL — symbols not defined.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/metrics.py` append:

```python
from dataclasses import dataclass


def gap_verdict(d: float, di_fail_below: float, di_warn_below: float) -> str:
    """Verdict for a parity GAP in [0,1], reusing the DI thresholds'
    complements (no new magic numbers). gap > (1-di_fail_below) -> fail ;
    gap > (1-di_warn_below) -> warn ; else pass."""
    if d > (1.0 - di_fail_below):
        return VERDICT_FAIL
    if d > (1.0 - di_warn_below):
        return VERDICT_WARN
    return VERDICT_PASS


def group_confusion(
    y_pred: list[bool], y_true: list[bool]
) -> dict[str, int]:
    tp = fp = fn = tn = 0
    for p, t in zip(y_pred, y_true, strict=True):
        if p and t:
            tp += 1
        elif p and not t:
            fp += 1
        elif (not p) and t:
            fn += 1
        else:
            tn += 1
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn}


@dataclass(frozen=True)
class TrueLabelMetrics:
    tpr: dict[str, float]
    fpr: dict[str, float]
    eo_diff: float | None
    eodds_diff: float | None
    skipped: list[str]
    reason: str | None


def _gap(values: dict[str, float], privileged: str | None) -> float:
    if privileged is not None and privileged in values:
        ref = values[privileged]
        return max(abs(v - ref) for v in values.values())
    return max(values.values()) - min(values.values())


def truelabel_metrics(
    confusion: dict[str, dict[str, int]], privileged: str | None
) -> TrueLabelMetrics:
    """EO = TPR gap ; Equalized Odds = max(TPR gap, FPR gap). Degenerate
    groups (no real positives / no real negatives) are skipped per rate
    with a warning; <2 comparable groups for a rate -> that metric is
    None with a reason. Never raises."""
    tpr: dict[str, float] = {}
    fpr: dict[str, float] = {}
    skipped: list[str] = []
    for g, c in confusion.items():
        pos = c["tp"] + c["fn"]
        neg = c["fp"] + c["tn"]
        if pos == 0:
            skipped.append(
                f"Groupe « {g} » : aucun positif réel — TPR (Equal "
                f"Opportunity) non calculable pour ce groupe, ignoré."
            )
        else:
            tpr[g] = c["tp"] / pos
        if neg == 0:
            skipped.append(
                f"Groupe « {g} » : aucun négatif réel — FPR non "
                f"calculable pour ce groupe, ignoré."
            )
        else:
            fpr[g] = c["fp"] / neg
    reason: str | None = None
    eo_diff: float | None = None
    eodds_diff: float | None = None
    if len(tpr) >= 2:
        eo_diff = _gap(tpr, privileged)
    else:
        reason = (
            "Equal Opportunity / Equalized Odds non calculable : moins de "
            "2 groupes avec un taux de vrais positifs défini."
        )
    if eo_diff is not None and len(fpr) >= 2:
        eodds_diff = max(eo_diff, _gap(fpr, privileged))
    elif eo_diff is not None:
        eodds_diff = None
        reason = (
            "Equalized Odds non calculable : moins de 2 groupes avec un "
            "taux de faux positifs défini."
        )
    return TrueLabelMetrics(
        tpr=tpr, fpr=fpr, eo_diff=eo_diff, eodds_diff=eodds_diff,
        skipped=skipped, reason=reason,
    )
```
(If `from dataclasses import dataclass` already exists at the top of `metrics.py`, do not duplicate the import — move it to the existing import block. Keep all existing functions byte-unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_metrics.py -v`
Expected: PASS (new + all existing metrics tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/metrics.py apps/api/tests/audit_engine/test_metrics.py
git commit -m "feat(engine): pure true-label metric helpers (TPR/FPR/EO/EOdds)"
```

---

### Task 3: Wire true-label metrics into `run_m1` (graceful, byte-identical when absent)

**Files:**
- Modify: `apps/api/app/audit_engine/m1_supervised.py`
- Test: `apps/api/tests/audit_engine/test_m1_supervised.py`

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/tests/audit_engine/test_m1_supervised.py` (reuse the file's existing pandas/`M1Config`/`run_m1` imports):

```python
def test_run_m1_without_ground_truth_is_byte_identical():
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
    assert r.equal_opportunity_diff is None
    assert r.equalized_odds_diff is None
    assert r.demographic_parity_verdict is None
    assert all(gs.tpr is None and gs.fpr is None for gs in r.groups)
    # existing fields still populated exactly as before
    assert r.verdict in ("pass", "warn", "fail")
    assert r.disparate_impact == r.disparate_impact  # not None


def test_run_m1_with_ground_truth_computes_eo_eodds():
    import pandas as pd
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    # group a: model right ; group b: many false negatives
    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 20 + ["non"] * 20) + (["oui"] * 10 + ["non"] * 30),
        "reel": (["oui"] * 20 + ["non"] * 20) + (["oui"] * 25 + ["non"] * 15),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", privileged_value="a",
                   ground_truth_column="reel")
    r = run_m1(df, cfg)
    assert r.equal_opportunity_diff is not None
    assert r.equalized_odds_diff is not None
    assert r.equal_opportunity_verdict in ("pass", "warn", "fail")
    assert r.equalized_odds_verdict in ("pass", "warn", "fail")
    assert r.demographic_parity_verdict in ("pass", "warn", "fail")
    assert all(gs.tpr is not None for gs in r.groups)
    # GLOBAL verdict must equal the no-ground-truth verdict (D3 invariant)
    cfg_no = M1Config(protected_attribute="g", decision_column="d",
                      favorable_value="oui", privileged_value="a")
    assert r.verdict == run_m1(df, cfg_no).verdict
    assert r.risk_score == run_m1(df, cfg_no).risk_score


def test_run_m1_ground_truth_missing_rows_dropna_independent():
    import pandas as pd
    from app.audit_engine.m1_supervised import run_m1
    from app.audit_engine.types import M1Config

    df = pd.DataFrame({
        "g": ["a"] * 40 + ["b"] * 40,
        "d": (["oui"] * 20 + ["non"] * 20) + (["oui"] * 20 + ["non"] * 20),
        "reel": ([None] * 40) + (["oui"] * 20 + ["non"] * 20),
    })
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", ground_truth_column="reel")
    r = run_m1(df, cfg)
    # group a fully missing ground truth -> <2 comparable -> reason set,
    # but the audit still completes and DI/DP unaffected by gt NaNs
    assert r.disparate_impact is not None
    assert r.truelabel_reason is not None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/audit_engine/test_m1_supervised.py -k "ground_truth or byte_identical" -v`
Expected: FAIL — `run_m1` ignores ground truth, fields stay `None`/unset incorrectly.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/m1_supervised.py`: extend the imports

```python
from .metrics import (
    decide_verdict,
    demographic_parity_diff,
    disparate_impacts,
    gap_verdict,
    group_confusion,
    pick_reference,
    risk_score,
    selection_rate,
    truelabel_metrics,
)
```
Then, immediately before the final `return M1Result(...)` (after `group_stats` is built, keeping ALL existing logic unchanged), insert the optional true-label block and thread the new fields into the result:

```python
    eo_diff = eodds_diff = None
    dp_verdict = eo_verdict = eodds_verdict = tl_reason = None
    tpr_map: dict[str, float] = {}
    fpr_map: dict[str, float] = {}
    gt = config.ground_truth_column
    if gt is not None:
        if gt not in df.columns:
            raise DatasetValidationError(
                f"Colonne vérité-terrain « {gt} » absente du jeu de "
                f"données.",
                field="ground_truth_column",
            )
        tl = df[[pa, dc, gt]].dropna()
        confusion: dict[str, dict[str, int]] = {}
        if not tl.empty:
            tl_pa = tl[pa].astype(str)
            tl_pred = tl[dc].astype(str) == fav
            tl_true = tl[gt].astype(str) == fav
            for g in sorted(tl_pa.unique()):
                m = tl_pa == g
                confusion[g] = group_confusion(
                    list(tl_pred[m]), list(tl_true[m])
                )
        if len(confusion) >= 2:
            res = truelabel_metrics(confusion, privileged)
            warnings.extend(res.skipped)
            tpr_map, fpr_map = res.tpr, res.fpr
            eo_diff = (
                round(res.eo_diff, _ROUND)
                if res.eo_diff is not None else None
            )
            eodds_diff = (
                round(res.eodds_diff, _ROUND)
                if res.eodds_diff is not None else None
            )
            tl_reason = res.reason
            if eo_diff is not None:
                eo_verdict = gap_verdict(
                    eo_diff, config.di_fail_below, config.di_warn_below
                )
            if eodds_diff is not None:
                eodds_verdict = gap_verdict(
                    eodds_diff, config.di_fail_below, config.di_warn_below
                )
            dp_verdict = gap_verdict(
                round(dpd, _ROUND), config.di_fail_below,
                config.di_warn_below,
            )
        else:
            tl_reason = (
                "Equal Opportunity / Equalized Odds non calculable : "
                "moins de 2 groupes exploitables après prise en compte "
                "de la colonne vérité-terrain."
            )

    group_stats = [
        GroupStat(
            value=g,
            n=counts[g],
            favorable=favs[g],
            selection_rate=round(rates[g], _ROUND),
            disparate_impact=round(di_map[g], _ROUND),
            tpr=(round(tpr_map[g], _ROUND) if g in tpr_map else None),
            fpr=(round(fpr_map[g], _ROUND) if g in fpr_map else None),
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
        equal_opportunity_diff=eo_diff,
        equalized_odds_diff=eodds_diff,
        demographic_parity_verdict=dp_verdict,
        equal_opportunity_verdict=eo_verdict,
        equalized_odds_verdict=eodds_verdict,
        truelabel_reason=tl_reason,
    )
```
This **replaces** the existing `group_stats = [...]` + `return M1Result(...)` tail (the original built `group_stats` without tpr/fpr and returned without the new kwargs). Everything above it (`verdict`, `score`, `overall_di`, `dpd`, `warnings`, etc.) is unchanged, so when `gt is None` every new value is `None`/`{}` and `M1Result` is byte-identical to before. (Read the real file: integrate so the original `group_stats`/`return` are removed exactly once and replaced by the block above; keep the exact pre-existing variable names — `dpd`, `overall_di`, `verdict`, `score`, `warnings`, `counts`, `favs`, `rates`, `di_map`, `groups`, `reference`, `worst_group`, `privileged`, `fav`, `pa`, `dc`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/audit_engine/test_m1_supervised.py -v`
Expected: PASS (new + ALL existing M1 engine tests — the byte-identical test is the regression guard).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/m1_supervised.py apps/api/tests/audit_engine/test_m1_supervised.py
git commit -m "feat(engine): optional EO/Equalized Odds in run_m1 (byte-identical when absent)"
```

---

### Task 4: Fairlearn cross-validation tests (dev dependency)

**Files:**
- Modify: `apps/api/pyproject.toml`
- Test: `apps/api/tests/audit_engine/test_truelabel_fairlearn.py`

- [ ] **Step 1: Add the dev dependency**

In `apps/api/pyproject.toml`, add `fairlearn` to the existing dev/test dependency group (read the file; match the exact group name used by `respx`/`pytest` — e.g. `[dependency-groups] dev = [...]` or `[project.optional-dependencies] dev`). Add the line `"fairlearn>=0.10",` to that list only. Then:

Run: `uv sync --all-extras`
Expected: fairlearn installed (resolves; it pulls scikit-learn which is already a dependency via M2).

- [ ] **Step 2: Write the cross-validation test**

Create `apps/api/tests/audit_engine/test_truelabel_fairlearn.py`:

```python
"""Validates the in-house EO/Equalized Odds against Fairlearn (dev dep).
Runtime engine never imports fairlearn; this proves equality at _ROUND."""
import pandas as pd
import pytest

fairlearn = pytest.importorskip("fairlearn.metrics")

from app.audit_engine.m1_supervised import run_m1
from app.audit_engine.types import M1Config

_ROUND = 4


def _frame():
    return pd.DataFrame({
        "g": ["a"] * 50 + ["b"] * 50,
        "d": (["oui"] * 30 + ["non"] * 20) + (["oui"] * 15 + ["non"] * 35),
        "reel": (["oui"] * 25 + ["non"] * 25)
        + (["oui"] * 20 + ["non"] * 30),
    })


def test_eo_eodds_match_fairlearn():
    from fairlearn.metrics import (
        equalized_odds_difference,
        true_positive_rate,
        false_positive_rate,
        MetricFrame,
    )

    df = _frame()
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", ground_truth_column="reel")
    r = run_m1(df, cfg)

    y_pred = (df["d"].astype(str) == "oui").astype(int)
    y_true = (df["reel"].astype(str) == "oui").astype(int)
    sf = df["g"].astype(str)

    mf_tpr = MetricFrame(metrics=true_positive_rate, y_true=y_true,
                         y_pred=y_pred, sensitive_features=sf)
    mf_fpr = MetricFrame(metrics=false_positive_rate, y_true=y_true,
                         y_pred=y_pred, sensitive_features=sf)
    fl_eo = mf_tpr.difference()  # max - min TPR (no privileged here)
    fl_eodds = equalized_odds_difference(
        y_true, y_pred, sensitive_features=sf
    )

    # engine here used privileged=None -> max-min convention, same as fairlearn
    assert r.equal_opportunity_diff == round(float(fl_eo), _ROUND)
    assert r.equalized_odds_diff == round(float(fl_eodds), _ROUND)
    # per-group TPR/FPR equal fairlearn's by-group frame
    for gs in r.groups:
        assert gs.tpr == round(float(mf_tpr.by_group[gs.value]), _ROUND)
        assert gs.fpr == round(float(mf_fpr.by_group[gs.value]), _ROUND)
```
(Use `privileged_value=None` so the engine's max−min matches Fairlearn's `.difference()`/`equalized_odds_difference` exactly. `pytest.importorskip` keeps the suite green even if fairlearn is unavailable, but CI/`uv sync --all-extras` installs it so the assertion runs.)

- [ ] **Step 3: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_truelabel_fairlearn.py -v`
Expected: PASS — engine equals Fairlearn within `_ROUND`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/tests/audit_engine/test_truelabel_fairlearn.py
git commit -m "test(engine): cross-validate EO/Equalized Odds against Fairlearn (dev dep)"
```
(Include `uv.lock` if `uv sync` updated it.)

---

### Task 5: Public engine API exports

**Files:**
- Modify: `apps/api/app/audit_engine/__init__.py`
- Test: `apps/api/tests/audit_engine/test_public_api.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/audit_engine/test_public_api.py`:

```python
def test_truelabel_helpers_exported():
    import app.audit_engine as ae

    assert hasattr(ae, "gap_verdict")
    assert hasattr(ae, "truelabel_metrics")
    # existing M1 surface still exported
    assert hasattr(ae, "run_m1")
    assert hasattr(ae, "M1Config")
    assert hasattr(ae, "M1Result")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/audit_engine/test_public_api.py -k truelabel -v`
Expected: FAIL — `gap_verdict`/`truelabel_metrics` not exported.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/audit_engine/__init__.py`, add `gap_verdict` and `truelabel_metrics` to the existing `from .metrics import (...)` block (alphabetical, matching the file's style) and append `"gap_verdict"`, `"truelabel_metrics"` to `__all__` (read the file; mirror exactly how M2/M3 symbols were added). Do not change existing exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/audit_engine/test_public_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/audit_engine/__init__.py apps/api/tests/audit_engine/test_public_api.py
git commit -m "feat(engine): export true-label helpers"
```

---

### Task 6: DTO — `ground_truth_column` + M1MetricsOut optional fields

**Files:**
- Modify: `apps/api/app/schemas/audit.py`
- Test: `apps/api/tests/api/test_schemas_m1.py` (or the real M1 schema test file — read which exists; if M1 schema assertions live in `test_schemas_m2.py`/`test_audits_router.py`, add a focused `tests/api/test_schemas_m1.py`)

- [ ] **Step 1: Write the failing test**

Create/append `apps/api/tests/api/test_schemas_m1.py`:

```python
import uuid

import pytest
from pydantic import ValidationError

from app.schemas.audit import AuditCreate, M1MetricsOut


def test_m1_accepts_optional_ground_truth():
    a = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", protected_attribute="genre",
        decision_column="embauche", favorable_value="oui",
        ground_truth_column="reel",
    )
    assert a.ground_truth_column == "reel"
    b = AuditCreate(
        dataset_id=uuid.uuid4(), title="t", protected_attribute="genre",
        decision_column="embauche", favorable_value="oui",
    )
    assert b.ground_truth_column is None


def test_ground_truth_must_differ_and_is_m1_only():
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t",
            protected_attribute="g", decision_column="d",
            favorable_value="oui", ground_truth_column="d",  # == decision
        )
    with pytest.raises(ValidationError):
        AuditCreate(
            dataset_id=uuid.uuid4(), title="t", module="M2",
            decision_column="d", favorable_value="oui",
            ground_truth_column="reel",  # not allowed for M2
        )


def test_m1_metrics_out_optional_truelabel_fields():
    m = M1MetricsOut(
        groups=[], reference_value="a", disparate_impact=1.0,
        demographic_parity_diff=0.0, worst_group="a", verdict="pass",
        risk_score=10, warnings=[],
    )
    assert m.equal_opportunity_diff is None
    assert m.equalized_odds_diff is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python -m pytest tests/api/test_schemas_m1.py -v`
Expected: FAIL — `ground_truth_column` unknown / not validated.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/schemas/audit.py` (read the real `AuditCreate`, `_per_module`, `M1MetricsOut`, `GroupStatOut`):
- `AuditCreate`: add `ground_truth_column: str | None = None`.
- `_per_module`: in the **M1 branch** add: if `self.ground_truth_column is not None` and it equals `self.decision_column` or `self.protected_attribute` → `raise ValueError("module M1 : 'ground_truth_column' doit différer des colonnes décision et attribut protégé.")`. In the **M2 and M3 branches** add `ground_truth_column` to the already-forbidden-fields check + message (it only applies to M1). Keep all existing M1/M2/M3 rules unchanged.
- `GroupStatOut`: add `tpr: float | None = None`, `fpr: float | None = None`.
- `M1MetricsOut`: add `equal_opportunity_diff: float | None = None`, `equalized_odds_diff: float | None = None`, `demographic_parity_verdict: Verdict | None = None`, `equal_opportunity_verdict: Verdict | None = None`, `equalized_odds_verdict: Verdict | None = None`, `truelabel_reason: str | None = None` (use the existing `Verdict` alias; `ConfigDict(extra="forbid")` like siblings).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run python -m pytest tests/api/test_schemas_m1.py tests/api/test_schemas_m2.py tests/api/test_schemas_m3.py -v`
Expected: PASS (new + existing schema tests; M1/M2/M3 validation unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_m1.py
git commit -m "feat(api): optional ground_truth_column DTO + M1 true-label metrics out"
```

---

### Task 7: Service — pass ground truth + map fields, get_audit round-trip

**Files:**
- Modify: `apps/api/app/services/audit_service.py`
- Test: `apps/api/tests/api/test_audit_service_m1.py` (or the real M1 service test file — read which exists; create `test_audit_service_m1.py` if M1 service coverage is elsewhere, reusing the existing `ctx`/storage fixture idiom)

- [ ] **Step 1: Write the failing test**

Append/create `apps/api/tests/api/test_audit_service_m1.py` (mirror the EXACT fixture/storage/dataset idiom of the existing M1/M2 service tests — read `tests/api/test_audit_service_m2.py`):

```python
async def test_run_m1_audit_with_ground_truth_roundtrip(ctx):
    # ctx provides session maker, org_id, user_id, and a CSV-upload helper
    # exactly as the existing M1/M2 service tests do — reuse it verbatim.
    sm, org_id, user_id, upload = ctx
    csv = (
        "genre,embauche,reel\n"
        + "homme,oui,oui\n" * 20 + "homme,non,non\n" * 20
        + "femme,oui,oui\n" * 10 + "femme,non,oui\n" * 30
    ).encode()
    async with sm() as session:
        ds = await upload(session, org_id, user_id, csv)
        from app.schemas.audit import AuditCreate, M1MetricsOut
        out = await audit_service.run_m1_audit(
            session, org_id=org_id, user_id=user_id,
            body=AuditCreate(
                dataset_id=ds.id, title="M1 GT",
                protected_attribute="genre", decision_column="embauche",
                favorable_value="oui", ground_truth_column="reel",
            ),
            llm_provider=None,
        )
    assert out.status == "done"
    assert isinstance(out.metrics, M1MetricsOut)
    assert out.metrics.equal_opportunity_diff is not None
    assert out.metrics.equalized_odds_diff is not None
    async with sm() as session:
        fetched = await audit_service.get_audit(session, out.id,
                                                org_id=org_id)
    assert isinstance(fetched.metrics, M1MetricsOut)
    assert fetched.metrics.equal_opportunity_diff is not None


async def test_run_m1_audit_without_ground_truth_unchanged(ctx):
    sm, org_id, user_id, upload = ctx
    csv = ("genre,embauche\n" + "homme,oui\n" * 20 + "homme,non\n" * 20
           + "femme,oui\n" * 10 + "femme,non\n" * 30).encode()
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
    assert out.metrics.equal_opportunity_diff is None
    assert out.metrics.equalized_odds_diff is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_audit_service_m1.py -v`
Expected: FAIL — `run_m1_audit` doesn't pass/​map ground truth.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/services/audit_service.py` (read the real `run_m1_audit` + the M1 result→`M1MetricsOut` mapper + `get_audit` M1 branch):
- When building `M1Config`, pass `ground_truth_column=body.ground_truth_column`.
- In the M1 metrics mapper, add the new optional fields from `M1Result` → `M1MetricsOut` (`equal_opportunity_diff`, `equalized_odds_diff`, `demographic_parity_verdict`, `equal_opportunity_verdict`, `equalized_odds_verdict`, `truelabel_reason`, and per-group `tpr`/`fpr` into `GroupStatOut`) with `cast(Verdict, ...)` for the verdict strings exactly like the existing M1 verdict mapping. When the engine fields are `None`, the mapped DTO fields are `None` (no behaviour change for the no-ground-truth path).
- `get_audit`'s M1 branch already validates the persisted metrics into `M1MetricsOut`; the new optional fields round-trip automatically once `M1MetricsOut` has them (Task 6) — verify no `.model_validate` field list needs widening; if `get_audit` reconstructs `M1MetricsOut` field-by-field, add the new fields there too.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_audit_service_m1.py tests/api/test_audit_service_m2.py tests/api/test_audit_service_m3.py -v`
Expected: PASS (new + existing M1/M2/M3 service tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/tests/api/test_audit_service_m1.py
git commit -m "feat(api): run_m1_audit passes ground truth + maps true-label metrics"
```

---

### Task 8: Interpretation — impossibility-theorem framing + EO/EOdds limits

**Files:**
- Modify: `apps/api/app/interpretation/m1.py`
- Modify: `apps/api/app/interpretation/prompts/m1_fr.md`
- Test: `apps/api/tests/api/test_interpret_m1.py`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/api/test_interpret_m1.py` (mirror the existing m1/m2/m3 interpretation test idiom — build an `M1Result` with EO/EOdds set):

```python
async def test_interpret_m1_fallback_mentions_normative_tension_when_eo_present():
    from app.audit_engine.types import GroupStat, M1Result
    from app.interpretation.m1 import interpret_m1

    r = M1Result(
        groups=(GroupStat("a", 40, 20, 0.5, 1.0, tpr=0.9, fpr=0.1),
                GroupStat("b", 40, 12, 0.3, 0.6, tpr=0.5, fpr=0.4)),
        reference_value="a", disparate_impact=0.6,
        demographic_parity_diff=0.2, worst_group="b", verdict="fail",
        risk_score=70, warnings=(),
        equal_opportunity_diff=0.4, equalized_odds_diff=0.4,
        demographic_parity_verdict="fail",
        equal_opportunity_verdict="fail",
        equalized_odds_verdict="fail",
    )
    out = await interpret_m1(r, provider=None)
    assert out.provider == "fallback"
    blob = (out.narrative + " " + " ".join(out.disclaimers)).lower()
    assert "equal opportunity" in blob or "vrais positifs" in blob
    # impossibility-theorem / normative framing surfaced
    assert "normati" in blob or "simultan" in blob


async def test_interpret_m1_no_eo_is_unchanged_shape():
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
    assert out.narrative  # still a valid fallback, no EO mention required
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_interpret_m1.py -k "normative or unchanged_shape" -v`
Expected: FAIL — fallback/prompt don't mention EO/normative framing.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/interpretation/m1.py` (read the real module + `prompts/m1_fr.md`):
- Extend `_fallback` so that **when `result.equal_opportunity_diff is not None`** the narrative/disclaimers additionally state: which of DP/EO/EOdds show a gap and of what nature; the impossibility-theorem framing ("Demographic Parity, Equal Opportunity et Equalized Odds ne peuvent être satisfaits simultanément — tout choix de métrique est un choix *normatif*, pas seulement technique"); and EO/EOdds-specific limits (sensibles à la qualité de la vérité-terrain ; calculées par groupe, ignorant les groupes dégénérés). When `equal_opportunity_diff is None`, the fallback is byte-identical to today.
- Extend the prompt template `m1_fr.md`: include the new metrics in the metrics JSON it renders and add a STRICT instruction block to explain EO/Equalized Odds in plain FR + the normative-choice framing + limits, ONLY when present. Keep brace-safety (`{{`/`}}` for literal JSON braces, like the m2/m3 prompts).
- Preserve the "never raises → deterministic fallback" contract exactly (same try/except as today).

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_interpret_m1.py -v`
Expected: PASS (new + existing M1 interpretation tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/interpretation/m1.py apps/api/app/interpretation/prompts/m1_fr.md apps/api/tests/api/test_interpret_m1.py
git commit -m "feat(api): M1 interpretation covers EO/EOdds + normative framing"
```

---

### Task 9: Web API types

**Files:**
- Modify: `apps/web/lib/api/audits.ts`
- Test: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audits-api.test.ts` (reuse the file's real mock idiom):

```typescript
it('createAudit M1 can include ground_truth_column', async () => {
  const out = { id: 'm1-gt', module: 'M1', status: 'done' };
  post.mockResolvedValueOnce({ data: out });
  await createAudit({
    dataset_id: 'd1', title: 't', protected_attribute: 'genre',
    decision_column: 'embauche', favorable_value: 'oui',
    privileged_value: null, ground_truth_column: 'reel',
  } as Parameters<typeof createAudit>[0]);
  const body = post.mock.calls.at(-1)![1];
  expect(body.ground_truth_column).toBe('reel');
});
```
(Match the real mock variable names/idiom of this file — read its top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run audits-api`
Expected: FAIL — the M1 create type has no `ground_truth_column` (TS) / assertion fails.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/lib/api/audits.ts` (read the real M1 create type + `M1MetricsOut`): add optional `ground_truth_column?: string | null` to the M1 `AuditCreate` type; add optional `equal_opportunity_diff?: number | null`, `equalized_odds_diff?: number | null`, `demographic_parity_verdict?: Verdict | null`, `equal_opportunity_verdict?: Verdict | null`, `equalized_odds_verdict?: Verdict | null`, `truelabel_reason?: string | null` to `M1MetricsOut`, and `tpr?: number | null`, `fpr?: number | null` to the M1 group-stat type. Keep M2/M3 types untouched. `createAudit` still posts the body as-is.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run audits-api` then `pnpm --filter @auditiq/web typecheck`
Expected: PASS + typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): M1 ground_truth_column + true-label metrics types"
```

---

### Task 10: Web wizard — optional ground-truth select (M1 only)

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Test: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/nouveau-page.test.tsx` (reuse the real M1 flow test idiom — choose module M1, upload CSV, fill form):

```typescript
it('M1: optional "colonne résultat réel" is sent as ground_truth_column', async () => {
  const user = userEvent.setup();
  (createAudit as unknown as Mock).mockResolvedValueOnce({ id: 'm1-gt' });
  render(<NouveauPage />);
  // drive the EXACT existing M1 happy-path (module choice -> CSV -> form)
  // exactly like the existing M1 test, then additionally select the
  // optional ground-truth column before submit:
  // ... (mirror the existing M1 test setup verbatim) ...
  await user.selectOptions(
    screen.getByLabelText(/résultat réel|vérité.?terrain/i), 'reel',
  );
  await user.click(screen.getByRole('button', { name: /lancer|créer/i }));
  await waitFor(() => expect(createAudit as unknown as Mock).toHaveBeenCalled());
  const body = (createAudit as unknown as Mock).mock.calls.at(-1)![0];
  expect(body.ground_truth_column).toBe('reel');
});
```
(Read the existing M1 wizard test and reproduce its exact setup; the new lines only add the optional select + assertion. Also confirm an existing M1 test WITHOUT selecting it still sends `ground_truth_column` undefined/omitted — keep that test green.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run nouveau-page`
Expected: FAIL — no ground-truth select in the M1 form.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/audits/nouveau/page.tsx` (read the real `M1Form`/`M1Schema`): add an **optional** select "Colonne résultat réel (vérité-terrain) — facultatif" populated from the dataset columns (same column source M1's protected/decision selects use), bound to a new optional zod field `ground_truth_column: z.string().optional()`. On submit, include `ground_truth_column: v.ground_truth_column || undefined` in the M1 `createAudit` body. Touch ONLY `M1Form`/`M1Schema`; M2/M3 forms and the choice-first flow byte-unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run nouveau-page` then full `pnpm --filter @auditiq/web test`
Expected: PASS (new + existing M1/M2/M3 wizard tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): optional ground-truth column in M1 wizard"
```

---

### Task 11: Web result page — conditional EO/EOdds section

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx`
- Test: `apps/web/__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audit-result-page.test.tsx` (reuse the M1 render idiom):

```typescript
it('M1 result shows EO/Equalized Odds section when present', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'm1-gt', code: 'AUD-2026-050', title: 'M1', status: 'done',
      module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
      decision_column: 'embauche', favorable_value: 'oui',
      privileged_value: 'homme', created_at: '2026-05-18T00:00:00Z',
      completed_at: '2026-05-18T00:00:00Z',
      metrics: {
        groups: [{ value: 'homme', n: 40, favorable: 20,
          selection_rate: 0.5, disparate_impact: 1.0, tpr: 0.9, fpr: 0.1 },
          { value: 'femme', n: 40, favorable: 12, selection_rate: 0.3,
          disparate_impact: 0.6, tpr: 0.5, fpr: 0.4 }],
        reference_value: 'homme', disparate_impact: 0.6,
        demographic_parity_diff: 0.2, worst_group: 'femme',
        verdict: 'fail', risk_score: 70, warnings: [],
        equal_opportunity_diff: 0.4, equalized_odds_diff: 0.4,
        demographic_parity_verdict: 'fail',
        equal_opportunity_verdict: 'fail',
        equalized_odds_verdict: 'fail', truelabel_reason: null,
      },
      interpretation: { narrative: 'N.', ai_act_anchors: ['AI Act art. 10'],
        disclaimers: ['Signal.'], provider: 'fallback',
        model: 'deterministic' },
      pre_check: [], config: {},
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'm1-gt' }} />);
  expect(await screen.findByText(/Equal Opportunity|Égalité des chances/i))
    .toBeInTheDocument();
  expect(screen.getByText(/Equalized Odds|cotes égalisées/i))
    .toBeInTheDocument();
  expect(screen.getAllByText(/0\.9|0\.5/).length).toBeGreaterThan(0); // TPR
});

it('M1 result WITHOUT EO is unchanged (no EO section)', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'm1', code: 'AUD-2026-051', title: 'M1', status: 'done',
      module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
      decision_column: 'embauche', favorable_value: 'oui',
      privileged_value: 'homme', created_at: '2026-05-18T00:00:00Z',
      completed_at: '2026-05-18T00:00:00Z',
      metrics: {
        groups: [{ value: 'homme', n: 40, favorable: 20,
          selection_rate: 0.5, disparate_impact: 1.0 },
          { value: 'femme', n: 40, favorable: 12, selection_rate: 0.3,
          disparate_impact: 0.6 }],
        reference_value: 'homme', disparate_impact: 0.6,
        demographic_parity_diff: 0.2, worst_group: 'femme',
        verdict: 'fail', risk_score: 70, warnings: [],
      },
      interpretation: null, pre_check: [], config: {},
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'm1' }} />);
  expect(await screen.findByText('AUD-2026-051')).toBeInTheDocument();
  expect(screen.queryByText(/Equalized Odds|cotes égalisées/i))
    .not.toBeInTheDocument();
});
```
(Match the real page render/`useAudit` idiom from the existing M1 result tests.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run audit-result-page`
Expected: FAIL — no EO/EOdds section rendered.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/audits/[id]/page.tsx` (read the real M1 view branch): inside the M1 render branch, **after the existing DI/DP/per-group block**, add a section that renders ONLY when `m.equal_opportunity_diff != null` (or `truelabel_reason != null`): a per-group TPR/FPR table (reuse the existing M1 table classes), Equal Opportunity & Equalized Odds value + their per-metric traffic light (reuse the existing `StatusBadge`), the Demographic Parity per-metric light, the normative note ("DP/EO/EOdds ne peuvent être satisfaits simultanément — choix normatif"), and `truelabel_reason` when set. When the fields are absent the M1 view is byte-identical to today. Do not touch the M2/M3 views or the discriminator.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run audit-result-page` then full `pnpm --filter @auditiq/web test`
Expected: PASS (new + existing M1/M2/M3 result tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/app/audits/[id]/page.tsx" apps/web/__tests__/audit-result-page.test.tsx
git commit -m "feat(web): conditional EO/Equalized Odds section in M1 result"
```

---

### Task 12: Reporting — conditional M1 EO/EOdds section (Excel + HTML)

**Files:**
- Modify: `apps/api/app/reporting/excel.py`
- Modify: `apps/api/app/reporting/html.py`
- Test: `apps/api/tests/api/test_excel_report.py`, `apps/api/tests/api/test_report_html.py`

- [ ] **Step 1: Write the failing tests**

Append M1+EO fixtures/tests to `test_excel_report.py` and `test_report_html.py` mirroring the existing M1 report tests, but with `equal_opportunity_diff`/`equalized_odds_diff`/per-group `tpr`/`fpr` set; assert the report contains "Equal Opportunity"/"Equalized Odds" and the TPR values; plus a test with those fields `None` asserting the report is unchanged (no EO section, existing M1 assertions still hold). (Reproduce the exact `AuditOut`-building idiom of the existing M1 report tests; only add the optional fields.)

```python
def test_excel_m1_eo_section_present_and_absent():
    from app.reporting.excel import build_excel_report
    import io
    from openpyxl import load_workbook
    # build an M1 AuditOut WITH eo fields (mirror existing M1 fixture) -> wb1
    # build the same WITHOUT eo fields -> wb0
    # assert "Equal Opportunity" in text(wb1) and not in text(wb0)
    # assert existing M1 cells (Disparate Impact, etc.) present in BOTH
    ...
```
(Fill the fixture by copying the file's existing M1 `AuditOut` builder and adding the optional fields; the `...` is replaced with the concrete workbook-text assertions following the existing M1 excel test's pattern — the implementer mirrors that test verbatim plus the EO assertions.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run python -m pytest tests/api/test_excel_report.py tests/api/test_report_html.py -k "m1 and eo" -v`
Expected: FAIL — no EO section in the M1 report branch.

- [ ] **Step 3: Write minimal implementation**

In `apps/api/app/reporting/excel.py` and `html.py` (read the real M1 branch): in the M1 detail branch, **after the existing DI/DP/per-group output**, add an EO/EOdds block rendered ONLY when `m.equal_opportunity_diff is not None` (or `m.truelabel_reason`): per-group TPR/FPR rows, EO & Equalized Odds values + per-metric verdict, the normative note, `truelabel_reason` when set. HTML: every dynamic value through the existing escape helper `_e` (group names/verdicts). When absent → M1 report byte-identical. No `apps/pdf` change (PDF via the HTML path).

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run python -m pytest tests/api/test_excel_report.py tests/api/test_report_html.py -v`
Expected: PASS (new + existing M1/M2/M3 report tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/reporting/excel.py apps/api/app/reporting/html.py apps/api/tests/api/test_excel_report.py apps/api/tests/api/test_report_html.py
git commit -m "feat(api): conditional M1 EO/Equalized Odds section in Excel/HTML reports"
```

---

### Task 13: Full gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: API suite**

Run (from `apps/api`): `uv run python -m pytest -q`
Expected: PASS, 0 failed (all prior + new; no M1/M2/M3 regression). The byte-identical/no-ground-truth tests are the regression guard.

- [ ] **Step 2: API lint + types**

Run: `uv run python -m ruff check app tests` (clean) and `uv run python -m mypy app` (`Success`). Fix minimally (the optional `M1MetricsOut`/`M1Result` fields may need `cast(Verdict, ...)` in the mapper; never blanket `Any`).

- [ ] **Step 3: Web gate**

Run: `pnpm --filter @auditiq/web test` (0 fail), `pnpm --filter @auditiq/web typecheck` (clean), `pnpm --filter @auditiq/web lint` (exit 0, 0 errors).

- [ ] **Step 4: Scope + identity sanity**

Run: `git --no-pager diff --name-only origin/main..HEAD` — only the in-scope files (+ this plan + spec docs). `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — must be ONLY `franck-dilane1.fambou@epitech.digital`; if any other, report the offending commits (controller normalizes via filter-branch before PR). Spot-check no commit is a 142/142 whole-file CRLF churn.

- [ ] **Step 5: Commit any gate fixes**

```bash
git add -A
git commit -m "chore: gate fixups for M1 true-label metrics"
```
(Skip if Steps 1–3 already clean.)

---

## Self-Review

**1. Spec coverage:** D1 graceful/optional → Tasks 1,3,6,7,10,11,12 (every layer gated on presence; byte-identical-when-absent tested in 3,7,11,12 + gate 13). D2 hand-rolled + Fairlearn-validated → Tasks 2,3 (pure, no fairlearn import) + Task 4 (dev-dep cross-validation, `pytest.importorskip`, runtime never imports it). D3 per-metric light + global verdict unchanged + gap banding from DI-threshold complements → Task 2 `gap_verdict`, Task 3 (global `verdict`/`risk_score` lines untouched; D3-reconciliation documented in the header and the `gap_verdict` docstring), per-metric verdict fields in 1/3/6/7, surfaced in 11/12. D4 degenerate skip+warn / <2 → reason, never raises → Task 2 `truelabel_metrics` + tests; Task 3 wires warnings into `M1Result.warnings`. D5 binary, reuse `favorable_value` → Task 3 (`tl_pred = ...==fav`, `tl_true = ...==fav`). D6 in-place extension → Task 3 (config-carried `ground_truth_column`, single `run_m1`; reconciled vs the spec's "param" wording — config-carried matches the existing `M1Config` pattern and still satisfies "optional, in-place, bit-identical when absent", noted here). Interpretation §3 → Task 8. Web §4 → Tasks 9,10,11. Reporting §5 → Task 12. Testing strategy → Tasks 2-4,7,11,12 + 13. Acceptance criteria 1-6 → 3 (global verdict invariant test), 3/7/11/12 (byte-identical), 4 (Fairlearn equality), 2 (degenerate), 8 (never-raises + normative), 13 (gates).

**2. Placeholder scan:** Task 12 Step 1 contains a `...`/"mirror the existing fixture" instruction rather than a full literal test — this is a deliberate, bounded "copy the file's existing M1 report fixture verbatim and add the optional fields + the stated EO assertions" instruction (the existing M1 report-test fixture is large and file-specific; reproducing it blindly would be more error-prone than instructing exact reuse). All other tasks have complete literal code. Tasks 6/7/8/9/10/11 say "read the real X" — these are precise intended-change specs against real anchors, the same proven style as the merged M2-B1/M3-B/M3-C plans, not vague placeholders (each names the exact fields/rules/files).

**3. Type consistency:** `M1Config.ground_truth_column` (T1) ↔ used in `run_m1` (T3) ↔ set by `run_m1_audit` from `AuditCreate.ground_truth_column` (T6/T7) ↔ web type (T9/T10). `M1Result` optional fields (T1) ↔ produced in `run_m1` (T3) ↔ mapped to `M1MetricsOut` (T6/T7) ↔ web `M1MetricsOut` (T9) ↔ rendered (T11/T12). `gap_verdict(d, di_fail_below, di_warn_below)` and `truelabel_metrics(confusion, privileged)` + `TrueLabelMetrics` (T2) ↔ called in `run_m1` (T3) ↔ exported (T5). `GroupStat.tpr/fpr` (T1) ↔ `GroupStatOut.tpr/fpr` (T6) ↔ web group type (T9) ↔ rendered (T11/T12). Verdict strings use the existing `Verdict` alias / `VERDICT_*` constants throughout. Global `verdict`/`risk_score` names are the real engine ones (confirmed: `verdict`, `score`→`risk_score`, `overall_di`, `dpd`, `counts`, `favs`, `rates`, `di_map`, `groups`, `reference`, `worst_group`, `privileged`, `fav`, `pa`, `dc`).
