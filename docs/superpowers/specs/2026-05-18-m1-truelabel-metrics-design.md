# M1 True-Label Metrics (Equal Opportunity + Equalized Odds) — Design

**Status:** Approved (brainstorm 2026-05-18) — ready for `writing-plans`.
**Type:** Sub-project #1 of 3 deferred-scope increments.

## Context & decomposition

M1+M2+M3 are complete, merged and live-validated on `main` (PRs #1–17). The user elected to start the deferred scope. The three deferred items are independent subsystems and were decomposed into **three sequential sub-projects, each its own brainstorm→spec→plan→build cycle** (like M1/M2/M3):

1. **This spec — M1 true-label metrics (Equal Opportunity + Equalized Odds).**
2. Multi-attribute / intersectional fairness (own later cycle).
3. Async (reframed: narrow long-audit UX, NOT APScheduler/scheduled re-audits) (own later cycle).

**Build order 1→2→3 confirmed by the user.** This spec covers ONLY sub-project #1.

## Goal

The mémoire (`docs/memoire_final (1).docx`, product source of truth) **explicitly specifies** that Module 1 "propose les métriques de référence (Demographic Parity, **Equal Opportunity, Equalized Odds**, règle des quatre cinquièmes)", with a 5-column metric table and a dashboard chart comparing groups on these metrics. The delivered M1 ships only Disparate Impact / Demographic Parity / 4-5 rule. This sub-project **closes that fidelity gap** by adding Equal Opportunity and Equalized Odds as an **optional, backward-compatible extension** of M1 — never degrading or changing the existing M1 behaviour when no ground truth is supplied.

## Decisions locked (from brainstorm)

| # | Decision |
|---|---|
| D1 | **Optional ground-truth column, graceful degradation.** M1 gains an optional ground-truth mapping. Provided → also compute EO + Equalized Odds. Absent → M1 strictly unchanged (DI/DP/4-5 only). Backward-compatible; targets the mémoire's "structures financières/RH matures" audience without excluding data-poor SMEs (whom M2 serves). |
| D2 | **Hand-rolled in `audit_engine`, validated against Fairlearn in tests.** EO/Equalized Odds are closed-form confusion-matrix definitions (not algorithms): runtime stays pure/zero-dependency (consistent with the `audit_engine/` pattern); **tests assert strict equality (within `_ROUND`) with Fairlearn** on real fixtures (Fairlearn = **dev/test dependency only**). Mémoire-defensible: "metrics computed in-house AND verified equal to the reference open-source implementation". |
| D3 | **Per-metric traffic light; global M1 verdict unchanged.** Each metric (DI/4-5, DP, EO, EOdds) gets its own light. The **global M1 verdict stays anchored on the 4/5 rule exactly as today** (the only quasi-regulatory anchor) — EO/EOdds never flip the global verdict. A narrative note explains the impossibility-theorem normative tension. EO/EOdds light thresholds **reuse the gap banding already applied to the Demographic Parity difference** (same tolerance for all parity-gap metrics — no new magic/configurable threshold). |
| D4 | **Degenerate-group policy: skip + warn.** A group with no real positives (TPR undefined) or no real negatives (FPR undefined) is excluded from THAT rate with a non-blocking warning (M2-style). If fewer than 2 comparable groups remain for a metric → that metric is reported "non calculable" with a reason (not an error). |
| D5 | **Binary only; reuse `favorable_value`.** y_pred = `decision_column == favorable_value`; y_true = `ground_truth_column == favorable_value` (same favorable class for prediction and real outcome). No multiclass, no new value-mapping input. |
| D6 | **Integration approach A** — extend `run_m1` in place with an optional `ground_truth_column`; `M1Result` gains optional fields (`None` when absent → bit-identical existing output). Single engine entry point, mirrors how M2/M3 types were appended. |

## Architecture

### 1. Engine (`apps/api/app/audit_engine/`, pure, TDD)

- `run_m1(...)` gains an **optional** `ground_truth_column: str | None = None` parameter (exact signature reconciled with the real `run_m1` at plan time). When `None` → behaviour and output are **byte-identical** to today.
- When provided, a pure helper (new function in the M1 metrics module, or a focused new module imported by `run_m1` — exact placement decided in the plan to match the real M1 file layout) computes, per protected-attribute group:
  - 2×2 confusion counts from `y_pred = (decision_column == favorable_value)` and `y_true = (ground_truth_column == favorable_value)`.
  - `TPR_g = TP/(TP+FN)`, `FPR_g = FP/(FP+TN)`.
  - **Equal Opportunity difference**: TPR gap — vs the `privileged_value` group if `privileged_value` is supplied, else `max_g TPR − min_g TPR`.
  - **Equalized Odds difference**: `max(TPR gap, FPR gap)` using the same reference convention.
  - All values rounded to the existing engine `_ROUND` (4).
- **Degenerate handling (D4):** group with `TP+FN==0` → TPR undefined → excluded from the TPR-based metric + warning; group with `FP+TN==0` → FPR undefined → excluded from the FPR-based metric + warning. If <2 comparable groups remain for a metric, that metric's value is `None` and a `reason` string is recorded; the audit still completes (no exception).
- `M1Result` (frozen dataclass) gains **optional** fields, all `None`/empty when no ground truth (names finalised in the plan against the real `M1Result`): `equal_opportunity` (diff + per-metric verdict), `equalized_odds` (diff + per-metric verdict), per-group `tpr`/`fpr`, and any per-metric verdict for DI/DP needed to render per-metric lights consistently. **Existing fields and the existing global `verdict`/`risk_score` are computed exactly as today** (D3: global verdict still from the 4/5 rule). The pure engine never imports Fairlearn.

### 2. DTO / API (`apps/api/app/schemas/audit.py`, `services/audit_service.py`, `routers`)

- `AuditCreate` gains `ground_truth_column: str | None = None`. Validator: only meaningful for **module M1**; if set it must differ from `decision_column` and `protected_attribute`; for M2/M3 it must be absent (consistent with the existing per-module validator style). Backward-compatible (omitted → `None` → today's M1).
- `M1MetricsOut` gains **optional** fields mirroring the new `M1Result` fields (EO/EOdds diffs, per-metric verdicts, per-group TPR/FPR) — all `None`/absent when no ground truth, so existing M1 responses are unchanged.
- `run_m1_audit` passes the optional `ground_truth_column` through to `run_m1` and maps the new optional result fields to `M1MetricsOut`. `get_audit` round-trips them. No change to M1 persistence shape when absent.

### 3. Interpretation (`apps/api/app/interpretation/m1.py` + prompt)

- Extend the M1 FR prompt and the deterministic `_fallback` so that, **when EO/EOdds are present**, the narrative explains: which metrics show a gap and of what nature; the **impossibility-theorem framing** (Demographic Parity / Equal Opportunity / Equalized Odds cannot all hold simultaneously — every metric choice is a *normative* choice, not purely technical, per the mémoire); and EO/EOdds-specific methodological limits/disclaimers. Anchors: AI Act art. 9/10 + the mémoire's 5-column metric framing. The existing `interpret_m1` "never raises → fallback" contract is preserved. Gemini is now live (key set); fallback remains the safety net.

### 4. Web (`apps/web`)

- M1 wizard: an **optional** "colonne résultat réel (vérité-terrain)" select, M1 path only (other modules unaffected). Sent as `ground_truth_column` only when chosen.
- M1 result page: when EO/EOdds present, render EO + Equalized Odds cards, a per-group TPR/FPR table, per-metric traffic lights, and the normative note; **when absent, the current M1 view is byte-identical**. `lib/api/audits.ts` M1 types gain the optional fields.

### 5. Reporting (transversal)

- The M1 branch of `reporting/excel.py` and `reporting/html.py` gains an EO/Equalized Odds section **only when the fields are present** (all dynamic text HTML-escaped, mirroring the existing M1/M2/M3 branches). PDF works via the existing module-agnostic HTML path (no `apps/pdf` change). When absent → reports byte-identical to today.

## Testing strategy

- Pure-engine TDD for the new metrics (known hand-computed fixtures).
- **Fairlearn cross-validation tests** (Fairlearn added as a **dev/test** dependency only): assert the engine's EO/Equalized Odds equal Fairlearn's (`MetricFrame` / `equalized_odds_difference` / `true_positive_rate` / `false_positive_rate`) within `_ROUND` on real fixtures.
- Degenerate-group tests (no positives / no negatives / <2 comparable groups → skip+warn / "non calculable", no exception).
- **Backward-compatibility tests**: with no `ground_truth_column`, `run_m1`/`M1Result`/`M1MetricsOut`/the web M1 view/the M1 report are byte-identical to pre-change (regression guard for the whole existing M1 path).
- DTO/validator tests (M1 accepts optional ground truth; rejects it for M2/M3; rejects collision with decision/protected).
- Web vitest (wizard optional field; result page conditional EO/EOdds; absent → unchanged) + tsc strict + eslint.
- Report tests (M1 EO/EOdds section present/absent).
- Full gates: api `pytest`/`ruff`/`mypy --strict`, web `vitest`/`typecheck`/`eslint`.

## Out of scope

Multiclass; multi-attribute/intersectional (= sub-project #2); async/scheduled re-audits (= sub-project #3); Fairlearn at runtime; configurable thresholds (the new per-metric lights reuse the existing DP-difference banding); changing the global M1 verdict logic; any M2/M3 behaviour.

## Acceptance criteria

1. With a ground-truth column: M1 returns per-group TPR/FPR, an Equal Opportunity difference and an Equalized Odds difference, each with its own traffic light; the **global M1 verdict is identical to what it would be without these metrics** (still anchored on the 4/5 rule).
2. Without a ground-truth column: `run_m1`, `M1MetricsOut`, the M1 web view and the M1 Excel/PDF report are **byte-identical** to the current `main` (proven by regression tests).
3. EO/Equalized Odds equal Fairlearn's reference implementation within `_ROUND` on the cross-validation fixtures.
4. Degenerate groups are skipped with a non-blocking warning; a metric with <2 comparable groups is reported "non calculable" with a reason; no audit aborts because of this.
5. Interpretation (Gemini or fallback) explains the metrics and the impossibility-theorem normative framing; never raises.
6. All gates green; changes scoped; mémoire "Fairlearn" wording is now defensible (in-house + Fairlearn-validated).

## Notes / reconciliation

The mémoire says M1 "s'appuie sur Fairlearn"; the implementation computes the metrics in-house and **validates them against Fairlearn in tests** (D2). This is functionally faithful and arguably stronger (independent verification). The user reconciles such wording in the .docx as needed (as previously done for ReportLab→Puppeteer); the spec records the rationale.
