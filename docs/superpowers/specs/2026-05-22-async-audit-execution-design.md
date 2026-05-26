# Asynchronous Audit Execution — Design

**Status:** Approved (brainstorm 2026-05-22) — ready for `writing-plans`.
**Type:** Sub-project #3 of 3 deferred-scope increments (the last one).

## Context & decomposition

M1/M2/M3 complete; deferred sub-projects #1 (M1 true-label metrics, PR #18) and #2 (M1 intersectional, PR #19) merged. The deferred scope was decomposed into three sequential sub-projects (user-confirmed order 1→2→3):

1. M1 true-label metrics — merged.
2. M1 intersectional fairness — merged.
3. **This spec — asynchronous audit execution (the "async" item, reframed).**

This spec covers ONLY sub-project #3. After it merges, the deferred scope is exhausted.

## Goal

`POST /audits` is currently **synchronous**: it blocks the HTTP request until the audit finishes and returns `201` with the full result. M3 (LLM/chatbot audit) issues up to ~25 calls to the target LLM under a 45 s budget, so the request can block ~30–45 s — close to or past the proxy/gateway cutoff (Render/Vercel front-ends commonly cut at 30–60 s) and with no progress feedback.

This sub-project makes audit execution **non-blocking**: `POST /audits` validates the request synchronously, creates the audit row, returns **`202` immediately with the audit id**, and runs the computation in an **in-process background task**; the web client redirects to the result page and **polls** the audit status until it is terminal.

**Reframed scope (locked with the user).** This is a narrow long-audit UX improvement, NOT a scheduler. The mémoire's body never describes a scheduled-re-audit feature; it mentions async only as "requêtes asynchrones avec indicateurs de progression / gestion des timeouts" — exactly the submit→poll model here. The mémoire's tech-stack annex does list `APScheduler`; since no feature uses it, that annex line is a documentation reconciliation for the user's `.docx` (like ReportLab→Puppeteer) — it does NOT reopen the no-scheduler decision. Hosting is settled by the mémoire: "backend dockerisé sur Render" — a **persistent container**, so an in-process background task (`asyncio.create_task`) is a correct, infrastructure-free mechanism (no APScheduler, no external queue/worker).

## Decisions locked (from brainstorm)

| # | Decision |
|---|---|
| D1 | **All modules, uniform async contract.** `POST /audits` behaves identically for M1/M2/M3: synchronous validation → create `pending` audit row → `202` + the pending `AuditOut` → background computation. No per-module response-shape split. |
| D2 | **Web redirects to the result page, which polls.** On submit the wizard redirects immediately to `/app/audits/[id]`; that page polls `GET /audits/{id}` while the status is non-terminal and renders the running / failed / done states. The wizard is not the polling host. |
| D3 | **Bounded background concurrency.** A module-level `asyncio.Semaphore` (size = `Settings.audit_max_concurrency`, default 3) gates background execution: audits beyond the cap wait their turn — `status="pending"` while queued, `running` while executing. Protects the single Render container from burst overload. |
| D4 | **Engine approach A** — a generic synchronous `submit_audit` (validate-all + insert the `pending` row) and a generic background `run_audit_job(audit_id)` (semaphore + fresh session + `running` → dispatch by module → `done`/`failed`). The current `run_mX_audit` services are refactored into `compute_mX_audit(session, audit, body)` operating on an already-created row. |
| D5 | **Synchronous validation before `202`; failures become a `failed` status.** All cheap validation runs in `submit_audit` so an invalid request is rejected with `422` immediately (Pydantic DTO; M1/M2 dataset existence; the M3 target SSRF pre-flight). Any exception during the background *computation* sets the audit to `status="failed"` with a persisted `error` message — a crashed audit is never left stuck on `running`. |

## Architecture

### 1. Migration & model (`apps/api`)

- Alembic migration `0005` (down_revision `0004`): add `audits.error` — `String`, nullable — a human-readable failure message for `failed` audits. `app/models/audit.py` `Audit.error: Mapped[str | None]`.
- The existing `audits.status` column is reused; its value domain becomes `pending → running → done | failed` (`pending` is the existing default and now means "queued, not yet executing").

### 2. Service (`app/services/audit_service.py`)

- **`submit_audit(session, *, org_id, user_id, body, llm_provider) -> AuditOut`** — synchronous. Validates everything cheap and fast: Pydantic DTO validation has already run; for M1/M2 it verifies the dataset exists (the current `get_dataset` lookup); for M3 it runs the SSRF pre-flight `assert_public_url(body.target.url)`. On any validation failure it raises `APIError` (mapped to RFC 7807 — `422`/`404`) **before any row is created**. On success it inserts the `audits` row with `status="pending"` (+ the audit code, module, config, etc. exactly as the current services do at creation time), commits, and returns the pending `AuditOut` (`status="pending"`, `metrics=None`, `error=None`).
- **`run_audit_job(audit_id, body, llm_provider) -> None`** — the background coroutine. It receives the in-memory `body` (`AuditCreate`) and `llm_provider` directly — **`body` is NOT reconstructed from the persisted audit row**, because the M3 target's secret (the `Authorization` header) is deliberately never persisted (sub-project M3-B's secret-non-persistence guarantee). The secret-bearing `body` lives only in the in-process task closure for the duration of the computation, exactly as in today's synchronous path. The coroutine: `async with _audit_semaphore` (a module-level `asyncio.Semaphore(get_settings().audit_max_concurrency)`); opens a **fresh** `AsyncSession` (the request-scoped session is closed once the `202` response is sent); loads the audit row; sets `status="running"`; commits; dispatches by `audit.module` to `compute_m1_audit` / `compute_m2_audit` / `compute_m3_audit`; on success sets `status="done"` and persists the `AuditResult`; on **any** exception sets `status="failed"` and `error` to the exception message (and rolls back any partial result), then commits. `run_audit_job` itself never propagates.
- **`compute_mX_audit(session, audit, body)`** — the heavy computation, refactored out of the current `run_mX_audit` (which today does create-row + compute + commit + return `AuditOut`). The row already exists; these functions run the engine / LLM calls / interpretation and write the `AuditResult`. The M3 per-call SSRF guard inside `call_target_llm` remains (defence in depth); per-call target failures stay non-fatal as today.
- `get_audit` is unchanged — it already returns `status` and a nullable `metrics`/`interpretation`; it also returns the new `error`.

### 3. Router (`app/routers/audits.py`)

`POST /audits` → calls `submit_audit` (synchronous validation may raise `APIError` → RFC 7807); schedules `asyncio.create_task(run_audit_job(audit.id, body, llm_provider))` (passing the in-memory `body` so the M3 target secret reaches the computation without ever being persisted); returns **`202`** with the pending `AuditOut`. The endpoint's `status_code` becomes `202`; `response_model` stays `AuditOut`.

### 4. DTO (`app/schemas/audit.py`)

`AuditOut` gains `error: str | None = None`. `status`, `metrics` (`… | None`) and `interpretation` (`… | None`) already exist. The `202` body is an `AuditOut` with `status="pending"`, `metrics=None`, `error=None`. No discriminated-union change.

### 5. Settings (`app/core/config.py`)

`audit_max_concurrency: int = 3`.

### 6. Web (`apps/web`)

- `lib/api/audits.ts`: `AuditOut` type gains `error?: string | null`. `createAudit` already returns `AuditOut`; it now returns the pending one (HTTP 202 — axios treats 2xx as success, no client change needed beyond the type).
- Wizard (`app/app/audits/nouveau/page.tsx`): unchanged — it already redirects to `/app/audits/[id]` via `onDone(audit.id)`; the audit it redirects to is simply `pending`/`running` now instead of `done`.
- Result page (`app/app/audits/[id]/page.tsx`) + `useAudit`: add a `refetchInterval` that polls `GET /audits/{id}` every ~2 s **while `status ∈ {pending, running}`** and stops once the status is terminal (`done`/`failed`). Rendering: `pending`/`running` → an "Analyse en cours…" state (spinner + a module-aware message); `failed` → an error panel showing `error`; `done` → the existing result view (M1/M2/M3 plus the sub-project #1/#2 sections) — unchanged.

## Testing strategy

- API: `submit_audit` rejects synchronously with `422` for an invalid M3 target (SSRF pre-flight) and for a missing dataset (M1/M2) — and creates NO audit row in those cases. `submit_audit` on a valid request creates a `pending` row and returns it. `run_audit_job` happy path: the row transitions `pending → running → done` and the metrics match what the (unchanged) engine/compute produces. `run_audit_job` failure path: a compute exception leaves the row `status="failed"` with `error` set — never stuck on `running`. The bounded semaphore: with `audit_max_concurrency` small, an over-cap audit waits (does not run concurrently). Router `POST /audits` returns `202` with a `pending` `AuditOut`. `get_audit` returns each status correctly. Tests call `run_audit_job` directly (not fire-and-forget) for determinism.
- Web: Vitest — the wizard redirects to the result page on a `202`; the result page renders the running state and polls, renders the `failed` state with the error, renders the `done` state once polling sees it, and stops polling on a terminal status.
- Full gates: api `pytest`/`ruff`/`mypy --strict`, web `vitest`/`typecheck`/`eslint`.
- The live smoke harness `C:/tmp/auditiq_smoke.py` M3 leg currently expects a synchronous `201 done`; with the async model it receives `202 pending` and must poll `GET /audits/{id}`. Updating the smoke harness to poll is a follow-up note (the harness is a developer script, not part of the shipped product; it is not a plan task but is recorded here so it is not forgotten).

## Out of scope

APScheduler; scheduled or recurring re-audits; an external job queue or worker process; websockets/SSE push (polling only); automatic retry of `failed` audits; any change to the M1/M2/M3 audit *computation* itself (the engines and `compute_*` logic are the current `run_mX_audit` bodies, only relocated).

## Acceptance criteria

1. `POST /audits` returns `202` with an `AuditOut` whose `status` is `pending` and `metrics` is `null`, for all three modules.
2. An invalid request (M3 target failing the SSRF pre-flight; M1/M2 with a missing dataset) is rejected synchronously with an RFC 7807 `4xx` and creates no audit row.
3. The background job drives the audit `pending → running → done`, persisting the same metrics/interpretation the previous synchronous path produced (the computation is unchanged).
4. A computation failure sets `status="failed"` with a non-empty `error`; the audit is never left on `running`.
5. Background concurrency is bounded by `audit_max_concurrency`; an over-cap audit queues rather than running immediately.
6. The web result page polls while the status is non-terminal, shows a running state then the done (or failed) state, and stops polling once terminal.
7. All gates green; M1/M2/M3 audit results are byte-equivalent to the pre-change synchronous path; no scheduler/queue dependency added.

## Notes

The audit *computation* is not modified — `compute_mX_audit` are the existing `run_mX_audit` bodies minus row creation. The only behavioural change is *when* the computation runs (after the response, in a bounded background task) and *how* failures surface (a `failed` status + `error` instead of a synchronous `5xx`). Validation that previously raised synchronously inside `run_m3_audit` (the SSRF pre-flight) is hoisted into `submit_audit` so it still produces an immediate `422`.
