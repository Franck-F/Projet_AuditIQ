# Playwright E2E Test Suite — Design

**Status:** Approved (brainstorm 2026-05-26) — ready for `writing-plans`.
**Type:** Standalone post-delivery increment (after PRs #1–20). NOT part of the mémoire's deferred-scope program (which is closed).

## Context

AuditIQ is feature-complete (PRs #1–20 on `main`, HEAD `901767f`): 3 mémoire modules (M1 supervisé / M2 non supervisé / M3 LLM-chatbot), end-to-end (moteur → API FastAPI → web Next.js → rapports Excel + PDF Puppeteer), + the 3 deferred increments (M1 true-label EO/Equalized Odds, M1 intersectional, async audit execution). API tests: pytest 276 ; web tests: vitest 41 ; live Supabase validated 2026-05-17 (smoke harness `C:/tmp/auditiq_smoke.py`). No end-to-end browser-driven test exists yet — the user is starting manual testing and wants a persisted Playwright suite to lock the headline product flows against UI regression going forward.

## Goal

Add a **persisted Playwright E2E suite** under `apps/web/e2e/` covering ~8–10 user-facing scenarios that exercise the full stack (real Supabase Auth + DB, real FastAPI + engines, real reporting). M3 target endpoints use a public echo (`httpbin.org`) — the same pragmatic choice the live smoke uses — because the API's SSRF pre-flight blocks loopback/private addresses by design. The suite is the regression net for what the user sees and clicks; the existing pytest/vitest suites remain the unit/integration nets.

## Decisions locked (from brainstorm)

| # | Decision |
|---|---|
| D1 | **Hybrid backend mode.** Real Supabase Auth + DB + admin-create user per run (smoke pattern), real FastAPI + engines, real Excel/PDF microservice. The M3 target points at **`httpbin.org`** (public echo, same as the smoke). Local loopback mocks would be rejected by the API's SSRF pre-flight by design. |
| D2 | **~8–10 scenarios.** Connexion + M1 simple + M1 with ground-truth + M1 intersectional + M2 + M3 happy (polling) + M3 SSRF (metadata → 422) + M3 failed (target 5xx → `failed`+`error`) + Excel download + PDF download. Covers the 3 mémoire modules **and** the 3 deferred increments **and** the async polling. Chromium only. |
| D3 | **Tests assume the stack is running.** `apps/api` (uvicorn :8000), `apps/web` (next dev :3000), `apps/pdf` (Puppeteer) are launched by the developer with the existing commands. `playwright.config.ts` sets `baseURL: http://localhost:3000` and does NOT autostart any service. (A small `pnpm e2e:up` helper script that launches the 3 in parallel is a nice-to-have, not a blocker.) |
| D4 | **Worker-scoped admin-created test user + `storageState`.** A `global-setup.ts` admin-creates one confirmed Supabase user via the service-role REST API, logs in, and saves Playwright's `storageState.json` (cookies + Supabase tokens). All tests inherit that state — no per-test login. A `global-teardown.ts` deletes the user's org rows (DB) and the Supabase auth user (REST). |
| D5 | **Sequential test execution (no parallel workers).** The single Render container + Supabase free tier do not benefit from parallel browser workers; sequential keeps the audit semaphore + Supabase rate limits comfortable, makes traces readable, and avoids inter-test interference on the shared test user. |
| D6 | **Secrets via `apps/web/e2e/.env.e2e` (gitignored).** A `.env.e2e.example` template is committed. The setup reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon), `SUPABASE_DB_URL`, optional `API_BASE_URL`/`WEB_BASE_URL` overrides. No secret committed. |

## Architecture

### 1. File layout (everything under `apps/web/`)

```
apps/web/
├── playwright.config.ts                  (chromium only; baseURL; storageState; retries=1; sequential)
├── package.json                          (+ devDeps: @playwright/test; + scripts: e2e, e2e:install)
├── .gitignore                            (+ e2e/.env.e2e, e2e/.auth/, test-results/, playwright-report/)
└── e2e/
    ├── .env.e2e.example                  (committed template)
    ├── global-setup.ts                   (admin-create user → password grant → save storageState)
    ├── global-teardown.ts                (SQL cleanup org rows → REST delete auth user)
    ├── helpers/
    │   ├── supabase.ts                   (admin-create-user / delete-user via REST)
    │   ├── db.ts                          (async-pg connection to clean org rows on teardown)
    │   └── poll.ts                       (waitForSelector helpers for "done" / "failed" states)
    ├── fixtures/
    │   ├── m1-simple.csv                 (genre, embauche — known DI≈0.6 fail)
    │   ├── m1-with-truth.csv             (genre, embauche, reel — TPR/FPR computable)
    │   ├── m1-intersectional.csv         (genre, origine, embauche — Simpson's-paradox dataset)
    │   └── m2.csv                        (no sensitive labels — KMeans-friendly)
    ├── auth.spec.ts                      (1 test: storageState is valid → /app accessible)
    ├── m1.spec.ts                        (3 tests: simple / +truth EO/EOdds / intersectional matrix)
    ├── m2.spec.ts                        (1 test: clusters + chi² + traffic light)
    ├── m3.spec.ts                        (3 tests: happy httpbin / SSRF→422 / all-calls-fail non-fatal)
    └── reports.spec.ts                   (2 tests: Excel + PDF downloads on a done M1 audit)
```

**Total: 10 tests** (auth=1 + m1=3 + m2=1 + m3=3 + reports=2).

### 2. `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
    storageState: 'e2e/.auth/user.json',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),
  timeout: 90_000, // M3 happy needs polling up to ~45s
});
```

### 3. `global-setup.ts`

Reads `e2e/.env.e2e`; admin-creates a unique confirmed user (`auditiq-e2e+{ts}@example.com`); requests a password-grant access token via the Supabase auth REST; uses Playwright's `request.newContext` + `storageState` save to write `e2e/.auth/user.json` carrying the Supabase tokens in localStorage (browser context format) so the `(auth)` flow is bypassed for every test. Records the `user_id` + `email` in a `e2e/.auth/meta.json` for teardown.

### 4. `global-teardown.ts`

Reads `e2e/.auth/meta.json`; opens an `asyncpg` connection to `SUPABASE_DB_URL`; deletes `audit_results` / `audits` / `datasets` / `users` / `organizations` rows where `org_id` belongs to the test user (mirrors the smoke harness cleanup query); REST-deletes the auth user. Always best-effort (never fails the run).

### 5. Per-scenario coverage

- **`auth.spec.ts`** — navigates to `/app`, asserts the dashboard renders (not redirected to `/connexion`). Validates `storageState` works.
- **`m1.spec.ts`**
  - *M1 simple* — `/app/audits/nouveau`, choose M1, upload `m1-simple.csv`, map `genre`/`embauche`/`oui`, submit, wait `running`→`done`, assert disparate impact + verdict displayed.
  - *M1 + truth* — same flow with `m1-with-truth.csv`, also map ground-truth column, assert Equal Opportunity + Equalized Odds appear + per-metric badges.
  - *M1 intersectional* — same flow with `m1-intersectional.csv`, choose secondary attribute, assert subgroup matrix + worst cell highlighted + two marginal DIs visible.
- **`m2.spec.ts`** — upload `m2.csv`, choose M2, submit, wait done, assert clusters table + chi² + verdict.
- **`m3.spec.ts`**
  - *M3 happy* — choose M3, target = `https://httpbin.org/anything`, `body_template: {"p":"{prompt}"}`, `response_path: json.p`, submit → expect `202` → result page polls → `done` (n_pairs=12, verdict in pass/warn/fail). Assert running state appears at least once (polling visible).
  - *M3 SSRF* — same form with `url=http://169.254.169.254/latest` → submit → the wizard's `createAudit` call gets `422` RFC 7807 (SSRF rejected by `submit_audit`'s pre-flight before any row is created). The wizard catches the axios error and displays it inline ; the test asserts an error message is visible AND the URL stays on `/app/audits/nouveau` (no redirect to `/app/audits/[id]`).
  - *M3 all-calls-fail (non-fatal)* — `url=https://httpbin.org/status/503` → submit accepted (`202`, valid target passes SSRF). Each per-call 5xx is caught by `run_m3_audit`'s `_one()` (`failed=True` per call). The audit therefore terminates with `status="done"` and `n_calls_failed == n_pairs * variants` (>0), NOT `status="failed"` (which only triggers on a top-level `compute_*` exception). Test asserts: polling reaches `done` ; the result page shows a non-zero "appels en échec" / failure-rate indicator ; the verdict is computed (the engine handles all-failed gracefully via warnings).
- **`reports.spec.ts`** — re-uses the M1 simple audit (or creates a fresh one); on the result page click **"Rapport Excel"** → `page.waitForEvent('download')` resolves, validate the filename suffix; same for **"Rapport PDF"**. Don't open the files; the existing pytest tests cover their content.

### 6. Helpers

`helpers/supabase.ts` (admin-create + delete by id, mirrors the smoke). `helpers/db.ts` (asyncpg-equivalent in Node — uses `pg` or the `postgres` lightweight driver — needed for teardown SQL). `helpers/poll.ts` (a `waitForAuditStatus(page, status, { timeout })` wrapper using `page.waitForSelector` keyed on FR copy: "Analyse en cours", "Audit terminé", "Échec de l'audit").

### 7. `package.json` (additions)

```json
"devDependencies": { "@playwright/test": "^1.49.0", "pg": "^8.13.0" },
"scripts": {
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "e2e:install": "playwright install --with-deps chromium",
  "e2e:report": "playwright show-report"
}
```

A root-level convenience target (e.g. `pnpm --filter @auditiq/web e2e`) is sufficient.

### 8. `.env.e2e.example`

```dotenv
# Copy to e2e/.env.e2e (gitignored) and fill in.
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
SUPABASE_DB_URL=postgresql+asyncpg://...        # for teardown SQL cleanup
WEB_BASE_URL=http://localhost:3000               # optional override
API_BASE_URL=http://localhost:8000/api/v1        # optional override
```

## Out of scope (v1)

Firefox / WebKit browsers ; visual/screenshot regression ; GitHub Actions CI wiring ; sign-up flow tests (admin-create replaces) ; parallel workers ; performance budgets ; testing the M2-C IQR pre-check banner permutations ; M3 with a real LLM provider (Gemini/OpenAI) — out of scope for cost/flakiness reasons (covered by manual testing).

## Acceptance criteria

1. `pnpm --filter @auditiq/web e2e` runs the 10 scenarios sequentially against a locally-running stack (`apps/api` + `apps/web` + `apps/pdf`) and reports pass/fail per spec.
2. Every test starts authenticated via the worker-scoped `storageState` — no per-test login.
3. The M3 happy path observably exercises the async contract: the result page renders the "Analyse en cours" state and then transitions to a `done` state with the M3 metrics.
4. The M3 SSRF target test triggers an immediate `422` (synchronous validation, no row created), surfaced as a form error or an error page — the test asserts the negative outcome without any polling.
5. Cleanup is hermetic: after the run the test user has zero rows in `organizations`/`users`/`datasets`/`audits`/`audit_results`, and the Supabase auth user is deleted.
6. The suite is CI-portable (env-driven config, no hardcoded localhost in fixtures beyond the `baseURL` default which is overridable).
7. The existing `pytest` (276) and `vitest` (41) suites are unchanged and still green — the Playwright suite is purely additive (`apps/web/e2e/`, `playwright.config.ts`, `package.json` scripts/devDeps; no production code edits).

## Operational note (DNS blocker, today)

The user's current network (Meraki) is blocking the Supabase DB pooler hostname (`getaddrinfo failed`). Until this is resolved (Cloudflare WARP / DNS change / different network), the suite cannot run end-to-end (Supabase Auth + DB unreachable). The migration `0005` (`audits.error`) must also be applied to the real Supabase before any `failed` path test (`m3.spec.ts` failed scenario) is exercised — `alembic upgrade head` from `apps/api/` once the DNS resolves. This is an environment concern, not a suite design concern.
