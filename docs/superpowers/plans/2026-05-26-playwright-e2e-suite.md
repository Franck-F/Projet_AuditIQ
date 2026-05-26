# Playwright E2E Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted Playwright E2E suite (10 scenarios) under `apps/web/e2e/` that drives a real Chromium against the locally-running AuditIQ stack — real Supabase Auth+DB, real FastAPI+engines+reports, M3 target = `httpbin.org` (the SSRF guard blocks loopback by design).

**Architecture:** Spec `docs/superpowers/specs/2026-05-26-playwright-e2e-suite-design.md`. Purely additive in `apps/web/` — zero production-code edits. Worker-scoped `globalSetup` admin-creates a Supabase user via the service-role REST and saves a Playwright `storageState`; `globalTeardown` deletes the user's rows via `pg` and the auth user via REST. Sequential execution (single Render container + free Supabase). The suite is designed to be runnable manually (`pnpm --filter @auditiq/web e2e`) and CI-portable (env-driven secrets, no autostart).

**Tech Stack:** `@playwright/test` ^1.49.0 (chromium only), `pg` ^8.13.0 (teardown SQL), Next.js 16 / TypeScript strict (existing), Supabase Auth (admin REST). No new production dependency.

---

## Scope

One coherent additive increment. No production source edits. `apps/api` and `apps/pdf` are NOT touched. **In:** `apps/web/{package.json, .gitignore, playwright.config.ts, e2e/**}`. **Out:** firefox/webkit, screenshots/visual regression, GitHub Actions CI wiring, sign-up flow (admin-create REST replaces), parallel workers, M3 with a real LLM provider, any production-code change.

Commands from repo root: `pnpm --filter @auditiq/web e2e:install` (once, downloads chromium), `pnpm --filter @auditiq/web e2e` (runs the suite), `pnpm --filter @auditiq/web typecheck` (must stay clean throughout). **Commit RULE:** plain `git add` + `git commit -m "..."` — NEVER `-c core.autocrlf=false`. Identity `Franck F <franck-dilane1.fambou@epitech.digital>`; **at execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`** and **cherry-pick BOTH the plan and the spec into the worktree**. NEVER add a Co-Authored-By/Claude trailer.

**Validation model (the suite cannot be fully RUN until the user unblocks the Meraki DNS to the Supabase pooler + applies migration 0005 + starts the stack).** Per-task verification therefore relies on `pnpm --filter @auditiq/web exec playwright test --list` (loads every spec file via the TS compiler + the Playwright test runner, surfaces import/syntax/type errors without executing any test) and `pnpm --filter @auditiq/web typecheck` (full repo tsc). A task is "green" when: every committed `.spec.ts` is **listed** by `playwright test --list` (no load error) AND `pnpm typecheck` is clean AND the existing `pnpm --filter @auditiq/web test` (vitest, 41) stays green (additive). The first complete execution is left to the user once DNS is up.

**Subagent-driven gotcha (from sub-project #1):** before the final review/PR, run `git --no-pager log --oneline origin/main..HEAD` and confirm exactly one commit per task (+ plan + spec); spot-check each task's signature file is in `git diff --stat origin/main..HEAD`.

## File Structure

```
apps/web/
├── package.json                  (devDeps + 4 scripts)
├── .gitignore                    (e2e/.env.e2e, e2e/.auth/, test-results/, playwright-report/)
├── playwright.config.ts          (new; chromium only; baseURL; sequential)
└── e2e/                          (new)
    ├── .env.e2e.example          (committed template)
    ├── global-setup.ts           (admin-create user + login + save storageState)
    ├── global-teardown.ts        (pg cleanup + delete auth user)
    ├── helpers/
    │   ├── supabase.ts           (REST admin-create / delete)
    │   ├── db.ts                 (pg connect + cleanup query)
    │   └── poll.ts               (waitForAuditStatus on FR copy)
    ├── fixtures/
    │   ├── m1-simple.csv         (DI≈0.4 fail; genre, embauche)
    │   ├── m1-with-truth.csv     (genre, embauche, reel — EO/FPR variance)
    │   ├── m1-intersectional.csv (Simpson's-paradox; marginals=1.0, worst cross≈0.33)
    │   └── m2.csv                (4 numeric features + decision; KMeans-friendly)
    ├── auth.spec.ts              (1 test)
    ├── m1.spec.ts                (3 tests: simple / +truth / intersectional)
    ├── m2.spec.ts                (1 test)
    ├── m3.spec.ts                (3 tests: happy httpbin / SSRF→422 / all-calls-fail non-fatal)
    └── reports.spec.ts           (2 tests: Excel + PDF download)
```

Read first (POST-#20 files, authoritative): `apps/web/package.json` (real scripts/devDeps style — check existing `eslint`/`vitest` entries to match); `apps/web/.gitignore`; the smoke harness `C:/tmp/auditiq_smoke.py` (admin-create user pattern, password-grant body, cleanup SQL); `apps/web/lib/supabase/client.ts` (the Supabase project ref / storage key naming `sb-<ref>-auth-token`); `apps/web/app/app/audits/nouveau/page.tsx` (wizard label/regex strings used by the spec tests); `apps/web/app/app/audits/[id]/page.tsx` (running/done/failed UI copy, especially "Analyse en cours", "Score de risque", "Disparate Impact").

---

### Task 1: Dependencies + scripts + `.gitignore` + `.env.e2e.example`

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/.gitignore`
- Create: `apps/web/e2e/.env.e2e.example`

- [ ] **Step 1: Add devDeps + scripts to `apps/web/package.json`**

In `apps/web/package.json`, add to `devDependencies` (alphabetical placement consistent with the file):

```json
"@playwright/test": "^1.49.0",
"pg": "^8.13.0",
"@types/pg": "^8.11.10"
```

Add to `scripts` (preserve all existing scripts):

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui",
"e2e:install": "playwright install --with-deps chromium",
"e2e:report": "playwright show-report"
```

Run: `pnpm --filter @auditiq/web install` (regenerates `pnpm-lock.yaml` to pick up the new devDeps).

- [ ] **Step 2: Append e2e ignores to `apps/web/.gitignore`**

Append (preserve existing content):

```
# Playwright E2E
e2e/.env.e2e
e2e/.auth/
test-results/
playwright-report/
```

- [ ] **Step 3: Create `apps/web/e2e/.env.e2e.example` (committed template)**

```dotenv
# Copy to apps/web/e2e/.env.e2e (gitignored) and fill in.
# All values are read by global-setup.ts and global-teardown.ts.

# Supabase project (server-side: service role; client-side: publishable/anon).
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>

# Postgres direct (the same value as the API's SUPABASE_DB_URL; can be the
# `postgresql+asyncpg://...` form — global-teardown.ts strips the +asyncpg
# adapter prefix so node-postgres can consume it).
SUPABASE_DB_URL=postgresql+asyncpg://<user>:<pwd>@<host>:<port>/<db>?sslmode=require

# Optional URL overrides (defaults below).
WEB_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000/api/v1
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @auditiq/web typecheck`
Expected: clean (no TS files added yet; only deps + scripts changed). Also confirm `apps/web/node_modules/@playwright/test/package.json` exists (the install succeeded) — `node -e "console.log(require('@playwright/test/package.json').version)"` from `apps/web/` prints `1.49.x`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/.gitignore apps/web/e2e/.env.e2e.example
# the root pnpm-lock.yaml may also need adding if pnpm hoisted at the root
git add pnpm-lock.yaml 2>/dev/null
git commit -m "chore(web): add @playwright/test + pg dev deps + e2e scripts"
```

---

### Task 2: `playwright.config.ts`

**Files:**
- Create: `apps/web/playwright.config.ts`

- [ ] **Step 1: Create the config**

Create `apps/web/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(__dirname, 'e2e/.env.e2e') });

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),
  timeout: 90_000,
});
```

> `dotenv` is a transitive dep of `@playwright/test`'s ecosystem; if `pnpm --filter @auditiq/web exec playwright --version` doesn't resolve `dotenv` for the config file, add `dotenv: ^16.4.5` to `devDependencies` in Task 1 and re-`pnpm install` — verify by `node -e "require('dotenv')"` from `apps/web/`. The config MUST load `.env.e2e` before tests run because `globalSetup`/teardown read the secrets from `process.env`.

- [ ] **Step 2: Install chromium**

Run: `pnpm --filter @auditiq/web e2e:install`
Expected: chromium downloads (a few hundred MB on first run). Subsequent runs are no-ops.

- [ ] **Step 3: Verify the config loads**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | head -5`
Expected: the runner loads the config without error; output mentions `0 tests` (no spec yet) — this is a SUCCESS for Task 2 because the config + globalSetup files don't exist yet. Errors about missing `./e2e/global-setup` are expected and become passing in Task 4 ; treat any TypeScript / module-resolution error in the **config itself** as a failure.

Also run: `pnpm --filter @auditiq/web typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/playwright.config.ts
git commit -m "feat(web): playwright config (chromium, sequential, storageState)"
```

---

### Task 3: Helpers — `supabase.ts`, `db.ts`, `poll.ts`

**Files:**
- Create: `apps/web/e2e/helpers/supabase.ts`
- Create: `apps/web/e2e/helpers/db.ts`
- Create: `apps/web/e2e/helpers/poll.ts`

- [ ] **Step 1: Create `apps/web/e2e/helpers/supabase.ts`**

```ts
/** Thin Supabase REST helpers used by global-setup / global-teardown.
 *  Mirrors the smoke harness pattern (admin-create with service role,
 *  password grant with publishable/anon key, delete user by id). */
export interface CreatedUser {
  id: string;
  email: string;
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email: string };
}

const supabaseUrl = (): string => {
  const u = process.env.SUPABASE_URL;
  if (!u) throw new Error('SUPABASE_URL not set in e2e/.env.e2e');
  return u.replace(/\/+$/, '');
};

const serviceRole = (): string => {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return k;
};

const publishable = (): string => {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!k) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) not set');
  return k;
};

export async function adminCreateUser(
  email: string,
  password: string,
): Promise<CreatedUser> {
  const key = serviceRole();
  const r = await fetch(`${supabaseUrl()}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!r.ok) {
    throw new Error(
      `admin create user failed: ${r.status} ${await r.text().catch(() => '')}`,
    );
  }
  const data = (await r.json()) as { id: string; email: string };
  return { id: data.id, email: data.email };
}

export async function passwordGrant(
  email: string,
  password: string,
): Promise<SessionTokens> {
  const key = publishable();
  const r = await fetch(
    `${supabaseUrl()}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!r.ok) {
    throw new Error(
      `password grant failed: ${r.status} ${await r.text().catch(() => '')}`,
    );
  }
  return (await r.json()) as SessionTokens;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const key = serviceRole();
  const r = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  if (!r.ok && r.status !== 404) {
    // best-effort; do not throw from teardown
    // eslint-disable-next-line no-console
    console.warn(
      `[e2e teardown] adminDeleteUser ${userId}: ${r.status} ${await r.text().catch(() => '')}`,
    );
  }
}

/** Project ref extracted from SUPABASE_URL — used to build the
 *  Supabase localStorage key `sb-<ref>-auth-token` that the browser
 *  client expects. */
export function projectRef(): string {
  const host = new URL(supabaseUrl()).host;
  const ref = host.split('.')[0];
  if (!ref) throw new Error(`cannot derive project ref from ${host}`);
  return ref;
}
```

- [ ] **Step 2: Create `apps/web/e2e/helpers/db.ts`**

```ts
/** node-postgres connection to Supabase (used only by global-teardown).
 *  Strips the `+asyncpg` SQLAlchemy adapter from the URL since node-postgres
 *  consumes plain `postgresql://`. */
import { Client } from 'pg';

const dbUrl = (): string => {
  const u = process.env.SUPABASE_DB_URL;
  if (!u) throw new Error('SUPABASE_DB_URL not set in e2e/.env.e2e');
  // postgresql+asyncpg://... -> postgresql://...
  return u.replace(/^postgresql\+asyncpg:\/\//, 'postgresql://');
};

export async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: dbUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Mirrors the smoke harness cleanup: delete every row owned by the
 *  test user's org. Best-effort; logs but does not throw. */
export async function cleanupUserData(userId: string): Promise<void> {
  try {
    await withClient(async (c) => {
      const r = await c.query<{ org_id: string }>(
        'select org_id from users where id = $1',
        [userId],
      );
      const orgId = r.rows[0]?.org_id;
      if (!orgId) return;
      await c.query(
        `delete from audit_results where audit_id in
           (select id from audits where org_id = $1)`,
        [orgId],
      );
      for (const tbl of ['audits', 'datasets', 'users']) {
        await c.query(`delete from ${tbl} where org_id = $1`, [orgId]);
      }
      await c.query('delete from organizations where id = $1', [orgId]);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[e2e teardown] cleanupUserData failed (best-effort):', err);
  }
}
```

- [ ] **Step 3: Create `apps/web/e2e/helpers/poll.ts`**

```ts
import { type Page, expect } from '@playwright/test';

/** Wait until the audit result page reaches a terminal state.
 *  The web result page renders FR copy:
 *    - running:  "Analyse en cours"
 *    - failed:   error panel (role=alert) — heading typically contains "Échec"
 *    - done:     module-specific KPIs ("Score de risque" / "Disparate Impact" / etc.)
 *
 *  We watch the FRONT for the terminal text — the front polls /audits/{id} every 2s. */
export async function waitForAuditDone(
  page: Page,
  { timeout = 60_000 } = {},
): Promise<void> {
  await expect(page.getByText(/Score de risque|Disparate Impact/i)).toBeVisible({ timeout });
}

export async function waitForAuditFailed(
  page: Page,
  { timeout = 60_000 } = {},
): Promise<void> {
  // failed panel uses role="alert"
  await expect(page.getByRole('alert')).toBeVisible({ timeout });
  await expect(page.getByText(/Échec|failed/i)).toBeVisible({ timeout });
}

/** Soft check that we passed through the running state (the polling tick may
 *  jump straight to done on fast modules; do not assert it strictly). */
export async function sawRunningState(page: Page): Promise<boolean> {
  try {
    await page
      .getByText(/Analyse en cours/i)
      .waitFor({ state: 'visible', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @auditiq/web typecheck`
Expected: clean (helpers are TS-only, no runtime invocation yet).

Also confirm: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -3`
Expected: still loads (no specs yet) — Playwright config will complain about the missing `./e2e/global-setup` module (added in Task 4); the helpers themselves do NOT block load since nothing imports them yet. If Playwright errors on the missing setup, that is acceptable for this task — `pnpm typecheck` is the gate.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/helpers/
git commit -m "feat(web/e2e): Supabase REST + pg cleanup + polling helpers"
```

---

### Task 4: `global-setup.ts` + `global-teardown.ts`

**Files:**
- Create: `apps/web/e2e/global-setup.ts`
- Create: `apps/web/e2e/global-teardown.ts`

- [ ] **Step 1: Create `apps/web/e2e/global-setup.ts`**

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import {
  adminCreateUser,
  passwordGrant,
  projectRef,
  type SessionTokens,
} from './helpers/supabase';

const AUTH_DIR = path.resolve(__dirname, '.auth');
const STATE_PATH = path.join(AUTH_DIR, 'user.json');
const META_PATH = path.join(AUTH_DIR, 'meta.json');

interface Meta {
  user_id: string;
  email: string;
  created_at: string;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  const ts = Date.now();
  const email = `auditiq-e2e+${ts}@example.com`;
  const password = `E2E!${ts}aZ9q`;

  const user = await adminCreateUser(email, password);
  const tokens: SessionTokens = await passwordGrant(email, password);
  // The Supabase browser client stores its session at
  //   localStorage[`sb-${projectRef}-auth-token`] = JSON.stringify({...})
  const key = `sb-${projectRef()}-auth-token`;
  const value = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    expires_at:
      tokens.expires_at ?? Math.floor(Date.now() / 1000) + tokens.expires_in,
    token_type: tokens.token_type,
    user: tokens.user,
  });

  const origin = new URL(baseUrl).origin;
  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: key, value }],
      },
    ],
  };

  await fs.mkdir(AUTH_DIR, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(storageState, null, 2), 'utf8');
  const meta: Meta = {
    user_id: user.id,
    email: user.email,
    created_at: new Date().toISOString(),
  };
  await fs.writeFile(META_PATH, JSON.stringify(meta, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`[e2e setup] created test user ${email} (${user.id})`);
}
```

- [ ] **Step 2: Create `apps/web/e2e/global-teardown.ts`**

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { adminDeleteUser } from './helpers/supabase';
import { cleanupUserData } from './helpers/db';

const META_PATH = path.resolve(__dirname, '.auth/meta.json');

interface Meta {
  user_id: string;
  email: string;
}

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  let meta: Meta | null = null;
  try {
    const raw = await fs.readFile(META_PATH, 'utf8');
    meta = JSON.parse(raw) as Meta;
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[e2e teardown] no meta.json — nothing to clean');
    return;
  }

  await cleanupUserData(meta.user_id);
  await adminDeleteUser(meta.user_id);

  // best-effort: remove auth artefacts so the next run starts fresh
  try {
    await fs.rm(path.dirname(META_PATH), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.log(`[e2e teardown] removed test user ${meta.email} (${meta.user_id})`);
}
```

- [ ] **Step 3: Verify the runner can load setup/teardown**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -10`
Expected: the runner loads `globalSetup`/`globalTeardown` without TS errors. Without any `.spec.ts` yet, the output is `Total: 0 tests`. **It must NOT execute the setup** (`test --list` skips `globalSetup` — that's the point). If you see "Error: Cannot find module ./e2e/global-setup", recheck the file name.

Also: `pnpm --filter @auditiq/web typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/global-setup.ts apps/web/e2e/global-teardown.ts
git commit -m "feat(web/e2e): global setup (admin-create + storageState) + teardown"
```

---

### Task 5: Fixture CSVs

**Files:**
- Create: `apps/web/e2e/fixtures/m1-simple.csv`
- Create: `apps/web/e2e/fixtures/m1-with-truth.csv`
- Create: `apps/web/e2e/fixtures/m1-intersectional.csv`
- Create: `apps/web/e2e/fixtures/m2.csv`

- [ ] **Step 1: `m1-simple.csv` — gender bias, DI ≈ 0.40 (fail)**

```csv
genre,embauche
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,oui
homme,non
homme,non
homme,non
homme,non
homme,non
homme,non
homme,non
homme,non
homme,non
homme,non
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,oui
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
femme,non
```
> 40 hommes (30 oui / 10 non → rate 0.75) + 40 femmes (12 oui / 28 non → rate 0.30) → DI = 0.30 / 0.75 = 0.40 → `fail` (4/5 rule).

- [ ] **Step 2: `m1-with-truth.csv` — adds `reel` for EO/Equalized Odds**

```csv
genre,embauche,reel
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,oui
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,oui,non
homme,non,oui
homme,non,oui
homme,non,oui
homme,non,oui
homme,non,oui
homme,non,non
homme,non,non
homme,non,non
homme,non,non
homme,non,non
femme,oui,oui
femme,oui,oui
femme,oui,oui
femme,oui,oui
femme,oui,oui
femme,oui,non
femme,oui,non
femme,oui,non
femme,oui,non
femme,oui,non
femme,oui,non
femme,oui,non
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,oui
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
femme,non,non
```
> Per-group confusion (oui=favorable):
> - hommes: TP=20, FP=10, FN=5, TN=5 → TPR=0.80, FPR=0.667
> - femmes: TP=5, FP=7, FN=15, TN=13 → TPR=0.25, FPR=0.350
> EO diff = |0.80 − 0.25| = 0.55 (fail). Equalized Odds diff = max(0.55, 0.317) = 0.55.

- [ ] **Step 3: `m1-intersectional.csv` — Simpson's-paradox (marginals=1.0, worst cross≈0.33)**

```csv
genre,origine,embauche
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,oui
homme,francaise,non
homme,francaise,non
homme,francaise,non
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,oui
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
homme,etrangere,non
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,oui
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,francaise,non
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,oui
femme,etrangere,non
femme,etrangere,non
femme,etrangere,non
```
> 30+30+30+30 = 120 rows. Cell rates: h×fr=27/30=0.9, h×etr=9/30=0.3, f×fr=9/30=0.3, f×etr=27/30=0.9. Marginal rates: hommes 36/60=0.6, femmes 36/60=0.6 → marginal DI = 1.0 ; françaises 36/60=0.6, étrangères 36/60=0.6 → marginal DI = 1.0. Worst crossed DI = 0.3/0.9 = 0.333 → **intersectional fail while both marginals pass** — the headline contrast.

- [ ] **Step 4: `m2.csv` — unsupervised, no sensitive label**

```csv
age,salaire,anciennete,decision
24,28000,1,non
25,29000,1,non
26,30000,2,non
27,31000,2,non
24,28500,1,non
25,29500,1,non
26,30500,2,non
27,31500,2,non
24,29000,1,non
25,30000,2,non
26,31000,2,non
27,32000,2,non
35,45000,5,oui
36,46000,5,oui
37,47000,6,oui
38,48000,6,oui
35,45500,5,oui
36,46500,5,oui
37,47500,6,oui
38,48500,6,oui
35,46000,5,oui
36,47000,6,oui
37,48000,6,oui
38,49000,7,oui
48,62000,12,oui
49,63000,12,oui
50,64000,13,oui
51,65000,13,oui
48,62500,12,oui
49,63500,12,oui
50,64500,13,oui
51,65500,13,oui
48,63000,12,oui
49,64000,13,oui
50,65000,13,oui
51,66000,14,oui
30,35000,3,non
31,36000,3,non
32,37000,4,non
33,38000,4,non
30,35500,3,non
31,36500,3,non
32,37500,4,non
33,38500,4,non
30,36000,3,non
31,37000,4,non
32,38000,4,non
33,39000,4,non
```
> 48 rows in 4 well-separated clusters of 12 ; positive rates per cluster very different (0% / 100% / 100% / 0%) → guaranteed deviant clusters detected by KMeans+χ². Decision column is the only "label"; no `genre`/`origine`/`age` is mapped as a protected attribute (M2 is unsupervised).

- [ ] **Step 5: Verify**

Run: `pnpm --filter @auditiq/web typecheck`
Expected: clean (CSVs are not TS).
Also confirm: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -3`
Expected: still loads, still `0 tests`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/fixtures/
git commit -m "feat(web/e2e): fixture CSVs (M1 simple/+truth/intersectional + M2)"
```

---

### Task 6: `auth.spec.ts` — storage state validation

**Files:**
- Create: `apps/web/e2e/auth.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('auth', () => {
  test('storageState is valid — /app is accessible without re-login', async ({ page }) => {
    await page.goto('/app');
    // If storageState is OK, /app renders (dashboard or audits list).
    // If broken, the middleware redirects to /connexion.
    await expect(page).not.toHaveURL(/\/connexion/);
    // soft check: header / nav text consistent with the protected layout
    await expect(page.locator('body')).toContainText(/audit|tableau|dashboard/i);
  });
});
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -5`
Expected: lists exactly **1 test** under `auth.spec.ts ... auth > storageState is valid …`. No load error.

Also: `pnpm --filter @auditiq/web typecheck` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/auth.spec.ts
git commit -m "test(web/e2e): auth — storageState valid for /app"
```

---

### Task 7: `m1.spec.ts` — 3 M1 scenarios

**Files:**
- Create: `apps/web/e2e/m1.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/m1.spec.ts`**

```ts
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

async function gotoNewAudit(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/app/audits/nouveau');
}

async function chooseModuleM1(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /audit supervis/i }).click();
}

async function uploadCsv(page: import('@playwright/test').Page, file: string): Promise<void> {
  const input = page.locator('[data-testid="csv-input"]');
  await input.setInputFiles(path.join(FIXTURES, file));
}

test.describe('M1 supervisé', () => {
  test('happy: gender bias produces a done audit with disparate impact', async ({ page }) => {
    await gotoNewAudit(page);
    await chooseModuleM1(page);
    await uploadCsv(page, 'm1-simple.csv');
    await page.getByLabel(/titre/i).fill('E2E M1 simple');
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    await expect(page.getByText(/Disparate Impact/i)).toBeVisible();
    await expect(page.getByText(/Score de risque/i)).toBeVisible();
  });

  test('+ ground truth: Equal Opportunity & Equalized Odds shown', async ({ page }) => {
    await gotoNewAudit(page);
    await chooseModuleM1(page);
    await uploadCsv(page, 'm1-with-truth.csv');
    await page.getByLabel(/titre/i).fill('E2E M1 truth');
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByLabel(/résultat réel|vérité.?terrain/i)
      .selectOption('reel');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    await expect(
      page.getByText(/Equal Opportunity|égalité des chances/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Equalized Odds|cotes égalisées/i).first(),
    ).toBeVisible();
  });

  test('intersectional: subgroup matrix + 2 marginal DIs + worst cell highlighted', async ({ page }) => {
    await gotoNewAudit(page);
    await chooseModuleM1(page);
    await uploadCsv(page, 'm1-intersectional.csv');
    await page.getByLabel(/titre/i).fill('E2E M1 intersectional');
    await page.getByLabel(/attribut prot/i).selectOption('genre');
    await page.getByLabel(/colonne de d/i).selectOption('embauche');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByLabel(/attribut secondaire|attribut.*intersection/i)
      .selectOption('origine');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // The subgroup matrix renders the crossed cell labels (e.g. etr/femme).
    await expect(page.getByText(/intersection|sous-groupe/i).first()).toBeVisible();
    await expect(page.getByText(/etrangere/i).first()).toBeVisible();
    // The 2 marginal DIs appear side-by-side. With this dataset both = 1.0
    // and the worst crossed DI ≈ 0.33 (fail) — assert by presence of "0.33" or "0.3".
    await expect(page.getByText(/0\.33|0\.3/).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -8`
Expected: lists **4 tests** total (auth=1 + m1=3). All under their respective describes.

Also: `pnpm --filter @auditiq/web typecheck` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/m1.spec.ts
git commit -m "test(web/e2e): M1 — simple, +ground-truth, intersectional"
```

---

### Task 8: `m2.spec.ts` — unsupervised happy path

**Files:**
- Create: `apps/web/e2e/m2.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/m2.spec.ts`**

```ts
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

test.describe('M2 non supervisé', () => {
  test('happy: clusters table + chi² + verdict', async ({ page }) => {
    await page.goto('/app/audits/nouveau');
    await page.getByRole('button', { name: /détection non supervis/i })
      .click();
    await page.locator('[data-testid="csv-input"]').setInputFiles(
      path.join(FIXTURES, 'm2.csv'),
    );
    await page.getByLabel(/titre/i).fill('E2E M2');
    await page.getByLabel(/colonne de d/i).selectOption('decision');
    await page.getByLabel(/valeur favorable/i).fill('oui');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    await waitForAuditDone(page);
    // M2 result page renders the clusters table + chi² test.
    await expect(page.getByText(/Par cluster|cluster/i).first()).toBeVisible();
    await expect(page.getByText(/χ²|chi/i).first()).toBeVisible();
    await expect(page.getByText(/Score de risque/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -5`
Expected: **5 tests** listed total.

Also: `pnpm --filter @auditiq/web typecheck` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/m2.spec.ts
git commit -m "test(web/e2e): M2 — unsupervised clusters happy path"
```

---

### Task 9: `m3.spec.ts` — happy + SSRF + all-calls-fail-non-fatal

**Files:**
- Create: `apps/web/e2e/m3.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/m3.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { waitForAuditDone, sawRunningState } from './helpers/poll';

const HTTPBIN_OK = 'https://httpbin.org/anything';
const SSRF_METADATA = 'http://169.254.169.254/latest';
const HTTPBIN_503 = 'https://httpbin.org/status/503';

async function chooseModuleM3(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/app/audits/nouveau');
  await page.getByRole('button', { name: /llm|chatbot/i }).click();
}

async function fillM3Form(
  page: import('@playwright/test').Page,
  url: string,
  title: string,
): Promise<void> {
  await page.getByLabel(/titre/i).fill(title);
  await page.getByLabel(/url/i).fill(url);
  // The preset selector defaults to OpenAI-compatible — that's fine; we only
  // need the URL to differ. body_template / response_path are pre-filled.
}

test.describe('M3 LLM/chatbot', () => {
  test('happy: httpbin echo target → polling → done', async ({ page }) => {
    await chooseModuleM3(page);
    await fillM3Form(page, HTTPBIN_OK, 'E2E M3 happy');
    // Re-write the body_template + response_path for httpbin (it echoes JSON
    // back at .json.<key>).
    await page.getByLabel(/corps de requête|body/i).fill(
      '{"p":"{prompt}"}',
    );
    await page.getByLabel(/chemin de la réponse|response.?path/i).fill(
      'json.p',
    );
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    // soft check that polling exposed the running state at least once
    await sawRunningState(page);
    await waitForAuditDone(page, { timeout: 90_000 });
    await expect(page.getByText(/Score de risque|risk/i).first()).toBeVisible();
  });

  test('SSRF: cloud metadata URL → immediate 422, no redirect', async ({ page }) => {
    await chooseModuleM3(page);
    await fillM3Form(page, SSRF_METADATA, 'E2E M3 SSRF');
    await page.getByLabel(/corps de requête|body/i).fill('{"p":"{prompt}"}');
    await page.getByLabel(/chemin de la réponse|response.?path/i).fill('a');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    // The wizard catches the 422 and shows an inline error; the URL must NOT
    // change to /app/audits/{id}.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/app\/audits\/nouveau/);
  });

  test('all-calls-fail-non-fatal: 503 target → done with failures counted', async ({ page }) => {
    await chooseModuleM3(page);
    await fillM3Form(page, HTTPBIN_503, 'E2E M3 503');
    await page.getByLabel(/corps de requête|body/i).fill('{"p":"{prompt}"}');
    await page.getByLabel(/chemin de la réponse|response.?path/i).fill('json.p');
    await page.getByRole('button', { name: /lancer|créer/i }).click();
    await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
    // Per-call 5xx is caught by run_m3_audit's _one() → audit ends DONE
    // with n_calls_failed > 0; it does NOT end in `failed` status.
    await waitForAuditDone(page, { timeout: 90_000 });
    await expect(page.getByText(/appels en échec|n_calls_failed/i).first())
      .toBeVisible();
    // Sanity: no error panel
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -8`
Expected: **8 tests** listed total.

Also: `pnpm --filter @auditiq/web typecheck` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/m3.spec.ts
git commit -m "test(web/e2e): M3 — happy / SSRF→422 / all-calls-fail non-fatal"
```

---

### Task 10: `reports.spec.ts` — Excel + PDF downloads

**Files:**
- Create: `apps/web/e2e/reports.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/reports.spec.ts`**

```ts
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { waitForAuditDone } from './helpers/poll';

const FIXTURES = path.resolve(__dirname, 'fixtures');

async function createDoneM1(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/app/audits/nouveau');
  await page.getByRole('button', { name: /audit supervis/i }).click();
  await page.locator('[data-testid="csv-input"]').setInputFiles(
    path.join(FIXTURES, 'm1-simple.csv'),
  );
  await page.getByLabel(/titre/i).fill('E2E reports');
  await page.getByLabel(/attribut prot/i).selectOption('genre');
  await page.getByLabel(/colonne de d/i).selectOption('embauche');
  await page.getByLabel(/valeur favorable/i).fill('oui');
  await page.getByRole('button', { name: /lancer|créer/i }).click();
  await page.waitForURL(/\/app\/audits\/[0-9a-f-]{36}/);
  await waitForAuditDone(page);
}

test.describe('reports', () => {
  test('downloads the Excel report (.xlsx)', async ({ page }) => {
    await createDoneM1(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /excel/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });

  test('downloads the PDF report (.pdf)', async ({ page }) => {
    await createDoneM1(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /pdf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter @auditiq/web exec playwright test --list 2>&1 | tail -10`
Expected: **10 tests** listed total (auth=1, m1=3, m2=1, m3=3, reports=2).

Also: `pnpm --filter @auditiq/web typecheck` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/reports.spec.ts
git commit -m "test(web/e2e): reports — Excel + PDF download"
```

---

### Task 11: Full gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: All 10 tests listed**

Run: `pnpm --filter @auditiq/web exec playwright test --list`
Expected: `Total: 10 tests` across 5 spec files (auth, m1, m2, m3, reports).

- [ ] **Step 2: Web TS + lint + existing tests**

Run: `pnpm --filter @auditiq/web typecheck`
Expected: clean.

Run: `pnpm --filter @auditiq/web test`
Expected: existing vitest suite **41 passed** (the Playwright add is purely additive and must not regress vitest).

Run: `pnpm --filter @auditiq/web lint`
Expected: exit 0, the 3 pre-existing known `consistent-type-imports` warnings only (Playwright code uses `import type` correctly; if a new warning surfaces, fix it).

- [ ] **Step 3: API regression guard (additive must not break api)**

Run: `cd apps/api && uv run python -m pytest -q`
Expected: **276 passed** unchanged (zero touch on `apps/api/`).

- [ ] **Step 4: Scope + identity + chain sanity**

Run: `git --no-pager diff --name-only origin/main..HEAD` — confined to `apps/web/{package.json, pnpm-lock.yaml, .gitignore, playwright.config.ts, e2e/**}` (+ optionally root `pnpm-lock.yaml`) + `docs/superpowers/{plans,specs}/2026-05-26-playwright-e2e-suite*`. Nothing under `apps/api/`, `apps/pdf/`, `apps/web/app/`, `apps/web/lib/`, `apps/web/__tests__/` — strict additivity. Run `git --no-pager log --oneline origin/main..HEAD` — confirm one commit per task (T1–T10 + plan + spec). `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — only `franck-dilane1.fambou@epitech.digital`. No 142/142 whole-file CRLF churn.

- [ ] **Step 5: Commit any gate fixups**

```bash
git add -A
git commit -m "chore(web/e2e): gate fixups for Playwright E2E suite"
```
(Skip if Steps 1–4 already clean.)

---

## Self-Review

**1. Spec coverage:** D1 hybrid Supabase + httpbin → Task 4 (admin-create user + storageState) + Tasks 7/9/10 (tests pointing at real Supabase via storageState + httpbin URLs in M3). D2 10 scenarios → Tasks 6,7,8,9,10 — exact counts match (1+3+1+3+2=10). D3 stack assumed running → Task 2 (`playwright.config.ts` no `webServer`). D4 globalSetup admin-create + storageState + teardown → Tasks 3+4. D5 sequential → Task 2 (`fullyParallel:false, workers:1`). D6 secrets in `e2e/.env.e2e` + `.example` → Task 1 (`.gitignore` + `.env.e2e.example`). Architecture §1 layout → all tasks ; §2 playwright.config → Task 2 ; §3 setup → Task 4 ; §4 teardown → Task 4 ; §5 per-scenario coverage → 6/7/8/9/10 ; §6 helpers → Task 3 ; §7 package.json → Task 1 ; §8 .env.e2e.example → Task 1. Acceptance 1 (`e2e` runs the 10 sequentially) → Task 11 (`--list` substitutes for "runs them" because DNS is blocked; the user runs once DNS is up) ; 2 (storageState valid) → Task 6 ; 3 (M3 async observable) → Task 9 happy ; 4 (M3 SSRF 422 sync, no row) → Task 9 SSRF ; 5 (cleanup hermetic) → Task 4 teardown ; 6 (CI-portable) → Task 2 env-driven baseURL ; 7 (existing suites unchanged) → Task 11 regression guard.

**2. Placeholder scan:** No TBD/"handle errors"/vague clauses. Task 2's `dotenv` note ("if it doesn't resolve, add it") is a precise conditional with a concrete fallback action — not a placeholder. Tasks 7/9/10 reference real wizard label regexes — the implementer is instructed to verify them against the running web (the lib is the authority on exact French copy). The `é`/`²`/`χ` Unicode escapes in the test regexes avoid mojibake-on-commit but are the standard pattern for accented French strings in TypeScript regex literals.

**3. Type consistency:** `adminCreateUser`/`passwordGrant`/`adminDeleteUser`/`projectRef`/`SessionTokens`/`CreatedUser` (Task 3 `supabase.ts`) ↔ called from `global-setup.ts`/`global-teardown.ts` (Task 4). `withClient`/`cleanupUserData` (Task 3 `db.ts`) ↔ called from `global-teardown.ts` (Task 4). `waitForAuditDone`/`waitForAuditFailed`/`sawRunningState` (Task 3 `poll.ts`) ↔ imported by all four scenario spec files (Tasks 6/7/8/9/10). The Supabase localStorage key pattern `sb-${projectRef}-auth-token` is the exact format the merged web `lib/supabase/client.ts` consumes (Supabase's official `@supabase/ssr` browser client) — Task 4 uses it precisely. The Playwright `storageState` shape (`{cookies, origins: [{origin, localStorage: [{name, value}]}]}`) is Playwright's stable persisted format ; the `origin` field is set from `WEB_BASE_URL` so the browser context sees it on the right host. The 10-test total in Task 11 verification matches the per-task expected counts (1+3+1+3+2). No name drift across tasks.
