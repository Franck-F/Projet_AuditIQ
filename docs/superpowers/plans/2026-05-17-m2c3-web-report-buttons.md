# M2-C3 — Web "Télécharger le rapport" buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel + PDF "Télécharger le rapport" download buttons to the audit result page, consuming the merged authenticated `GET /audits/{id}/report.{xlsx,pdf}` endpoints; PDF failure surfaces a non-silent message while Excel stays usable.

**Architecture:** Pure `apps/web` change. A `downloadReport(id, fmt)` helper in `lib/api/audits.ts` fetches the binary through the JWT-authenticated axios `api` (`responseType: 'blob'`) and triggers a browser save; a small `ReportActions` client component in the result page wires two buttons with busy/error state. No backend change (M2-C1/C2 merged).

**Tech Stack:** Next.js 16, TypeScript strict + `noUncheckedIndexedAccess`, axios (`@/lib/api/client` — Supabase JWT interceptor), Vitest + Testing Library, pnpm. Gates = `tsc --noEmit` strict + Vitest (repo ESLint known-broken, not a gate).

---

## Scope

Plan **M2-C3** of M2-C — the final M2 piece. M2-C1 (Excel) + M2-C2 (PDF microservice) merged: `GET /api/v1/audits/{id}/report.xlsx` and `…/report.pdf` exist, auth via the axios interceptor; PDF endpoint returns RFC 7807 502 if the microservice is down (Excel independent). **In (apps/web only):** `downloadReport` helper; `ReportActions` buttons on `/app/audits/[id]`; tests. **Out:** any backend/microservice change. After this, the entire M2 module is complete.

Run from `apps/web/`. Test `pnpm exec vitest run`. Typecheck `pnpm run typecheck`. Commit `git -c core.autocrlf=false commit` (author Franck F preconfigured). **At execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`** (fresh worktrees don't inherit it — known recurring leak). Never `npm`; no ESLint.

## File Structure

- Modify `lib/api/audits.ts` — add `ReportFormat` type + `downloadReport(id, fmt)` (fetch blob via `api`, save via an anchor).
- Modify `app/app/audits/[id]/page.tsx` — add a `ReportActions` client sub-component; render it in the result header when `data.metrics` is present (audit done).
- Modify `__tests__/audits-api.test.ts` — `downloadReport` test (correct URL + `responseType: 'blob'`; rejects on error).
- Modify `__tests__/audit-result-page.test.tsx` — buttons render + click calls `downloadReport`; PDF failure shows a non-silent message.

Patterns to follow (read first): `lib/api/audits.ts` (existing `uploadDataset`/`createAudit`/`fetchAudit` + `api` usage), `lib/api/client.ts` (the axios `api` w/ JWT interceptor), `app/app/audits/[id]/page.tsx` (the merged result page: `useParams`/`useAudit`, `VERDICT`, header with title + `StatusBadge`, `M2View`, `Interpretation`, pre-check banner), `components/ui/button` (`Button` props `variant`/`size`/`disabled`), `__tests__/audits-api.test.ts` (axios `post`/`get` mock pattern), `__tests__/audit-result-page.test.tsx` (`vi.hoisted` `useAudit`/`useParams` mocks). Conventions: `'use client'`; `vi.hoisted` + partial `vi.mock('@/lib/api/audits', async (orig)=>({ ...(await orig<...>()), fn }))`; strict-TS guards; French copy; design tokens.

---

### Task 1: `downloadReport` API helper

**Files:**
- Modify: `lib/api/audits.ts`
- Test: `__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe` in `__tests__/audits-api.test.ts` (read it; reuse its existing axios mock — it mocks `@/lib/api/client`; the GET spy is likely `get`. Adapt the spy name to the real one. Also stub the DOM save side-effect):

```typescript
  it('downloadReport GETs the report as a blob and triggers a save', async () => {
    const blob = new Blob(['x'], { type: 'application/pdf' });
    get.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="AUD-1.pdf"' },
    });
    const createURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockReturnValue();
    const { downloadReport } = await import('@/lib/api/audits');

    await downloadReport('aud-1', 'pdf');

    expect(get.mock.calls[0]![0]).toBe('/audits/aud-1/report.pdf');
    expect(get.mock.calls[0]![1]).toMatchObject({ responseType: 'blob' });
    expect(createURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:fake');
    createURL.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });

  it('downloadReport rejects when the request fails', async () => {
    get.mockRejectedValue(new Error('502'));
    const { downloadReport } = await import('@/lib/api/audits');
    await expect(downloadReport('aud-1', 'pdf')).rejects.toThrow();
  });
```

> `get` must be the file's real axios mock variable for `api.get`. If the file only mocks `post`, add `get: vi.fn()` to its existing `vi.hoisted`/`vi.mock('@/lib/api/client', …)` block alongside `post` (mirror the existing mock shape exactly). Do not restructure existing tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run __tests__/audits-api.test.ts`
Expected: FAIL — `downloadReport` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `lib/api/audits.ts`, append (keep all existing exports unchanged):

```typescript
export type ReportFormat = 'xlsx' | 'pdf';

const _REPORT_MIME: Record<ReportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

function _filename(contentDisposition: unknown, fallback: string): string {
  if (typeof contentDisposition === 'string') {
    const m = contentDisposition.match(/filename="?([^"]+)"?/);
    if (m && m[1]) return m[1];
  }
  return fallback;
}

export async function downloadReport(
  auditId: string,
  fmt: ReportFormat,
): Promise<void> {
  const res = await api.get<Blob>(`/audits/${auditId}/report.${fmt}`, {
    responseType: 'blob',
  });
  const blob =
    res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: _REPORT_MIME[fmt] });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = _filename(
      res.headers?.['content-disposition'],
      `rapport-${auditId}.${fmt}`,
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run __tests__/audits-api.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add lib/api/audits.ts __tests__/audits-api.test.ts
git -c core.autocrlf=false commit -m "feat(web): downloadReport (blob + save) helper"
```

---

### Task 2: `ReportActions` buttons on the result page

**Files:**
- Modify: `app/app/audits/[id]/page.tsx`
- Test: `__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe` in `__tests__/audit-result-page.test.tsx` (read it; reuse its hoisted `useAudit`/`useParams` mocks; add a hoisted `downloadReport` mock partial — mirror the file's existing partial-mock style if it already mocks `@/lib/api/audits`, otherwise add the mock):

```typescript
  it('renders report buttons and downloads Excel/PDF; PDF failure is non-silent', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'a3', code: 'AUD-2026-010', title: 'Rapport', status: 'done',
        module: 'M1', pre_check: [], config: null,
        metrics: {
          groups: [], reference_value: 'H', disparate_impact: 0.7,
          demographic_parity_diff: 0.1, worst_group: 'F', verdict: 'warn',
          risk_score: 50, warnings: [],
        },
        interpretation: null,
      },
    });
    downloadReport.mockResolvedValue(undefined);
    render(<AuditResultPage />);

    await userEvent.click(screen.getByRole('button', { name: /excel/i }));
    expect(downloadReport).toHaveBeenCalledWith('a3', 'xlsx');

    downloadReport.mockRejectedValueOnce(new Error('502'));
    await userEvent.click(screen.getByRole('button', { name: /pdf/i }));
    expect(downloadReport).toHaveBeenLastCalledWith('a3', 'pdf');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /indisponible|échou/i,
    );
  });
```

Add the hoisted mock at the top of the file alongside the existing `useAudit` hoist (mirror the file's exact pattern):

```typescript
const { downloadReport } = vi.hoisted(() => ({ downloadReport: vi.fn() }));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  downloadReport,
}));
```

(If the test file already `vi.mock`s `@/lib/api/audits`, extend that single mock factory instead of adding a second.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run __tests__/audit-result-page.test.tsx`
Expected: FAIL — no Excel/PDF buttons in the DOM.

- [ ] **Step 3: Write minimal implementation**

In `app/app/audits/[id]/page.tsx`: add `downloadReport`, `type ReportFormat` to the existing `@/lib/api/audits` import; add `import * as React from 'react';` if not already imported (the file is `'use client'`). Add this component above `AuditResultPage`:

```tsx
function ReportActions({ auditId }: { auditId: string }) {
  const [busy, setBusy] = React.useState<ReportFormat | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onDownload = async (fmt: ReportFormat) => {
    setError(null);
    setBusy(fmt);
    try {
      await downloadReport(auditId, fmt);
    } catch {
      setError(
        fmt === 'pdf'
          ? "Le rapport PDF est momentanément indisponible. Le rapport Excel reste disponible."
          : "Le téléchargement du rapport a échoué.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => onDownload('xlsx')}
        >
          {busy === 'xlsx' ? 'Export…' : 'Rapport Excel'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => onDownload('pdf')}
        >
          {busy === 'pdf' ? 'Export…' : 'Rapport PDF'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="max-w-[36ch] text-right text-xs text-status-fail">
          {error}
        </p>
      )}
    </div>
  );
}
```

Add `Button` to the imports (read how the wizard imports it: `import { Button } from '@/components/ui/button';`). In the result `<header>` (the block rendering the title + `StatusBadge`), render `<ReportActions auditId={data.id} />` next to the badge **only when results exist** — i.e. change the badge area so it shows the actions when `m` (metrics) is truthy. Locate the existing header JSX:

```tsx
          {v && <StatusBadge tone={v.tone}>{v.label}</StatusBadge>}
```

replace it with:

```tsx
          <div className="flex items-center gap-3">
            {v && <StatusBadge tone={v.tone}>{v.label}</StatusBadge>}
            {m && <ReportActions auditId={data.id} />}
          </div>
```

(`m` and `v` are the existing locals in `AuditResultPage`: `const m = data.metrics; const v = m ? VERDICT[m.verdict] : null;`. Do not change other logic.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run __tests__/audit-result-page.test.tsx`
Expected: PASS (existing M1/M2/loading tests + the new buttons test).

- [ ] **Step 5: Commit**

```bash
git add "app/app/audits/[id]/page.tsx" __tests__/audit-result-page.test.tsx
git -c core.autocrlf=false commit -m "feat(web): report download buttons (Excel/PDF, non-silent)"
```

---

### Task 3: Web gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: Full Vitest suite**

Run: `pnpm exec vitest run`
Expected: PASS, 0 failed (all prior web tests + the M2-C3 additions; M1/M2 result + wizard + dashboard tests still green).

- [ ] **Step 2: Strict typecheck**

Run: `pnpm run typecheck`
Expected: exit 0 (strict + `noUncheckedIndexedAccess`). Likely fixups: `res.headers?.['content-disposition']` is `unknown` → the `_filename` helper already narrows via `typeof === 'string'`; the match group access uses `m && m[1]`; `ReportFormat` union exhaustive in `_REPORT_MIME`. Apply minimal typed fixes; never `any`.

- [ ] **Step 3: Scope sanity**

Run: `git --no-pager diff --stat origin/main..HEAD`
Confirm changes only under `apps/web/**` (no apps/api, apps/pdf, docs). Report the file list. Also `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — must be only `franck-dilane1.fambou@epitech.digital`.

- [ ] **Step 4: Commit any gate fixes**

```bash
git add -A
git -c core.autocrlf=false commit -m "chore(web): gate fixups for M2-C3"
```
(Skip if Steps 1–2 already clean.)

---

## Self-Review

**1. Spec coverage (spec §7 — "bouton « Télécharger le rapport » (PDF/Excel)" on the result page; §9 — PDF 502 non-silent on the client):**
- Excel + PDF download buttons on `/app/audits/[id]`, shown only when results exist → Task 2 (`ReportActions`, gated on `m`).
- Authenticated download (Supabase JWT) → Task 1 uses the existing `api` axios instance (interceptor adds the bearer token); `responseType: 'blob'` + anchor save → real browser download.
- PDF microservice failure → backend already returns RFC 7807 502 (M2-C2); the client surfaces it **non-silently** as a visible `role="alert"` message that explicitly says the **Excel report stays available** → Task 2 (catch branch, asserted in the test). Excel and PDF are independent buttons/requests.
- Filename from `Content-Disposition` (the API sets `attachment; filename="{code or id}.{ext}"`), with a safe fallback → Task 1 `_filename`.

**2. Placeholder scan:** No TBD/"handle errors". Tasks 1/2 instruct reusing the real existing mock variables/factories verbatim (concrete instruction — the exact axios-mock name and the existing `@/lib/api/audits` mock factory must be honored, not duplicated). Every code step has complete code.

**3. Type consistency:** `ReportFormat = 'xlsx' | 'pdf'` defined in Task 1 (`lib/api/audits.ts`), consumed by `downloadReport(auditId, fmt: ReportFormat)` (Task 1) and `ReportActions`'s `busy: ReportFormat | null` + `onDownload(fmt: ReportFormat)` + `downloadReport(auditId, fmt)` calls (Task 2). `_REPORT_MIME: Record<ReportFormat, string>` is exhaustive over the union. `ReportActions` consumes `data.id` (string) and is gated on `m` (existing `data.metrics` local). Reuses the proven `api` instance, `Button` component, `vi.hoisted` partial-mock pattern. No new backend types; `AuditOut` unchanged.
