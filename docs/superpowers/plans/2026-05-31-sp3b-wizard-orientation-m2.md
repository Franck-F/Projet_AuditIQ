# SP3-B — Wizard d'audit orienté : M2 (5 étapes guidées + Playwright E2E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le formulaire M2 actuel (à plat) par un wizard guidé en 5 étapes, sur le même modèle que SP3-A pour M1 — mais avec une étape « Paramètres avancés » (k/deviation_pp/chi2_alpha) au lieu de « Attribut protégé » (M2 = unsupervised, pas d'attribut sensible déclaré).

**Architecture:** `M2Wizard` orchestrateur tient l'état React Hook Form + dataset uploadé + résultat d'analyse. Délègue le rendu de chaque étape à un composant `StepN` via `WizardShell.renderStep`. Mêmes patterns que M1 — duplique au lieu d'extraire (les variations de texte par module rendent l'abstraction prématurée). La page `audits/nouveau` continue d'exposer M1/M2/M3 ; la branche M1 utilise M1Wizard (SP3-A), la branche M2 bascule sur M2Wizard, M3 reste intact (SP3-C).

**Tech Stack:** Next.js 16, React 19, TypeScript strict, React Hook Form, Tailwind v4, vitest + @testing-library/react, Playwright 1.49.

**Spec source:** `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` §3, §4.7 (M2 5 étapes), §6, §7.

**Pré-requis exécution :** SP3-A (PR #30) DOIT être mergée sur `main` (utilise `WizardShell`, `HelpPanel`, `analyzeDataset`, `DatasetAnalysisOut` types). Vérifier `git log origin/main` contient la squash de SP3-A. Si pas mergée, créer le worktree depuis `worktree-wizard-sp3a-m1` puis rebaser après merge.

---

## File Structure

```
apps/web/
├── lib/wizard/help-content.ts                       [MOD]   +M2 STEP_HELP entries (8 keys)
├── components/audits/wizard/
│   └── m2/
│       ├── M2Wizard.tsx                             [NEW]   orchestrator
│       ├── Step1Context.tsx                         [NEW]   title input (M2 variant)
│       ├── Step2Data.tsx                            [NEW]   upload + analysis (M2 variant)
│       ├── Step3Decision.tsx                        [NEW]   decision_column + favorable_value
│       ├── Step4Advanced.tsx                        [NEW]   k / deviation_pp / chi2_alpha (collapsible)
│       └── Step5Review.tsx                          [NEW]   recap M2 (KMeans config)
├── app/app/audits/nouveau/page.tsx                  [MOD]   swap M2Form → M2Wizard
└── e2e/wizard-m2-guided.spec.ts                     [NEW]   Playwright happy path

apps/web/__tests__/
├── wizard-help-content.test.ts                      [MOD]   +M2 coverage test
├── wizard-m2-step1-context.test.tsx                 [NEW]
├── wizard-m2-step2-data.test.tsx                    [NEW]
├── wizard-m2-step3-decision.test.tsx                [NEW]
├── wizard-m2-step4-advanced.test.tsx                [NEW]
├── wizard-m2-step5-review.test.tsx                  [NEW]
└── wizard-m2-flow.test.tsx                          [NEW]
```

**Decomposition rationale:** mêmes patterns que SP3-A — un fichier par étape, test dédié. Step1Context et Step2Data sont **duplicate** de M1 (textes diffèrent légèrement, helpKeys diffèrent). Step3Decision est aussi duplicate (M1 et M2 ont les mêmes inputs ; refactor cross-module hors scope). Step4Advanced est unique à M2. Step5Review a un contenu différent (kMeans clusters au lieu de DI/4-5).

---

## Conventions répétées

- **Worktree** : `worktree-wizard-sp3b-m2`, créé via `git worktree add .claude/worktrees/wizard-sp3b-m2 -b worktree-wizard-sp3b-m2 origin/main` (si #30 mergée) ou `... worktree-wizard-sp3a-m1` (sinon).
- **Identité git** : `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**.
- **Commit** : Conventional Commits. Plain `git commit`.
- **Subagent gate** (Step 0 obligatoire) : `git rev-parse --show-toplevel` doit se terminer par `wizard-sp3b-m2`.
- **Scope restriction** : chaque tâche modifie strictement ses fichiers listés. `git status --short` doit montrer EXACTEMENT ces fichiers avant commit.
- **Controller verification** : après chaque DONE, le controller vérifie HEAD du worktree + sweep main checkout.
- **Aucune modif côté `apps/api/` ni `apps/pdf/`**.

---

## Task 1: M2 STEP_HELP entries

**Files:**
- Modify: `apps/web/lib/wizard/help-content.ts`
- Modify: `apps/web/__tests__/wizard-help-content.test.ts`

- [ ] **Step 1: Failing test**

Append to `apps/web/__tests__/wizard-help-content.test.ts`:

```typescript
describe('M2 help entries', () => {
  const M2_REQUIRED_KEYS = [
    'm2.step1',
    'm2.step1.title',
    'm2.step2',
    'm2.step3',
    'm2.step3.decision_column',
    'm2.step3.favorable_value',
    'm2.step4',
    'm2.step4.k',
    'm2.step4.deviation_pp',
    'm2.step4.chi2_alpha',
    'm2.step5',
  ];

  it('all M2 required help keys have entries', () => {
    for (const key of M2_REQUIRED_KEYS) {
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

- [ ] **Step 3: Add entries**

In `apps/web/lib/wizard/help-content.ts`, append to the `STEP_HELP` constant (after the M1 block, keep M1 + canary intact):

```typescript
  // M2 — Détection non supervisée
  'm2.step1': {
    title: 'Donnez un nom à votre détection',
    body: "Choisissez un titre court et descriptif. La détection non supervisée cherche des groupes de décisions inhabituels sans connaître l'attribut sensible.",
    example: '« Détection biais octrois crédit 2026 »',
  },
  'm2.step1.title': {
    title: 'Titre de la détection',
    body: 'Un nom court (3-50 caractères) qui identifie l’audit. Apparaît dans le tableau de bord et les rapports.',
  },
  'm2.step2': {
    title: 'Importez votre jeu de données',
    body: "Importez le CSV des décisions à analyser. Inutile d'inclure un attribut protégé : M2 détecte les écarts à partir des features comportementales (montant, durée, ancienneté, etc.).",
    example: 'Un CSV de 1 000 décisions de crédit avec colonnes : montant, duree, garantie, anciennete, decision.',
  },
  'm2.step3': {
    title: 'Quelle décision auditer ?',
    body: "Indiquez la colonne de décision et la valeur favorable. M2 mesurera comment cette valeur se distribue entre les clusters découverts automatiquement.",
  },
  'm2.step3.decision_column': {
    title: 'Colonne de décision',
    body: "Colonne qui contient la sortie binaire ou catégorielle du modèle. AuditIQ propose la plus probable.",
    example: '« accorde » avec valeurs 0 / 1.',
  },
  'm2.step3.favorable_value': {
    title: 'Valeur favorable',
    body: "Valeur représentant le bénéfice (accordé, accepté, 1). M2 mesure le taux de cette valeur dans chaque cluster.",
  },
  'm2.step4': {
    title: 'Paramètres avancés (facultatif)',
    body: "Les valeurs par défaut conviennent à la plupart des cas (k=5 clusters, seuil 20 pp, alpha 0.05). N'ajustez que si vous savez ce que vous faites — par exemple plus de clusters sur un grand dataset.",
  },
  'm2.step4.k': {
    title: 'Nombre de clusters (k)',
    body: "Nombre de groupes que KMeans cherchera. Plus k est grand, plus la segmentation est fine — mais aussi plus sensible au bruit. Par défaut k=5 convient à 100-10 000 lignes.",
    example: 'k=3 pour un petit dataset (<200 lignes), k=8 pour un grand (>10 000).',
  },
  'm2.step4.deviation_pp': {
    title: 'Seuil de déviation (points)',
    body: "Un cluster est considéré « déviant » si son taux de décision favorable s'écarte de cette valeur (en points de pourcentage) du taux global. 20 pp = écart d'environ 20 points avec la moyenne.",
    example: 'Taux global 50 %, seuil 20 pp → un cluster à 25 % ou à 75 % est marqué déviant.',
  },
  'm2.step4.chi2_alpha': {
    title: 'Seuil χ² (alpha)',
    body: "Niveau de significativité du test du chi-deux d'indépendance. 0.05 = on accepte 5 % de chance de fausse alerte.",
    example: 'alpha=0.01 (plus strict), 0.05 (standard), 0.10 (plus permissif).',
  },
  'm2.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez les paramètres avant de lancer la détection. KMeans + chi² prennent généralement 5-30 secondes selon la taille du dataset.",
  },
```

- [ ] **Step 4: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-help-content && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3b-m2
git rev-parse --show-toplevel  # MUST end with wizard-sp3b-m2
git add apps/web/lib/wizard/help-content.ts apps/web/__tests__/wizard-help-content.test.ts
git commit -m "feat(web): M2 STEP_HELP entries (11 keys covering steps 1-5 + advanced params)"
```

---

## Task 2: Step1Context (M2)

**Files:**
- Create: `apps/web/components/audits/wizard/m2/Step1Context.tsx`
- Create: `apps/web/__tests__/wizard-m2-step1-context.test.tsx`

- [ ] **Step 1: Failing test**

Create `apps/web/__tests__/wizard-m2-step1-context.test.tsx` (identical structure to M1's, but with `m2.step1.title` helpKey and different placeholder):

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';
import { Step1Context } from '@/components/audits/wizard/m2/Step1Context';

type Values = { title: string };

function Harness() {
  const form = useForm<Values>({ defaultValues: { title: '' } });
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

describe('M2 Step1Context', () => {
  it('renders a title input', () => {
    render(
      <WizardProvider totalSteps={5}><Harness /></WizardProvider>
    );
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  });

  it('focusing the input sets helpKey to m2.step1.title', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('textbox', { name: /titre/i }));
    expect(screen.getByTestId('hk').textContent).toBe('m2.step1.title');
  });

  it('blurring clears helpKey', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('textbox', { name: /titre/i }));
    await user.tab();
    expect(screen.getByTestId('hk').textContent).toBe('null');
  });
});
```

- [ ] **Step 2: FAIL → create component**

Create `apps/web/components/audits/wizard/m2/Step1Context.tsx`:

```typescript
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

export function Step1Context(): React.ReactElement {
  const { register } = useFormContext<{ title: string }>();
  const { setHelpKey, clearHelpKey } = useWizard();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-fg">
        Donnez un nom à votre détection
      </h2>
      <p className="text-sm text-fg-secondary">
        La détection non supervisée cherche des groupes de décisions inhabituels
        sans connaître l&apos;attribut sensible.
      </p>
      <label htmlFor="m2-title" className="text-sm font-medium text-fg-secondary">
        Titre de la détection
      </label>
      <input
        id="m2-title"
        type="text"
        placeholder="Détection biais octrois crédit 2026"
        className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
        {...register('title', { required: true })}
        onFocus={() => setHelpKey('m2.step1.title')}
        onBlur={() => clearHelpKey()}
        aria-label="Titre de la détection"
      />
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m2-step1-context && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3b-m2
git add apps/web/components/audits/wizard/m2/Step1Context.tsx apps/web/__tests__/wizard-m2-step1-context.test.tsx
git commit -m "feat(web): M2 Step1Context (title input + helpKey wiring)"
```

---

## Task 3: Step2Data (M2)

**Files:**
- Create: `apps/web/components/audits/wizard/m2/Step2Data.tsx`
- Create: `apps/web/__tests__/wizard-m2-step2-data.test.tsx`

Same shape as M1's Step2Data but pass `module="M2"` to `DatasetUploadCard` and slightly different intro text.

- [ ] **Step 1: Failing test**

Create `apps/web/__tests__/wizard-m2-step2-data.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Data } from '@/components/audits/wizard/m2/Step2Data';
import type { DatasetOut, DatasetAnalysisOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 1234,
  columns: ['montant', 'duree', 'decision'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: dataset.columns.map((c) => ({
    name: c, dtype: 'categorical', unique_count: 2, null_ratio: 0,
    top_values: [], role_hint: c === 'decision' ? 'decision' : 'feature',
  })),
  suggested_decision: { column: 'decision', confidence: 0.85, reason: '', favorable_value: '1' },
  suggested_protected: null,
};

function wrap(children: React.ReactNode) {
  return <WizardProvider totalSteps={5}>{children}</WizardProvider>;
}

describe('M2 Step2Data', () => {
  it('shows the upload card when no dataset', () => {
    render(wrap(<Step2Data dataset={null} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText(/Importez votre jeu de données/i)).toBeInTheDocument();
  });

  it('shows file summary when dataset selected', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText('credit.csv')).toBeInTheDocument();
    expect(screen.getByText(/1\D?234\s+lignes/)).toBeInTheDocument();
  });

  it('shows skeleton while analysis is loading', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={null} analysisError={null} onUpload={vi.fn()} busy={true} />));
    expect(screen.getByText(/Analyse en cours/i)).toBeInTheDocument();
  });

  it('shows analysis suggestion when present', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={analysis} analysisError={null} onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText(/Analyse automatique/i)).toBeInTheDocument();
    expect(screen.getByText(/decision/)).toBeInTheDocument();
  });

  it('shows non-blocking warning on analysis failure', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={null} analysisError="indisponible" onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText(/Analyse indisponible/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL → create component**

Create `apps/web/components/audits/wizard/m2/Step2Data.tsx`:

```typescript
'use client';

import * as React from 'react';

import { DatasetUploadCard } from '@/components/audits/DatasetUploadCard';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

interface Step2DataProps {
  dataset: DatasetOut | null;
  analysis: DatasetAnalysisOut | null;
  analysisError: string | null;
  onUpload: (file: File) => void;
  busy: boolean;
}

export function Step2Data({
  dataset,
  analysis,
  analysisError,
  onUpload,
  busy,
}: Step2DataProps): React.ReactElement {
  if (!dataset) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Importez votre jeu de données</h2>
        <p className="text-sm text-fg-secondary">
          M2 détecte les écarts à partir des features comportementales (montant,
          durée, ancienneté…). Inutile d&apos;inclure un attribut protégé.
        </p>
        <DatasetUploadCard module="M2" busy={busy} onSelected={onUpload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Jeu de données importé</h2>
      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="font-medium text-fg">{dataset.filename}</p>
        <p className="text-xs text-fg-muted">
          {dataset.row_count.toLocaleString('fr-FR')} lignes, {dataset.columns.length} colonnes
        </p>
      </div>

      {busy && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="text-sm text-fg-muted">Analyse en cours… cela peut prendre 2-5 secondes.</p>
        </div>
      )}

      {analysisError !== null && (
        <div role="alert" className="rounded-md border border-status-warn-border bg-status-warn-bg p-4 text-sm text-status-warn">
          <p className="font-medium">Analyse indisponible</p>
          <p>{analysisError} Vous pouvez continuer en sélectionnant manuellement les colonnes.</p>
        </div>
      )}

      {analysis !== null && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-fg">Analyse automatique</p>
          <ul className="flex flex-col gap-1 text-xs text-fg-secondary">
            {analysis.suggested_decision !== null && (
              <li>
                Décision suggérée : <strong>{analysis.suggested_decision.column}</strong> (
                {Math.round(analysis.suggested_decision.confidence * 100)}%)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m2-step2-data && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m2/Step2Data.tsx apps/web/__tests__/wizard-m2-step2-data.test.tsx
git commit -m "feat(web): M2 Step2Data (upload + analysis card, no protected attribute)"
```

---

## Task 4: Step3Decision (M2)

**Files:**
- Create: `apps/web/components/audits/wizard/m2/Step3Decision.tsx`
- Create: `apps/web/__tests__/wizard-m2-step3-decision.test.tsx`

Identical logic to M1's Step3Decision (same dropdown + dynamic favorable_value), only helpKeys change from `m1.*` to `m2.*`.

- [ ] **Step 1: Failing test**

Create `apps/web/__tests__/wizard-m2-step3-decision.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step3Decision } from '@/components/audits/wizard/m2/Step3Decision';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

type Values = { decision_column: string; favorable_value: string };

function Harness({ columns, analysis }: { columns: string[]; analysis: DatasetAnalysisOut | null }) {
  const form = useForm<Values>({ defaultValues: { decision_column: '', favorable_value: '' } });
  return (
    <FormProvider {...form}>
      <Step3Decision columns={columns} analysis={analysis} />
    </FormProvider>
  );
}

const cols = ['montant', 'duree', 'decision'];
const analysis: DatasetAnalysisOut = {
  columns: cols.map((c) => ({
    name: c, dtype: 'categorical',
    unique_count: c === 'decision' ? 2 : 5,
    null_ratio: 0,
    top_values: c === 'decision' ? ([['1', 80], ['0', 120]] as Array<[unknown, number]>) : ([] as Array<[unknown, number]>),
    role_hint: c === 'decision' ? 'decision' : 'feature',
  })),
  suggested_decision: { column: 'decision', confidence: 0.92, reason: '', favorable_value: '1' },
  suggested_protected: null,
};

describe('M2 Step3Decision', () => {
  it('renders dropdowns', () => {
    render(<WizardProvider totalSteps={5}><Harness columns={cols} analysis={null} /></WizardProvider>);
    expect(screen.getByRole('combobox', { name: /Colonne de décision/i })).toBeInTheDocument();
  });

  it('shows Suggéré badge', () => {
    render(<WizardProvider totalSteps={5}><Harness columns={cols} analysis={analysis} /></WizardProvider>);
    expect(screen.getByText(/Suggéré/i)).toBeInTheDocument();
  });

  it('disables favorable_value until decision chosen', () => {
    render(<WizardProvider totalSteps={5}><Harness columns={cols} analysis={null} /></WizardProvider>);
    expect(screen.getByRole('combobox', { name: /Valeur favorable/i })).toBeDisabled();
  });

  it('populates favorable_value from top_values', async () => {
    render(<WizardProvider totalSteps={5}><Harness columns={cols} analysis={analysis} /></WizardProvider>);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox', { name: /Colonne de décision/i }), 'decision');
    const fav = screen.getByRole('combobox', { name: /Valeur favorable/i });
    expect(fav).not.toBeDisabled();
    const opts = Array.from(fav.querySelectorAll('option')).map(o => (o as HTMLOptionElement).value);
    expect(opts).toContain('1');
    expect(opts).toContain('0');
  });
});
```

- [ ] **Step 2: FAIL → create component**

Create `apps/web/components/audits/wizard/m2/Step3Decision.tsx`:

```typescript
'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

interface Step3DecisionProps {
  columns: ReadonlyArray<string>;
  analysis: DatasetAnalysisOut | null;
}

type Values = { decision_column: string; favorable_value: string };

export function Step3Decision({ columns, analysis }: Step3DecisionProps): React.ReactElement {
  const { register, control } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const selectedDecision = useWatch({ control, name: 'decision_column' });

  const suggestedDecision = analysis?.suggested_decision?.column ?? null;

  const selectedColumnProfile = React.useMemo(() => {
    if (!analysis || !selectedDecision) return null;
    return analysis.columns.find((c) => c.name === selectedDecision) ?? null;
  }, [analysis, selectedDecision]);

  const favorableOptions = React.useMemo(() => {
    if (!selectedColumnProfile) return [];
    return selectedColumnProfile.top_values.map(([v]) => String(v as string | number | boolean));
  }, [selectedColumnProfile]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Quelle décision auditer&nbsp;?</h2>
      <p className="text-sm text-fg-secondary">
        Indiquez la colonne et la valeur favorable. M2 mesurera la distribution
        de cette valeur entre les clusters découverts automatiquement.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m2-decision" className="text-sm font-medium text-fg-secondary">Colonne de décision</label>
        <select
          id="m2-decision"
          defaultValue=""
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('decision_column', { required: true })}
          onFocus={() => setHelpKey('m2.step3.decision_column')}
          onBlur={() => clearHelpKey()}
          aria-label="Colonne de décision"
        >
          <option value="" disabled>—</option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}{c === suggestedDecision ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m2-favorable" className="text-sm font-medium text-fg-secondary">Valeur favorable</label>
        {favorableOptions.length > 0 ? (
          <select
            id="m2-favorable"
            defaultValue=""
            disabled={!selectedDecision}
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('m2.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          >
            <option value="" disabled>—</option>
            {favorableOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : (
          <input
            id="m2-favorable"
            type="text"
            disabled={!selectedDecision}
            placeholder="Saisissez la valeur (ex. 1, oui, accepté)"
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('m2.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-m2-step3-decision && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m2/Step3Decision.tsx apps/web/__tests__/wizard-m2-step3-decision.test.tsx
git commit -m "feat(web): M2 Step3Decision (decision_column + smart favorable_value dropdown)"
```

---

## Task 5: Step4Advanced (M2 — unique)

**Files:**
- Create: `apps/web/components/audits/wizard/m2/Step4Advanced.tsx`
- Create: `apps/web/__tests__/wizard-m2-step4-advanced.test.tsx`

Collapsible advanced params : `k`, `deviation_pp`, `chi2_alpha`. Closed by default with explanatory text.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step4Advanced } from '@/components/audits/wizard/m2/Step4Advanced';

type Values = { k: string; deviation_pp: string; chi2_alpha: string };

function Harness() {
  const form = useForm<Values>({ defaultValues: { k: '', deviation_pp: '', chi2_alpha: '' } });
  return <FormProvider {...form}><Step4Advanced /></FormProvider>;
}

describe('M2 Step4Advanced', () => {
  it('shows defaults message by default (collapsed)', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByText(/Valeurs par défaut/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombre de clusters/i)).toBeNull();
  });

  it('expands to show k, deviation_pp, chi2_alpha inputs', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));
    expect(screen.getByLabelText(/Nombre de clusters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seuil de déviation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seuil χ²/i)).toBeInTheDocument();
  });

  it('toggles back to collapsed', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /Personnaliser/i });
    await user.click(btn);
    await user.click(btn);
    expect(screen.queryByLabelText(/Nombre de clusters/i)).toBeNull();
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

type Values = { k: string; deviation_pp: string; chi2_alpha: string };

export function Step4Advanced(): React.ReactElement {
  const { register } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Paramètres avancés</h2>
      <p className="text-sm text-fg-secondary">
        Valeurs par défaut adaptées à la plupart des cas : <code>k=5</code> clusters,
        seuil de déviation <code>20 pp</code>, seuil χ² <code>alpha=0.05</code>.
        N&apos;ajustez que si vous savez ce que vous faites.
      </p>

      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="self-start text-sm text-fg-muted underline-offset-2 hover:underline"
        aria-expanded={expanded}
      >
        {expanded ? '− Personnaliser' : '+ Personnaliser'}
      </button>

      {expanded && (
        <div className="grid gap-4 rounded-md border border-border-default bg-surface p-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m2-k" className="text-sm font-medium text-fg-secondary">
              Nombre de clusters (k)
            </label>
            <input
              id="m2-k"
              type="number"
              min={2}
              max={20}
              placeholder="5"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('k')}
              onFocus={() => setHelpKey('m2.step4.k')}
              onBlur={() => clearHelpKey()}
              aria-label="Nombre de clusters"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m2-dev" className="text-sm font-medium text-fg-secondary">
              Seuil de déviation (pts)
            </label>
            <input
              id="m2-dev"
              type="number"
              min={1}
              max={100}
              placeholder="20"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('deviation_pp')}
              onFocus={() => setHelpKey('m2.step4.deviation_pp')}
              onBlur={() => clearHelpKey()}
              aria-label="Seuil de déviation"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m2-alpha" className="text-sm font-medium text-fg-secondary">
              Seuil χ² (alpha)
            </label>
            <input
              id="m2-alpha"
              type="number"
              step="0.01"
              min={0.001}
              max={0.5}
              placeholder="0.05"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('chi2_alpha')}
              onFocus={() => setHelpKey('m2.step4.chi2_alpha')}
              onBlur={() => clearHelpKey()}
              aria-label="Seuil χ²"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: PASS + commit**

```
cd apps/web && pnpm test wizard-m2-step4-advanced && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m2/Step4Advanced.tsx apps/web/__tests__/wizard-m2-step4-advanced.test.tsx
git commit -m "feat(web): M2 Step4Advanced (collapsible k/deviation_pp/chi2_alpha)"
```

---

## Task 6: Step5Review (M2)

**Files:**
- Create: `apps/web/components/audits/wizard/m2/Step5Review.tsx`
- Create: `apps/web/__tests__/wizard-m2-step5-review.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Step5Review } from '@/components/audits/wizard/m2/Step5Review';
import type { DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1', filename: 'credit.csv', row_count: 1234,
  columns: ['montant', 'decision'], status: 'ready',
  created_at: '2026-05-30T10:00:00Z', expires_at: null,
};

describe('M2 Step5Review', () => {
  it('renders recap with defaults when advanced empty', () => {
    render(<Step5Review dataset={dataset} values={{ title: 'Détection X', decision_column: 'decision', favorable_value: '1', k: '', deviation_pp: '', chi2_alpha: '' }} />);
    expect(screen.getByText(/Détection X/)).toBeInTheDocument();
    expect(screen.getByText(/credit.csv/)).toBeInTheDocument();
    expect(screen.getByText(/k = 5/)).toBeInTheDocument();
    expect(screen.getByText(/déviation = 20 pp/)).toBeInTheDocument();
    expect(screen.getByText(/alpha = 0.05/)).toBeInTheDocument();
  });

  it('uses custom advanced values when provided', () => {
    render(<Step5Review dataset={dataset} values={{ title: 'X', decision_column: 'decision', favorable_value: '1', k: '8', deviation_pp: '15', chi2_alpha: '0.01' }} />);
    expect(screen.getByText(/k = 8/)).toBeInTheDocument();
    expect(screen.getByText(/déviation = 15 pp/)).toBeInTheDocument();
    expect(screen.getByText(/alpha = 0.01/)).toBeInTheDocument();
  });

  it('lists KMeans + chi² + IQR pre-check in analyses', () => {
    render(<Step5Review dataset={dataset} values={{ title: 'X', decision_column: 'decision', favorable_value: '1', k: '', deviation_pp: '', chi2_alpha: '' }} />);
    expect(screen.getByText(/KMeans/i)).toBeInTheDocument();
    expect(screen.getByText(/χ² par cluster/i)).toBeInTheDocument();
    expect(screen.getByText(/IQR/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';

import type { DatasetOut } from '@/lib/api/audits';

interface Step5ReviewValues {
  title: string;
  decision_column: string;
  favorable_value: string;
  k: string;
  deviation_pp: string;
  chi2_alpha: string;
}

interface Step5ReviewProps {
  dataset: DatasetOut | null;
  values: Step5ReviewValues;
}

export function Step5Review({ dataset, values }: Step5ReviewProps): React.ReactElement {
  const k = values.k || '5';
  const dev = values.deviation_pp || '20';
  const alpha = values.chi2_alpha || '0.05';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez les paramètres avant de lancer la détection. KMeans + χ²
        prennent généralement 5-30 secondes selon la taille du dataset.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        {dataset !== null && (
          <p className="text-sm text-fg-secondary">
            Dataset&nbsp;: <strong>{dataset.filename}</strong> ({dataset.row_count.toLocaleString('fr-FR')} lignes)
          </p>
        )}
        <p className="text-sm text-fg-secondary">
          Décision&nbsp;: <code>{values.decision_column}</code> = <code>{values.favorable_value}</code> est l&apos;issue favorable
        </p>
        <p className="text-sm text-fg-secondary">
          Paramètres&nbsp;: k = {k}, déviation = {dev} pp, alpha = {alpha}
        </p>
      </div>

      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">Analyses qui seront produites</p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          <li>• KMeans (k={k} clusters sur features comportementales)</li>
          <li>• χ² par cluster vs taux global de la décision</li>
          <li>• IQR pré-check (alertes statistiques préalables)</li>
          <li>• Caractérisation top-3 features par cluster déviant</li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PASS + commit**

```
cd apps/web && pnpm test wizard-m2-step5-review && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m2/Step5Review.tsx apps/web/__tests__/wizard-m2-step5-review.test.tsx
git commit -m "feat(web): M2 Step5Review (recap with KMeans params + analyses list)"
```

---

## Task 7: M2Wizard orchestrator

**Files:**
- Create: `apps/web/components/audits/wizard/m2/M2Wizard.tsx`
- Create: `apps/web/__tests__/wizard-m2-flow.test.tsx`

- [ ] **Step 1: Failing integration test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { M2Wizard } from '@/components/audits/wizard/m2/M2Wizard';
import * as audits from '@/lib/api/audits';

const dataset: audits.DatasetOut = {
  id: 'd-1', filename: 'credit.csv', row_count: 100,
  columns: ['montant', 'duree', 'decision'], status: 'ready',
  created_at: '2026-05-30T10:00:00Z', expires_at: null,
};

const analysis: audits.DatasetAnalysisOut = {
  columns: [
    { name: 'montant', dtype: 'numeric', unique_count: 50, null_ratio: 0, top_values: [], role_hint: 'feature' },
    { name: 'duree', dtype: 'numeric', unique_count: 30, null_ratio: 0, top_values: [], role_hint: 'feature' },
    { name: 'decision', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['1', 50], ['0', 50]], role_hint: 'decision' },
  ],
  suggested_decision: { column: 'decision', confidence: 0.9, reason: '', favorable_value: '1' },
  suggested_protected: null,
};

const auditCreated: audits.AuditOut = {
  id: 'a-1', code: 'AUD-2026-002', title: 'X', status: 'pending', error: null,
  module: 'M2', dataset_id: 'd-1', protected_attribute: null,
  decision_column: 'decision', favorable_value: '1', privileged_value: null,
  created_at: '2026-05-30T10:00:00Z', completed_at: null, metrics: null,
  interpretation: null, pre_check: [], config: null,
};

describe('M2Wizard happy path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'uploadDataset').mockResolvedValue(dataset);
    vi.spyOn(audits, 'analyzeDataset').mockResolvedValue(analysis);
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreated);
  });

  it('walks 5 steps and creates an audit with M2 module', async () => {
    const onComplete = vi.fn();
    render(<M2Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'My detection');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: upload
    const fakeFile = new File(['montant,duree,decision\n100,12,1'], 'credit.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input') as HTMLInputElement, fakeFile);
    await waitFor(() => screen.getByText(/credit.csv/));
    await waitFor(() => screen.getByText(/Analyse automatique/i));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3
    await user.selectOptions(screen.getByRole('combobox', { name: /Colonne de décision/i }), 'decision');
    await user.selectOptions(screen.getByRole('combobox', { name: /Valeur favorable/i }), '1');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4 (advanced collapsed by default — skip)
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5
    expect(screen.getByText(/Récapitulatif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M2',
          dataset_id: 'd-1',
          title: 'My detection',
          decision_column: 'decision',
          favorable_value: '1',
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-1');
  });

  it('forwards advanced params when provided', async () => {
    render(<M2Wizard onComplete={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'X');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    const fakeFile = new File(['x,decision\n1,1'], 'x.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input') as HTMLInputElement, fakeFile);
    await waitFor(() => screen.getByText(/credit.csv/));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Colonne de décision/i }), 'decision');
    await user.selectOptions(screen.getByRole('combobox', { name: /Valeur favorable/i }), '1');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    // Step 4: expand + fill
    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));
    await user.type(screen.getByLabelText(/Nombre de clusters/i), '8');
    await user.type(screen.getByLabelText(/Seuil de déviation/i), '15');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Terminer/i }));
    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M2',
          config: expect.objectContaining({ k: 8, deviation_pp: 15 }),
        }),
      ),
    );
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
import { Step1Context } from '@/components/audits/wizard/m2/Step1Context';
import { Step2Data } from '@/components/audits/wizard/m2/Step2Data';
import { Step3Decision } from '@/components/audits/wizard/m2/Step3Decision';
import { Step4Advanced } from '@/components/audits/wizard/m2/Step4Advanced';
import { Step5Review } from '@/components/audits/wizard/m2/Step5Review';
import {
  analyzeDataset,
  createAudit,
  uploadDataset,
  type DatasetAnalysisOut,
  type DatasetOut,
  type M2ConfigIn,
} from '@/lib/api/audits';
import type { WizardStepDef } from '@/lib/wizard/types';

interface M2Values {
  title: string;
  decision_column: string;
  favorable_value: string;
  k: string;
  deviation_pp: string;
  chi2_alpha: string;
}

const DEFAULTS: M2Values = {
  title: '',
  decision_column: '',
  favorable_value: '',
  k: '',
  deviation_pp: '',
  chi2_alpha: '',
};

interface M2WizardProps {
  onComplete: (auditId: string) => void;
}

export function M2Wizard({ onComplete }: M2WizardProps): React.ReactElement {
  const form = useForm<M2Values>({ defaultValues: DEFAULTS });
  const values = form.watch();

  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [analysis, setAnalysis] = React.useState<DatasetAnalysisOut | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setAnalysisError(null);
    try {
      const d = await uploadDataset(file);
      setDataset(d);
      try {
        const a = await analyzeDataset(d.id);
        setAnalysis(a);
      } catch {
        setAnalysisError("Le service d'analyse est indisponible.");
      }
    } catch {
      setAnalysisError("L'import du fichier a échoué. Vérifiez le CSV.");
    } finally {
      setBusy(false);
    }
  };

  const steps: ReadonlyArray<WizardStepDef<M2Values>> = [
    { id: 'context', title: 'Contexte', helpKey: 'm2.step1', isValid: (v) => v.title.trim().length > 0 },
    { id: 'data', title: 'Données', helpKey: 'm2.step2', isValid: () => dataset !== null },
    { id: 'decision', title: 'Décision', helpKey: 'm2.step3', isValid: (v) => v.decision_column.length > 0 && v.favorable_value.length > 0 },
    { id: 'advanced', title: 'Paramètres', helpKey: 'm2.step4', isValid: () => true },
    { id: 'review', title: 'Résumé', helpKey: 'm2.step5', isValid: () => true },
  ];

  const onSubmit = async () => {
    if (!dataset) return;
    const v = form.getValues();
    setSubmitError(null);
    const config: M2ConfigIn = {};
    if (v.k) config.k = Number(v.k);
    if (v.deviation_pp) config.deviation_pp = Number(v.deviation_pp);
    if (v.chi2_alpha) config.chi2_alpha = Number(v.chi2_alpha);

    try {
      const audit = await createAudit({
        dataset_id: dataset.id,
        title: v.title,
        module: 'M2',
        decision_column: v.decision_column,
        favorable_value: v.favorable_value,
        config,
      });
      onComplete(audit.id);
    } catch {
      setSubmitError("Le lancement de la détection a échoué. Réessayez.");
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
            <WizardShell<M2Values>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context': return <Step1Context />;
                  case 'data': return <Step2Data dataset={dataset} analysis={analysis} analysisError={analysisError} onUpload={handleUpload} busy={busy} />;
                  case 'decision': return <Step3Decision columns={dataset?.columns ?? []} analysis={analysis} />;
                  case 'advanced': return <Step4Advanced />;
                  case 'review': return <Step5Review dataset={dataset} values={values} />;
                  default: return null;
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

- [ ] **Step 3: PASS + commit**

```
cd apps/web && pnpm test wizard-m2-flow && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/m2/M2Wizard.tsx apps/web/__tests__/wizard-m2-flow.test.tsx
git commit -m "feat(web): M2Wizard orchestrator (form state + 5 steps + advanced config)"
```

---

## Task 8: page.tsx M2 swap

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Modify: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Update tests for new M2 wizard behavior**

In `apps/web/__tests__/nouveau-page.test.tsx`, find existing M2 tests that assumed the old M2Form's flat fields. Update or replace with a smoke test:

```typescript
it('M2 module choice shows the new wizard (step 1: title input)', async () => {
  const user = userEvent.setup();
  render(<NouveauPage />);
  await user.click(screen.getByRole('button', { name: /Détection non supervisée/i }));
  expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  // Step 4 advanced not visible at step 1
  expect(screen.queryByLabelText(/Nombre de clusters/i)).toBeNull();
});
```

Pre-existing M2 tests that walked the old form must be DELETED or rewritten. M1 and M3 tests stay untouched.

- [ ] **Step 2: Update page.tsx**

Add import:
```typescript
import { M2Wizard } from '@/components/audits/wizard/m2/M2Wizard';
```

Replace the M2 branches (the upload card branch + M2Form branch) with a single block. The resulting M2 branch:
```typescript
) : module === 'M2' ? (
  <M2Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
```

The full conditional becomes (adapt to existing structure):
```typescript
{module === null ? (
  /* module choice */
) : module === 'M1' ? (
  <M1Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
) : module === 'M2' ? (
  <M2Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
) : (
  <M3Form ... />  // unchanged
)}
```

Delete the local `M2Form` function definition, `M2Schema`, `M2Values` type if they exist. Keep `M3Form` and its related types intact.

- [ ] **Step 3: PASS + scope check + commit**

```
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3b-m2
git status --short  # MUST show only the 2 modified files
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): switch M2 branch of /audits/nouveau to the new M2Wizard"
```

---

## Task 9: Playwright wizard-m2-guided.spec.ts

**Files:**
- Create: `apps/web/e2e/wizard-m2-guided.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect } from '@playwright/test';

test.describe('M2 wizard guided flow', () => {
  test('walks through 5 steps and creates an audit', async ({ page }) => {
    await page.goto('/app/audits/nouveau');

    await page.getByRole('button', { name: /Détection non supervisée/i }).click();

    await page.getByRole('textbox', { name: /titre/i }).fill('E2E M2 wizard test');
    await page.getByRole('button', { name: /Suivant/i }).click();

    const fileInput = page.getByTestId('csv-input');
    await fileInput.setInputFiles('e2e/fixtures/m2-deviant.csv');
    await expect(page.getByText(/Analyse automatique/i)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /Suivant/i }).click();

    await page.getByRole('combobox', { name: /Colonne de décision/i }).selectOption({ label: /decision/ });
    await page.getByRole('combobox', { name: /Valeur favorable/i }).selectOption({ index: 1 });
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Skip advanced (defaults)
    await page.getByRole('button', { name: /Suivant/i }).click();

    await expect(page.getByText(/Récapitulatif/i)).toBeVisible();
    await page.getByRole('button', { name: /Terminer/i }).click();

    await page.waitForURL(/\/app\/audits\/[a-f0-9-]+$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /E2E M2 wizard/i })).toBeVisible({ timeout: 90000 });
  });
});
```

Adapt the fixture filename to one present in `e2e/fixtures/` (read directory first; if no M2 fixture exists, reuse the M1 one — the M2 wizard only needs a decision column).

- [ ] **Step 2: Verify it parses**

```
cd apps/web && pnpm exec playwright test --list e2e/wizard-m2-guided.spec.ts
```

Expected: 1 test listed, no parse errors.

- [ ] **Step 3: Commit**

```
git add apps/web/e2e/wizard-m2-guided.spec.ts
git commit -m "test(web): Playwright E2E for M2 guided wizard happy path"
```

---

## Task 10: Final gate + push + PR

- [ ] **Step 1: Full gates**

```
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3b-m2
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

Expected: ~9 commits Franck F, zero Claude trailer. vitest ~109 (89 SP3-A baseline + 20 nouveaux).

- [ ] **Step 2: Push + open PR**

```
git push -u origin worktree-wizard-sp3b-m2
gh pr create --title "feat(web): wizard orientation SP3-B — M2 guided wizard (5 steps + Playwright E2E)" --body "$(cat <<'EOF'
## Summary

Sous-projet 3-B du wizard d'audit orienté.

Bascule la branche **M2** du formulaire d'audit (\`/app/audits/nouveau\`) vers un wizard guidé en 5 étapes :

1. **Contexte** — titre.
2. **Données** — upload + analyse auto (réutilise endpoint SP1).
3. **Décision** — colonne + valeur favorable (smart dropdowns).
4. **Paramètres avancés** *(repliable, fermé par défaut)* — k, deviation_pp, chi2_alpha.
5. **Résumé & lancement** — récap + liste analyses (KMeans + χ² + IQR).

**M1** et **M3** restent intacts. SP3-C migrera M3.

## Test plan

- [x] vitest ~109 passing (de 89 baseline SP3-A, +20 nouveaux)
- [x] tsc strict + noUncheckedIndexedAccess clean
- [x] eslint 0 errors
- [x] Playwright spec parse OK
- [x] 9 commits Franck F, zéro trailer Claude

## Hors scope SP3-B

- M3 wizard 5 steps + test connexion via \`/audits/m3/test-connection\` (SP3-C)
EOF
)"
```

---

## Spec coverage check

| Spec section / item | Covered by |
|---|---|
| §4.7 — M2 5 étapes (contexte → données → décision → avancés → résumé) | Tasks 2-7 |
| §4.7 — Step 4 paramètres avancés repliable | Task 5 (closed by default) |
| §4.5 — M2 STEP_HELP entries | Task 1 |
| §4.6 — HelpPanel composition | Task 7 (M2Wizard) |
| §6 — `/analyze` fail : bandeau non-bloquant | Tasks 3, 7 |
| §6 — createAudit 5xx : submitError state | Task 7 |
| §7 — Playwright wizard-m2-guided.spec.ts | Task 9 |

**Out-of-scope (SP3-C):**
- M3 wizard (5 steps + test-connection via `/audits/m3/test-connection`)
