# M3-C — Web LLM/chatbot audit (wizard step + target form + result view) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the M3 (LLM/chatbot) path to the web app: API types, a module-choice-first wizard with a target-LLM config form (preset or custom, no dataset), and an M3 result view — reusing the merged M3-B backend and the existing M1/M2 web patterns.

**Architecture:** Mirror the delivered M2 web wiring. M3 has NO dataset, so the wizard is reordered to **module-choice-first**: pick module → M1/M2 still upload a CSV then show their (unchanged) form; M3 goes straight to a target-config form and `createAudit({module:"M3", target, lang})`. The result page gains an `M3View` selected by `data.module === "M3"`; shared `Interpretation`/`ReportActions`/`StatusBadge`/`Gauge` are reused unchanged. PDF/Excel already work transversally (M3-B).

**Tech Stack:** Next.js App Router (client components), axios `@/lib/api/client` (Supabase JWT), TanStack Query (`useAudit`), react-hook-form + zod, Vitest + @testing-library/react + user-event, TS strict + `noUncheckedIndexedAccess`, pnpm workspace.

---

## Scope

Plan **M3-C** (3rd/final M3 increment; spec `docs/superpowers/specs/2026-05-17-m3-llm-audit-design.md`). M3-A engine + M3-B backend merged on `main`. **In:** `apps/web` only — API DTOs/union (`lib/api/audits.ts`), wizard reorder + M3 form (`app/app/audits/nouveau/page.tsx`), `M3View` on the result page (`app/app/audits/[id]/page.tsx`), and the three `__tests__` updated. **Out:** any `apps/api`/`apps/pdf` change (backend done; PDF/Excel already module-agnostic). After M3-C merges, the M3 module — and all three mémoire modules — are complete end-to-end.

Run from repo root with pnpm filtered to web. Tests: `pnpm --filter @auditiq/web test` (or the real package name from `apps/web/package.json` — read it; fall back to running inside `apps/web` via `pnpm test`). Typecheck: `pnpm --filter @auditiq/web typecheck`. **Commit RULE (verified M3-B):** plain `git add` + `git commit -m "..."` — do NOT pass `-c core.autocrlf=false` (it rewrites whole CRLF working copies → 142/142 churn; plain commit normalizes to the repo's LF). Identity `Franck F <franck-dilane1.fambou@epitech.digital>`; **at execution start, in the worktree run `git config user.name "Franck F"; git config user.email "franck-dilane1.fambou@epitech.digital"`**. NEVER add a Co-Authored-By/Claude trailer.

## File Structure

- Modify `apps/web/lib/api/audits.ts` — add `CategoryStatOut`, `DivergentExampleOut`, `M3MetricsOut`, `TargetIn`, `M3AuditCreate`; widen the `createAudit` param union and `AuditOut.metrics` union.
- Modify `apps/web/app/app/audits/nouveau/page.tsx` — `Module` gains `"M3"`; render module choice FIRST (before dataset); M1/M2 keep CSV-then-form; add `M3Schema` + `M3Form` (preset selector + custom fields, no dataset).
- Modify `apps/web/app/app/audits/[id]/page.tsx` — add `M3View`; select it when `data.module === "M3"`.
- Modify `apps/web/__tests__/audits-api.test.ts`, `apps/web/__tests__/nouveau-page.test.tsx`, `apps/web/__tests__/audit-result-page.test.tsx` — M3 cases; M1/M2 cases updated for the choice-first flow.

Patterns to read first (authoritative over this plan's snippets where they differ): the real `lib/api/audits.ts` (`M2AuditCreate`, `M2MetricsOut`, `createAudit`, `AuditOut`), `app/app/audits/nouveau/page.tsx` (`Module` type, `M2Schema`, `M2Form`, the `!dataset`/`module===null` flow, `FormProps`), `app/app/audits/[id]/page.tsx` (`isM2 = m!==null && 'clusters' in m`, `M2View`, shared `Interpretation`/`ReportActions`/`StatusBadge`/`Gauge`, pre-check banner), `vitest.setup.ts`, and the three `__tests__` files (mock idioms: `vi.hoisted`, `vi.mock('@/lib/api/...')`, `userEvent`, `waitFor`). The M3-B backend contract: request `AuditCreate{title, module:"M3", target:{url,method,headers,body_template,response_path}, lang}` (no dataset_id/decision/favorable); response `AuditOut.metrics = M3MetricsOut{categories:CategoryStatOut[]{name,length_gap,sentiment_gap,refusal_rate,score,verdict}, global_score, verdict, risk_score, divergent_examples:DivergentExampleOut[]{category,prompt_id,variant_a,variant_b,excerpt_a,excerpt_b,reason}, n_pairs, n_calls_failed, warnings}`, `AuditOut.module === "M3"`, `dataset_id` null.

---

### Task 1: API layer — M3 types + unions

**Files:**
- Modify: `apps/web/lib/api/audits.ts`
- Test: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audits-api.test.ts` (reuse the file's existing `vi.mock('@/lib/api/client')` + `api` mock setup; mirror the existing M2 `createAudit` test):

```typescript
it('createAudit sends an M3 body (module M3, target, lang, no dataset)', async () => {
  const out = { id: 'a-m3', module: 'M3', status: 'done' };
  (api.post as unknown as Mock).mockResolvedValueOnce({ data: out });
  const res = await createAudit({
    title: 'Chatbot RH',
    module: 'M3',
    target: {
      url: 'https://api.example.com/v1',
      method: 'POST',
      headers: { Authorization: 'Bearer X' },
      body_template: '{"messages":[{"role":"user","content":"{prompt}"}]}',
      response_path: 'choices.0.message.content',
    },
    lang: 'fr',
  });
  expect(res).toEqual(out);
  const [url, body] = (api.post as unknown as Mock).mock.calls.at(-1)!;
  expect(url).toBe('/audits');
  expect(body.module).toBe('M3');
  expect(body.target.url).toBe('https://api.example.com/v1');
  expect(body.lang).toBe('fr');
  expect('dataset_id' in body).toBe(false);
});
```

(Use the SAME import names/`Mock` type the existing tests in this file use — read the top of the file; if it uses `vi.mocked(api.post)` or a typed mock helper, match that exactly.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web test -- audits-api`
Expected: FAIL — `createAudit` union doesn't accept `module:'M3'`/`target` (TS) or the body assertion fails.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/lib/api/audits.ts` add (place near `M2MetricsOut`/`M2AuditCreate`, matching the file's existing `type` style — `Verdict` already exists there):

```typescript
export type TargetIn = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body_template: string;
  response_path: string;
};

export type M3AuditCreate = {
  title: string;
  module: 'M3';
  target: TargetIn;
  lang: string;
};

export type CategoryStatOut = {
  name: string;
  length_gap: number;
  sentiment_gap: number;
  refusal_rate: number;
  score: number;
  verdict: Verdict;
};

export type DivergentExampleOut = {
  category: string;
  prompt_id: string;
  variant_a: string;
  variant_b: string;
  excerpt_a: string;
  excerpt_b: string;
  reason: string;
};

export type M3MetricsOut = {
  categories: CategoryStatOut[];
  global_score: number;
  verdict: Verdict;
  risk_score: number;
  divergent_examples: DivergentExampleOut[];
  n_pairs: number;
  n_calls_failed: number;
  warnings: string[];
};
```

Widen the existing unions (edit the real declarations — keep M1/M2 members exactly):
- `createAudit` parameter type: `AuditCreate | M2AuditCreate` → `AuditCreate | M2AuditCreate | M3AuditCreate`.
- `AuditOut.metrics`: `M1MetricsOut | M2MetricsOut | null` → `M1MetricsOut | M2MetricsOut | M3MetricsOut | null`.

`createAudit` body is already passed straight to `api.post('/audits', body)` — no logic change; the union widening is sufficient.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web test -- audits-api`
Expected: PASS (new M3 test + existing M1/M2 createAudit/fetchAudit/downloadReport tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): M3 audit API types + unions"
```

---

### Task 2: Wizard — module-choice-first + M3 target form

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Test: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Write the failing test**

In `apps/web/__tests__/nouveau-page.test.tsx`: (a) update the existing M1 and M2 tests so they click the module button **before** uploading the CSV (the new order), keeping their final `createAudit` payload assertions identical; (b) add the M3 test below (reuse the file's mock setup — `createAudit`/`uploadDataset`/`useRouter` mocks):

```typescript
it('M3: choose module, fill target form (no CSV), creates an M3 audit', async () => {
  const user = userEvent.setup();
  (createAudit as unknown as Mock).mockResolvedValueOnce({ id: 'm3-1' });
  render(<NouveauPage />);

  await user.click(screen.getByRole('button', { name: /chatbot|llm/i }));

  await user.type(screen.getByLabelText(/titre/i), 'Chatbot RH');
  await user.type(screen.getByLabelText(/url/i), 'https://api.example.com/v1');
  await user.type(
    screen.getByLabelText(/corps|body/i),
    '{"messages":[{"role":"user","content":"{prompt}"}]}',
  );
  await user.type(screen.getByLabelText(/chemin|response.?path/i), 'choices.0.message.content');
  await user.click(screen.getByRole('button', { name: /lancer|créer|auditer/i }));

  await waitFor(() => expect(createAudit as unknown as Mock).toHaveBeenCalled());
  const body = (createAudit as unknown as Mock).mock.calls.at(-1)![0];
  expect(body.module).toBe('M3');
  expect(body.target.url).toBe('https://api.example.com/v1');
  expect(body.target.response_path).toBe('choices.0.message.content');
  expect(body.lang).toBeTruthy();
  expect(uploadDataset as unknown as Mock).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith('/app/audits/m3-1');
});
```

(Match the real label text the form uses — adjust the regexes to the actual `<label>` strings you implement in Step 3 so the test and UI agree; keep `push`/router-mock access exactly as the existing tests do.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web test -- nouveau-page`
Expected: FAIL — no M3 button/form; M1/M2 tests fail until reordered.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/audits/nouveau/page.tsx`:

(a) Widen the module type: `type Module = 'M1' | 'M2' | 'M3'` (edit the real declaration).

(b) **Reorder the flow** so module choice renders first. Replace the top-level conditional so it is:
1. `module === null` → render the module-choice block (now THREE buttons; add M3) — no longer gated on `dataset`.
2. `(module === 'M1' || module === 'M2') && !dataset` → render the existing CSV upload UI (the exact JSX/`onFile` currently under the `!dataset` branch — move it here unchanged).
3. `(module === 'M1' || module === 'M2') && dataset` → render `M1Form`/`M2Form` exactly as today (unchanged props/JSX).
4. `module === 'M3'` → render `<M3Form busy={busy} setBusy={setBusy} setError={setError} onDone={onDone} />` (no `dataset` prop).

Add the M3 button to the choice block, mirroring the M1/M2 buttons' markup/classes:

```tsx
<button type="button" onClick={() => setModule('M3')} className={/* same classes as the M2 choice button */}>
  Audit LLM / chatbot (M3)
</button>
```

(c) Add the zod schema + preset table + form. Place near `M2Schema`/`M2Form`. `M3Form`'s prop type is the existing `FormProps` MINUS `dataset` (define `M3FormProps = Omit<FormProps, 'dataset'>` if `FormProps` includes `dataset`, else reuse `FormProps`):

```tsx
const M3_PRESETS: Record<string, { method: string; body_template: string; response_path: string }> = {
  'OpenAI-compatible (/chat/completions)': {
    method: 'POST',
    body_template: '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
    response_path: 'choices.0.message.content',
  },
  'Personnalisé': { method: 'POST', body_template: '', response_path: '' },
};

const M3Schema = z.object({
  title: z.string().min(1, 'Requis'),
  url: z.string().url('URL invalide'),
  method: z.string().min(1, 'Requis'),
  auth_header: z.string().optional(),
  body_template: z.string().min(1, 'Requis'),
  response_path: z.string().min(1, 'Requis'),
  lang: z.enum(['fr', 'en']),
});
type M3Values = z.infer<typeof M3Schema>;

function M3Form({ busy, setBusy, setError, onDone }: M3FormProps) {
  const presetNames = Object.keys(M3_PRESETS);
  const firstPreset = presetNames[0] ?? 'Personnalisé';
  const firstCfg = M3_PRESETS[firstPreset] ?? { method: 'POST', body_template: '', response_path: '' };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<M3Values>({
    resolver: zodResolver(M3Schema),
    defaultValues: {
      title: '',
      url: '',
      method: firstCfg.method,
      auth_header: '',
      body_template: firstCfg.body_template,
      response_path: firstCfg.response_path,
      lang: 'fr',
    },
  });
  const [preset, setPreset] = React.useState<string>(firstPreset);

  const applyPreset = (name: string) => {
    setPreset(name);
    const cfg = M3_PRESETS[name];
    if (cfg) {
      reset((prev) => ({ ...prev, method: cfg.method, body_template: cfg.body_template, response_path: cfg.response_path }));
    }
  };

  const onSubmit = async (v: M3Values) => {
    setError(null);
    setBusy(true);
    try {
      const headers: Record<string, string> = {};
      if (v.auth_header && v.auth_header.trim()) headers.Authorization = v.auth_header.trim();
      const audit = await createAudit({
        title: v.title,
        module: 'M3',
        target: {
          url: v.url,
          method: v.method,
          headers,
          body_template: v.body_template,
          response_path: v.response_path,
        },
        lang: v.lang,
      });
      onDone(audit.id);
    } catch {
      setError("Le lancement de l'audit a échoué.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={/* same wrapper classes as M2Form */ ''}>
      <label>
        Titre
        <input {...register('title')} />
      </label>
      {errors.title && <span role="alert">{errors.title.message}</span>}

      <label>
        Modèle de configuration
        <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
          {presetNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label>
        URL de l'API du chatbot
        <input {...register('url')} placeholder="https://…" />
      </label>
      {errors.url && <span role="alert">{errors.url.message}</span>}

      <label>
        Méthode HTTP
        <input {...register('method')} />
      </label>

      <label>
        En-tête d'authentification (optionnel)
        <input {...register('auth_header')} placeholder="Bearer sk-…" />
      </label>

      <label>
        Corps de requête (gabarit, doit contenir {'{prompt}'})
        <textarea {...register('body_template')} rows={4} />
      </label>
      {errors.body_template && <span role="alert">{errors.body_template.message}</span>}

      <label>
        Chemin de la réponse (response_path, ex. choices.0.message.content)
        <input {...register('response_path')} />
      </label>
      {errors.response_path && <span role="alert">{errors.response_path.message}</span>}

      <label>
        Langue des prompts
        <select {...register('lang')}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </label>

      <p className={/* same hint class M2Form uses */ ''}>
        Le secret d'authentification n'est jamais enregistré ni journalisé.
      </p>

      <button type="submit" disabled={busy}>Lancer l'audit</button>
    </form>
  );
}
```

(Use the SAME `useForm`/`zodResolver`/`React` imports the file already has; mirror M2Form's exact class names/markup so styling is consistent. Ensure every `<label>` wraps its control so `getByLabelText` resolves — match how M2Form associates labels. Keep `onDone`/`setError`/`setBusy`/`busy` semantics identical to M2Form.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web test -- nouveau-page`
Expected: PASS — updated M1/M2 (choice-first) + new M3.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): module-choice-first wizard + M3 target form"
```

---

### Task 3: Result page — M3View

**Files:**
- Modify: `apps/web/app/app/audits/[id]/page.tsx`
- Test: `apps/web/__tests__/audit-result-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append an M3 render test to `apps/web/__tests__/audit-result-page.test.tsx` (reuse the file's `useAudit` mock idiom; build an M3 `AuditOut`):

```typescript
it('renders the M3 view (categories + divergent examples + gauge)', async () => {
  (useAudit as unknown as Mock).mockReturnValue({
    data: {
      id: 'm3-1', code: 'AUD-2026-040', title: 'Chatbot', status: 'done',
      module: 'M3', dataset_id: null, protected_attribute: null,
      decision_column: null, favorable_value: null, privileged_value: null,
      created_at: '2026-05-17T00:00:00Z', completed_at: '2026-05-17T00:00:00Z',
      metrics: {
        categories: [
          { name: 'genre', length_gap: 0.4, sentiment_gap: 0.2, refusal_rate: 0.5, score: 0.55, verdict: 'warn' },
        ],
        global_score: 0.55, verdict: 'warn', risk_score: 55,
        divergent_examples: [
          { category: 'genre', prompt_id: 'g1', variant_a: 'm', variant_b: 'f',
            excerpt_a: 'réponse longue', excerpt_b: 'Je ne peux pas', reason: 'refus' },
        ],
        n_pairs: 12, n_calls_failed: 0, warnings: [],
      },
      interpretation: {
        narrative: 'Écart de traitement détecté.', ai_act_anchors: ['AI Act, article 50'],
        disclaimers: ['Signal à approfondir.'], provider: 'fallback', model: 'deterministic',
      },
      pre_check: [], config: { lang: 'fr' },
    },
    isLoading: false, isError: false,
  });
  render(<AuditResultPage params={{ id: 'm3-1' }} />);

  expect(await screen.findByText('AUD-2026-040')).toBeInTheDocument();
  expect(screen.getByText(/genre/)).toBeInTheDocument();
  expect(screen.getByText(/refus/)).toBeInTheDocument();
  expect(screen.getByText(/Je ne peux pas/)).toBeInTheDocument();
  expect(screen.getByText(/article 50/i)).toBeInTheDocument();
  // M2-only label must NOT appear for an M3 audit:
  expect(screen.queryByText(/Par cluster/i)).not.toBeInTheDocument();
});
```

(Match the real component's prop/render signature — how the existing M1/M2 tests `render` the page and pass `params`/`id`; reuse their `useAudit` mock access pattern verbatim.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @auditiq/web test -- audit-result-page`
Expected: FAIL — M3 metrics fall through; categories/examples not rendered.

- [ ] **Step 3: Write minimal implementation**

In `apps/web/app/app/audits/[id]/page.tsx`:

(a) Add the selector alongside the existing `isM2`. Keep `isM2` as-is; add:

```tsx
const isM3 = data.module === 'M3' && m !== null;
```

(b) In the render branch (where it currently does `!m` → unavailable, `isM2` → `<M2View …>`, else `<M1View …>`), insert M3 FIRST so it never falls into M1/M2:

```tsx
{!m ? (
  /* existing "Résultats indisponibles" */
) : isM3 ? (
  <M3View metrics={m as M3MetricsOut} />
) : isM2 ? (
  /* existing <M2View …/> */
) : (
  /* existing M1 JSX */
)}
```

(c) Add the component (mirror `M2View`'s layout: `Gauge` + metric cards + table; reuse the real `Gauge`/`StatusBadge` imports and the existing table classes). `Interpretation`, `ReportActions`, `StatusBadge`, the pre-check banner stay where they are (module-agnostic — unchanged):

```tsx
import type { M3MetricsOut } from '@/lib/api/audits';

function M3View({ metrics }: { metrics: M3MetricsOut }) {
  return (
    <>
      <div className={/* same Gauge+cards row classes as M2View */ ''}>
        <Gauge value={metrics.risk_score} verdict={metrics.verdict} />
        <div className={/* same card-grid classes as M2View */ ''}>
          <div className={/* same card class */ ''}>
            <h3>Score global</h3>
            <p>{metrics.global_score}</p>
            <p>Verdict : {metrics.verdict}</p>
          </div>
          <div className={/* same card class */ ''}>
            <h3>Couverture</h3>
            <p>{metrics.n_pairs} paires</p>
            <p>{metrics.n_calls_failed} appel(s) en échec</p>
          </div>
        </div>
      </div>

      <h2>Par catégorie</h2>
      <table className={/* same table class M2View uses */ ''}>
        <thead>
          <tr>
            <th>Catégorie</th><th>Écart longueur</th><th>Écart sentiment</th>
            <th>Taux de refus</th><th>Score</th><th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {metrics.categories.map((c) => (
            <tr key={c.name}>
              <td>{c.name}</td><td>{c.length_gap}</td><td>{c.sentiment_gap}</td>
              <td>{c.refusal_rate}</td><td>{c.score}</td><td>{c.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {metrics.divergent_examples.length > 0 && (
        <>
          <h2>Exemples divergents</h2>
          <table className={/* same table class */ ''}>
            <thead>
              <tr><th>Catégorie</th><th>Raison</th><th>Réponse A</th><th>Réponse B</th></tr>
            </thead>
            <tbody>
              {metrics.divergent_examples.map((d) => (
                <tr key={d.prompt_id}>
                  <td>{d.category}</td><td>{d.reason}</td>
                  <td>{d.excerpt_a}</td><td>{d.excerpt_b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {metrics.warnings.length > 0 && (
        <ul className={/* same warnings class M2View uses, if any */ ''}>
          {metrics.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </>
  );
}
```

(JSX auto-escapes `{d.excerpt_*}` — the untrusted target-LLM text is rendered as text, safe. Match `Gauge`/`StatusBadge` real prop names; if `Gauge` takes `score`/`label` not `value`/`verdict`, adapt to the real signature used by `M2View`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @auditiq/web test -- audit-result-page`
Expected: PASS — new M3 render + existing M1/M2/interpretation/report-button/pre-check tests.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/app/audits/[id]/page.tsx" apps/web/__tests__/audit-result-page.test.tsx
git commit -m "feat(web): M3 result view"
```

---

### Task 4: Web gate

**Files:** None (verification + minimal fixups)

- [ ] **Step 1: Full web test suite**

Run: `pnpm --filter @auditiq/web test`
Expected: PASS, 0 failed (all M1/M2/M3 web tests; no regression).

- [ ] **Step 2: Strict typecheck**

Run: `pnpm --filter @auditiq/web typecheck`
Expected: `tsc --noEmit` clean. Likely fixups: union narrowing for `M3MetricsOut` (`isM3`/`as M3MetricsOut`), `noUncheckedIndexedAccess` on `M3_PRESETS[...]`/`presetNames[0]` (the plan code already guards with `?? …` — keep that), zod `enum` typing for `lang`. Apply minimal precise fixes; never `any`/`@ts-ignore`.

- [ ] **Step 3: Lint (if the web package has a lint script)**

Run: `pnpm --filter @auditiq/web lint` (skip if no `lint` script in `apps/web/package.json`).
Expected: clean — fix minimally.

- [ ] **Step 4: Scope + identity sanity**

Run: `git --no-pager diff --name-only origin/main..HEAD` — confirm changes only under `apps/web/**` (+ this plan doc). Run `git --no-pager log --format='%ae' origin/main..HEAD | sort -u` — must be ONLY `franck-dilane1.fambou@epitech.digital`; if any other, report the offending commits (the controller normalizes via filter-branch before PR). Spot-check no commit is a 142/142 whole-file CRLF churn (`git --no-pager show --stat <sha>` on the 3 edited files = small semantic deltas).

- [ ] **Step 5: Commit any gate fixes**

```bash
git add -A
git commit -m "chore(web): gate fixups for M3-C"
```
(Skip if Steps 1–3 already clean.)

---

## Self-Review

**1. Spec coverage:** M3-C = the spec's web increment (wizard step "Audit LLM/chatbot" + target-LLM config form preset/custom + M3 result page; dashboard already module-agnostic from M2). Task 1 = API DTOs/unions (M3 request/response shapes exactly matching merged M3-B). Task 2 = wizard: choice-first reorder (M3 has no dataset — the key structural requirement), M3 button, `M3Schema`+`M3Form` with preset selector (OpenAI-compatible) vs custom, secret-not-stored hint, `createAudit({module:"M3",target,lang})`, redirect; M1/M2 step-count unchanged. Task 3 = `M3View` selected by `data.module === "M3"` (M2 `'clusters' in m` path untouched), Gauge + per-category table + divergent-examples table + warnings, shared Interpretation/ReportActions/StatusBadge/pre-check reused. PDF/Excel already transversal (M3-B) — no work needed; the existing module-agnostic `ReportActions` renders for M3 automatically. Task 4 = gates + scope/identity. No spec requirement left unmapped.

**2. Placeholder scan:** No TBD/"handle later". The `/* same … classes */ ''` markers are explicit instructions to copy the real M2 sibling's className (the plan cannot invent the project's Tailwind/CSS-module strings without inventing them — copying the adjacent M2 component is the correct, concrete action and is called out at every site); the empty-string fallback keeps it type-valid until the real class is filled. Test label regexes are explicitly reconciled with the implemented labels in the same task. Not placeholders in the prohibited sense (no missing logic/types/code).

**3. Type consistency:** `M3AuditCreate{title,module:'M3',target:TargetIn,lang}` (Task 1) is exactly what `M3Form.onSubmit` builds (Task 2) and what M3-B's backend `AuditCreate`+`TargetIn` accept. `M3MetricsOut`/`CategoryStatOut`/`DivergentExampleOut` (Task 1) field-for-field match the M3-B response and are consumed by `M3View` (Task 3). `createAudit` union widened once (Task 1) and used in Task 2. `Verdict` is the existing shared type. `Module` widened to include `'M3'` (Task 2). `isM3 = data.module === 'M3'` is mutually exclusive with the untouched `isM2`. Discriminator choice (`module` field, not structural) avoids touching the M2 `'clusters' in m` check → zero M2 regression risk.
