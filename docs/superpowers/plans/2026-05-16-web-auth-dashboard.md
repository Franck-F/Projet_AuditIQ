# Web Auth + API Client + Dashboard Un-mocked Implementation Plan (Plan 3A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real Supabase email/password auth in `apps/web`, `/app/*` protected, an Axios client that injects the Supabase JWT, and the `/app` dashboard rendering **live data from `GET /api/v1/dashboard/summary`** instead of `lib/mocks/dashboard.ts`.

**Architecture:** Next.js 16 App Router. `@supabase/ssr` browser+server clients; Next proxy (`proxy.ts`) guards `/app/*`. Axios singleton reads the Supabase access token per request. TanStack Query (`QueryClientProvider` in the `/app` layout) + a typed `useDashboard()` hook. The dashboard page maps the API DTO to the existing presentational components; the mock module is deleted. Tests: Vitest + Testing Library, Supabase & Axios mocked, jsdom — no network.

**Tech Stack:** Next.js 16, TypeScript strict, `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `axios`, `react-hook-form`+`zod` (already deps), Vitest. Package manager: **pnpm** (run `pnpm --filter @auditiq/web <script>`). Never `npm`.

---

## File Structure

```
apps/web/
├── lib/supabase/client.ts        # createBrowserClient (browser)
├── lib/supabase/server.ts        # createServerClient (RSC/route, cookies)
├── lib/api/client.ts             # axios instance + Supabase-JWT request interceptor
├── lib/api/dashboard.ts          # DashboardSummary type + fetchDashboardSummary()
├── lib/query/provider.tsx        # 'use client' QueryClientProvider
├── lib/query/use-dashboard.ts    # useDashboard() hook
├── proxy.ts                      # MODIFY: gate /app/* via Supabase session
├── app/(auth)/connexion/page.tsx # MODIFY: real signInWithPassword
├── app/(auth)/inscription/page.tsx # MODIFY: real signUp
├── app/app/layout.tsx            # MODIFY: wrap children in <QueryProvider>
├── app/app/page.tsx              # MODIFY: useDashboard() instead of MOCK_*
└── lib/mocks/dashboard.ts        # DELETE (types move into lib/api/dashboard.ts)
apps/web/__tests__/
  api-client.test.ts · use-dashboard.test.tsx · dashboard-page.test.tsx
```

Conventions: Conventional Commits; commit messages end with a blank line then
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`; use
`git -c core.autocrlf=false commit`. Never `git push`. Run scripts from repo root
as `pnpm --filter @auditiq/web <script>` (test / typecheck / lint), after
`pnpm install` in the worktree.

---

### Task 1: Supabase browser + server clients

**Files:**
- Create: `apps/web/lib/supabase/client.ts`, `apps/web/lib/supabase/server.ts`
- Test: `apps/web/__tests__/supabase-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/supabase-client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn((url: string, key: string) => ({ url, key })),
}));

describe('supabase browser client', () => {
  it('is constructed from public env', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk_test');
    const { createClient } = await import('@/lib/supabase/client');
    const c = createClient() as unknown as { url: string; key: string };
    expect(c.url).toBe('https://proj.supabase.co');
    expect(c.key).toBe('pk_test');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/supabase-client.test.ts`
Expected: FAIL — cannot resolve `@/lib/supabase/client`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export function createClient() {
  return createBrowserClient(URL, KEY);
}
```

Create `apps/web/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          store.set(name, value, options);
        }
      },
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/supabase-client.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/supabase/ apps/web/__tests__/supabase-client.test.ts
git -c core.autocrlf=false commit -m "feat(web): Supabase browser + server clients

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Axios API client with Supabase-JWT interceptor

**Files:**
- Create: `apps/web/lib/api/client.ts`
- Test: `apps/web/__tests__/api-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/api-client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession } }),
}));

describe('api client', () => {
  it('injects the Supabase access token as a Bearer header', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'jwt-123' } },
    });
    const { api } = await import('@/lib/api/client');
    const req = await (api.interceptors.request as any).handlers[0].fulfilled({
      headers: {},
    });
    expect(req.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('sends no Authorization header when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { api } = await import('@/lib/api/client');
    const req = await (api.interceptors.request as any).handlers[0].fulfilled({
      headers: {},
    });
    expect(req.headers.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/api-client.test.ts`
Expected: FAIL — cannot resolve `@/lib/api/client`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/api/client.ts`:

```ts
import axios from 'axios';

import { createClient } from '@/lib/supabase/client';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1',
});

api.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/api-client.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/client.ts apps/web/__tests__/api-client.test.ts
git -c core.autocrlf=false commit -m "feat(web): axios client injecting Supabase JWT

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Dashboard API fetcher + TanStack Query hook

**Files:**
- Create: `apps/web/lib/api/dashboard.ts`, `apps/web/lib/query/provider.tsx`, `apps/web/lib/query/use-dashboard.ts`
- Test: `apps/web/__tests__/use-dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/use-dashboard.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { get } }));

import { useDashboard } from '@/lib/query/use-dashboard';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDashboard', () => {
  it('returns the API summary', async () => {
    get.mockResolvedValue({
      data: {
        total_audits: 3,
        failing_audits: 1,
        warning_audits: 1,
        risk_score: 42,
        module_usage: { M1: 3 },
        recent_audits: [],
      },
    });
    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_audits).toBe(3);
    expect(get).toHaveBeenCalledWith('/dashboard/summary');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/use-dashboard.test.tsx`
Expected: FAIL — cannot resolve `@/lib/query/use-dashboard`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/api/dashboard.ts`:

```ts
import { api } from '@/lib/api/client';

export type RecentAudit = {
  id: string;
  code: string | null;
  title: string;
  module: string;
  verdict: 'pass' | 'warn' | 'fail' | null;
  risk_score: number | null;
  created_at: string;
};

export type DashboardSummary = {
  total_audits: number;
  failing_audits: number;
  warning_audits: number;
  risk_score: number;
  module_usage: Record<string, number>;
  recent_audits: RecentAudit[];
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary');
  return data;
}
```

Create `apps/web/lib/query/provider.tsx`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
```

Create `apps/web/lib/query/use-dashboard.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { type DashboardSummary, fetchDashboardSummary } from '@/lib/api/dashboard';

export function useDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/use-dashboard.test.tsx`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/dashboard.ts apps/web/lib/query/ apps/web/__tests__/use-dashboard.test.tsx
git -c core.autocrlf=false commit -m "feat(web): dashboard fetcher + useDashboard query hook

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Wire real auth into connexion + inscription

**Files:**
- Modify: `apps/web/app/(auth)/connexion/page.tsx`, `apps/web/app/(auth)/inscription/page.tsx`
- Test: `apps/web/__tests__/connexion.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/connexion.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const signInWithPassword = vi.fn();
const push = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import ConnexionPage from '@/app/(auth)/connexion/page';

describe('connexion', () => {
  it('signs in then redirects to /app', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<ConnexionPage />);
    await userEvent.type(
      screen.getByLabelText(/email/i),
      'claire@acme.fr',
    );
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'secret123');
    await userEvent.click(
      screen.getByRole('button', { name: /se connecter/i }),
    );
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'claire@acme.fr',
        password: 'secret123',
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
  });

  it('shows an error message on invalid credentials', async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    render(<ConnexionPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'x@y.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'bad');
    await userEvent.click(
      screen.getByRole('button', { name: /se connecter/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/identifiants/i);
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/connexion.test.tsx`
Expected: FAIL — current page only `alert()`s; no `signInWithPassword`/redirect.

- [ ] **Step 3: Write minimal implementation**

Replace the `onSubmit` and add the imports/state in
`apps/web/app/(auth)/connexion/page.tsx`. At the top of the file, ensure these
imports exist (add what is missing; the file already uses `react-hook-form`,
`zod`, the `Button`/`AuthMain`/`AuthSide` components):

```tsx
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { createClient } from '@/lib/supabase/client';
```

Inside the component, replace the existing `onSubmit` handler with:

```tsx
  const router = useRouter();
  const [authError, setAuthError] = React.useState<string | null>(null);

  const onSubmit = async (v: ConnexionValues) => {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: v.email,
      password: v.password,
    });
    if (error) {
      setAuthError('Identifiants invalides. Vérifiez votre email et mot de passe.');
      return;
    }
    router.push('/app');
  };
```

Render the error: immediately before the submit `<Button ...>Se connecter</Button>`,
add:

```tsx
          {authError && (
            <p role="alert" className="text-sm text-status-fail">
              {authError}
            </p>
          )}
```

In `apps/web/app/(auth)/inscription/page.tsx`, apply the symmetric change: add
the same imports, and replace its `onSubmit` with (field names follow that
file's existing zod schema — it has `email` and `password`):

```tsx
  const router = useRouter();
  const [authError, setAuthError] = React.useState<string | null>(null);

  const onSubmit = async (v: InscriptionValues) => {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
    });
    if (error) {
      setAuthError("L'inscription a échoué. Cet email est peut-être déjà utilisé.");
      return;
    }
    router.push('/app');
  };
```

and add the same `role="alert"` block before its submit button. (If the
inscription schema/type is named differently than `InscriptionValues`, use that
file's existing inferred type name — do not rename it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/connexion.test.tsx`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(auth)/connexion/page.tsx" "apps/web/app/(auth)/inscription/page.tsx" apps/web/__tests__/connexion.test.tsx
git -c core.autocrlf=false commit -m "feat(web): real Supabase sign-in/sign-up

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Protect `/app/*` via proxy (middleware)

**Files:**
- Modify: `apps/web/proxy.ts`
- Test: `apps/web/__tests__/proxy.test.ts`

- [ ] **Step 1: Read the current proxy + write the failing test**

First read `apps/web/proxy.ts` to learn its exact exported function name and
signature (Next 16 uses `proxy.ts` with a default/`proxy` export + a `config`
matcher). Then create `apps/web/__tests__/proxy.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { proxy } from '@/proxy';

function req(path: string) {
  return new Request(`http://localhost${path}`, {
    headers: { cookie: '' },
  });
}

describe('proxy auth gate', () => {
  it('redirects unauthenticated /app to /connexion', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(req('/app') as never);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/connexion');
  });

  it('lets an authenticated user through to /app', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await proxy(req('/app') as never);
    expect(res.status).toBe(200);
  });

  it('never gates public routes', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(req('/tarifs') as never);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/proxy.test.ts`
Expected: FAIL — `proxy` is not exported / does not gate `/app`.

- [ ] **Step 3: Write minimal implementation**

Replace `apps/web/proxy.ts` with (this is the Next 16 proxy/middleware
contract — a named `proxy` function + a `config.matcher`):

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.nextUrl.pathname.startsWith('/app')) {
    return response;
  }
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/app/:path*'],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/proxy.test.ts`
Expected: PASS (3 passed). If the original `proxy.ts` exported a differently
named function that Next 16 requires (e.g. `default`), keep BOTH: export the
logic as `proxy` AND re-export it as the name Next expects, and adjust the test
import accordingly — do not break the framework contract; report the exact
export name you found.

- [ ] **Step 5: Commit**

```bash
git add apps/web/proxy.ts apps/web/__tests__/proxy.test.ts
git -c core.autocrlf=false commit -m "feat(web): gate /app/* behind Supabase session

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Un-mock the dashboard

**Files:**
- Modify: `apps/web/app/app/layout.tsx`, `apps/web/app/app/page.tsx`
- Delete: `apps/web/lib/mocks/dashboard.ts`
- Test: `apps/web/__tests__/dashboard-page.test.tsx`

- [ ] **Step 1: Read the current page + write the failing test**

Read `apps/web/app/app/page.tsx` and `apps/web/app/app/layout.tsx` to learn the
exact presentational components used (e.g. `Gauge`, `MetricCard`,
`StatusBadge`) and the current `MOCK_*` shapes. Then create
`apps/web/__tests__/dashboard-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useDashboard = vi.fn();
vi.mock('@/lib/query/use-dashboard', () => ({ useDashboard }));

import DashboardPage from '@/app/app/page';

describe('dashboard page', () => {
  it('renders live API aggregates', () => {
    useDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        total_audits: 12,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 62,
        module_usage: { M1: 12 },
        recent_audits: [
          {
            id: 'a1',
            code: 'AUD-2026-001',
            title: 'Recrutement Q2',
            module: 'M1',
            verdict: 'fail',
            risk_score: 55,
            created_at: '2026-05-16T10:00:00Z',
          },
        ],
      },
    });
    render(<DashboardPage />);
    expect(screen.getByText('Recrutement Q2')).toBeInTheDocument();
    expect(screen.getByText(/AUD-2026-001/)).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    useDashboard.mockReturnValue({ isLoading: true, isError: false });
    render(<DashboardPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/dashboard-page.test.tsx`
Expected: FAIL — page imports `MOCK_*` from `@/lib/mocks/dashboard`, no
`useDashboard`, no loading `role="status"`.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/layout.tsx`, wrap the rendered children with the
`QueryProvider`. Add the import `import { QueryProvider } from '@/lib/query/provider';`
and wrap the existing returned subtree: change the outermost returned element so
its children are inside `<QueryProvider>...</QueryProvider>` (keep the existing
shell/sidebar markup; only insert the provider as a wrapper around `{children}`).

Convert `apps/web/app/app/page.tsx` to a client component that uses the hook.
At the very top add `'use client';`. Remove the
`import { MOCK_ALERTS, MOCK_GAUGE, MOCK_KPIS, MOCK_MODULE_USAGE, MOCK_RECENT_AUDITS, MOCK_USER } from '@/lib/mocks/dashboard';`
line and the `export const metadata` (metadata is not allowed in client
components — move the title out or delete it). Add:

```tsx
import { useDashboard } from '@/lib/query/use-dashboard';
```

At the start of the `DashboardPage` component body, add:

```tsx
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <main role="status" className="flex-1 px-8 py-8 text-fg-secondary">
        Chargement du tableau de bord…
      </main>
    );
  }
  if (isError || !data) {
    return (
      <main className="flex-1 px-8 py-8 text-status-fail">
        Impossible de charger le tableau de bord.
      </main>
    );
  }
```

Then replace every `MOCK_*` usage in the JSX with `data`:
- `MOCK_GAUGE.value` → `data.risk_score`; the gauge caption → a literal
  `` `/100 · ${data.risk_score >= 71 ? 'risque critique' : data.risk_score >= 31 ? 'risque modéré' : 'risque faible'}` ``;
  `MOCK_GAUGE.total` → `data.total_audits`.
- KPI cards: `MOCK_KPIS.yearAudits.value` → `data.total_audits`;
  `MOCK_KPIS.biases.value` → `data.failing_audits`; the "recommandations"/
  "AI Act" cards → use `data.warning_audits` and `data.risk_score`
  respectively (drop sparkline/delta props that depended on mock arrays — pass
  the plain `value`/`label` only; the components already accept those).
- Recent audits list: map `data.recent_audits` to the existing row markup —
  `audit.title`, `audit.code ?? audit.id` for the subtitle/meta, `audit.verdict`
  → `StatusBadge tone={audit.verdict === 'fail' ? 'fail' : audit.verdict === 'warn' ? 'warn' : 'pass'}`,
  `audit.risk_score` for the metric, `href={`/app/audits/${audit.id}`}`.
- Module usage: map `Object.entries(data.module_usage)` to the existing bar
  markup (`module`, `count`; `percent = Math.round((count / Math.max(data.total_audits,1)) * 100)`).
- Remove the `MOCK_USER` header personalization — replace the greeting with a
  static `Bonjour` and use `data.total_audits` / `data.warning_audits` in the
  subline. Remove the `MOCK_ALERTS` section entirely (alerts are derived from
  audits in a later plan; deleting it is in-scope here since the mock is being
  removed).

Keep all class names / presentational components exactly as they are — only the
data source changes.

Delete the mock module:

```bash
git rm apps/web/lib/mocks/dashboard.ts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/dashboard-page.test.tsx`
Expected: PASS (2 passed). Then `pnpm --filter @auditiq/web exec vitest run`
(whole web suite) — all green; confirm nothing else imports
`@/lib/mocks/dashboard` (grep; if a stray import remains, it is dead UI from the
scaffold — remove that import/usage minimally).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/layout.tsx apps/web/app/app/page.tsx apps/web/__tests__/dashboard-page.test.tsx
git rm --cached apps/web/lib/mocks/dashboard.ts 2>/dev/null || true
git -c core.autocrlf=false commit -m "feat(web): dashboard renders live API data; drop mocks

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Full gate — test, typecheck, lint, docs

**Files:**
- Modify: `apps/web` (none new) ; `README.md` (root) note

- [ ] **Step 1: Whole web suite**

Run from repo root: `pnpm --filter @auditiq/web exec vitest run`
Expected: PASS, 0 failed (all `apps/web/__tests__/*`). Fix implementation if any
fail (never weaken tests).

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @auditiq/web run typecheck`
Expected: `tsc --noEmit` exits 0 (no type errors). Fix type errors minimally
(strict TS). Do not add `// @ts-ignore` without a one-line justification.

- [ ] **Step 3: Lint**

Run: `pnpm --filter @auditiq/web run lint`
Expected: `next lint` passes (0 errors). Fix or justify any warning that is an
error in CI.

- [ ] **Step 4: Update root README status**

In `README.md` (repo root), change the `## Statut` line
`🚧 En cours de développement initial (Phase 0).` to:

```markdown
## Statut

🚧 Slice M1 livrée : API (auth Supabase JWKS, upload CSV, audit M1, interprétation
Gemini+fallback, dashboard, durcissée) + web (auth réelle, `/app` protégé,
dashboard branché sur l'API). Reste : assistant de création d'audit + page
résultat web (Plan 3B).
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git -c core.autocrlf=false commit -m "docs: status — M1 slice API + web auth/dashboard done

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (spec §3 frontend state, §7 web auth, §4.6 dashboard consumer):**
- §7 Supabase Auth email/password via `@supabase/ssr`, session in cookies, middleware protects `/app/*` → Tasks 1, 4, 5 (SSO buttons stay visual stubs, per spec — untouched).
- §3 server state = TanStack Query; Axios + JWT → Tasks 2, 3 (provider in `/app` layout; `useDashboard`).
- §4.6 the web dashboard consumes `GET /api/v1/dashboard/summary` replacing `lib/mocks/dashboard.ts` → Task 6 (mock module deleted; page renders live aggregates; loading/error states).
- **Deferred (Plan 3B, NOT gaps):** `/app/audits/nouveau` upload+mapping and `/app/audits/[id]` result page; alerts derived from audits. Marketing pages already exist and are untouched.

**2. Placeholder scan:** every step has complete code or a precise, bounded modification of an existing file (Tasks 4/6 modify pages whose exact current contents must be read first — Steps explicitly say to read them; the changes are described as exact import/handler/JSX replacements, not vague "wire it up"). No TBD/TODO. Commands have expected output.

**3. Type consistency:** `createClient` (browser), `createServerSupabase` (server), `api` (axios), `DashboardSummary`/`RecentAudit` types, `fetchDashboardSummary`, `QueryProvider`, `useDashboard`, `proxy`+`config` are defined once and imported identically across tasks. `DashboardSummary` mirrors the API's `DashboardSummaryOut` (snake_case, `verdict` union `'pass'|'warn'|'fail'|null`) so `api.get('/dashboard/summary')` deserializes directly with no mapping layer. The dashboard page consumes `data.*` fields named exactly as the type. Tests mock at module boundaries (`@/lib/supabase/client`, `@/lib/api/client`, `@/lib/query/use-dashboard`, `@supabase/ssr`, `next/navigation`) so no network/Supabase is hit.
