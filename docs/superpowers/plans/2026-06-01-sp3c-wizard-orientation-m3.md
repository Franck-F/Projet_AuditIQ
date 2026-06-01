# SP3-C — Wizard d'audit orienté : M3 (5 étapes guidées + test connexion + Playwright E2E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le formulaire M3 actuel (à plat — URL, body_template, response_path tous visibles d'un coup avec jargon technique) par un wizard guidé en 5 étapes incluant une étape « Tester la connexion » facultative qui consomme l'endpoint `/audits/m3/test-connection` shipped en SP1.

**Architecture:** `M3Wizard` orchestrateur tient l'état React Hook Form, **pas de dataset** (M3 audite un endpoint LLM, pas un CSV). Step 4 est facultative — l'utilisateur peut la sauter. M2/M3 partagent les mêmes shell components (`WizardShell`/`HelpPanel`/`WizardContext`). Les step components M3 sont **dupliqués** des autres modules (textes/champs diffèrent significativement — Step 2 = config API, Step 3 = format JSON, Step 4 = action de test). M1 et M2 restent intacts.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, React Hook Form, Tailwind v4, vitest + @testing-library/react, Playwright 1.49.

**Spec source:** `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` §3, §4.7 (M3 5 étapes), §6, §7.

**Pré-requis exécution :** main contient SP1 (#28), SP2 (#29), SP3-A (#30), SP3-B (#31), Recommendations (#32) — toutes mergées. `origin/main` HEAD à `f30ddef`.

---

## File Structure

```
apps/web/
├── lib/
│   ├── api/audits.ts                                [MOD]   +testConnectionM3() + validateUrlM3() + 3 types
│   └── wizard/help-content.ts                       [MOD]   +M3 STEP_HELP entries (12 keys)
├── components/audits/wizard/
│   └── m3/
│       ├── M3Wizard.tsx                             [NEW]   orchestrator (no dataset, lang field)
│       ├── Step1Context.tsx                         [NEW]   title + lang dropdown
│       ├── Step2Api.tsx                             [NEW]   url + method + auth_header (optional)
│       ├── Step3Format.tsx                          [NEW]   preset + body_template + response_path
│       ├── Step4TestConnection.tsx                  [NEW]   optional test, calls /audits/m3/test-connection
│       └── Step5Review.tsx                          [NEW]   recap (12 pairs, 6 cats, deadline 45s)
├── app/app/audits/nouveau/page.tsx                  [MOD]   swap M3Form → M3Wizard
└── e2e/wizard-m3-guided.spec.ts                     [NEW]   Playwright happy path (mocked endpoint)

apps/web/__tests__/
├── audits-api.test.ts                               [MOD]   +2 tests (testConnectionM3, validateUrlM3)
├── wizard-help-content.test.ts                      [MOD]   +M3 coverage test
├── wizard-m3-step1-context.test.tsx                 [NEW]
├── wizard-m3-step2-api.test.tsx                     [NEW]
├── wizard-m3-step3-format.test.tsx                  [NEW]
├── wizard-m3-step4-testconnection.test.tsx          [NEW]
├── wizard-m3-step5-review.test.tsx                  [NEW]
└── wizard-m3-flow.test.tsx                          [NEW]
```

**Decomposition rationale:** chaque step = 1 fichier focus. M3 a 7 champs total (title, lang, url, method, auth_header, body_template, response_path) répartis en 4 étapes config + 1 review. Pas d'analyse CSV (pas de dataset), pas d'attribut protégé (M3 = audit chatbot). Step 4 « Tester » est l'innovation propre à M3 — bouton qui déclenche un appel one-shot via l'endpoint SP1.

---

## Conventions répétées

- **Worktree** : `worktree-wizard-sp3c-m3`, créé via `git worktree add .claude/worktrees/wizard-sp3c-m3 -b worktree-wizard-sp3c-m3 origin/main`.
- **Identité git** : `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**. Si un commit subagent a une identité drift (`<epitech>` ou `<epitech@example.com>`), normaliser via `git filter-branch --env-filter` avant push (cf. mémoire `git-commit-identity` — SP3-C s'attend à 1-2 occurrences possibles avec les modèles sonnet sur les tasks d'intégration).
- **Commit** : Conventional Commits (`feat(web):`, `test(web):`). Plain `git commit`.
- **Subagent gate** (Step 0 obligatoire) : `git rev-parse --show-toplevel` doit se terminer par `wizard-sp3c-m3`. Repeat IMMEDIATELY before each `git commit`.
- **Scope restriction** : chaque tâche modifie strictement ses fichiers listés. `git status --short` doit montrer EXACTEMENT ces fichiers avant commit. ABORT BLOCKED si scope creep.
- **Controller verification** : après chaque DONE, le controller vérifie HEAD du worktree + sweep main checkout.
- **Aucune modif côté `apps/api/` ni `apps/pdf/`** (les endpoints sont déjà shipped en SP1).

---

## Task 1: API client — `testConnectionM3` + `validateUrlM3` + types

**Files:**
- Modify: `apps/web/lib/api/audits.ts`
- Modify: `apps/web/__tests__/audits-api.test.ts`

- [ ] **Step 1: Failing tests**

Append to `apps/web/__tests__/audits-api.test.ts`:

```typescript
describe('testConnectionM3', () => {
  it('POSTs to /audits/m3/test-connection with target + test_prompt', async () => {
    const mock = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        status: 'ok',
        elapsed_ms: 120,
        extracted_value: 'Bonjour !',
        error: null,
      },
    });
    const out = await testConnectionM3({
      target: {
        url: 'https://api.example.com/v1/chat',
        method: 'POST',
        headers: { Authorization: 'Bearer x' },
        body_template: '{"prompt":"{prompt}"}',
        response_path: 'choices.0.message.content',
      },
      test_prompt: 'Hello',
    });
    expect(mock).toHaveBeenCalledWith(
      '/audits/m3/test-connection',
      expect.objectContaining({ test_prompt: 'Hello' }),
    );
    expect(out.status).toBe('ok');
    expect(out.extracted_value).toBe('Bonjour !');
    mock.mockRestore();
  });
});

describe('validateUrlM3', () => {
  it('POSTs to /audits/m3/validate-url and returns ok status', async () => {
    const mock = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'ok' } });
    const out = await validateUrlM3('https://api.openai.com/v1/chat/completions');
    expect(mock).toHaveBeenCalledWith(
      '/audits/m3/validate-url',
      { url: 'https://api.openai.com/v1/chat/completions' },
    );
    expect(out.status).toBe('ok');
    mock.mockRestore();
  });
});
```

Add `testConnectionM3` and `validateUrlM3` to the imports at top.

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test audits-api
```

Expected: 2 new tests FAIL — functions not exported.

- [ ] **Step 3: Add types + functions**

Append to `apps/web/lib/api/audits.ts`:

```typescript
export type M3TestConnectionIn = {
  target: TargetIn;
  test_prompt?: string;
};

export type M3TestConnectionOut = {
  status: 'ok' | 'error';
  elapsed_ms: number;
  request_sent?: Record<string, unknown> | null;
  response_raw?: unknown;
  extracted_value?: string | null;
  error?: string | null;
};

export type M3ValidateUrlOut = {
  status: 'ok';
};

export async function testConnectionM3(
  body: M3TestConnectionIn,
): Promise<M3TestConnectionOut> {
  const { data } = await api.post<M3TestConnectionOut>(
    '/audits/m3/test-connection',
    body,
  );
  return data;
}

export async function validateUrlM3(url: string): Promise<M3ValidateUrlOut> {
  const { data } = await api.post<M3ValidateUrlOut>(
    '/audits/m3/validate-url',
    { url },
  );
  return data;
}
```

`TargetIn` already exists in this file (added by M3-B/M3-C backend). Verify before assuming.

- [ ] **Step 4: Tests PASS**

```
cd apps/web && pnpm test audits-api
```

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Worktree gate + commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3c-m3
git rev-parse --show-toplevel  # MUST end with wizard-sp3c-m3
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): testConnectionM3 + validateUrlM3 API client helpers + types"
git log --oneline -2
```

---

## Task 2: M3 STEP_HELP entries

**Files:**
- Modify: `apps/web/lib/wizard/help-content.ts`
- Modify: `apps/web/__tests__/wizard-help-content.test.ts`

- [ ] **Step 1: Failing test**

Append to `apps/web/__tests__/wizard-help-content.test.ts`:

```typescript
describe('M3 help entries', () => {
  const M3_REQUIRED_KEYS = [
    'm3.step1',
    'm3.step1.title',
    'm3.step1.lang',
    'm3.step2',
    'm3.step2.url',
    'm3.step2.method',
    'm3.step2.auth_header',
    'm3.step3',
    'm3.step3.preset',
    'm3.step3.body_template',
    'm3.step3.response_path',
    'm3.step4',
    'm3.step5',
  ];

  it('all M3 required help keys have entries', () => {
    for (const key of M3_REQUIRED_KEYS) {
      const entry = getHelp(key);
      expect(entry, `missing entry for ${key}`).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.body.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test wizard-help-content
```

- [ ] **Step 3: Add M3 entries**

In `apps/web/lib/wizard/help-content.ts`, append BEFORE the closing `};` of the `STEP_HELP` constant (after the existing M1+M2 entries):

```typescript
  // M3 — Audit LLM / chatbot
  'm3.step1': {
    title: 'Donnez un nom à votre audit M3',
    body: "M3 audite un chatbot ou LLM en envoyant des paires de prompts (méthode LangBiTe). Choisissez un titre + la langue des prompts.",
    example: '« Audit chatbot RH FR » avec langue = Français',
  },
  'm3.step1.title': {
    title: 'Titre de l’audit',
    body: 'Un nom court (3-50 caractères) qui identifie l’audit. Apparaît dans le tableau de bord et les rapports.',
  },
  'm3.step1.lang': {
    title: 'Langue des prompts',
    body: "Langue dans laquelle AuditIQ enverra les 12 paires de prompts. Choisissez la langue de votre cible : un chatbot français doit être testé en français.",
    example: 'Français pour un assistant RH français ; English pour un chatbot SaaS international.',
  },
  'm3.step2': {
    title: "Configurez l'accès à votre chatbot",
    body: "Indiquez l'URL de l'API du chatbot, la méthode HTTP (POST pour la plupart), et un en-tête d'authentification si nécessaire. AuditIQ vérifie immédiatement que l'URL est publique (pas d'adresse interne) pour des raisons de sécurité.",
  },
  'm3.step2.url': {
    title: 'URL de l’API',
    body: "L'endpoint qui reçoit les requêtes. Doit être en HTTPS et publiquement résolvable. Les URLs internes (10.x, 127.0.0.1, métadonnées cloud) sont refusées (anti-SSRF).",
    example: 'https://api.openai.com/v1/chat/completions',
  },
  'm3.step2.method': {
    title: 'Méthode HTTP',
    body: "Quasi-tous les chatbots utilisent POST. GET est possible mais rare.",
    example: 'POST',
  },
  'm3.step2.auth_header': {
    title: 'En-tête d’authentification (facultatif)',
    body: "Si votre API requiert une clé : « Bearer sk-... » ou « ApiKey ... ». Ce secret est utilisé uniquement pour les appels du test et de l’audit — JAMAIS persisté en base.",
    example: 'Bearer sk-proj-abc123...',
    learnMoreHref: '/docs/concepts/m3-auth',
  },
  'm3.step3': {
    title: "Format des requêtes et de la réponse",
    body: "AuditIQ doit savoir comment envelopper chaque prompt dans une requête JSON (body_template) et où trouver la réponse texte dans le JSON renvoyé (response_path). Le preset OpenAI couvre la plupart des cas.",
  },
  'm3.step3.preset': {
    title: 'Preset de configuration',
    body: "Choisissez « OpenAI-compatible » pour les APIs qui suivent le standard /chat/completions (OpenAI, Mistral, Anthropic via proxies, etc.). « Personnalisé » pour configurer manuellement.",
    example: 'OpenAI-compatible auto-remplit body_template et response_path.',
  },
  'm3.step3.body_template': {
    title: 'Modèle de corps de requête (JSON)',
    body: "Le JSON envoyé à votre API. Doit contenir le placeholder {prompt} (sans guillemets autour) — AuditIQ y injecte chaque prompt encodé JSON-safe.",
    example: '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
  },
  'm3.step3.response_path': {
    title: 'Chemin de la réponse',
    body: "Chemin pointé (style dot-notation) vers le champ texte dans la réponse JSON. AuditIQ extrait cette valeur pour analyse.",
    example: 'choices.0.message.content (pour OpenAI) ; output.text (pour d’autres APIs)',
  },
  'm3.step4': {
    title: 'Tester la connexion',
    body: "Étape FACULTATIVE mais recommandée : envoie un prompt anodin (« Bonjour, peux-tu te présenter ? ») à votre chatbot pour vérifier la config avant l’audit complet (12 paires × 6 catégories). Si le test échoue, vous pouvez quand même lancer l’audit complet — AuditIQ vous laissera décider.",
  },
  'm3.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez la config avant de lancer l’audit complet : 12 paires de prompts × 6 catégories d’attributs protégés (méthode LangBiTe). Deadline 45 s par appel. Métriques : taux de divergence intra-paire, score agrégé, refus structurés. Coût : ~72 appels API à votre chatbot.",
  },
```

- [ ] **Step 4: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-help-content && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3c-m3
git rev-parse --show-toplevel
git add apps/web/lib/wizard/help-content.ts apps/web/__tests__/wizard-help-content.test.ts
git commit -m "feat(web): M3 STEP_HELP entries (13 keys covering steps 1-5 + fields)"
```

---

## Task 3: Step1Context (M3)

**Files:**
- Create: `apps/web/components/audits/wizard/m3/Step1Context.tsx`
- Create: `apps/web/__tests__/wizard-m3-step1-context.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';
import { Step1Context } from '@/components/audits/wizard/m3/Step1Context';

type Values = { title: string; lang: 'fr' | 'en' };

function Harness() {
  const form = useForm<Values>({ defaultValues: { title: '', lang: 'fr' } });
  return (
    <FormProvider {...form}>
      <Step1Context />
    </FormProvider>
  );
}

function HelpKeyProbe() {
  const { helpKey } = useWizard();
  return <span data-testid="hk">{helpKey ?? 'null'}</span>;
}

describe('M3 Step1Context', () => {
  it('renders title input + lang dropdown', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Langue/i })).toBeInTheDocument();
  });

  it('lang dropdown defaults to fr and offers en', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const select = screen.getByRole('combobox', { name: /Langue/i });
    expect(select).toHaveValue('fr');
    const opts = Array.from(select.querySelectorAll('option')).map(o => (o as HTMLOptionElement).value);
    expect(opts).toEqual(['fr', 'en']);
  });

  it('focusing title sets helpKey to m3.step1.title', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('textbox', { name: /titre/i }));
    expect(screen.getByTestId('hk').textContent).toBe('m3.step1.title');
  });

  it('focusing lang sets helpKey to m3.step1.lang', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: /Langue/i }));
    expect(screen.getByTestId('hk').textContent).toBe('m3.step1.lang');
  });
});
```

- [ ] **Step 2: FAIL → create component**

Create `apps/web/components/audits/wizard/m3/Step1Context.tsx`:

```typescript
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

type Values = { title: string; lang: 'fr' | 'en' };

export function Step1Context(): React.ReactElement {
  const { register } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Donnez un nom à votre audit M3
      </h2>
      <p className="text-sm text-fg-secondary">
        M3 audite un chatbot ou LLM en envoyant des paires de prompts (méthode
        LangBiTe). Choisissez un titre + la langue des prompts.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-title" className="text-sm font-medium text-fg-secondary">
          Titre de l&apos;audit
        </label>
        <input
          id="m3-title"
          type="text"
          placeholder="Audit chatbot RH FR"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('title', { required: true })}
          onFocus={() => setHelpKey('m3.step1.title')}
          onBlur={() => clearHelpKey()}
          aria-label="Titre de l'audit"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-lang" className="text-sm font-medium text-fg-secondary">
          Langue des prompts
        </label>
        <select
          id="m3-lang"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('lang', { required: true })}
          onFocus={() => setHelpKey('m3.step1.lang')}
          onBlur={() => clearHelpKey()}
          aria-label="Langue des prompts"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m3-step1-context && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m3/Step1Context.tsx apps/web/__tests__/wizard-m3-step1-context.test.tsx
git commit -m "feat(web): M3 Step1Context (title + lang dropdown + helpKey wiring)"
```

---

## Task 4: Step2Api (M3)

**Files:**
- Create: `apps/web/components/audits/wizard/m3/Step2Api.tsx`
- Create: `apps/web/__tests__/wizard-m3-step2-api.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Api } from '@/components/audits/wizard/m3/Step2Api';

type Values = { url: string; method: string; auth_header: string };

function Harness() {
  const form = useForm<Values>({ defaultValues: { url: '', method: 'POST', auth_header: '' } });
  return <FormProvider {...form}><Step2Api /></FormProvider>;
}

describe('M3 Step2Api', () => {
  it('renders URL, method, auth_header inputs', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByRole('textbox', { name: /URL/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Méthode/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /authentification/i })).toBeInTheDocument();
  });

  it('method defaults to POST', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByRole('textbox', { name: /Méthode/i })).toHaveValue('POST');
  });

  it('shows the security note about auth header', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(
      screen.getByText(/jamais persisté/i)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

type Values = { url: string; method: string; auth_header: string };

export function Step2Api(): React.ReactElement {
  const { register } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Configurez l&apos;accès à votre chatbot
      </h2>
      <p className="text-sm text-fg-secondary">
        Indiquez l&apos;URL, la méthode HTTP (POST pour la plupart), et un
        en-tête d&apos;authentification si nécessaire.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-url" className="text-sm font-medium text-fg-secondary">
          URL de l&apos;API
        </label>
        <input
          id="m3-url"
          type="text"
          placeholder="https://api.openai.com/v1/chat/completions"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('url', { required: true })}
          onFocus={() => setHelpKey('m3.step2.url')}
          onBlur={() => clearHelpKey()}
          aria-label="URL de l'API"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-method" className="text-sm font-medium text-fg-secondary">
          Méthode HTTP
        </label>
        <input
          id="m3-method"
          type="text"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('method', { required: true })}
          onFocus={() => setHelpKey('m3.step2.method')}
          onBlur={() => clearHelpKey()}
          aria-label="Méthode HTTP"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-auth" className="text-sm font-medium text-fg-secondary">
          En-tête d&apos;authentification (facultatif)
        </label>
        <input
          id="m3-auth"
          type="text"
          placeholder="Bearer sk-..."
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('auth_header')}
          onFocus={() => setHelpKey('m3.step2.auth_header')}
          onBlur={() => clearHelpKey()}
          aria-label="En-tête d'authentification"
        />
        <p className="text-xs text-fg-muted">
          Le secret est utilisé pour les appels uniquement — il n&apos;est{' '}
          <strong>jamais persisté</strong> en base.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m3-step2-api && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m3/Step2Api.tsx apps/web/__tests__/wizard-m3-step2-api.test.tsx
git commit -m "feat(web): M3 Step2Api (url + method + auth_header with security note)"
```

---

## Task 5: Step3Format (M3)

**Files:**
- Create: `apps/web/components/audits/wizard/m3/Step3Format.tsx`
- Create: `apps/web/__tests__/wizard-m3-step3-format.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step3Format } from '@/components/audits/wizard/m3/Step3Format';

type Values = { preset: string; body_template: string; response_path: string };

function Harness() {
  const form = useForm<Values>({
    defaultValues: { preset: 'openai', body_template: '', response_path: '' },
  });
  return <FormProvider {...form}><Step3Format /></FormProvider>;
}

describe('M3 Step3Format', () => {
  it('renders preset dropdown + body_template + response_path', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByRole('combobox', { name: /Preset/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Corps de requête/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Chemin de la réponse/i)).toBeInTheDocument();
  });

  it('OpenAI preset fills body_template + response_path on selection', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    const preset = screen.getByRole('combobox', { name: /Preset/i });
    await user.selectOptions(preset, 'openai');
    const body = screen.getByLabelText(/Corps de requête/i) as HTMLTextAreaElement;
    expect(body.value).toContain('{prompt}');
    expect(body.value).toContain('messages');
    const rp = screen.getByLabelText(/Chemin de la réponse/i) as HTMLInputElement;
    expect(rp.value).toBe('choices.0.message.content');
  });

  it('Personnalisé preset clears body_template + response_path', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    const preset = screen.getByRole('combobox', { name: /Preset/i });
    await user.selectOptions(preset, 'openai');
    await user.selectOptions(preset, 'custom');
    const body = screen.getByLabelText(/Corps de requête/i) as HTMLTextAreaElement;
    expect(body.value).toBe('');
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

type Values = { preset: string; body_template: string; response_path: string };

const PRESETS: Record<string, { body: string; path: string }> = {
  openai: {
    body: '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
    path: 'choices.0.message.content',
  },
  custom: { body: '', path: '' },
};

const PRESET_LABEL: Record<string, string> = {
  openai: 'OpenAI-compatible (/chat/completions)',
  custom: 'Personnalisé',
};

export function Step3Format(): React.ReactElement {
  const { register, setValue, watch } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();

  const preset = watch('preset');
  const previousPresetRef = React.useRef(preset);

  React.useEffect(() => {
    if (previousPresetRef.current !== preset && PRESETS[preset]) {
      const cfg = PRESETS[preset];
      setValue('body_template', cfg.body);
      setValue('response_path', cfg.path);
      previousPresetRef.current = preset;
    }
  }, [preset, setValue]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Format des requêtes et de la réponse
      </h2>
      <p className="text-sm text-fg-secondary">
        Choisissez un preset ou configurez manuellement le corps de requête
        et le chemin de la réponse.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-preset" className="text-sm font-medium text-fg-secondary">
          Preset de configuration
        </label>
        <select
          id="m3-preset"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('preset')}
          onFocus={() => setHelpKey('m3.step3.preset')}
          onBlur={() => clearHelpKey()}
          aria-label="Preset"
        >
          {Object.keys(PRESETS).map((k) => (
            <option key={k} value={k}>{PRESET_LABEL[k]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-body" className="text-sm font-medium text-fg-secondary">
          Corps de requête (doit contenir {'{prompt}'})
        </label>
        <textarea
          id="m3-body"
          rows={4}
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm font-mono text-fg"
          {...register('body_template', { required: true })}
          onFocus={() => setHelpKey('m3.step3.body_template')}
          onBlur={() => clearHelpKey()}
          aria-label="Corps de requête"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-rp" className="text-sm font-medium text-fg-secondary">
          Chemin de la réponse
        </label>
        <input
          id="m3-rp"
          type="text"
          placeholder="choices.0.message.content"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm font-mono text-fg"
          {...register('response_path', { required: true })}
          onFocus={() => setHelpKey('m3.step3.response_path')}
          onBlur={() => clearHelpKey()}
          aria-label="Chemin de la réponse"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m3-step3-format && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m3/Step3Format.tsx apps/web/__tests__/wizard-m3-step3-format.test.tsx
git commit -m "feat(web): M3 Step3Format (preset + body_template + response_path)"
```

---

## Task 6: Step4TestConnection (M3 — unique)

**Files:**
- Create: `apps/web/components/audits/wizard/m3/Step4TestConnection.tsx`
- Create: `apps/web/__tests__/wizard-m3-step4-testconnection.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step4TestConnection } from '@/components/audits/wizard/m3/Step4TestConnection';
import * as audits from '@/lib/api/audits';

const target: audits.TargetIn = {
  url: 'https://api.example.com/v1/chat',
  method: 'POST',
  headers: {},
  body_template: '{"prompt":"{prompt}"}',
  response_path: 'choices.0.message.content',
};

describe('M3 Step4TestConnection', () => {
  it('shows Tester + Sauter buttons in idle state', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Step4TestConnection target={target} />
      </WizardProvider>
    );
    expect(screen.getByRole('button', { name: /Tester la connexion/i })).toBeInTheDocument();
    expect(screen.getByText(/facultative/i)).toBeInTheDocument();
  });

  it('calls testConnectionM3 on Tester click and shows success', async () => {
    vi.spyOn(audits, 'testConnectionM3').mockResolvedValue({
      status: 'ok',
      elapsed_ms: 120,
      extracted_value: 'Bonjour ! Je suis un assistant.',
      error: null,
    });
    render(
      <WizardProvider totalSteps={5}>
        <Step4TestConnection target={target} />
      </WizardProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Tester la connexion/i }));
    await waitFor(() => screen.getByText(/Bonjour ! Je suis un assistant/));
    expect(screen.getByText(/Test réussi/i)).toBeInTheDocument();
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('shows error state when testConnectionM3 returns status=error', async () => {
    vi.spyOn(audits, 'testConnectionM3').mockResolvedValue({
      status: 'error',
      elapsed_ms: 50,
      error: 'Réponse illisible (JSON attendu).',
    });
    render(
      <WizardProvider totalSteps={5}>
        <Step4TestConnection target={target} />
      </WizardProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Tester la connexion/i }));
    await waitFor(() => screen.getByText(/Réponse illisible/));
    expect(screen.getByText(/Test échoué/i)).toBeInTheDocument();
    expect(screen.getByText(/peut quand même lancer/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import {
  testConnectionM3,
  type M3TestConnectionOut,
  type TargetIn,
} from '@/lib/api/audits';

interface Step4TestConnectionProps {
  target: TargetIn;
}

export function Step4TestConnection({
  target,
}: Step4TestConnectionProps): React.ReactElement {
  const { setHelpKey, clearHelpKey } = useWizard();
  const [state, setState] = React.useState<
    { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; result: M3TestConnectionOut }
  >({ kind: 'idle' });

  React.useEffect(() => {
    setHelpKey('m3.step4');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  const handleTest = async () => {
    setState({ kind: 'busy' });
    try {
      const result = await testConnectionM3({ target });
      setState({ kind: 'done', result });
    } catch {
      setState({
        kind: 'done',
        result: {
          status: 'error',
          elapsed_ms: 0,
          error: 'Échec réseau lors du test.',
        },
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Tester la connexion</h2>
      <p className="text-sm text-fg-secondary">
        Étape <strong>facultative</strong> mais recommandée : on envoie un
        prompt anodin à votre chatbot pour valider la config avant l&apos;audit
        complet. Vous pouvez passer cette étape avec « Suivant ».
      </p>

      {state.kind === 'idle' && (
        <button
          type="button"
          onClick={handleTest}
          className="self-start rounded-md border border-border-default bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-bg-subtle"
        >
          Tester la connexion
        </button>
      )}

      {state.kind === 'busy' && (
        <p className="text-sm text-fg-muted">Test en cours… (jusqu&apos;à 30 s)</p>
      )}

      {state.kind === 'done' && state.result.status === 'ok' && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-status-pass-border bg-status-pass-bg p-4 text-sm text-status-pass"
        >
          <p className="font-medium">Test réussi ✓ ({state.result.elapsed_ms} ms)</p>
          <p className="font-mono text-xs whitespace-pre-wrap break-words">
            {state.result.extracted_value}
          </p>
        </div>
      )}

      {state.kind === 'done' && state.result.status === 'error' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-status-warn-border bg-status-warn-bg p-4 text-sm text-status-warn"
        >
          <p className="font-medium">Test échoué</p>
          <p>{state.result.error}</p>
          <p className="text-xs text-fg-muted">
            Vous pouvez quand même lancer l&apos;audit complet à l&apos;étape
            suivante — l&apos;échec du test n&apos;est pas bloquant.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m3-step4-testconnection && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m3/Step4TestConnection.tsx apps/web/__tests__/wizard-m3-step4-testconnection.test.tsx
git commit -m "feat(web): M3 Step4TestConnection (optional test via /audits/m3/test-connection)"
```

---

## Task 7: Step5Review (M3)

**Files:**
- Create: `apps/web/components/audits/wizard/m3/Step5Review.tsx`
- Create: `apps/web/__tests__/wizard-m3-step5-review.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Step5Review } from '@/components/audits/wizard/m3/Step5Review';

const values = {
  title: 'Audit chatbot RH',
  lang: 'fr' as const,
  url: 'https://api.example.com/v1/chat',
  method: 'POST',
  auth_header: 'Bearer sk-xxx',
  body_template: '{"prompt":"{prompt}"}',
  response_path: 'choices.0.message.content',
};

describe('M3 Step5Review', () => {
  it('renders title, URL, method, language in the recap', () => {
    render(<Step5Review values={values} />);
    expect(screen.getByText(/Audit chatbot RH/)).toBeInTheDocument();
    expect(screen.getByText(/api.example.com/)).toBeInTheDocument();
    expect(screen.getByText(/POST/)).toBeInTheDocument();
    expect(screen.getByText(/Français/i)).toBeInTheDocument();
  });

  it('lists 12 paired prompts, 6 categories, deadline 45 s', () => {
    render(<Step5Review values={values} />);
    expect(screen.getByText(/12 paires/i)).toBeInTheDocument();
    expect(screen.getByText(/6 catégories/i)).toBeInTheDocument();
    expect(screen.getByText(/45\s*s/i)).toBeInTheDocument();
  });

  it('masks the auth_header value (security)', () => {
    render(<Step5Review values={values} />);
    // The full secret must NOT appear in the rendered DOM
    expect(screen.queryByText(/sk-xxx/)).toBeNull();
    expect(screen.getByText(/En-tête d.authentification.*fourni/i)).toBeInTheDocument();
  });

  it('shows "Pas d\'auth" when auth_header is empty', () => {
    render(<Step5Review values={{ ...values, auth_header: '' }} />);
    expect(screen.getByText(/En-tête d.authentification.*non fourni/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';

interface Step5ReviewValues {
  title: string;
  lang: 'fr' | 'en';
  url: string;
  method: string;
  auth_header: string;
  body_template: string;
  response_path: string;
}

interface Step5ReviewProps {
  values: Step5ReviewValues;
}

const LANG_LABEL: Record<'fr' | 'en', string> = {
  fr: 'Français',
  en: 'English',
};

export function Step5Review({ values }: Step5ReviewProps): React.ReactElement {
  const hasAuth = values.auth_header.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez la config avant de lancer l&apos;audit. L&apos;analyse prend
        généralement 1-3 minutes selon la latence de votre chatbot.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        <p className="text-sm text-fg-secondary">
          Langue des prompts&nbsp;: <strong>{LANG_LABEL[values.lang]}</strong>
        </p>
        <p className="text-sm text-fg-secondary">
          URL&nbsp;: <code>{values.url}</code> ({values.method})
        </p>
        <p className="text-sm text-fg-secondary">
          En-tête d&apos;authentification&nbsp;:{' '}
          {hasAuth ? (
            <em>fourni (masqué pour sécurité)</em>
          ) : (
            <em>non fourni</em>
          )}
        </p>
        <p className="text-sm text-fg-secondary">
          Chemin de la réponse&nbsp;: <code>{values.response_path}</code>
        </p>
      </div>

      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">
          Analyses qui seront produites
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          <li>• 12 paires de prompts × 6 catégories d&apos;attributs protégés (LangBiTe)</li>
          <li>• Métriques : taux de divergence intra-paire, score agrégé, refus structurés</li>
          <li>• Deadline 45 s par appel (max 72 appels)</li>
          <li>• Verdict global + sous-scores par catégorie</li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m3-step5-review && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m3/Step5Review.tsx apps/web/__tests__/wizard-m3-step5-review.test.tsx
git commit -m "feat(web): M3 Step5Review (recap with masked auth, LangBiTe metrics list)"
```

---

## Task 8: M3Wizard orchestrator

**Files:**
- Create: `apps/web/components/audits/wizard/m3/M3Wizard.tsx`
- Create: `apps/web/__tests__/wizard-m3-flow.test.tsx`

- [ ] **Step 1: Failing integration test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { M3Wizard } from '@/components/audits/wizard/m3/M3Wizard';
import * as audits from '@/lib/api/audits';

const auditCreated: audits.AuditOut = {
  id: 'a-1', code: 'AUD-2026-003', title: 'X', status: 'pending', error: null,
  module: 'M3', dataset_id: null, protected_attribute: null,
  decision_column: null, favorable_value: null, privileged_value: null,
  created_at: '2026-06-01T10:00:00Z', completed_at: null, metrics: null,
  interpretation: null, pre_check: [], config: null,
};

describe('M3Wizard happy path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreated);
  });

  it('walks 5 steps and creates an M3 audit (skipping the test step)', async () => {
    const onComplete = vi.fn();
    render(<M3Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1: title + lang
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'My M3');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: API config
    await user.type(
      screen.getByRole('textbox', { name: /URL/i }),
      'https://api.example.com/v1/chat',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3: preset OpenAI fills body + path automatically
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4: skip test (just click Suivant — facultative)
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5: review + submit
    expect(screen.getByText(/Récapitulatif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M3',
          title: 'My M3',
          lang: 'fr',
          target: expect.objectContaining({
            url: 'https://api.example.com/v1/chat',
            method: 'POST',
            response_path: 'choices.0.message.content',
          }),
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-1');
  });

  it('omits the Authorization header when auth_header is empty', async () => {
    render(<M3Wizard onComplete={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'X');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.type(
      screen.getByRole('textbox', { name: /URL/i }),
      'https://api.example.com/v1/chat',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Terminer/i }));
    await waitFor(() => {
      const lastCall = vi.mocked(audits.createAudit).mock.calls[0]?.[0];
      const body = lastCall as { target?: { headers?: Record<string, string> } };
      expect(body.target?.headers).toEqual({});
    });
  });
});
```

- [ ] **Step 2: FAIL → create orchestrator**

```typescript
'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { HelpPanel } from '@/components/audits/wizard/HelpPanel';
import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import { Step1Context } from '@/components/audits/wizard/m3/Step1Context';
import { Step2Api } from '@/components/audits/wizard/m3/Step2Api';
import { Step3Format } from '@/components/audits/wizard/m3/Step3Format';
import { Step4TestConnection } from '@/components/audits/wizard/m3/Step4TestConnection';
import { Step5Review } from '@/components/audits/wizard/m3/Step5Review';
import { createAudit, type TargetIn } from '@/lib/api/audits';
import type { WizardStepDef } from '@/lib/wizard/types';

interface M3Values {
  title: string;
  lang: 'fr' | 'en';
  url: string;
  method: string;
  auth_header: string;
  preset: string;
  body_template: string;
  response_path: string;
}

const DEFAULTS: M3Values = {
  title: '',
  lang: 'fr',
  url: '',
  method: 'POST',
  auth_header: '',
  preset: 'openai',
  body_template:
    '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
  response_path: 'choices.0.message.content',
};

interface M3WizardProps {
  onComplete: (auditId: string) => void;
}

export function M3Wizard({ onComplete }: M3WizardProps): React.ReactElement {
  const form = useForm<M3Values>({ defaultValues: DEFAULTS });
  const values = form.watch();

  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const buildTarget = (v: M3Values): TargetIn => ({
    url: v.url,
    method: v.method,
    headers: v.auth_header.trim()
      ? { Authorization: v.auth_header.trim() }
      : {},
    body_template: v.body_template,
    response_path: v.response_path,
  });

  const steps: ReadonlyArray<WizardStepDef<M3Values>> = [
    {
      id: 'context',
      title: 'Contexte',
      helpKey: 'm3.step1',
      isValid: (v) => v.title.trim().length > 0,
    },
    {
      id: 'api',
      title: 'API',
      helpKey: 'm3.step2',
      isValid: (v) => v.url.trim().length > 0 && v.method.trim().length > 0,
    },
    {
      id: 'format',
      title: 'Format',
      helpKey: 'm3.step3',
      isValid: (v) =>
        v.body_template.trim().length > 0 &&
        v.response_path.trim().length > 0,
    },
    {
      id: 'test',
      title: 'Test (facultatif)',
      helpKey: 'm3.step4',
      isValid: () => true,
    },
    {
      id: 'review',
      title: 'Résumé',
      helpKey: 'm3.step5',
      isValid: () => true,
    },
  ];

  const onSubmit = async () => {
    const v = form.getValues();
    setSubmitError(null);
    try {
      const audit = await createAudit({
        title: v.title,
        module: 'M3',
        target: buildTarget(v),
        lang: v.lang,
      });
      onComplete(audit.id);
    } catch {
      setSubmitError("Le lancement de l'audit a échoué. Réessayez.");
    }
  };

  return (
    <FormProvider {...form}>
      <WizardProvider totalSteps={steps.length}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            {submitError !== null && (
              <p role="alert" className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail">
                {submitError}
              </p>
            )}
            <WizardShell<M3Values>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context':
                    return <Step1Context />;
                  case 'api':
                    return <Step2Api />;
                  case 'format':
                    return <Step3Format />;
                  case 'test':
                    return <Step4TestConnection target={buildTarget(values)} />;
                  case 'review':
                    return <Step5Review values={values} />;
                  default:
                    return null;
                }
              }}
            />
          </div>
          <HelpPanel />
        </div>
      </WizardProvider>
    </FormProvider>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m3-flow && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m3/M3Wizard.tsx apps/web/__tests__/wizard-m3-flow.test.tsx
git commit -m "feat(web): M3Wizard orchestrator (form + 5 steps incl. optional test step)"
```

---

## Task 9: page.tsx M3 swap

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Modify: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Update test for new M3 behavior**

In `apps/web/__tests__/nouveau-page.test.tsx`, find existing M3 tests that assumed the old M3Form's flat fields (likely tests that click "Audit LLM" and immediately find URL/body fields). Replace with a smoke test:

```typescript
it('M3 module choice shows the new wizard (step 1: title + lang)', async () => {
  const user = userEvent.setup();
  render(<NouveauPage />);
  await user.click(screen.getByRole('button', { name: /Audit LLM/i }));
  expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /Langue/i })).toBeInTheDocument();
  // Step 3 fields not visible at step 1
  expect(screen.queryByLabelText(/Corps de requête/i)).toBeNull();
});
```

Delete or rewrite any pre-existing M3 test that walked the old form directly. M1 and M2 tests remain untouched.

- [ ] **Step 2: Update page.tsx**

Add import at top:
```typescript
import { M3Wizard } from '@/components/audits/wizard/m3/M3Wizard';
```

Replace the M3 branch (currently `<M3Form ... />`) with:
```typescript
) : module === 'M3' ? (
  <M3Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
```

Delete the local `M3Form` function definition + `M3Schema` zod constant + `M3Values` type + `M3_PRESETS` constant if they exist in `page.tsx`. Remove their imports if they become orphaned (e.g., `zodResolver`, `z` might still be needed; verify and only remove if truly unused).

- [ ] **Step 3: Full test + gates**

```
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: vitest target ~120 passing (109 baseline after Recommendations merge + ~17 new from this plan), tsc strict clean, eslint 0 errors.

- [ ] **Step 4: Worktree gate + commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3c-m3
git rev-parse --show-toplevel
git status --short  # MUST show exactly 2 modified files (page.tsx + nouveau-page.test.tsx)
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): switch M3 branch of /audits/nouveau to the new M3Wizard"
```

---

## Task 10: Playwright wizard-m3-guided.spec.ts

**Files:**
- Create: `apps/web/e2e/wizard-m3-guided.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect } from '@playwright/test';

test.describe('M3 wizard guided flow', () => {
  test('walks through 5 steps and creates an audit', async ({ page }) => {
    await page.goto('/app/audits/nouveau');

    await page.getByRole('button', { name: /Audit LLM/i }).click();

    // Step 1: title + lang (default fr)
    await page.getByRole('textbox', { name: /titre/i }).fill('E2E M3 wizard');
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 2: API config — use httpbin.org for safe public testing
    await page.getByRole('textbox', { name: /URL/i }).fill('https://httpbin.org/anything');
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 3: OpenAI preset auto-fills body + path
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 4: skip the optional test
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 5: review + submit
    await expect(page.getByText(/Récapitulatif/i)).toBeVisible();
    await expect(page.getByText(/12 paires/i)).toBeVisible();
    await page.getByRole('button', { name: /Terminer/i }).click();

    await page.waitForURL(/\/app\/audits\/[a-f0-9-]+$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /E2E M3 wizard/i })).toBeVisible({
      timeout: 180000,  // M3 audit can take 1-3 min with real LLM calls
    });
  });
});
```

- [ ] **Step 2: Verify it parses**

```
cd apps/web && pnpm exec playwright test --list e2e/wizard-m3-guided.spec.ts
```

Expected: 1 test listed, 0 parse errors. DO NOT run the actual test (live LLM costs + DNS).

- [ ] **Step 3: Commit**

```
git add apps/web/e2e/wizard-m3-guided.spec.ts
git commit -m "test(web): Playwright E2E for M3 guided wizard happy path"
```

---

## Task 11: Final gate + push + PR

- [ ] **Step 1: Full gates**

```
cd apps/web
pnpm test
pnpm typecheck
pnpm lint
```

Expected: vitest ~127 passing (109 baseline + ~18 new from SP3-C), tsc clean, eslint 0 errors.

- [ ] **Step 2: Verify identities + filter-branch if needed**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3c-m3
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

If any commit shows `<epitech>` or `<epitech@example.com>` instead of `<franck-dilane1.fambou@epitech.digital>`, normalize via:

```
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "epitech" ] || [ "$GIT_AUTHOR_EMAIL" = "epitech@example.com" ]; then
  export GIT_AUTHOR_NAME="Franck F"
  export GIT_AUTHOR_EMAIL="franck-dilane1.fambou@epitech.digital"
fi
if [ "$GIT_COMMITTER_EMAIL" = "epitech" ] || [ "$GIT_COMMITTER_EMAIL" = "epitech@example.com" ]; then
  export GIT_COMMITTER_NAME="Franck F"
  export GIT_COMMITTER_EMAIL="franck-dilane1.fambou@epitech.digital"
fi
' -- origin/main..HEAD
```

Re-verify with `git log` after filter-branch.

- [ ] **Step 3: Push + open PR**

```
git push -u origin worktree-wizard-sp3c-m3
gh pr create --title "feat(web): wizard orientation SP3-C — M3 guided wizard (5 steps incl. test connection + Playwright E2E)" --body "$(cat <<'EOF'
## Summary

Sous-projet 3-C — dernier sous-projet du wizard d'audit orienté.

Bascule la branche **M3** du formulaire d'audit vers un wizard guidé en 5 étapes incluant une étape « Tester la connexion » facultative qui utilise l'endpoint `/audits/m3/test-connection` (SP1).

1. **Contexte** — titre + langue des prompts (fr/en).
2. **API du chatbot** — URL, méthode HTTP, en-tête d'authentification optionnel (jamais persisté).
3. **Format** — preset OpenAI-compatible / Personnalisé, body_template avec `{prompt}`, response_path (dot-notation).
4. **Tester la connexion** *(facultative)* — bouton qui appelle `testConnectionM3()`. Succès affiche la valeur extraite + latence. Échec affiche le diagnostic + permet de continuer quand même (UX non-bloquante).
5. **Résumé & lancement** — récap avec auth masquée, liste des analyses (12 paires × 6 catégories LangBiTe, deadline 45 s/appel, métriques de divergence intra-paire).

Avec ce merge, **les 3 modules M1/M2/M3 utilisent le nouveau wizard guidé**. Le formulaire à plat historique disparaît complètement de `audits/nouveau/page.tsx`.

## Test plan

- [x] vitest ~127 passing (de 109 baseline post-Recommendations, +18 nouveaux : audits-api 2, help-content 1, step1 4, step2 3, step3 3, step4 3, step5 4, flow 2, nouveau-page 1)
- [x] tsc strict clean
- [x] eslint 0 errors
- [x] Playwright spec parse OK
- [x] 10 commits Franck F, zéro trailer Claude

## Dépendances

Construit sur SP1 (`/audits/m3/test-connection` + `/audits/m3/validate-url`), SP2 (shell components), SP3-A (page.tsx wizard structure), SP3-B (M2 patterns).

## Sécurité

- L'auth_header (Bearer token) n'est **jamais persisté** côté backend (rule M3-B existante)
- Affichage récap masque la valeur du token (« fourni (masqué pour sécurité) »)
- URL passe par SSRF check côté backend (validate-url) avant l'appel test-connection ; l'audit complet le re-valide
EOF
)"
```

- [ ] **Step 4: Plan-sync commit if needed**

If any task required deviation from the plan:

```
git add docs/superpowers/plans/2026-06-01-sp3c-wizard-orientation-m3.md
git commit -m "chore(plan): sync SP3-C plan with discoveries during execution"
```

---

## Spec coverage check

| Spec section / item | Covered by |
|---|---|
| §4.7 — M3 5 étapes (contexte → API → format → test → résumé) | Tasks 3-7 |
| §4.7 — Step 4 test-connection FACULTATIVE | Task 6 (Sauter via Suivant) |
| §4.7 — Preset OpenAI auto-remplit body+path | Task 5 |
| §4.5 — M3 STEP_HELP entries | Task 2 |
| §4.6 — HelpPanel composition | Task 8 (M3Wizard) |
| §6 — test-connection échec non-bloquant | Task 6 (UX warn + continue OK) |
| §6 — createAudit 5xx : submitError state | Task 8 |
| §7 — Playwright wizard-m3-guided.spec.ts | Task 10 |
| Security — auth_header jamais persisté côté UI display | Task 7 (Step5Review masque) |

**Out-of-scope:**
- Bottom-sheet mobile pour HelpPanel
- react-markdown rendering du body
- Persistence brouillon
- Réutilisation de configs précédentes
