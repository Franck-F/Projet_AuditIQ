# Web Audit Wizard + Result Page Implementation Plan (Plan 3B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-service M1 audit through the web UI — `/app/audits/nouveau` (upload a CSV → map columns → run) and `/app/audits/[id]` (gauge, DI/DP, per-group table, Gemini narrative, AI-Act anchors, disclaimers), closing the end-to-end loop.

**Architecture:** Next.js 16 App Router client pages on the Plan-3A foundation (Supabase auth, Axios+JWT `api`, TanStack Query, vitest harness). `lib/api/audits.ts` typed against the API DTOs (`POST /datasets`, `POST /audits`, `GET /audits/{id}`); `useAudit()` query hook; the wizard calls the upload/create functions directly with a two-phase local state. Tests: Vitest + Testing Library, the `api`/`@/lib/api/audits` modules mocked, no network.

**Tech Stack:** Next.js 16, TS strict, `@tanstack/react-query`, `axios`, `react-hook-form`+`zod`+`@hookform/resolvers` (deps), Vitest + `@testing-library/user-event`. pnpm: `pnpm --filter @auditiq/web <script>`.

---

## File Structure

```
apps/web/
├── lib/api/audits.ts                 # DTO types + uploadDataset/createAudit/fetchAudit
├── lib/query/use-audit.ts            # useAudit(id) query hook
├── app/app/audits/nouveau/page.tsx   # upload + column-mapping wizard
└── app/app/audits/[id]/page.tsx      # M1 result view
apps/web/__tests__/
  audits-api.test.ts · use-audit.test.tsx · nouveau-page.test.tsx
  · audit-result-page.test.tsx
```

Conventions: Conventional Commits; commit messages end with a blank line then
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`; use
`git -c core.autocrlf=false commit`. Never `git push`. Quality gate (web ESLint is
pre-existing-broken): `pnpm --filter @auditiq/web exec vitest run` +
`pnpm --filter @auditiq/web run typecheck` (strict). Run after `pnpm install`.

---

### Task 1: Audits API client

**Files:**
- Create: `apps/web/lib/api/audits.ts`
- Test: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/audits-api.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { post, get } }));

import { createAudit, fetchAudit, uploadDataset } from '@/lib/api/audits';

describe('audits api', () => {
  it('uploads a dataset as multipart to /datasets', async () => {
    post.mockResolvedValue({ data: { id: 'd1', columns: ['genre'] } });
    const file = new File(['genre,decision\nH,oui\n'], 'd.csv', {
      type: 'text/csv',
    });
    const out = await uploadDataset(file);
    expect(out.id).toBe('d1');
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/datasets');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
  });

  it('creates an audit via POST /audits', async () => {
    post.mockResolvedValue({ data: { id: 'a1', status: 'done' } });
    const out = await createAudit({
      dataset_id: 'd1',
      title: 'R',
      protected_attribute: 'genre',
      decision_column: 'decision',
      favorable_value: 'oui',
      privileged_value: null,
    });
    expect(out.id).toBe('a1');
    expect(post).toHaveBeenLastCalledWith('/audits', {
      dataset_id: 'd1',
      title: 'R',
      protected_attribute: 'genre',
      decision_column: 'decision',
      favorable_value: 'oui',
      privileged_value: null,
    });
  });

  it('fetches an audit via GET /audits/{id}', async () => {
    get.mockResolvedValue({ data: { id: 'a1' } });
    const out = await fetchAudit('a1');
    expect(out.id).toBe('a1');
    expect(get).toHaveBeenCalledWith('/audits/a1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/audits-api.test.ts`
Expected: FAIL — cannot resolve `@/lib/api/audits`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/api/audits.ts`:

```ts
import { api } from '@/lib/api/client';

export type Verdict = 'pass' | 'warn' | 'fail';

export type DatasetOut = {
  id: string;
  filename: string;
  row_count: number;
  columns: string[];
  status: string;
  created_at: string;
  expires_at: string | null;
};

export type AuditCreate = {
  dataset_id: string;
  title: string;
  protected_attribute: string;
  decision_column: string;
  favorable_value: string;
  privileged_value: string | null;
};

export type GroupStatOut = {
  value: string;
  n: number;
  favorable: number;
  selection_rate: number;
  disparate_impact: number;
};

export type M1MetricsOut = {
  groups: GroupStatOut[];
  reference_value: string;
  disparate_impact: number;
  demographic_parity_diff: number;
  worst_group: string;
  verdict: Verdict;
  risk_score: number;
  warnings: string[];
};

export type InterpretationOut = {
  narrative: string;
  ai_act_anchors: string[];
  disclaimers: string[];
  provider: string;
  model: string;
};

export type AuditOut = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  module: string;
  dataset_id: string;
  protected_attribute: string;
  decision_column: string;
  favorable_value: string;
  privileged_value: string | null;
  created_at: string;
  completed_at: string | null;
  metrics: M1MetricsOut | null;
  interpretation: InterpretationOut | null;
};

export async function uploadDataset(file: File): Promise<DatasetOut> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<DatasetOut>('/datasets', form);
  return data;
}

export async function createAudit(body: AuditCreate): Promise<AuditOut> {
  const { data } = await api.post<AuditOut>('/audits', body);
  return data;
}

export async function fetchAudit(id: string): Promise<AuditOut> {
  const { data } = await api.get<AuditOut>(`/audits/${id}`);
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/audits-api.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git -c core.autocrlf=false commit -m "feat(web): audits API client (upload/create/fetch)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `useAudit` query hook

**Files:**
- Create: `apps/web/lib/query/use-audit.ts`
- Test: `apps/web/__tests__/use-audit.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/use-audit.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { fetchAudit } = vi.hoisted(() => ({ fetchAudit: vi.fn() }));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  fetchAudit,
}));

import { useAudit } from '@/lib/query/use-audit';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAudit', () => {
  it('fetches the audit by id', async () => {
    fetchAudit.mockResolvedValue({ id: 'a1', title: 'R' });
    const { result } = renderHook(() => useAudit('a1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('a1');
    expect(fetchAudit).toHaveBeenCalledWith('a1');
  });

  it('is disabled when id is empty', () => {
    fetchAudit.mockClear();
    const { result } = renderHook(() => useAudit(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchAudit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/use-audit.test.tsx`
Expected: FAIL — cannot resolve `@/lib/query/use-audit`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/query/use-audit.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { type AuditOut, fetchAudit } from '@/lib/api/audits';

export function useAudit(id: string) {
  return useQuery<AuditOut>({
    queryKey: ['audit', id],
    queryFn: () => fetchAudit(id),
    enabled: id.length > 0,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/use-audit.test.tsx`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/query/use-audit.ts apps/web/__tests__/use-audit.test.tsx
git -c core.autocrlf=false commit -m "feat(web): useAudit query hook

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Audit creation wizard `/app/audits/nouveau`

**Files:**
- Create: `apps/web/app/app/audits/nouveau/page.tsx`
- Test: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/nouveau-page.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { uploadDataset, createAudit, push } = vi.hoisted(() => ({
  uploadDataset: vi.fn(),
  createAudit: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  uploadDataset,
  createAudit,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import NouveauPage from '@/app/app/audits/nouveau/page';

describe('audit wizard', () => {
  it('uploads, maps columns, creates the audit and redirects', async () => {
    uploadDataset.mockResolvedValue({
      id: 'd1',
      filename: 'r.csv',
      row_count: 2,
      columns: ['genre', 'decision'],
      status: 'ready',
      created_at: '',
      expires_at: null,
    });
    createAudit.mockResolvedValue({ id: 'aud-9', status: 'done' });
    render(<NouveauPage />);

    const file = new File(['genre,decision\nH,oui\n'], 'r.csv', {
      type: 'text/csv',
    });
    await userEvent.upload(screen.getByTestId('csv-input'), file);
    await waitFor(() =>
      expect(uploadDataset).toHaveBeenCalledWith(file),
    );

    await userEvent.type(screen.getByLabelText(/titre/i), 'Recrutement Q2');
    await userEvent.selectOptions(
      screen.getByLabelText(/attribut prot/i),
      'genre',
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/colonne de d/i),
      'decision',
    );
    await userEvent.type(screen.getByLabelText(/valeur favorable/i), 'oui');
    await userEvent.click(
      screen.getByRole('button', { name: /lancer l'audit/i }),
    );

    await waitFor(() =>
      expect(createAudit).toHaveBeenCalledWith({
        dataset_id: 'd1',
        title: 'Recrutement Q2',
        protected_attribute: 'genre',
        decision_column: 'decision',
        favorable_value: 'oui',
        privileged_value: null,
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/app/audits/aud-9'),
    );
  });

  it('shows an error if the upload fails', async () => {
    uploadDataset.mockRejectedValue(new Error('bad csv'));
    render(<NouveauPage />);
    const file = new File(['x'], 'x.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByTestId('csv-input'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent(/échou/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/nouveau-page.test.tsx`
Expected: FAIL — cannot resolve `@/app/app/audits/nouveau/page`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/app/app/audits/nouveau/page.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Topbar } from '@/components/app/Topbar';
import { Button } from '@/components/ui/button';
import {
  type DatasetOut,
  createAudit,
  uploadDataset,
} from '@/lib/api/audits';

const MapSchema = z.object({
  title: z.string().min(1, 'Requis'),
  protected_attribute: z.string().min(1, 'Requis'),
  decision_column: z.string().min(1, 'Requis'),
  favorable_value: z.string().min(1, 'Requis'),
  privileged_value: z.string().optional(),
});
type MapValues = z.infer<typeof MapSchema>;

export default function NouveauPage() {
  const router = useRouter();
  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MapValues>({ resolver: zodResolver(MapSchema) });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setDataset(await uploadDataset(file));
    } catch {
      setError("L'import du fichier a échoué. Vérifiez le CSV.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (v: MapValues) => {
    if (!dataset) return;
    setError(null);
    setBusy(true);
    try {
      const audit = await createAudit({
        dataset_id: dataset.id,
        title: v.title,
        protected_attribute: v.protected_attribute,
        decision_column: v.decision_column,
        favorable_value: v.favorable_value,
        privileged_value: v.privileged_value ? v.privileged_value : null,
      });
      router.push(`/app/audits/${audit.id}`);
    } catch {
      setError("Le lancement de l'audit a échoué.");
      setBusy(false);
    }
  };

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Audits', href: '/app/audits' },
          { label: 'Nouvel audit' },
        ]}
      />
      <main className="flex-1 px-8 py-8">
        <h1 className="mb-6 text-[28px] font-semibold tracking-[-0.02em] text-fg">
          Nouvel audit M1
        </h1>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail"
          >
            {error}
          </p>
        )}

        {!dataset ? (
          <div className="rounded-2xl border border-border-default bg-surface p-8">
            <label
              htmlFor="csv"
              className="text-sm font-medium text-fg-secondary"
            >
              Jeu de données (CSV)
            </label>
            <input
              id="csv"
              data-testid="csv-input"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={onFile}
              className="mt-2 block w-full text-sm text-fg-secondary"
            />
            <p className="mt-3 text-xs text-fg-muted">
              Le fichier est stocké de façon sécurisée et supprimé après la
              durée de rétention de votre organisation.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-8"
            noValidate
          >
            <p className="text-sm text-fg-secondary">
              <strong className="text-fg">{dataset.filename}</strong> ·{' '}
              {dataset.row_count} lignes · {dataset.columns.length} colonnes
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-fg-secondary">
                Titre de l&apos;audit
              </label>
              <input
                id="title"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('title')}
              />
              {errors.title && (
                <span className="text-xs text-status-fail">
                  {errors.title.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pa" className="text-sm font-medium text-fg-secondary">
                Attribut protégé
              </label>
              <select
                id="pa"
                defaultValue=""
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('protected_attribute')}
              >
                <option value="" disabled>
                  —
                </option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.protected_attribute && (
                <span className="text-xs text-status-fail">
                  {errors.protected_attribute.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dc" className="text-sm font-medium text-fg-secondary">
                Colonne de décision
              </label>
              <select
                id="dc"
                defaultValue=""
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('decision_column')}
              >
                <option value="" disabled>
                  —
                </option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.decision_column && (
                <span className="text-xs text-status-fail">
                  {errors.decision_column.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fv" className="text-sm font-medium text-fg-secondary">
                Valeur favorable
              </label>
              <input
                id="fv"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('favorable_value')}
              />
              {errors.favorable_value && (
                <span className="text-xs text-status-fail">
                  {errors.favorable_value.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pv" className="text-sm font-medium text-fg-secondary">
                Groupe de référence (optionnel)
              </label>
              <input
                id="pv"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('privileged_value')}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" disabled={busy}>
              {busy ? 'Analyse…' : "Lancer l'audit"}
            </Button>
          </form>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/nouveau-page.test.tsx`
Expected: PASS (2 passed). The `select` labels are linked by `htmlFor`/`id`
(`pa`,`dc`) so `getByLabelText(/attribut prot/i)` / `/colonne de d/i` resolve;
`getByLabelText(/valeur favorable/i)` → `#fv`; the file input is found via
`data-testid="csv-input"`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git -c core.autocrlf=false commit -m "feat(web): audit creation wizard (upload + column mapping)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Audit result page `/app/audits/[id]`

**Files:**
- Create: `apps/web/app/app/audits/[id]/page.tsx`
- Test: `apps/web/__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/audit-result-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useAudit } = vi.hoisted(() => ({ useAudit: vi.fn() }));
vi.mock('@/lib/query/use-audit', () => ({ useAudit }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'a1' }) }));

import AuditResultPage from '@/app/app/audits/[id]/page';

describe('audit result page', () => {
  it('renders metrics, narrative, anchors and disclaimers', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'a1',
        code: 'AUD-2026-007',
        title: 'Recrutement Q2',
        status: 'done',
        module: 'M1',
        metrics: {
          groups: [
            { value: 'Femmes', n: 200, favorable: 72, selection_rate: 0.36, disparate_impact: 0.72 },
            { value: 'Hommes', n: 200, favorable: 100, selection_rate: 0.5, disparate_impact: 1.0 },
          ],
          reference_value: 'Hommes',
          disparate_impact: 0.72,
          demographic_parity_diff: 0.14,
          worst_group: 'Femmes',
          verdict: 'fail',
          risk_score: 55,
          warnings: [],
        },
        interpretation: {
          narrative: 'Un écart défavorable touche les femmes.',
          ai_act_anchors: ['AI Act art. 10'],
          disclaimers: ['Aide à l’analyse, pas un verdict de conformité.'],
          provider: 'fallback',
          model: 'deterministic',
        },
      },
    });
    render(<AuditResultPage />);
    expect(screen.getByText('Recrutement Q2')).toBeInTheDocument();
    expect(screen.getByText(/AUD-2026-007/)).toBeInTheDocument();
    expect(screen.getByText(/écart défavorable/i)).toBeInTheDocument();
    expect(screen.getByText('AI Act art. 10')).toBeInTheDocument();
    expect(screen.getByText(/aide à l/i)).toBeInTheDocument();
    expect(screen.getByText('Femmes')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    useAudit.mockReturnValue({ isLoading: true, isError: false });
    render(<AuditResultPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/audit-result-page.test.tsx`
Expected: FAIL — cannot resolve `@/app/app/audits/[id]/page`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/app/app/audits/[id]/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { Gauge } from '@/components/product/Gauge';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { useAudit } from '@/lib/query/use-audit';

const VERDICT: Record<'fail' | 'warn' | 'pass', { tone: StatusTone; label: string }> = {
  fail: { tone: 'fail', label: 'Critique' },
  warn: { tone: 'warn', label: 'Vigilance' },
  pass: { tone: 'pass', label: 'Conforme' },
};

export default function AuditResultPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data, isLoading, isError } = useAudit(id);

  if (isLoading) {
    return (
      <main role="status" className="flex-1 px-8 py-8 text-fg-secondary">
        Chargement de l&apos;audit…
      </main>
    );
  }
  if (isError || !data) {
    return (
      <main className="flex-1 px-8 py-8 text-status-fail">
        Audit introuvable.
      </main>
    );
  }

  const m = data.metrics;
  const v = m ? VERDICT[m.verdict] : null;

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Audits', href: '/app/audits' },
          { label: data.code ?? data.id },
        ]}
      />
      <main className="flex-1 px-8 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">
              {data.title}
            </h1>
            <p className="mt-1 font-mono text-xs text-fg-muted">
              {data.code ?? data.id} · {data.module} · {data.status}
            </p>
          </div>
          {v && <StatusBadge tone={v.tone}>{v.label}</StatusBadge>}
        </header>

        {!m ? (
          <p className="text-sm text-fg-secondary">
            Résultats indisponibles pour cet audit.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col items-center rounded-2xl border border-border-default bg-surface p-8">
                <Gauge
                  value={m.risk_score}
                  label="Score de risque"
                  caption={`/100 · ${v?.label ?? ''}`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border-default bg-surface p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Disparate Impact
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-fg">
                    {m.disparate_impact}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">
                    règle des 4/5 ; pire groupe : « {m.worst_group} »
                  </div>
                </div>
                <div className="rounded-2xl border border-border-default bg-surface p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                    Demographic Parity
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-fg">
                    {m.demographic_parity_diff}
                  </div>
                  <div className="mt-1 text-xs text-fg-muted">
                    référence : « {m.reference_value} »
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border-default bg-surface p-7">
              <h2 className="mb-3 text-[18px] font-medium text-fg">
                Par groupe
              </h2>
              <div className="overflow-hidden rounded-md border border-border-default">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-fg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Groupe</th>
                      <th className="px-4 py-2 text-right font-medium">Effectif</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Taux favorable
                      </th>
                      <th className="px-4 py-2 text-right font-medium">DI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.groups.map((g) => (
                      <tr key={g.value} className="border-t border-border-default">
                        <td className="px-4 py-2 text-fg">{g.value}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                          {g.n}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                          {g.selection_rate}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-fg-secondary">
                          {g.disparate_impact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {data.interpretation && (
              <section className="rounded-2xl border border-border-default bg-surface p-7">
                <h2 className="mb-3 text-[18px] font-medium text-fg">
                  Interprétation
                </h2>
                <p className="text-sm leading-relaxed text-fg-secondary">
                  {data.interpretation.narrative}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Ancrages AI Act
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-fg-secondary">
                      {data.interpretation.ai_act_anchors.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                      Limites
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-fg-secondary">
                      {data.interpretation.disclaimers.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 font-mono text-[11px] text-fg-muted">
                  Interprétation : {data.interpretation.provider} /{' '}
                  {data.interpretation.model}
                </p>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web exec vitest run __tests__/audit-result-page.test.tsx`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/app/audits/[id]/page.tsx" apps/web/__tests__/audit-result-page.test.tsx
git -c core.autocrlf=false commit -m "feat(web): M1 audit result page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full gate + status docs

**Files:**
- Modify: `README.md` (root)

- [ ] **Step 1: Whole web suite**

Run: `pnpm --filter @auditiq/web exec vitest run`
Expected: PASS, 0 failed (Plan-3A 11 tests + Plan-3B: audits-api 3, use-audit 2,
nouveau 2, result 2). Fix implementation if any fail (never weaken tests).

- [ ] **Step 2: Type-check** — `pnpm --filter @auditiq/web run typecheck`
Expected: `tsc --noEmit` exit 0 (strict + `noUncheckedIndexedAccess`). Fix
type errors minimally; no `// @ts-ignore` without a one-line justification.

- [ ] **Step 3: Update root README status**

In `README.md` (repo root), replace the `## Statut` body with:

```markdown
## Statut

✅ Slice M1 complète end-to-end : web (auth Supabase, `/app` protégé, dashboard
live, **assistant de création d'audit + page résultat**) → API (upload CSV,
audit M1, interprétation Gemini+fallback, dashboard), org-scoped et durcie.
Suite : modules M2/M3, async, export PDF/Excel (hors slice M1).
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git -c core.autocrlf=false commit -m "docs: status — M1 slice complete end-to-end

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (spec §4 flow steps 2–5, web result view):**
- §4.2/4.3 web upload → `POST /datasets`, column mapping → `POST /audits` → Task 1 (`uploadDataset`/`createAudit`) + Task 3 (wizard: file input → columns → mapping form → submit → redirect).
- §4.5 result page (gauge + DI/DP + per-group table + narrative + AI-Act anchors + disclaimers) → Task 4 (`useAudit` from Task 2; loading/error states; metrics table; interpretation block).
- DTO mirror exact: `AuditOut`/`M1MetricsOut`/`InterpretationOut`/`DatasetOut` match the API DTOs (snake_case, `verdict` union) so responses deserialize with no mapping; `privileged_value` empty → `null` to match the API contract.
- **Deferred (not gaps):** history list, recommendations, PDF/Excel, M2/M3 — outside the M1 slice.

**2. Placeholder scan:** every step ships complete code + exact command/expected output. No TBD/TODO. The wizard uses a native file input (`data-testid="csv-input"`) for robust testability rather than a drag-drop lib — a deliberate, documented choice (YAGNI; spec did not mandate drag-drop).

**3. Type consistency:** `Verdict`/`DatasetOut`/`AuditCreate`/`GroupStatOut`/`M1MetricsOut`/`InterpretationOut`/`AuditOut` defined once in `lib/api/audits.ts`; `uploadDataset(file)`, `createAudit(body)`, `fetchAudit(id)`, `useAudit(id)` used identically across tasks; the wizard sends exactly the `AuditCreate` shape the API expects; the result page reads `data.metrics`/`data.interpretation` fields named exactly as the types. Tests mock at module boundaries (`@/lib/api/client`, `@/lib/api/audits`, `@/lib/query/use-audit`, `next/navigation`) — no network. `StatusTone` imported from the StatusBadge component (same pattern proven in Plan 3A).
