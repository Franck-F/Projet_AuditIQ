# M1 attributs protégés multiples (marginaux + paires 2-à-2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Généraliser l'audit M1 d'un attribut protégé (+1 secondaire) à **N attributs (1–4)** : un marginal M1 par attribut + tous les croisements 2-à-2, verdict global = pire de tous, exposé jusqu'au wizard (multi-select) et aux rapports.

**Architecture:** Le moteur pur calcule `marginals[]` (généralisation du calcul mono-attribut existant) et `pairwise[]` (généralisation de `run_intersectional` à une paire explicite). `M1Result` gagne `marginals`/`pairwise` ; ses champs top-level deviennent l'agrégat (1ᵉʳ marginal + pire verdict). Rétro-compatible (1 attribut ⇒ sortie équivalente à l'actuel). Le champ unique `intersectional` est remplacé par `pairwise` partout (DTO, service, interprétation, rapports, web).

**Tech Stack:** Python 3.12 (pandas, pydantic v2, pytest/ruff/mypy --strict) ; Next.js + React + react-hook-form + vitest.

**Spec:** `docs/superpowers/specs/2026-06-07-m1-multi-protected-design.md`

**Commandes (Windows) :**
- API tests : depuis `apps/api`, `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest <chemin> -q`
- API gates : `.\.venv\Scripts\python.exe -m ruff check app tests` ; `.\.venv\Scripts\python.exe -m mypy app`
- Web : depuis `apps/web`, `pnpm vitest run <chemin>` · `pnpm tsc --noEmit` · `pnpm eslint <fichiers>`
- Commit : identité Franck F (déjà configurée), **jamais** de trailer `Co-Authored-By: Claude`. Ne pas pousser (le contrôleur gère push/PR).

**Rétro-compat — invariant central à tester à chaque étape moteur :** `run_m1` avec exactement 1 attribut (et aucun secondaire) doit produire un `M1Result` dont les champs top-level (`groups`, `reference_value`, `disparate_impact`, `demographic_parity_diff`, `worst_group`, `verdict`, `risk_score`, EO/EOdds) sont **identiques** à l'actuel.

---

## File Structure

- `apps/api/app/audit_engine/types.py` — MODIFY: `M1Config += protected_attributes`; new `MarginalResult`; `IntersectionalResult += primary_attribute/secondary_attribute`; `M1Result += marginals/pairwise`, remove `intersectional`.
- `apps/api/app/audit_engine/intersectional.py` — MODIFY: `run_intersectional` → `run_intersectional_pair(df, config, attr_a, attr_b)` (explicit pair), set attribute names on result.
- `apps/api/app/audit_engine/m1_supervised.py` — MODIFY: extract `_marginal_audit`; `run_m1` orchestrates N marginals + pairs + aggregate.
- `apps/api/app/schemas/audit.py` — MODIFY: `AuditCreate += protected_attributes` (+validation); `M1MetricsOut` += `marginals`/`pairwise`, remove `intersectional`; new `MarginalOut`; `IntersectionalOut += primary_attribute/secondary_attribute`.
- `apps/api/app/services/audit_service.py` — MODIFY: build `M1Config.protected_attributes` from body; persist in `config` JSON; `_to_metrics_out` maps marginals/pairwise; dataset-validate all attrs.
- `apps/api/app/interpretation/m1.py` (+ `prompts/m1_fr.md`) — MODIFY: narrative/metrics from marginals/pairwise.
- `apps/api/app/reporting/excel.py`, `html.py` — MODIFY: per-attribute + per-pair sections.
- `apps/web/lib/api/audits.ts` — MODIFY: `AuditCreate.protected_attributes`, `M1MetricsOut` marginals/pairwise.
- `apps/web/components/audits/wizard/unified/types.ts` — MODIFY: `protected_attributes: string[]`, drop `secondary_protected_attribute`.
- `apps/web/components/audits/wizard/unified/Step3Config.tsx` — MODIFY: multi-select.
- `apps/web/components/audits/wizard/unified/Step4Verify.tsx`, `Step5Review.tsx`, `app/app/audits/nouveau/page.tsx` — MODIFY: list N attrs, submit `protected_attributes`.
- audit result page (`apps/web/app/app/audits/[id]/page.tsx` or its components) — MODIFY: marginal cards + pairwise matrices.
- Tests: `apps/api/tests/audit_engine/test_m1_multi.py` (new), additions to `tests/api/test_schemas_*`, web `__tests__/`.

No DB migration: `protected_attributes` is stored in the existing `config` JSON column (same as `ground_truth_column`/`secondary_protected_attribute` today).

---

## Task 1: Engine types

**Files:** Modify `apps/api/app/audit_engine/types.py`
**Test:** `apps/api/tests/audit_engine/test_m1_multi.py` (create)

- [ ] **Step 1: Write failing test**

```python
from app.audit_engine.types import (
    GroupStat, IntersectionalResult, M1Config, M1Result, MarginalResult,
)


def test_m1config_protected_attributes_default():
    c = M1Config(protected_attribute="sexe", decision_column="d",
                 favorable_value="oui")
    assert c.protected_attributes == ()


def test_marginal_result_holds_attribute():
    m = MarginalResult(
        attribute="sexe",
        groups=(GroupStat("H", 10, 8, 0.8, 1.0),),
        reference_value="H", disparate_impact=0.5,
        demographic_parity_diff=0.3, worst_group="F",
        verdict="fail", risk_score=70,
    )
    assert m.attribute == "sexe" and m.verdict == "fail"


def test_intersectional_carries_attribute_names():
    r = IntersectionalResult(
        cells=(), reference_primary="", reference_secondary="",
        worst_primary="", worst_secondary="", disparate_impact=1.0,
        demographic_parity_diff=0.0, verdict="warn", risk_score=0,
        marginal_di=(1.0, 1.0), primary_attribute="sexe",
        secondary_attribute="age",
    )
    assert (r.primary_attribute, r.secondary_attribute) == ("sexe", "age")


def test_m1result_has_marginals_and_pairwise():
    r = M1Result(
        groups=(), reference_value="H", disparate_impact=0.5,
        demographic_parity_diff=0.3, worst_group="F", verdict="fail",
        risk_score=70,
    )
    assert r.marginals == () and r.pairwise == ()
```

- [ ] **Step 2: Run → fail**

`$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest tests/audit_engine/test_m1_multi.py -q`
Expected: FAIL (`ImportError: MarginalResult`; unexpected kwargs).

- [ ] **Step 3: Implement** in `types.py`

Add to `M1Config` (after `secondary_privileged_value`):
```python
    protected_attributes: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "protected_attributes",
                           tuple(self.protected_attributes))
```
(If `M1Config` already has a `__post_init__`, merge this normalization into it.)

Add new dataclass:
```python
@dataclass(frozen=True)
class MarginalResult:
    attribute: str
    groups: tuple[GroupStat, ...]
    reference_value: str
    disparate_impact: float
    demographic_parity_diff: float
    worst_group: str
    verdict: str
    risk_score: int
    equal_opportunity_diff: float | None = None
    equalized_odds_diff: float | None = None
    demographic_parity_verdict: str | None = None
    equal_opportunity_verdict: str | None = None
    equalized_odds_verdict: str | None = None
    truelabel_reason: str | None = None
    warnings: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "groups", tuple(self.groups))
        object.__setattr__(self, "warnings", tuple(self.warnings))
```

In `IntersectionalResult`, add two fields (with defaults, after `reason`):
```python
    primary_attribute: str = ""
    secondary_attribute: str = ""
```

In `M1Result`: remove the `intersectional: IntersectionalResult | None = None` field and add:
```python
    marginals: tuple[MarginalResult, ...] = ()
    pairwise: tuple[IntersectionalResult, ...] = ()
```
Extend `M1Result.__post_init__` to normalize the new tuples:
```python
        object.__setattr__(self, "marginals", tuple(self.marginals))
        object.__setattr__(self, "pairwise", tuple(self.pairwise))
```

- [ ] **Step 4: Run → pass.** Same pytest command. Expected: 4 passed.
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/types.py apps/api/tests/audit_engine/test_m1_multi.py
git commit -m "feat(engine): M1 multi-attribute types (MarginalResult, marginals/pairwise, attr names)"
```
Note: removing `M1Result.intersectional` will break `m1_supervised.py`, `audit_service.py`, `interpretation/m1.py`, reports, DTO — they're fixed in later tasks. This task's pytest target only runs `test_m1_multi.py`; do not run the full suite yet (it will be red until Task 6). If imports in `types.py` itself break, fix them here.

---

## Task 2: `run_intersectional_pair` (explicit pair)

**Files:** Modify `apps/api/app/audit_engine/intersectional.py`
**Test:** `apps/api/tests/audit_engine/test_m1_multi.py`

Current `run_intersectional(df, config)` reads `config.protected_attribute` / `config.secondary_protected_attribute`. Generalize to take the two attributes explicitly and label the result.

- [ ] **Step 1: Write failing test**

```python
import pandas as pd
from app.audit_engine.intersectional import run_intersectional_pair


def _df():
    return pd.DataFrame({
        "sexe": ["H"] * 30 + ["F"] * 30,
        "age": (["j"] * 15 + ["v"] * 15) * 2,
        "d": (["oui"] * 24 + ["non"] * 6) + (["oui"] * 9 + ["non"] * 21),
    })


def test_run_intersectional_pair_labels_attributes():
    cfg = M1Config(protected_attribute="sexe", decision_column="d",
                   favorable_value="oui")
    r = run_intersectional_pair(_df(), cfg, "sexe", "age")
    assert r.primary_attribute == "sexe"
    assert r.secondary_attribute == "age"
    assert len(r.cells) >= 2
```

- [ ] **Step 2: Run → fail** (`ImportError: run_intersectional_pair`).

- [ ] **Step 3: Implement.** Rename `run_intersectional` to `run_intersectional_pair` and change its signature/body to use explicit attributes:
```python
def run_intersectional_pair(
    df: pd.DataFrame, config: M1Config, attr_a: str, attr_b: str
) -> IntersectionalResult:
```
Inside, replace `pa = config.protected_attribute` / `sa = config.secondary_protected_attribute` with `pa = attr_a` / `sa = attr_b`, and remove the `assert sa is not None`. Everything else (cell building, reference, EO/EOdds, marginal_di, verdict) stays the same. In the final `return IntersectionalResult(...)` add:
```python
        primary_attribute=attr_a, secondary_attribute=attr_b,
```
Also add the same two kwargs to the early `len(raw) < 2` return path. Keep the `marginal_di` computation using `p_str`/`s_str` as before.

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/intersectional.py apps/api/tests/audit_engine/test_m1_multi.py
git commit -m "feat(engine): run_intersectional_pair takes explicit attribute pair + labels result"
```

---

## Task 3: `_marginal_audit` (per-attribute M1)

**Files:** Modify `apps/api/app/audit_engine/m1_supervised.py`
**Test:** `apps/api/tests/audit_engine/test_m1_multi.py`

Extract the per-attribute computation currently inlined in `run_m1` (lines computing groups, rates, DI, DP, verdict, risk, EO/EOdds) into a reusable helper returning `MarginalResult`. The privileged value applies only when the attribute is the first/primary.

- [ ] **Step 1: Write failing test**

```python
from app.audit_engine.m1_supervised import _marginal_audit, run_m1


def test_marginal_audit_matches_single_run_m1():
    df = pd.read_csv(
        Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv"
    )
    cfg = M1Config(protected_attribute="sexe", decision_column="embauche",
                   favorable_value="oui", privileged_value="H")
    single = run_m1(df, cfg)                     # current top-level == this attr
    m = _marginal_audit(df, cfg, "sexe", is_primary=True)
    assert m.attribute == "sexe"
    assert m.disparate_impact == single.disparate_impact
    assert m.demographic_parity_diff == single.demographic_parity_diff
    assert m.verdict == single.verdict
    assert m.reference_value == single.reference_value
```
(Add `from pathlib import Path` to the test file imports if not present.)

- [ ] **Step 2: Run → fail** (`ImportError: _marginal_audit`).

- [ ] **Step 3: Implement.** Add `_marginal_audit(df, config, attribute, *, is_primary)` that performs the existing single-attribute computation against `attribute` (use `config.privileged_value` only when `is_primary`, else `None`; reference auto-picked). Reuse the existing helpers from `metrics.py` (`selection_rate`, `pick_reference`, `disparate_impacts`, `demographic_parity_diff`, `decide_verdict`, `risk_score`, `group_confusion`, `truelabel_metrics`, `gap_verdict`) and the existing validation pattern (min group sizes, favorable presence). Return a `MarginalResult`. The simplest correct path: lift the body of the current `run_m1` (the part from `groups = sorted(...)` through building `group_stats`, verdict, score, EO/EOdds) into this helper, parameterized by `attribute` and `privileged = config.privileged_value if is_primary else None`. Validation that the decision column is binary / favorable present / ≥2 groups stays (raise `DatasetValidationError` as today).

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/m1_supervised.py apps/api/tests/audit_engine/test_m1_multi.py
git commit -m "feat(engine): extract _marginal_audit (per-attribute M1) reused by run_m1"
```

---

## Task 4: `run_m1` orchestrates N attributes + aggregate

**Files:** Modify `apps/api/app/audit_engine/m1_supervised.py`
**Test:** `apps/api/tests/audit_engine/test_m1_multi.py`

- [ ] **Step 1: Write failing tests**

```python
from itertools import combinations


def _attrs_cfg(attrs, **kw):
    return M1Config(protected_attribute=attrs[0], decision_column="embauche",
                    favorable_value="oui", protected_attributes=tuple(attrs),
                    **kw)


def test_run_m1_three_attributes_marginals_and_pairs():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    # recruitment has sexe + diplome + (synthesize) — use sexe, diplome, age-binned not present;
    # use the two real categoricals available plus a duplicated check:
    cfg = _attrs_cfg(["sexe", "diplome"])
    r = run_m1(df, cfg)
    assert [m.attribute for m in r.marginals] == ["sexe", "diplome"]
    assert len(r.pairwise) == 1  # C(2,2)=1 pair
    assert r.pairwise[0].primary_attribute == "sexe"
    assert r.pairwise[0].secondary_attribute == "diplome"


def test_run_m1_aggregate_verdict_is_worst():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    r = run_m1(_attrs_cfg(["sexe", "diplome"]))
    order = {"pass": 0, "warn": 1, "fail": 2}
    worst = max(
        [order[m.verdict] for m in r.marginals]
        + [order[p.verdict] for p in r.pairwise]
    )
    assert order[r.verdict] == worst
    assert r.risk_score == max(
        [m.risk_score for m in r.marginals] + [p.risk_score for p in r.pairwise]
    )


def test_run_m1_single_attribute_backward_compatible():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    cfg = M1Config(protected_attribute="sexe", decision_column="embauche",
                   favorable_value="oui", privileged_value="H")
    r = run_m1(df, cfg)
    assert len(r.marginals) == 1 and r.pairwise == ()
    # top-level == the single marginal (unchanged behaviour)
    assert r.disparate_impact == r.marginals[0].disparate_impact
    assert r.verdict == r.marginals[0].verdict
    assert tuple(g.value for g in r.groups) == tuple(
        g.value for g in r.marginals[0].groups
    )


def test_run_m1_rejects_more_than_four_attributes():
    df = pd.read_csv(Path(__file__).parent / "fixtures" / "m1-recrutement-biais.csv")
    import pytest
    from app.audit_engine.errors import DatasetValidationError
    cfg = M1Config(protected_attribute="sexe", decision_column="embauche",
                   favorable_value="oui",
                   protected_attributes=("a", "b", "c", "d", "e"))
    with pytest.raises(DatasetValidationError):
        run_m1(df, cfg)
```

- [ ] **Step 2: Run → fail** (run_m1 doesn't populate marginals/pairwise yet / no cap).

- [ ] **Step 3: Implement.** Rewrite `run_m1`:
```python
def run_m1(df: pd.DataFrame, config: M1Config) -> M1Result:
    # resolve attribute list (source of truth = protected_attributes,
    # else derive from primary + optional secondary — backward compat)
    if config.protected_attributes:
        attrs = list(config.protected_attributes)
    else:
        attrs = [config.protected_attribute]
        if config.secondary_protected_attribute:
            attrs.append(config.secondary_protected_attribute)
    # validate
    if not 1 <= len(attrs) <= 4:
        raise DatasetValidationError(
            "Sélectionnez entre 1 et 4 attributs protégés.",
            field="protected_attributes",
        )
    if len(set(attrs)) != len(attrs):
        raise DatasetValidationError(
            "Les attributs protégés doivent être distincts.",
            field="protected_attributes",
        )
    for a in attrs:
        if a == config.decision_column or a == config.ground_truth_column:
            raise DatasetValidationError(
                f"L'attribut protégé « {a} » doit différer des colonnes "
                f"décision et vérité-terrain.",
                field="protected_attributes",
            )

    marginals = [
        _marginal_audit(df, config, a, is_primary=(i == 0))
        for i, a in enumerate(attrs)
    ]
    pairwise = [
        run_intersectional_pair(df, config, a, b)
        for a, b in combinations(attrs, 2)
    ]

    order = {"pass": 0, "warn": 1, "fail": 2}
    verdicts = [m.verdict for m in marginals] + [p.verdict for p in pairwise]
    agg_verdict = max(verdicts, key=lambda v: order[v])
    agg_risk = max(
        [m.risk_score for m in marginals] + [p.risk_score for p in pairwise]
    )

    first = marginals[0]
    return M1Result(
        groups=first.groups,
        reference_value=first.reference_value,
        disparate_impact=first.disparate_impact,
        demographic_parity_diff=first.demographic_parity_diff,
        worst_group=first.worst_group,
        verdict=agg_verdict,
        risk_score=agg_risk,
        warnings=first.warnings,
        equal_opportunity_diff=first.equal_opportunity_diff,
        equalized_odds_diff=first.equalized_odds_diff,
        demographic_parity_verdict=first.demographic_parity_verdict,
        equal_opportunity_verdict=first.equal_opportunity_verdict,
        equalized_odds_verdict=first.equalized_odds_verdict,
        truelabel_reason=first.truelabel_reason,
        marginals=tuple(marginals),
        pairwise=tuple(pairwise),
    )
```
Add `from itertools import combinations` at the top. Remove the old single-attribute inline body and the old `secondary_protected_attribute`-driven `run_intersectional` call.
**Backward-compat nuance:** for exactly 1 attribute, `pairwise` is empty and top-level == the single marginal, so the verdict == today's. (The 2-attribute case now aggregates marginals+pair, which intentionally differs from the old "intersectional-only" verdict — update any #19 tests that asserted top-level == intersectional verdict.)

- [ ] **Step 4: Run → pass** (run `tests/audit_engine/test_m1_multi.py` then the whole `tests/audit_engine/ -q`; fix any #19 intersectional engine tests that asserted the removed `.intersectional` field or the old 2-attr verdict — update them to read `.pairwise[0]` / aggregate).
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/audit_engine/m1_supervised.py apps/api/tests/audit_engine/
git commit -m "feat(engine): run_m1 audits N protected attributes (marginals + pairwise, worst-aggregate)"
```

---

## Task 5: DTO — `MarginalOut`, `M1MetricsOut`, `IntersectionalOut`

**Files:** Modify `apps/api/app/schemas/audit.py`
**Test:** add to `apps/api/tests/api/test_schemas_m1.py`

- [ ] **Step 1: Write failing test** asserting `M1MetricsOut.from_engine` maps `marginals` (list of `MarginalOut` with `attribute`) and `pairwise` (list of `IntersectionalOut` with `primary_attribute`/`secondary_attribute`), and that `intersectional` is gone. (Build a small `M1Result` with 1 marginal + 0 pairs and one with 2 marginals + 1 pair.)

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement.**
  - Add `MarginalOut(BaseModel)` mirroring `MarginalResult` (same fields; `groups: list[GroupStatOut]`).
  - `IntersectionalOut`: add `primary_attribute: str = ""`, `secondary_attribute: str = ""`.
  - `M1MetricsOut`: remove `intersectional: IntersectionalOut | None`; add `marginals: list[MarginalOut] = []` and `pairwise: list[IntersectionalOut] = []`.
  - Update the `from_engine` classmethods (`MarginalOut.from_engine`, `IntersectionalOut.from_engine` add the two names, `M1MetricsOut.from_engine` builds `marginals`/`pairwise`).

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/schemas/audit.py apps/api/tests/api/test_schemas_m1.py
git commit -m "feat(api): M1MetricsOut exposes marginals + pairwise (drop singular intersectional)"
```

---

## Task 6: `AuditCreate.protected_attributes` + service wiring

**Files:** Modify `apps/api/app/schemas/audit.py`, `apps/api/app/services/audit_service.py`
**Test:** `apps/api/tests/api/` (extend audit-service + schema tests)

- [ ] **Step 1: Write failing tests**
  - `AuditCreate` accepts `protected_attributes: list[str]` (M1) and validates: 1–4, distinct, ≠ decision/ground_truth; if absent, derive from `protected_attribute` (+secondary). At least one of `protected_attribute` / `protected_attributes` required for M1.
  - `compute_m1_audit` (service) passes `protected_attributes` into `M1Config` and produces `marginals`/`pairwise` in the persisted `M1MetricsOut`; `protected_attributes` is stored in the `config` JSON and read back.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement.**
  - `schemas/audit.py` `AuditCreate`: add `protected_attributes: list[str] | None = None`; in `_per_module` M1 branch, validate as above (derive list when absent; cap 1–4; distinct; ≠ decision/ground_truth; require at least one source).
  - `services/audit_service.py`:
    - `compute_m1_audit`: build `M1Config(..., protected_attributes=tuple(body.protected_attributes or ()))` in addition to the existing single fields (keep them for backward compat). The engine resolves the list.
    - persistence (`submit_audit` M1 branch): store `protected_attributes` into the `config` JSON payload (alongside how `ground_truth_column`/`secondary_protected_attribute` are stored today). Read it back where config is loaded.
    - `_to_metrics_out`: replace the `result_obj.intersectional` mapping with `marginals=[MarginalOut.from_engine(m) for m in result_obj.marginals]` and `pairwise=[IntersectionalOut.from_engine(p) for p in result_obj.pairwise]`.
    - dataset validation at submit: validate every attribute in the resolved list exists in the dataset columns (extend the current single-column check).

- [ ] **Step 4: Run → pass; then full API suite** `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest -q` → green (fix any service/router tests referencing the old `intersectional` field). Gates: ruff + mypy.
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/schemas/audit.py apps/api/app/services/audit_service.py apps/api/tests/
git commit -m "feat(api): accept protected_attributes (1-4) end-to-end; persist in config JSON"
```

---

## Task 7: Interpretation (`m1.py` + prompt)

**Files:** Modify `apps/api/app/interpretation/m1.py`, `apps/api/app/interpretation/prompts/m1_fr.md`
**Test:** `apps/api/tests/api/test_interpret_m1.py` (+ the robustness file)

- [ ] **Step 1: Write failing test** — fallback narrative for a 2-attribute result mentions both attributes' marginals and the worst pair (Gender-Shades framing reads from `pairwise`, not the removed `intersectional`).

- [ ] **Step 2: Run → fail** (current code references `result.intersectional`).

- [ ] **Step 3: Implement.** In `m1.py`: `_metrics_json` serializes `marginals` (per attribute: attribute, disparate_impact, demographic_parity_diff, verdict, groups, EO/EOdds) and `pairwise` (per pair: primary_attribute, secondary_attribute, disparate_impact, marginal_di, worst cell, verdict). `_fallback` builds the narrative from `result.marginals` (describe worst marginal) and `result.pairwise` (worst pair, marginal-vs-intersection contrast). Update `prompts/m1_fr.md` output instructions to the new structure (several attributes + pairs). Keep the existing EO/EOdds normative-tension and sparsity disclaimers, keyed off presence in marginals/pairwise.

- [ ] **Step 4: Run → pass** (interpret tests).
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/interpretation/m1.py apps/api/app/interpretation/prompts/m1_fr.md apps/api/tests/api/test_interpret_m1.py
git commit -m "feat(api): M1 interpretation narrates per-attribute marginals + pairwise crossings"
```

---

## Task 8: Reports (Excel + HTML)

**Files:** Modify `apps/api/app/reporting/excel.py`, `apps/api/app/reporting/html.py`
**Test:** existing reporting tests (`tests/api/test_excel_report.py`, and the HTML report test if present)

- [ ] **Step 1: Write failing test** — build an `M1MetricsOut`/`M1Result` with 2 marginals + 1 pair; assert the Excel workbook has a per-attribute section/rows for each marginal and a section for the pair; assert the HTML contains each attribute name and the `attr_a × attr_b` pair heading. (Mirror the existing intersectional assertions, generalized.)

- [ ] **Step 2: Run → fail** (reports read the old `intersectional`).

- [ ] **Step 3: Implement.** Generalize the current single-intersectional rendering: iterate `marginals` (one block each, reuse the existing per-attribute M1 table rendering) and iterate `pairwise` (one block each, reuse the existing intersectional cell-matrix rendering, titled with `primary_attribute × secondary_attribute`). Remove references to the removed singular field. Read the real functions in `excel.py`/`html.py` and adapt to their structure.

- [ ] **Step 4: Run → pass** (reporting tests + full API suite green). Gates: ruff + mypy.
- [ ] **Step 5: Commit**
```bash
git add apps/api/app/reporting/excel.py apps/api/app/reporting/html.py apps/api/tests/
git commit -m "feat(api): Excel + HTML reports render per-attribute marginals + all pairwise crossings"
```

---

## Task 9: Web — types + wizard multi-select

**Files:** Modify `apps/web/lib/api/audits.ts`, `apps/web/components/audits/wizard/unified/types.ts`, `Step3Config.tsx`, `Step4Verify.tsx`, `Step5Review.tsx`, `app/app/audits/nouveau/page.tsx`
**Test:** `apps/web/__tests__/step3-multi-protected.test.tsx` (create)

- [ ] **Step 1: Write failing test** — render `Step3Config` (M1) in a `FormProvider`+`WizardProvider` harness with a dataset of columns and an analysis with `protected_candidates`; assert: (a) selecting up to 4 attributes records them in form state `protected_attributes`; (b) attempting a 5th is prevented/disabled; (c) the top candidate is pre-selected. (Mirror the existing `__tests__/step3-prefill.test.tsx` harness; place the file in `apps/web/__tests__/` per the project's vitest config.)

- [ ] **Step 2: Run → fail** (`pnpm vitest run __tests__/step3-multi-protected.test.tsx`).

- [ ] **Step 3: Implement.**
  - `lib/api/audits.ts`: `AuditCreate` → `protected_attributes: string[]` (keep `protected_attribute?`/`secondary_protected_attribute?` optional for compat); `M1MetricsOut` → `marginals: MarginalOut[]`, `pairwise: IntersectionalOut[]` (with `primary_attribute`/`secondary_attribute`); add `MarginalOut` type; remove the singular `intersectional`.
  - `unified/types.ts`: `protected_attributes: string[]` (default `[]`), remove `secondary_protected_attribute`.
  - `Step3Config.tsx` (M1): replace the single `protected_attribute` `<select>` AND the advanced `secondary_protected_attribute` `<select>` with a **multi-select** bound to `protected_attributes` (checkbox list or multi-`<select>`), max 4, seeded by `analysis.suggested_protected`/`protected_candidates` (top pre-selected). Keep the prefill effect from A+B for the other fields; prefill `protected_attributes` to `[suggested_protected.column]` if empty.
  - `Step4Verify.tsx` / `Step5Review.tsx`: display the list of selected attributes.
  - `page.tsx` submit: send `protected_attributes` (drop `secondary_protected_attribute`).

- [ ] **Step 4: Run → pass**; `pnpm tsc --noEmit`; `pnpm eslint <changed files>`.
- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/api/audits.ts apps/web/components/audits/wizard/unified/ apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/step3-multi-protected.test.tsx
git commit -m "feat(web): wizard multi-select of protected attributes (1-4) + M1 types"
```

---

## Task 10: Web — result page (marginals + pairwise matrices)

**Files:** Modify the audit result page/components (`apps/web/app/app/audits/[id]/page.tsx` and the M1 result components it uses — locate by searching for the current intersectional matrix rendering).
**Test:** web result component test (mirror existing `audit-result-*` tests)

- [ ] **Step 1: Write failing test** — render the M1 result view with an `M1MetricsOut` containing 2 marginals + 1 pairwise; assert each attribute's marginal card appears (attribute name + DI) and the pairwise matrix renders titled `attr_a × attr_b`.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement.** Find the current single-attribute M1 result rendering and the single intersectional matrix rendering. Generalize: map over `marginals` (one card per attribute, reuse the existing per-attribute rendering) and over `pairwise` (one matrix per pair, reuse the existing intersectional matrix component, titled by attribute names). Remove the singular `intersectional` consumption. Keep the aggregate verdict/risk headline (already top-level in `M1MetricsOut`).

- [ ] **Step 4: Run → pass**; `pnpm tsc --noEmit`; `pnpm eslint <changed>`; then full web suite `pnpm vitest run`.
- [ ] **Step 5: Commit**
```bash
git add apps/web/
git commit -m "feat(web): audit result renders per-attribute marginals + all pairwise matrices"
```

---

## Final verification (before PR)
- [ ] API: `$env:PYTHONUTF8='1'; .\.venv\Scripts\python.exe -m pytest -q` → green
- [ ] API: `ruff check app tests` + `mypy app` → clean
- [ ] Web: `pnpm vitest run` + `pnpm tsc --noEmit` + `pnpm eslint .` → clean (eslint . must stay green — Web CI runs the whole project)
- [ ] Smoke: upload `Data_test/m1-recrutement-biais.csv`, select 2 attributes (sexe, diplome) → result shows 2 marginal cards + 1 pairwise matrix; reports include both.
- [ ] Open PR base `main`, head `feat-m1-multi-protected`.
