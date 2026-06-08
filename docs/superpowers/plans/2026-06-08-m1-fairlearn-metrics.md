# M1 métriques fairlearn additionnelles (ratios + taux par groupe) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter, de façon **additive et informative** (verdict inchangé), des métriques fairlearn à M1 : ratios `demographic_parity_ratio`/`equal_opportunity_ratio`/`equalized_odds_ratio` (par marginal et par paire) et taux par groupe `fnr`/`accuracy`/`precision` (quand une vérité-terrain est fournie), exposés jusqu'à la page résultat et aux rapports.

**Architecture:** Calcul dans le moteur pur (`metrics.py` étendu, `_marginal_audit` + `run_intersectional_pair` peuplent les nouveaux champs) ; types `GroupStat`/`MarginalResult`/`IntersectionalResult` étendus (défauts → rétro-compat) ; DTO + interprétation + rapports + web exposent les nouveaux champs. Aucune logique de verdict/risk modifiée.

**Tech Stack:** Python 3.12 (pandas, pydantic v2, pytest/ruff/mypy --strict, fairlearn en dev pour cross-check) ; Next.js + React + vitest.

**Spec:** `docs/superpowers/specs/2026-06-08-m1-fairlearn-metrics-design.md`

**Commandes (Windows) :** API `apps/api` → `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest <p> -q` ; `... -m ruff check app tests` ; `... -m mypy app`. Web `apps/web` → `pnpm vitest run <p>` ; `pnpm typecheck` ; `pnpm eslint .`. Commits : identité Franck F, **jamais** de trailer `Co-Authored-By: Claude`. `git add <fichiers précis>` (jamais `-A`/`.`). Ne pas pousser.

**Définitions :** `demographic_parity_ratio` = min/max selection_rate (1.0 si max==0). `equal_opportunity_ratio` = min/max TPR (≥2 TPR définis, sinon None). `equalized_odds_ratio` = min(ratio_TPR, ratio_FPR) (chacun min/max ; None si <2). Par groupe : `fnr`=fn/(tp+fn) (None si 0), `accuracy`=(tp+tn)/n, `precision`=tp/(tp+fp) (None si 0).

---

## File Structure
- `apps/api/app/audit_engine/metrics.py` — `demographic_parity_ratio` helper; extend `TrueLabelMetrics` + `truelabel_metrics` (eo_ratio, eodds_ratio, accuracy/precision/fnr maps).
- `apps/api/app/audit_engine/types.py` — `GroupStat` (+fnr/accuracy/precision); `MarginalResult` + `IntersectionalResult` (+3 ratios).
- `apps/api/app/audit_engine/m1_supervised.py` — `_marginal_audit` populates new fields.
- `apps/api/app/audit_engine/intersectional.py` — `run_intersectional_pair` populates ratios.
- `apps/api/app/schemas/audit.py` — `GroupStatOut`/`MarginalOut`/`IntersectionalOut` + new fields + mapping.
- `apps/api/app/interpretation/m1.py` (+ `prompts/m1_fr.md`) — surface ratios informatively.
- `apps/api/app/reporting/excel.py`, `html.py` — extra per-group columns + ratios.
- `apps/web/lib/api/audits.ts` — TS types.
- audit result page + M1 components — display.
- Tests: `tests/audit_engine/test_m1_metrics_fairlearn.py` (new), extend `test_truelabel_fairlearn.py`, DTO + web tests.

No removals; all new fields have defaults (backward compatible).

---

## Task 1: Engine types (additive fields)

**Files:** Modify `apps/api/app/audit_engine/types.py`
**Test:** `apps/api/tests/audit_engine/test_m1_metrics_fairlearn.py` (create)

- [ ] **Step 1: Write failing test**
```python
from app.audit_engine.types import GroupStat, IntersectionalResult, MarginalResult


def test_groupstat_has_extra_rates():
    g = GroupStat("H", 10, 8, 0.8, 1.0, tpr=0.9, fpr=0.1,
                  fnr=0.1, accuracy=0.85, precision=0.88)
    assert (g.fnr, g.accuracy, g.precision) == (0.1, 0.85, 0.88)


def test_marginal_has_ratio_fields():
    m = MarginalResult(
        attribute="sexe", groups=(), reference_value="H",
        disparate_impact=0.5, demographic_parity_diff=0.3, worst_group="F",
        verdict="fail", risk_score=70,
        demographic_parity_ratio=0.5, equal_opportunity_ratio=0.6,
        equalized_odds_ratio=0.55,
    )
    assert (m.demographic_parity_ratio, m.equal_opportunity_ratio,
            m.equalized_odds_ratio) == (0.5, 0.6, 0.55)


def test_intersectional_has_ratio_fields():
    r = IntersectionalResult(
        cells=(), reference_primary="", reference_secondary="",
        worst_primary="", worst_secondary="", disparate_impact=1.0,
        demographic_parity_diff=0.0, verdict="warn", risk_score=0,
        marginal_di=(1.0, 1.0), demographic_parity_ratio=0.4,
        equal_opportunity_ratio=0.5, equalized_odds_ratio=0.45,
    )
    assert r.demographic_parity_ratio == 0.4
```

- [ ] **Step 2: Run → fail** (`$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_m1_metrics_fairlearn.py -q`) — unexpected kwargs.

- [ ] **Step 3: Implement.** In `types.py`:
  - `GroupStat`: add after `fpr`:
    ```python
        fnr: float | None = None
        accuracy: float | None = None
        precision: float | None = None
    ```
  - `MarginalResult`: add (after the existing optional fields, before `warnings` or at end — keep defaults):
    ```python
        demographic_parity_ratio: float = 1.0
        equal_opportunity_ratio: float | None = None
        equalized_odds_ratio: float | None = None
    ```
  - `IntersectionalResult`: add the same three fields with the same defaults.

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_m1_metrics_fairlearn.py
git commit -m "feat(engine): additive fairlearn metric fields (per-group rates + ratios)"
```

---

## Task 2: `metrics.py` — DP ratio + extended truelabel_metrics

**Files:** Modify `apps/api/app/audit_engine/metrics.py`
**Test:** `apps/api/tests/audit_engine/test_m1_metrics_fairlearn.py`

- [ ] **Step 1: Write failing tests**
```python
from app.audit_engine.metrics import demographic_parity_ratio, group_confusion, truelabel_metrics


def test_demographic_parity_ratio():
    assert demographic_parity_ratio({"a": 0.8, "b": 0.2}) == 0.25
    assert demographic_parity_ratio({"a": 0.0, "b": 0.0}) == 1.0


def test_truelabel_metrics_ratios_and_rates():
    # group a: tp=8 fp=2 fn=2 tn=8 ; group b: tp=3 fp=7 fn=7 tn=3
    conf = {
        "a": {"tp": 8, "fp": 2, "fn": 2, "tn": 8},
        "b": {"tp": 3, "fp": 7, "fn": 7, "tn": 3},
    }
    r = truelabel_metrics(conf, None)
    # TPR a=0.8 b=0.3 -> ratio 0.375 ; FPR a=0.2 b=0.7 -> ratio 0.2857
    assert round(r.eo_ratio, 4) == 0.375
    assert round(r.eodds_ratio, 4) == round(min(0.3 / 0.8, 0.2 / 0.7), 4)
    # per-group rates
    assert round(r.accuracy["a"], 4) == 0.8      # (8+8)/20
    assert round(r.precision["a"], 4) == 0.8     # 8/(8+2)
    assert round(r.fnr["a"], 4) == 0.2           # 2/(8+2) ; ==1-TPR
    assert round(r.fnr["b"], 4) == 0.7
```

- [ ] **Step 2: Run → fail** (`ImportError: demographic_parity_ratio` / `TrueLabelMetrics` has no `eo_ratio`).

- [ ] **Step 3: Implement.** In `metrics.py`:
  - Add helper:
    ```python
    def demographic_parity_ratio(rates: dict[str, float]) -> float:
        """min/max selection rate across groups (fairlearn). 1.0 if max == 0."""
        if not rates:
            return 1.0
        hi = max(rates.values())
        return 1.0 if hi == 0.0 else min(rates.values()) / hi
    ```
  - Add a private ratio helper:
    ```python
    def _ratio(values: dict[str, float]) -> float | None:
        if len(values) < 2:
            return None
        hi = max(values.values())
        return None if hi == 0.0 else min(values.values()) / hi
    ```
  - Extend `TrueLabelMetrics` dataclass with:
    ```python
        eo_ratio: float | None = None
        eodds_ratio: float | None = None
        accuracy: dict[str, float] = field(default_factory=dict)
        precision: dict[str, float] = field(default_factory=dict)
        fnr: dict[str, float] = field(default_factory=dict)
    ```
    (Add `from dataclasses import field` if not already imported.)
  - In `truelabel_metrics`, inside the per-group loop (where `tpr`/`fpr` are computed), also compute per-group rates from `c` = confusion:
    ```python
        n = c["tp"] + c["fp"] + c["fn"] + c["tn"]
        if n > 0:
            accuracy[g] = (c["tp"] + c["tn"]) / n
        if pos > 0:
            fnr[g] = c["fn"] / pos
        if (c["tp"] + c["fp"]) > 0:
            precision[g] = c["tp"] / (c["tp"] + c["fp"])
    ```
    (Initialize `accuracy: dict[str,float] = {}`, `precision = {}`, `fnr = {}` before the loop.)
  - After computing eo_diff/eodds_diff, compute ratios:
    ```python
        eo_ratio = _ratio(tpr)
        eodds_ratio = None
        if eo_ratio is not None and len(fpr) >= 2:
            fpr_ratio = _ratio(fpr)
            eodds_ratio = min(eo_ratio, fpr_ratio) if fpr_ratio is not None else None
    ```
  - Add all five to the returned `TrueLabelMetrics(...)`.

- [ ] **Step 4: Run → pass** (and `tests/audit_engine/ -q` to confirm no regression).
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/metrics.py apps/api/tests/audit_engine/test_m1_metrics_fairlearn.py
git commit -m "feat(engine): demographic_parity_ratio + truelabel ratios & per-group accuracy/precision/fnr"
```

---

## Task 3: Populate ratios/rates in `_marginal_audit` + `run_intersectional_pair`

**Files:** Modify `apps/api/app/audit_engine/m1_supervised.py`, `apps/api/app/audit_engine/intersectional.py`
**Test:** `apps/api/tests/audit_engine/test_m1_metrics_fairlearn.py` + extend `test_truelabel_fairlearn.py`

- [ ] **Step 1: Write failing tests**
```python
import pandas as pd
from pathlib import Path
from app.audit_engine.m1_supervised import run_m1
from app.audit_engine.types import M1Config

_FIX = Path(__file__).parent / "fixtures"


def test_marginal_populates_dp_ratio_and_group_rates():
    df = pd.read_csv(_FIX / "m1-truelabel-eo.csv")  # has ground truth
    cfg = M1Config(protected_attribute="sexe", decision_column="predicted",
                   favorable_value="1", ground_truth_column="actually_qualified")
    r = run_m1(df, cfg)
    m = r.marginals[0]
    assert 0.0 <= m.demographic_parity_ratio <= 1.0
    assert m.equal_opportunity_ratio is not None
    assert m.equalized_odds_ratio is not None
    # at least one group exposes the extra true-label rates
    assert any(g.accuracy is not None and g.precision is not None
               and g.fnr is not None for g in m.groups)


def test_marginal_no_groundtruth_ratios_none_but_dp_ratio_present():
    df = pd.read_csv(_FIX / "m1-recrutement-biais.csv")  # no GT
    cfg = M1Config(protected_attribute="sexe", decision_column="embauche",
                   favorable_value="oui")
    m = run_m1(df, cfg).marginals[0]
    assert m.equal_opportunity_ratio is None
    assert m.equalized_odds_ratio is None
    assert 0.0 <= m.demographic_parity_ratio <= 1.0
    assert all(g.accuracy is None for g in m.groups)


def test_pairwise_populates_ratios():
    df = pd.read_csv(_FIX / "m1-truelabel-eo.csv")
    cfg = M1Config(protected_attribute="sexe", decision_column="predicted",
                   favorable_value="1", ground_truth_column="actually_qualified",
                   protected_attributes=("sexe", "age"))
    # age may be high-cardinality; if so this asserts dp_ratio only.
    p = run_m1(df, cfg).pairwise[0]
    assert 0.0 <= p.demographic_parity_ratio <= 1.0
```
(If `age` in the fixture is not low-cardinality enough to be a valid protected attr, replace the second attribute in `test_pairwise_populates_ratios` with another categorical column present in the fixture — read the CSV header first.)

- [ ] **Step 2: Run → fail** (fields are defaults).

- [ ] **Step 3: Implement.**
  - `m1_supervised.py` `_marginal_audit`: after `dpd = demographic_parity_diff(rates)`, add `dp_ratio = demographic_parity_ratio(rates)` (import it). Initialize `eo_ratio = eodds_ratio = None` and per-group rate maps `acc_map: dict[str,float] = {}`, `prec_map = {}`, `fnr_map = {}` near the other `*_map`. In the `if len(confusion) >= 2:` block, after `res = truelabel_metrics(...)`, set `eo_ratio = round(res.eo_ratio, _ROUND) if res.eo_ratio is not None else None`, same for `eodds_ratio`, and `acc_map, prec_map, fnr_map = res.accuracy, res.precision, res.fnr`. In the `GroupStat(...)` construction add:
    ```python
            fnr=(round(fnr_map[g], _ROUND) if g in fnr_map else None),
            accuracy=(round(acc_map[g], _ROUND) if g in acc_map else None),
            precision=(round(prec_map[g], _ROUND) if g in prec_map else None),
    ```
    In the `MarginalResult(...)` return add:
    ```python
            demographic_parity_ratio=round(dp_ratio, _ROUND),
            equal_opportunity_ratio=eo_ratio,
            equalized_odds_ratio=eodds_ratio,
    ```
  - `intersectional.py` `run_intersectional_pair`: compute `dp_ratio = demographic_parity_ratio(rates)` (import it; `rates` already exists). In the `if gt is not None:` block where `tl = truelabel_metrics(confusion, None)` is computed, capture `eo_ratio = round(tl.eo_ratio, _ROUND) if tl.eo_ratio is not None else None` and same for `eodds_ratio` (init both to None before the block). Add to BOTH `IntersectionalResult(...)` returns (the `<2 cells` early return uses `demographic_parity_ratio=1.0, equal_opportunity_ratio=None, equalized_odds_ratio=None`; the normal return uses the computed values):
    ```python
            demographic_parity_ratio=round(dp_ratio, _ROUND),
            equal_opportunity_ratio=eo_ratio,
            equalized_odds_ratio=eodds_ratio,
    ```
    (For the early-return path, `rates` isn't computed yet — use `1.0` there.)

- [ ] **Step 4: Run → pass.** Then extend `tests/audit_engine/test_truelabel_fairlearn.py` with a cross-check:
```python
def test_ratios_match_fairlearn():
    from fairlearn.metrics import (
        MetricFrame, demographic_parity_ratio as fl_dp_ratio,
        equalized_odds_ratio as fl_eodds_ratio, false_negative_rate,
        true_positive_rate,
    )
    df = _frame()  # the existing helper with g/d/reel
    cfg = M1Config(protected_attribute="g", decision_column="d",
                   favorable_value="oui", ground_truth_column="reel")
    m = run_m1(df, cfg).marginals[0]
    y_pred = (df["d"].astype(str) == "oui").astype(int)
    y_true = (df["reel"].astype(str) == "oui").astype(int)
    sf = df["g"].astype(str)
    assert m.demographic_parity_ratio == round(
        float(fl_dp_ratio(y_pred, y_pred, sensitive_features=sf)), _ROUND)
    assert m.equalized_odds_ratio == round(
        float(fl_eodds_ratio(y_true, y_pred, sensitive_features=sf)), _ROUND)
    mf_fnr = MetricFrame(metrics=false_negative_rate, y_true=y_true,
                         y_pred=y_pred, sensitive_features=sf)
    for g in m.groups:
        if g.fnr is not None:
            assert g.fnr == round(float(mf_fnr.by_group[g.value]), _ROUND)
```
Run `tests/audit_engine/ -q` → green; ruff + `mypy app/audit_engine` clean.
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/m1_supervised.py apps/api/app/audit_engine/intersectional.py apps/api/tests/audit_engine/
git commit -m "feat(engine): populate fairlearn ratios + per-group rates in marginals & pairs"
```

---

## Task 4: DTO

**Files:** Modify `apps/api/app/schemas/audit.py`
**Test:** extend `apps/api/tests/api/test_schemas_m1.py`

- [ ] **Step 1: Write failing test** asserting `GroupStatOut` carries `fnr`/`accuracy`/`precision` and `MarginalOut`/`IntersectionalOut` carry the 3 ratios, mapped by `M1MetricsOut.from_engine`/`_to_metrics_out` from an engine result with those fields set.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.** Add `fnr`/`accuracy`/`precision: float | None = None` to `GroupStatOut`; add `demographic_parity_ratio: float = 1.0`, `equal_opportunity_ratio: float | None = None`, `equalized_odds_ratio: float | None = None` to `MarginalOut` and `IntersectionalOut`. Map them in the relevant `from_engine`/`_to_metrics_out` (in `schemas/audit.py` and/or `services/audit_service.py` — find where GroupStat/Marginal/Intersectional are converted and add the fields).
- [ ] **Step 4: Run → pass; full API suite green; ruff + mypy clean.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/schemas/audit.py apps/api/app/services/audit_service.py apps/api/tests/api/test_schemas_m1.py
git commit -m "feat(api): expose fairlearn ratios + per-group rates in M1 DTO"
```

---

## Task 5: Interpretation (informative)

**Files:** Modify `apps/api/app/interpretation/m1.py`, `apps/api/app/interpretation/prompts/m1_fr.md`
**Test:** extend `apps/api/tests/api/test_interpret_m1.py`

- [ ] **Step 1: Write failing test** — `_metrics_json` for a marginal with ratios includes `demographic_parity_ratio` etc.; `_fallback` narrative (with GT) mentions a ratio value, without changing verdict/provider.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.** In `_metrics_json`, add the three ratios per marginal/pair and the per-group rates when present. In `_fallback`, append one informative sentence citing the worst marginal's `demographic_parity_ratio` (and EO/EOdds ratios when present), explicitly framed as informative (verdict unchanged). Update `m1_fr.md` to mention the ratios are informative and read alongside the differences.
- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/interpretation/m1.py apps/api/app/interpretation/prompts/m1_fr.md apps/api/tests/api/test_interpret_m1.py
git commit -m "feat(api): M1 interpretation surfaces fairlearn ratios (informative)"
```

---

## Task 6: Reports (Excel + HTML)

**Files:** Modify `apps/api/app/reporting/excel.py`, `apps/api/app/reporting/html.py`
**Test:** extend `apps/api/tests/api/test_excel_report.py`, `test_report_html.py`

- [ ] **Step 1: Write failing test** — with a marginal carrying ratios + a group with `accuracy`/`precision`/`fnr`, assert the Excel workbook and the HTML contain the ratio values and the extra per-group columns (only when present).
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.** In the per-attribute marginal block of both reports, add the three ratio values next to the existing diffs, and add FNR/Accuracy/Precision columns to the per-group table (rendered only when the group has them, i.e. ground truth present). For pairwise blocks, add the three ratios. Read the real rendering functions and follow their structure.
- [ ] **Step 4: Run → pass; full API suite green; ruff + mypy clean.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/reporting/excel.py apps/api/app/reporting/html.py apps/api/tests/
git commit -m "feat(api): Excel + HTML reports show fairlearn ratios + per-group rates"
```

---

## Task 7: Web — types + result page

**Files:** Modify `apps/web/lib/api/audits.ts`, the audit result page/components (M1 marginal cards + pairwise matrices)
**Test:** `apps/web/__tests__/audit-result-m1-metrics.test.tsx` (create; mirror existing audit-result tests)

- [ ] **Step 1: Write failing test** — render the M1 result with a marginal carrying the 3 ratios + a group with `accuracy`/`precision`/`fnr`; assert the ratio values and the extra per-group columns appear; assert they are absent (or "—") when not provided.
- [ ] **Step 2: Run → fail** (`pnpm vitest run __tests__/audit-result-m1-metrics.test.tsx`).
- [ ] **Step 3: Implement.** `lib/api/audits.ts`: add `fnr`/`accuracy`/`precision` to `GroupStatOut`; add the 3 ratios to `MarginalOut` and `IntersectionalOut`. Result page (M1 marginal card + pairwise matrix): display the ratios next to the existing diffs (label them, mark informative) and add the per-group columns when present. No change to the verdict/hero.
- [ ] **Step 4: Run → pass; `pnpm typecheck`; `pnpm eslint .` (0 errors).**
- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/api/audits.ts apps/web/app apps/web/components apps/web/__tests__/audit-result-m1-metrics.test.tsx
git commit -m "feat(web): show fairlearn ratios + per-group rates on M1 result"
```

---

## Final verification (before PR)
- [ ] API: `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest -q` → green ; `ruff check app tests` + `mypy app` → clean
- [ ] Web: `pnpm vitest run` + `pnpm typecheck` + `pnpm eslint .` → clean
- [ ] Backward-compat: an audit without ground truth shows DP ratio but no EO/EOdds ratios and no per-group accuracy/precision/fnr; verdict identical to before D.
- [ ] Open PR base `main`, head `feat-m1-fairlearn-metrics`.
