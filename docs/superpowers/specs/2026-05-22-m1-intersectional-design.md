# M1 Intersectional Fairness (2-way protected-attribute crossing) — Design

**Status:** Approved (brainstorm 2026-05-22) — ready for `writing-plans`.
**Type:** Sub-project #2 of 3 deferred-scope increments.

## Context & decomposition

M1 (supervised: DI / Demographic Parity / Equal Opportunity / Equalized Odds / 4-5 rule), M2 (unsupervised), M3 (LLM/chatbot) are complete, merged and live-validated on `main` (PRs #1–18). The deferred scope was decomposed into three sequential sub-projects (user-confirmed order 1→2→3), each its own brainstorm→spec→plan→build cycle:

1. M1 true-label metrics (Equal Opportunity + Equalized Odds) — **merged, PR #18.**
2. **This spec — M1 intersectional fairness (2-way protected-attribute crossing).**
3. Async (reframed: narrow long-audit UX, not APScheduler/scheduled re-audits) — own later cycle.

This spec covers ONLY sub-project #2.

## Goal

M1 today audits **one** protected attribute at a time. The mémoire (`docs/memoire_final (1).docx`, product source of truth) makes the **intersectional** gap its canonical motivating example — Buolamwini & Gebru's *"Gender Shades: Intersectional Accuracy Disparities"* is cited and discussed at length (facial recognition: 99% accuracy for light-skinned men vs 65% for dark-skinned women; 34.7% error for dark-skinned women vs 0.8% for light-skinned men), explicitly called "fondamentale pour les PME". A single-attribute audit can report "gender: compliant" and "origin: compliant" while the **intersection** (e.g. women of foreign origin) is strongly discriminated — invisible to marginal analysis.

This sub-project extends M1 with an **optional, backward-compatible 2-way intersectional analysis**: when the user supplies a second protected attribute, M1 audits the crossed subgroups and surfaces the marginal-vs-intersection contrast. When no second attribute is supplied, M1 is strictly unchanged. It is a genuine extension beyond the mémoire's written module spec (which is why it was deferred), but it makes AuditIQ deliver on the mémoire's own headline example.

## Decisions locked (from brainstorm)

| # | Decision |
|---|---|
| D1 | **Extend M1.** M1 accepts an optional second protected attribute; with ≥2 attributes it audits the crossed subgroups using the same M1 metrics. Backward-compatible (one attribute → today's M1). No new module (the mémoire taxonomy stays M1/M2/M3). |
| D2 | **Exactly 2 attributes crossed.** One primary protected attribute + one optional secondary → a 2-way cross. Matches the canonical Gender Shades case; keeps subgroup count and sparsity tractable on SME-sized data. No 3+ crossing. |
| D3 | **Crossed-cell sparsity → skip + warn (never raise).** On the intersectional path: a crossed cell with `n < min_group_error` (5) is excluded from the metrics with a non-blocking warning; `n < min_group_warn` (30) → a low-confidence warning; fewer than 2 usable cells → the intersectional result is "non calculable" with a reason. Reuses the existing `M1Config` thresholds — no new constant — and NEVER raises. The single-attribute M1 path keeps its current behaviour (raises on `n < min_group_error`). |
| D4 | **Full M1 metric set per crossed cell.** Per crossed cell: n, favorable count, selection rate, Disparate Impact, verdict; and Equal Opportunity / Equalized Odds (per-cell TPR/FPR) when a `ground_truth_column` is also supplied (the complete Gender Shades replication — accuracy/error disparities across intersections, reusing sub-project #1). Reference cell = the doubly-privileged crossed cell (the primary + secondary `privileged_value`s) when both are supplied, else the max-selection-rate cell. |
| D5 | **Intersectional drives the verdict + marginal contrast shown.** In 2-attribute mode the global M1 verdict = the 4-5 rule applied to the **worst crossed-cell Disparate Impact**. The result also carries the **two marginal DIs** (each attribute audited alone) so the UI/report can show the Gender Shades reveal ("gender alone: compliant; origin alone: compliant; women × foreign origin: NOT compliant"). Each crossed cell gets its own traffic light (per sub-project #1's per-metric-light pattern). |
| D6 | **Engine approach A** — a new pure module `intersectional.py` reusing the `metrics.py` helpers; `run_m1` composes it when a second attribute is set and attaches an optional nested field to `M1Result` (`None` when single-attribute → byte-identical). `run_m1` stays focused on the single-attribute path. |

## Architecture

### 1. Engine (`apps/api/app/audit_engine/`, pure, TDD)

- `M1Config` gains optional `secondary_protected_attribute: str | None = None` and `secondary_privileged_value: object | None = None`.
- New pure module `intersectional.py` — `run_intersectional(df, config) -> IntersectionalResult` (pure: no I/O):
  - Builds crossed cells keyed by `(primary_value, secondary_value)` from the two protected columns (compared as strings via `astype(str)`, consistent with `run_m1`).
  - Per cell: `n`, `favorable`, `selection_rate`, `disparate_impact` (cell rate / reference-cell rate, reusing `metrics.disparate_impacts` semantics), per-cell `verdict`; and per-cell `tpr`/`fpr` + the intersectional `equal_opportunity_diff`/`equalized_odds_diff` when `config.ground_truth_column` is set (reusing `metrics.group_confusion`/`truelabel_metrics` from sub-project #1).
  - Reference cell: the `(primary_privileged_value, secondary_privileged_value)` cell when both are supplied, else the max-selection-rate cell.
  - **Sparsity (D3):** a cell with `n < config.min_group_error` is excluded + a non-blocking warning; `n < config.min_group_warn` → a low-confidence warning; fewer than 2 usable cells → `reason` set, metrics `None`, no exception.
  - Computes the **two marginal DIs** — attribute A alone and attribute B alone — by reusing the existing single-attribute selection-rate/DI logic.
  - Global intersectional verdict/`risk_score` = the 4-5-rule bands (`metrics.decide_verdict`/`risk_score`) applied to the worst crossed-cell DI.
  - All values rounded to the engine `_ROUND` (4).
- New frozen dataclasses: `IntersectionalCell` (`primary_value`, `secondary_value`, `n`, `favorable`, `selection_rate`, `disparate_impact`, `verdict`, `tpr: float | None`, `fpr: float | None`) and `IntersectionalResult` (`cells: tuple[IntersectionalCell, ...]`, `reference_primary`, `reference_secondary`, `worst_primary`, `worst_secondary`, `disparate_impact` (min over cells), `demographic_parity_diff`, `equal_opportunity_diff: float | None`, `equalized_odds_diff: float | None`, per-metric verdicts, `marginal_di: tuple` (primary-attribute DI, secondary-attribute DI), `verdict`, `risk_score`, `warnings: tuple[str, ...]`, `reason: str | None`).
- `M1Result` gains an **optional** `intersectional: IntersectionalResult | None = None`.
- `run_m1`: when `config.secondary_protected_attribute is None` → behaviour and output **byte-identical** to today. When set → it still computes the primary single-attribute pass, then calls `run_intersectional`, attaches `M1Result.intersectional`, and **sets `M1Result.verdict`/`risk_score` from the intersectional worst cell** (D5). A configured-but-absent secondary column raises `DatasetValidationError(field="secondary_protected_attribute")`; the secondary attribute must differ from the primary.

### 2. DTO / API (`apps/api/app/schemas/audit.py`, `services/audit_service.py`)

- `AuditCreate` gains `secondary_protected_attribute: str | None = None` and `secondary_privileged_value: str | None = None`. Validator (M1 branch): if `secondary_protected_attribute` is set it must differ from `protected_attribute`, `decision_column`, and `ground_truth_column`; for M2/M3 both new fields must be absent.
- `M1MetricsOut` gains an optional `intersectional: IntersectionalOut | None = None`, where `IntersectionalOut` mirrors `IntersectionalResult` (cells with per-cell stats + verdicts, reference/worst cells, DI, DP, EO/EOdds, per-metric verdicts, marginal DIs, verdict, risk_score, warnings, reason). All optional → existing M1 responses unchanged.
- `run_m1_audit` passes the two new fields into `M1Config` and maps `M1Result.intersectional` into `M1MetricsOut.intersectional`. `get_audit` round-trips it (the M1 branch already `model_validate`s the persisted metrics).

### 3. Interpretation (`apps/api/app/interpretation/m1.py` + prompt)

- Extend the M1 FR prompt and deterministic `_fallback`: when `intersectional` is present, the narrative explains the **marginal-vs-intersection contrast** (the Gender Shades reveal — marginals can look compliant while a crossed subgroup is not), names the worst crossed subgroup, and states the sparsity caveat (small crossed cells excluded; intersectional results are indicative on SME-sized data). Anchors: AI Act art. 9/10. The "never raises → deterministic fallback" contract is preserved; when `intersectional` is absent the interpretation is byte-identical to today.

### 4. Web (`apps/web`)

- M1 wizard: an **optional** "2e attribut protégé (analyse intersectionnelle)" select + an optional secondary privileged-value select, M1 path only (M2/M3 wizard branches and the module-choice-first flow unchanged). Sent as `secondary_protected_attribute`/`secondary_privileged_value` only when chosen.
- M1 result page: when `intersectional` is present, render the **subgroup matrix** (primary values × secondary values; each cell shows selection rate / DI / a traffic light), the worst crossed cell highlighted, the **two marginal DIs side by side** for the contrast, the intersectional EO/Equalized Odds when present, and warnings/reason. When absent, the M1 view is byte-identical to today. `lib/api/audits.ts` M1 types gain the optional `intersectional` field.

### 5. Reporting (transversal)

- The M1 branch of `reporting/excel.py` and `reporting/html.py` gains an intersectional section **only when `intersectional` is present** — the subgroup matrix, the marginal-vs-intersection contrast, the worst cell, warnings/reason. All dynamic HTML values pass through the existing `_e` escape helper. PDF works via the existing module-agnostic HTML path (no `apps/pdf` change). When absent → the M1 report is byte-identical to today.

## Testing strategy

- Pure-engine TDD for `intersectional.py`: crossed-cell construction; reference-cell conventions (doubly-privileged vs max-rate); per-cell DI/verdict; sparsity skip + warning; fewer-than-2-cells → reason, no exception; the two marginal DIs; worst-cell verdict; intersectional EO/Equalized Odds when ground truth is supplied.
- **Backward-compatibility tests:** with no `secondary_protected_attribute`, `run_m1` / `M1Result` / `M1MetricsOut` / the M1 web view / the M1 Excel+HTML report are byte-identical to pre-change.
- A contrast test: a constructed dataset where each marginal DI is compliant but a crossed cell is not — asserting the intersectional verdict is `fail` while the marginals are `pass` (the Gender Shades scenario).
- DTO/validator tests (M1 accepts the optional secondary attribute; rejects collision with primary/decision/ground-truth; rejects the fields for M2/M3).
- Web vitest (wizard optional secondary select; result-page subgroup matrix present/absent) + tsc strict + eslint.
- Report tests (M1 intersectional section present/absent).
- Full gates: api `pytest`/`ruff`/`mypy --strict`, web `vitest`/`typecheck`/`eslint`.

## Out of scope

Crossing 3 or more attributes; intersectional analysis for M2/M3; configurable subgroup-size thresholds (the intersectional path reuses the existing `M1Config` thresholds); a new module; changing the single-attribute M1 verdict logic; any M2/M3 behaviour.

## Acceptance criteria

1. With a second protected attribute: M1 returns a crossed-subgroup matrix (per-cell n/rate/DI/verdict, plus per-cell TPR/FPR + intersectional EO/Equalized Odds when a ground-truth column is supplied), the two marginal DIs, and a global verdict driven by the worst crossed-cell DI.
2. Without a second protected attribute: `run_m1`, `M1MetricsOut`, the M1 web view and the M1 Excel/PDF report are **byte-identical** to the current `main` (proven by regression tests).
3. Crossed cells below `min_group_error` are excluded with a non-blocking warning; fewer than 2 usable cells → "non calculable" with a reason; no audit aborts because of crossed-cell sparsity.
4. A dataset whose marginal DIs are both compliant but whose worst crossed cell is not yields an intersectional `fail` verdict while each marginal reads `pass` — the marginal-vs-intersection contrast is visible in the UI and report.
5. Interpretation (Gemini or fallback) explains the marginal-vs-intersection contrast and the sparsity caveat; never raises.
6. All gates green; changes scoped to the M1/intersectional surface; M2/M3 untouched.

## Notes

The single-attribute M1 path (including its raise-on-small-group behaviour) is unchanged — only the new intersectional path uses skip + warn for crossed cells. The intersectional per-cell EO/Equalized Odds reuse the `metrics.py` helpers delivered and Fairlearn-cross-validated in sub-project #1, so no new metric maths is introduced — only the crossing and aggregation.
