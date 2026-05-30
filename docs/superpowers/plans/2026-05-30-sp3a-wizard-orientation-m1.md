# SP3-A — Wizard d'audit orienté : M1 (5 étapes guidées + Playwright E2E)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le formulaire M1 actuel (à plat, 8 champs visibles d'un coup) par un wizard guidé en 5 étapes qui réutilise le shell de SP2 (`WizardShell`/`HelpPanel`) et la détection auto de SP1 (`POST /datasets/{id}/analyze`).

**Architecture:** `M1Wizard` orchestrateur tient l'état React Hook Form + dataset uploadé + résultat d'analyse, et délègue le rendu de chaque étape à un composant `StepN` via `WizardShell.renderStep`. Chaque step est un composant focus (1 responsabilité, 2-4 champs max). La page `audits/nouveau` continue d'exposer M1/M2/M3 ; seule la branche M1 bascule sur le nouveau wizard. M2/M3 restent intacts (SP3-B et SP3-C les migreront).

**Tech Stack:** Next.js 16, React 19, TypeScript strict, React Hook Form + Zod (déjà dans le repo), TanStack Query (pour l'appel `/analyze`), Tailwind v4, vitest + @testing-library/react, Playwright 1.49.

**Spec source:** `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` §3, §4.7 (M1 5 étapes), §6 (gestion erreurs), §7 (tests).

**Pré-requis exécution :** SP1 (PR #28) et SP2 (PR #29) DOIVENT être mergées sur `main` avant de créer le worktree SP3-A — sinon le worktree n'aura ni `WizardShell`, ni les exports de SP1. Vérifier `git log --oneline -3 origin/main` doit contenir SP2 et SP1 (ou au minimum SP2 — l'appel `/analyze` est tolérant à l'absence d'endpoint via try/catch fallback).

---

## File Structure

```
apps/web/
├── lib/
│   ├── api/audits.ts                                [MOD]   +analyzeDataset, +3 types
│   └── wizard/help-content.ts                       [MOD]   +M1 STEP_HELP entries (10 keys)
├── components/audits/wizard/
│   └── m1/
│       ├── M1Wizard.tsx                             [NEW]   orchestrator: form + WizardShell composition
│       ├── Step1Context.tsx                         [NEW]   title input
│       ├── Step2Data.tsx                            [NEW]   reuses DatasetUploadCard + analysis card
│       ├── Step3Decision.tsx                        [NEW]   decision_column + favorable_value dropdowns
│       ├── Step4Protected.tsx                       [NEW]   protected_attribute + collapsible options
│       └── Step5Review.tsx                          [NEW]   summary card
├── app/app/audits/nouveau/page.tsx                  [MOD]   swap M1Form → M1Wizard for M1 branch
└── e2e/
    └── wizard-m1-guided.spec.ts                     [NEW]   Playwright happy path

apps/web/__tests__/
├── audits-api.test.ts                               [MOD]   +analyzeDataset test
├── wizard-help-content.test.ts                      [MOD]   +M1 keys coverage test
├── wizard-m1-step1-context.test.tsx                 [NEW]
├── wizard-m1-step2-data.test.tsx                    [NEW]
├── wizard-m1-step3-decision.test.tsx                [NEW]
├── wizard-m1-step4-protected.test.tsx               [NEW]
├── wizard-m1-step5-review.test.tsx                  [NEW]
└── wizard-m1-flow.test.tsx                          [NEW]   integration: nav 1→5 + submit
```

**Decomposition rationale:** chaque step a un fichier dédié = 1 responsabilité, testable isolément. M1Wizard est le seul à connaître la forme complète de M1Values + l'orchestration. La page `nouveau/page.tsx` reste un router de modules ; le nouveau composant `M1Wizard` se branche en lieu et place de l'ancien `M1Form`. M2Form et M3Form sont laissés intacts (out-of-scope SP3-A).

---

## Conventions répétées

- **Worktree** : `worktree-wizard-sp3a-m1`, créé via `git worktree add .claude/worktrees/wizard-sp3a-m1 -b worktree-wizard-sp3a-m1`.
- **Identité git** : `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**.
- **Commit** : Conventional Commits (`feat(web):`, `chore(web):`, `test(web):`). Plain `git commit`.
- **Test runner** : depuis `apps/web/` → `pnpm test` (full), `pnpm test <pattern>` (ciblé).
- **Gates** : `pnpm typecheck && pnpm lint` après chaque tâche.
- **Aucune modif côté `apps/api/` ni `apps/pdf/`**.
- **Subagent gate** : chaque prompt subagent MUST inclure « verify `git rev-parse --show-toplevel` ends with `wizard-sp3a-m1` » comme Step 0 (cf. `memory/subagent-orphaned-commit-gotcha.md`).

---

## Task 1: API client — `analyzeDataset()` + types

**Files:**
- Modify: `apps/web/lib/api/audits.ts` (+ 3 types + 1 function)
- Modify: `apps/web/__tests__/audits-api.test.ts` (+ 1 test)

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/audits-api.test.ts`:

```typescript
import { analyzeDataset } from '@/lib/api/audits';

describe('analyzeDataset', () => {
  it('POSTs to /datasets/:id/analyze and returns the payload', async () => {
    const mock = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        columns: [
          { name: 'sex', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['F', 100], ['M', 100]], role_hint: 'protected' },
        ],
        suggested_decision: null,
        suggested_protected: { column: 'sex', confidence: 0.95, reason: 'Nom évocateur', favorable_value: null },
      },
    });
    const out = await analyzeDataset('abc-123');
    expect(mock).toHaveBeenCalledWith('/datasets/abc-123/analyze');
    expect(out.suggested_protected?.column).toBe('sex');
    mock.mockRestore();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test audits-api
```

Expected: FAIL — `analyzeDataset` not exported.

- [ ] **Step 3: Add types + function**

Append to `apps/web/lib/api/audits.ts`:

```typescript
export type ColumnProfileOut = {
  name: string;
  dtype: string;
  unique_count: number;
  null_ratio: number;
  top_values: Array<[unknown, number]>;
  role_hint: string;
};

export type SuggestionOut = {
  column: string;
  confidence: number;
  reason: string;
  favorable_value?: unknown | null;
};

export type DatasetAnalysisOut = {
  columns: ColumnProfileOut[];
  suggested_decision: SuggestionOut | null;
  suggested_protected: SuggestionOut | null;
};

export async function analyzeDataset(
  datasetId: string,
): Promise<DatasetAnalysisOut> {
  const { data } = await api.post<DatasetAnalysisOut>(
    `/datasets/${datasetId}/analyze`,
  );
  return data;
}
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test audits-api
```

Expected: PASS.

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors on this file.

- [ ] **Step 6: Commit**

```
git add apps/web/lib/api/audits.ts apps/web/__tests__/audits-api.test.ts
git commit -m "feat(web): analyzeDataset() API client + DatasetAnalysisOut types"
```

---

## Task 2: M1 STEP_HELP entries

**Files:**
- Modify: `apps/web/lib/wizard/help-content.ts` (+ 10 M1 keys)
- Modify: `apps/web/__tests__/wizard-help-content.test.ts` (+ M1 coverage test)

- [ ] **Step 1: Write the failing test**

Append to `apps/web/__tests__/wizard-help-content.test.ts`:

```typescript
describe('M1 help entries', () => {
  const M1_REQUIRED_KEYS = [
    'm1.step1',
    'm1.step1.title',
    'm1.step2',
    'm1.step3',
    'm1.step3.decision_column',
    'm1.step3.favorable_value',
    'm1.step4',
    'm1.step4.protected_attribute',
    'm1.step4.privileged_value',
    'm1.step4.ground_truth_column',
    'm1.step4.secondary_protected_attribute',
    'm1.step5',
  ];

  it('all M1 required help keys have entries', () => {
    for (const key of M1_REQUIRED_KEYS) {
      const entry = getHelp(key);
      expect(entry, `missing entry for ${key}`).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.body.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-help-content
```

Expected: FAIL — entries missing.

- [ ] **Step 3: Add M1 entries**

In `apps/web/lib/wizard/help-content.ts`, replace the `STEP_HELP` constant with this expanded version (keep the `canary.test` key for backward compat with SP2 tests):

```typescript
export const STEP_HELP: Record<HelpKey, HelpEntry> = {
  'canary.test': {
    title: 'Canary',
    body: 'Entrée de test pour valider la mécanique de lookup.',
  },

  // M1 — Audit supervisé
  'm1.step1': {
    title: 'Donnez un nom à votre audit',
    body: "Choisissez un titre court et descriptif. Il vous servira à retrouver ce rapport plus tard dans le tableau de bord.",
    example: '« Audit recrutement Q1 2026 » ou « Modèle scoring crédit v2 »',
  },
  'm1.step1.title': {
    title: 'Titre de l’audit',
    body: 'Un nom court (3-50 caractères) qui identifie l’audit. Apparaît dans le tableau de bord et les rapports PDF/Excel.',
    example: '« Audit recrutement Q1 2026 »',
  },
  'm1.step2': {
    title: 'Importez votre jeu de données',
    body: "Vous pouvez glisser-déposer un fichier CSV, choisir un exemple, ou importer depuis une source externe. Après l'import, AuditIQ analyse automatiquement vos colonnes pour suggérer les bons paramètres.",
    example: 'Un CSV de 1 000 décisions de crédit avec colonnes : sex, age, income, approved.',
  },
  'm1.step3': {
    title: 'Quelle décision allons-nous auditer ?',
    body: "Indiquez quelle colonne contient la décision du modèle, et quelle valeur représente une issue favorable pour la personne (acceptation, embauche, prêt accordé, etc.).",
  },
  'm1.step3.decision_column': {
    title: 'Colonne de décision',
    body: "C'est la colonne qui contient la sortie de votre modèle : acceptation/refus, score, classification. AuditIQ propose la plus probable d'après le nom et la cardinalité.",
    example: "Pour un audit de prêt bancaire, ce serait la colonne « approved » ou « loan_status ».",
  },
  'm1.step3.favorable_value': {
    title: 'Valeur favorable',
    body: "La valeur qui représente le bénéfice : « oui », « accepté », « 1 ». On vérifiera si cette valeur est attribuée équitablement selon votre attribut protégé.",
    example: "Si votre colonne « approved » contient « 0 » (refusé) et « 1 » (accepté), la valeur favorable est « 1 ».",
  },
  'm1.step4': {
    title: 'Sur quelle caractéristique chercher des écarts ?',
    body: "Choisissez l'attribut protégé (sexe, âge, origine…) sur lequel mesurer un éventuel écart de traitement. Vous pouvez aussi ajouter des options avancées : groupe de référence, vérité-terrain, analyse intersectionnelle.",
  },
  'm1.step4.protected_attribute': {
    title: 'Attribut protégé',
    body: "Une caractéristique légalement sensible. AuditIQ propose la plus plausible d'après le nom de colonne et la corrélation avec la décision (test du χ²).",
    example: "« sex », « age_group », « origine »",
    learnMoreHref: '/docs/concepts/attribut-protege',
  },
  'm1.step4.privileged_value': {
    title: 'Groupe de référence (facultatif)',
    body: "Valeur de l'attribut protégé considérée comme « groupe de référence » pour le calcul du Disparate Impact. Si vous laissez vide, AuditIQ utilise le groupe au plus fort taux d'acceptation.",
    example: "Pour « sex », mettre « M » fixe les hommes comme référence ; sinon AuditIQ détecte automatiquement.",
  },
  'm1.step4.ground_truth_column': {
    title: 'Colonne vérité-terrain (facultatif)',
    body: "Si vous avez la « vraie » étiquette pour chaque ligne (pas seulement la prédiction du modèle), AuditIQ calculera Equal Opportunity et Equalized Odds en plus du Disparate Impact.",
    example: "Une colonne « actually_repaid » à côté de la colonne « approved » du modèle.",
  },
  'm1.step4.secondary_protected_attribute': {
    title: 'Attribut secondaire — analyse intersectionnelle (facultatif)',
    body: "Pour croiser deux caractéristiques (ex. genre × âge) et détecter des biais qui n'apparaissent qu'à l'intersection (paradoxe de Simpson).",
    example: "Si attribut principal = « sex » et secondaire = « age_group », on auditera chaque combinaison (F-jeune, F-âgé, M-jeune, M-âgé).",
  },
  'm1.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez les paramètres avant de lancer l'audit. Le calcul prend généralement 5-30 secondes selon la taille du dataset. Vous pourrez télécharger les rapports Excel et PDF une fois terminé.",
  },
};
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-help-content
```

Expected: PASS (existing 5 + new M1 coverage test).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/lib/wizard/help-content.ts apps/web/__tests__/wizard-help-content.test.ts
git commit -m "feat(web): M1 STEP_HELP entries (12 keys covering steps 1-5 + fields)"
```

---

## Task 3: Step1Context — title field

**Files:**
- Create: `apps/web/components/audits/wizard/m1/Step1Context.tsx`
- Create: `apps/web/__tests__/wizard-m1-step1-context.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-m1-step1-context.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';
import { Step1Context } from '@/components/audits/wizard/m1/Step1Context';

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

describe('Step1Context', () => {
  it('renders a title input with placeholder', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness />
      </WizardProvider>,
    );
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  });

  it('focusing the input sets helpKey to m1.step1.title', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>,
    );
    const input = screen.getByRole('textbox', { name: /titre/i });
    const user = userEvent.setup();
    await user.click(input);
    expect(screen.getByTestId('hk').textContent).toBe('m1.step1.title');
  });

  it('blurring the input clears helpKey to null', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>,
    );
    const input = screen.getByRole('textbox', { name: /titre/i });
    const user = userEvent.setup();
    await user.click(input);
    await user.tab(); // blur
    expect(screen.getByTestId('hk').textContent).toBe('null');
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-m1-step1-context
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/components/audits/wizard/m1/Step1Context.tsx`:

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
        Donnez un nom à votre audit
      </h2>
      <p className="text-sm text-fg-secondary">
        Choisissez un titre court et descriptif. Il vous servira à retrouver ce
        rapport plus tard dans le tableau de bord.
      </p>
      <label
        htmlFor="m1-title"
        className="text-sm font-medium text-fg-secondary"
      >
        Titre de l&apos;audit
      </label>
      <input
        id="m1-title"
        type="text"
        placeholder="Audit recrutement Q1 2026"
        className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
        {...register('title', { required: true })}
        onFocus={() => setHelpKey('m1.step1.title')}
        onBlur={() => clearHelpKey()}
        aria-label="Titre de l'audit"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-m1-step1-context
```

Expected: PASS (3 tests).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/m1/Step1Context.tsx apps/web/__tests__/wizard-m1-step1-context.test.tsx
git commit -m "feat(web): M1 Step1Context (title input + helpKey wiring)"
```

---

## Task 4: Step2Data — upload + analyse auto

**Files:**
- Create: `apps/web/components/audits/wizard/m1/Step2Data.tsx`
- Create: `apps/web/__tests__/wizard-m1-step2-data.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-m1-step2-data.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  WizardProvider,
} from '@/components/audits/wizard/WizardContext';
import { Step2Data } from '@/components/audits/wizard/m1/Step2Data';
import type { DatasetOut, DatasetAnalysisOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 1234,
  columns: ['sex', 'age', 'approved'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: dataset.columns.map((c) => ({
    name: c,
    dtype: 'categorical',
    unique_count: 2,
    null_ratio: 0,
    top_values: [],
    role_hint: c === 'sex' ? 'protected' : 'feature',
  })),
  suggested_decision: { column: 'approved', confidence: 0.85, reason: 'Nom évocateur', favorable_value: '1' },
  suggested_protected: { column: 'sex', confidence: 0.9, reason: 'Nom évocateur', favorable_value: null },
};

function wrap(children: React.ReactNode) {
  return <WizardProvider totalSteps={5}>{children}</WizardProvider>;
}

describe('Step2Data', () => {
  it('shows the upload card when no dataset is selected', () => {
    render(
      wrap(
        <Step2Data
          dataset={null}
          analysis={null}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText(/Importez votre jeu de données/i)).toBeInTheDocument();
  });

  it('shows file summary when dataset selected', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={null}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText('credit.csv')).toBeInTheDocument();
    expect(screen.getByText(/1 234 lignes/)).toBeInTheDocument();
  });

  it('shows skeleton while analysis is loading', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={null}
          analysisError={null}
          onUpload={vi.fn()}
          busy={true}
        />,
      ),
    );
    expect(screen.getByText(/Analyse en cours/i)).toBeInTheDocument();
  });

  it('shows analysis suggestions when present', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={analysis}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText(/Analyse automatique/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/)).toBeInTheDocument();
    expect(screen.getByText(/sex/)).toBeInTheDocument();
  });

  it('shows a non-blocking warning when analysis fails', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={null}
          analysisError="Le service d'analyse est indisponible"
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText(/Analyse indisponible/i)).toBeInTheDocument();
    expect(
      screen.getByText(/sélectionnant manuellement/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-m1-step2-data
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/components/audits/wizard/m1/Step2Data.tsx`:

```typescript
'use client';

import * as React from 'react';

import { DatasetUploadCard } from '@/components/audits/DatasetUploadCard';
import type {
  DatasetAnalysisOut,
  DatasetOut,
} from '@/lib/api/audits';

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
        <h2 className="text-lg font-semibold text-fg">
          Importez votre jeu de données
        </h2>
        <p className="text-sm text-fg-secondary">
          Glissez-déposez un CSV, choisissez un exemple, ou importez depuis une
          source externe. Après l&apos;import, AuditIQ analyse automatiquement
          vos colonnes pour suggérer les bons paramètres.
        </p>
        <DatasetUploadCard module="M1" busy={busy} onSelected={onUpload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Jeu de données importé
      </h2>
      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="font-medium text-fg">{dataset.filename}</p>
        <p className="text-xs text-fg-muted">
          {dataset.row_count.toLocaleString('fr-FR')} lignes,{' '}
          {dataset.columns.length} colonnes
        </p>
      </div>

      {busy && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="text-sm text-fg-muted">
            Analyse en cours… cela peut prendre 2-5 secondes.
          </p>
        </div>
      )}

      {analysisError !== null && (
        <div
          role="alert"
          className="rounded-md border border-status-warn-border bg-status-warn-bg p-4 text-sm text-status-warn"
        >
          <p className="font-medium">Analyse indisponible</p>
          <p>
            {analysisError} Vous pouvez continuer en sélectionnant manuellement
            les colonnes aux étapes suivantes.
          </p>
        </div>
      )}

      {analysis !== null && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-fg">
            Analyse automatique
          </p>
          <ul className="flex flex-col gap-1 text-xs text-fg-secondary">
            {analysis.suggested_decision !== null && (
              <li>
                Décision suggérée :{' '}
                <strong>{analysis.suggested_decision.column}</strong> (
                {Math.round(analysis.suggested_decision.confidence * 100)}%)
              </li>
            )}
            {analysis.suggested_protected !== null && (
              <li>
                Attribut protégé suggéré :{' '}
                <strong>{analysis.suggested_protected.column}</strong> (
                {Math.round(analysis.suggested_protected.confidence * 100)}%)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-m1-step2-data
```

Expected: PASS (5 tests).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/m1/Step2Data.tsx apps/web/__tests__/wizard-m1-step2-data.test.tsx
git commit -m "feat(web): M1 Step2Data (reuses DatasetUploadCard + analysis card with suggestions)"
```

---

## Task 5: Step3Decision — decision_column + favorable_value

**Files:**
- Create: `apps/web/components/audits/wizard/m1/Step3Decision.tsx`
- Create: `apps/web/__tests__/wizard-m1-step3-decision.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-m1-step3-decision.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step3Decision } from '@/components/audits/wizard/m1/Step3Decision';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

type Values = { decision_column: string; favorable_value: string };

function Harness({
  columns,
  analysis,
}: {
  columns: string[];
  analysis: DatasetAnalysisOut | null;
}) {
  const form = useForm<Values>({
    defaultValues: { decision_column: '', favorable_value: '' },
  });
  return (
    <FormProvider {...form}>
      <Step3Decision columns={columns} analysis={analysis} />
    </FormProvider>
  );
}

const cols = ['sex', 'age', 'approved'];
const analysisWithSuggestion: DatasetAnalysisOut = {
  columns: cols.map((c) => ({
    name: c,
    dtype: 'categorical',
    unique_count: c === 'approved' ? 2 : 5,
    null_ratio: 0,
    top_values: c === 'approved' ? [['1', 80], ['0', 120]] : [],
    role_hint: c === 'approved' ? 'decision' : 'feature',
  })),
  suggested_decision: {
    column: 'approved',
    confidence: 0.92,
    reason: 'Nom évocateur',
    favorable_value: '1',
  },
  suggested_protected: null,
};

describe('Step3Decision', () => {
  it('renders dropdowns for decision_column and favorable_value', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={null} />
      </WizardProvider>,
    );
    expect(
      screen.getByRole('combobox', { name: /Colonne de décision/i }),
    ).toBeInTheDocument();
  });

  it('shows a "Suggéré" badge next to the suggested decision option', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={analysisWithSuggestion} />
      </WizardProvider>,
    );
    // The decision dropdown shows 'approved' with a Suggéré badge
    expect(screen.getByText(/Suggéré/i)).toBeInTheDocument();
  });

  it('disables favorable_value dropdown until decision_column is chosen', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={null} />
      </WizardProvider>,
    );
    const fav = screen.getByRole('combobox', { name: /Valeur favorable/i });
    expect(fav).toBeDisabled();
  });

  it('populates favorable_value options from analysis.top_values once decision chosen', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={analysisWithSuggestion} />
      </WizardProvider>,
    );
    const user = userEvent.setup();
    const decision = screen.getByRole('combobox', {
      name: /Colonne de décision/i,
    });
    await user.selectOptions(decision, 'approved');
    const fav = screen.getByRole('combobox', { name: /Valeur favorable/i });
    expect(fav).not.toBeDisabled();
    const options = Array.from(fav.querySelectorAll('option'));
    const optionValues = options.map((o) => (o as HTMLOptionElement).value);
    expect(optionValues).toContain('1');
    expect(optionValues).toContain('0');
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-m1-step3-decision
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/components/audits/wizard/m1/Step3Decision.tsx`:

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

export function Step3Decision({
  columns,
  analysis,
}: Step3DecisionProps): React.ReactElement {
  const { register, control } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const selectedDecision = useWatch({ control, name: 'decision_column' });

  const suggestedDecision = analysis?.suggested_decision?.column ?? null;

  // Find the column profile for the selected decision, get its top_values for favorable dropdown
  const selectedColumnProfile = React.useMemo(() => {
    if (!analysis || !selectedDecision) return null;
    return analysis.columns.find((c) => c.name === selectedDecision) ?? null;
  }, [analysis, selectedDecision]);

  const favorableOptions = React.useMemo(() => {
    if (!selectedColumnProfile) return [];
    return selectedColumnProfile.top_values.map(
      ([value]) => String(value as string | number | boolean),
    );
  }, [selectedColumnProfile]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Quelle décision allons-nous auditer&nbsp;?
      </h2>
      <p className="text-sm text-fg-secondary">
        Indiquez quelle colonne contient la décision du modèle, et quelle
        valeur représente une issue favorable pour la personne.
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-decision"
          className="text-sm font-medium text-fg-secondary"
        >
          Colonne de décision
        </label>
        <select
          id="m1-decision"
          defaultValue=""
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('decision_column', { required: true })}
          onFocus={() => setHelpKey('m1.step3.decision_column')}
          onBlur={() => clearHelpKey()}
          aria-label="Colonne de décision"
        >
          <option value="" disabled>
            —
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === suggestedDecision ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-favorable"
          className="text-sm font-medium text-fg-secondary"
        >
          Valeur favorable
        </label>
        {favorableOptions.length > 0 ? (
          <select
            id="m1-favorable"
            defaultValue=""
            disabled={!selectedDecision}
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('m1.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          >
            <option value="" disabled>
              —
            </option>
            {favorableOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="m1-favorable"
            type="text"
            disabled={!selectedDecision}
            placeholder="Saisissez la valeur (ex. 1, oui, accepté)"
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('m1.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-m1-step3-decision
```

Expected: PASS (4 tests).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/m1/Step3Decision.tsx apps/web/__tests__/wizard-m1-step3-decision.test.tsx
git commit -m "feat(web): M1 Step3Decision (decision_column + smart favorable_value dropdown)"
```

---

## Task 6: Step4Protected — protected_attribute + collapsible options

**Files:**
- Create: `apps/web/components/audits/wizard/m1/Step4Protected.tsx`
- Create: `apps/web/__tests__/wizard-m1-step4-protected.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-m1-step4-protected.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step4Protected } from '@/components/audits/wizard/m1/Step4Protected';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

type Values = {
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
};

function Harness({
  columns,
  analysis,
}: {
  columns: string[];
  analysis: DatasetAnalysisOut | null;
}) {
  const form = useForm<Values>({
    defaultValues: {
      protected_attribute: '',
      privileged_value: '',
      ground_truth_column: '',
      secondary_protected_attribute: '',
    },
  });
  return (
    <FormProvider {...form}>
      <Step4Protected columns={columns} analysis={analysis} />
    </FormProvider>
  );
}

const cols = ['sex', 'age_group', 'income', 'approved'];
const analysis: DatasetAnalysisOut = {
  columns: [],
  suggested_decision: null,
  suggested_protected: {
    column: 'sex',
    confidence: 0.9,
    reason: 'Nom évocateur',
    favorable_value: null,
  },
};

describe('Step4Protected', () => {
  it('renders the protected_attribute dropdown with all columns', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={null} />
      </WizardProvider>,
    );
    expect(
      screen.getByRole('combobox', { name: /Attribut protégé/i }),
    ).toBeInTheDocument();
  });

  it('shows "Suggéré" badge for the suggested protected attribute', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={analysis} />
      </WizardProvider>,
    );
    expect(screen.getByText(/Suggéré/i)).toBeInTheDocument();
  });

  it('hides advanced options behind a collapsible by default', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={null} />
      </WizardProvider>,
    );
    // ground_truth_column is inside the collapsible — not visible unless expanded
    expect(
      screen.queryByRole('combobox', { name: /vérité-terrain/i }),
    ).toBeNull();
  });

  it('reveals advanced options when the collapsible is expanded', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness columns={cols} analysis={null} />
      </WizardProvider>,
    );
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /Options avancées/i }),
    );
    expect(
      screen.getByRole('combobox', { name: /vérité-terrain/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /Attribut secondaire/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Groupe de référence/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-m1-step4-protected
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/components/audits/wizard/m1/Step4Protected.tsx`:

```typescript
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

interface Step4ProtectedProps {
  columns: ReadonlyArray<string>;
  analysis: DatasetAnalysisOut | null;
}

type Values = {
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
};

export function Step4Protected({
  columns,
  analysis,
}: Step4ProtectedProps): React.ReactElement {
  const { register } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const suggested = analysis?.suggested_protected?.column ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Sur quelle caractéristique chercher des écarts&nbsp;?
      </h2>
      <p className="text-sm text-fg-secondary">
        Choisissez l&apos;attribut protégé sur lequel mesurer un éventuel
        écart de traitement.
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-protected"
          className="text-sm font-medium text-fg-secondary"
        >
          Attribut protégé
        </label>
        <select
          id="m1-protected"
          defaultValue=""
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('protected_attribute', { required: true })}
          onFocus={() => setHelpKey('m1.step4.protected_attribute')}
          onBlur={() => clearHelpKey()}
          aria-label="Attribut protégé"
        >
          <option value="" disabled>
            —
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === suggested ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="self-start text-sm text-fg-muted underline-offset-2 hover:underline"
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? '− Options avancées' : '+ Options avancées'}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-4 rounded-md border border-border-default bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="m1-priv"
              className="text-sm font-medium text-fg-secondary"
            >
              Groupe de référence (facultatif)
            </label>
            <input
              id="m1-priv"
              type="text"
              placeholder="Laisser vide pour détection automatique"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('privileged_value')}
              onFocus={() => setHelpKey('m1.step4.privileged_value')}
              onBlur={() => clearHelpKey()}
              aria-label="Groupe de référence"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="m1-gt"
              className="text-sm font-medium text-fg-secondary"
            >
              Colonne vérité-terrain (facultatif)
            </label>
            <select
              id="m1-gt"
              defaultValue=""
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('ground_truth_column')}
              onFocus={() => setHelpKey('m1.step4.ground_truth_column')}
              onBlur={() => clearHelpKey()}
              aria-label="Colonne vérité-terrain"
            >
              <option value="">—</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="m1-sec"
              className="text-sm font-medium text-fg-secondary"
            >
              Attribut secondaire — analyse intersectionnelle (facultatif)
            </label>
            <select
              id="m1-sec"
              defaultValue=""
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('secondary_protected_attribute')}
              onFocus={() => setHelpKey('m1.step4.secondary_protected_attribute')}
              onBlur={() => clearHelpKey()}
              aria-label="Attribut secondaire"
            >
              <option value="">—</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-m1-step4-protected
```

Expected: PASS (4 tests).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/m1/Step4Protected.tsx apps/web/__tests__/wizard-m1-step4-protected.test.tsx
git commit -m "feat(web): M1 Step4Protected (protected_attribute + collapsible advanced options)"
```

---

## Task 7: Step5Review — summary

**Files:**
- Create: `apps/web/components/audits/wizard/m1/Step5Review.tsx`
- Create: `apps/web/__tests__/wizard-m1-step5-review.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-m1-step5-review.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Step5Review } from '@/components/audits/wizard/m1/Step5Review';
import type { DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 1234,
  columns: ['sex', 'age', 'approved'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

describe('Step5Review', () => {
  it('renders the recap card with dataset + decision + protected attribute', () => {
    render(
      <Step5Review
        dataset={dataset}
        values={{
          title: 'Audit recrutement Q1',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
          privileged_value: '',
          ground_truth_column: '',
          secondary_protected_attribute: '',
        }}
      />,
    );
    expect(screen.getByText(/Audit recrutement Q1/)).toBeInTheDocument();
    expect(screen.getByText(/credit.csv/)).toBeInTheDocument();
    expect(screen.getByText(/approved.*=.*1/i)).toBeInTheDocument();
    expect(screen.getByText(/sex/)).toBeInTheDocument();
  });

  it('lists Equal Opportunity in analyses when ground_truth_column set', () => {
    render(
      <Step5Review
        dataset={dataset}
        values={{
          title: 'X',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
          privileged_value: '',
          ground_truth_column: 'true_label',
          secondary_protected_attribute: '',
        }}
      />,
    );
    expect(screen.getByText(/Equal Opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/Equalized Odds/i)).toBeInTheDocument();
  });

  it('lists intersectional analysis when secondary attribute set', () => {
    render(
      <Step5Review
        dataset={dataset}
        values={{
          title: 'X',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
          privileged_value: '',
          ground_truth_column: '',
          secondary_protected_attribute: 'age_group',
        }}
      />,
    );
    expect(
      screen.getByText(/Analyse intersectionnelle/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-m1-step5-review
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/components/audits/wizard/m1/Step5Review.tsx`:

```typescript
'use client';

import * as React from 'react';

import type { DatasetOut } from '@/lib/api/audits';

interface Step5ReviewValues {
  title: string;
  decision_column: string;
  favorable_value: string;
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
}

interface Step5ReviewProps {
  dataset: DatasetOut | null;
  values: Step5ReviewValues;
}

export function Step5Review({
  dataset,
  values,
}: Step5ReviewProps): React.ReactElement {
  const analyses: string[] = [
    'Disparate Impact (DI)',
    'Règle des 4/5',
    'Demographic Parity',
  ];
  if (values.ground_truth_column) {
    analyses.push('Equal Opportunity');
    analyses.push('Equalized Odds');
  }
  if (values.secondary_protected_attribute) {
    analyses.push(
      `Analyse intersectionnelle (${values.protected_attribute} × ${values.secondary_protected_attribute})`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez les paramètres avant de lancer l&apos;audit. Le calcul prend
        généralement 5-30 secondes selon la taille du dataset.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        {dataset !== null && (
          <p className="text-sm text-fg-secondary">
            Dataset&nbsp;: <strong>{dataset.filename}</strong> (
            {dataset.row_count.toLocaleString('fr-FR')} lignes)
          </p>
        )}
        <p className="text-sm text-fg-secondary">
          Décision&nbsp;: <code>{values.decision_column}</code> ={' '}
          <code>{values.favorable_value}</code> est l&apos;issue favorable
        </p>
        <p className="text-sm text-fg-secondary">
          Attribut protégé&nbsp;: <code>{values.protected_attribute}</code>
          {values.privileged_value && (
            <>
              {' '}
              (référence&nbsp;: <code>{values.privileged_value}</code>)
            </>
          )}
        </p>
      </div>

      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">
          Analyses qui seront produites
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          {analyses.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-m1-step5-review
```

Expected: PASS (3 tests).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/m1/Step5Review.tsx apps/web/__tests__/wizard-m1-step5-review.test.tsx
git commit -m "feat(web): M1 Step5Review (recap card + conditional analyses list)"
```

---

## Task 8: M1Wizard orchestrator

**Files:**
- Create: `apps/web/components/audits/wizard/m1/M1Wizard.tsx`
- Create: `apps/web/__tests__/wizard-m1-flow.test.tsx`

- [ ] **Step 1: Write the failing integration test**

Create `apps/web/__tests__/wizard-m1-flow.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { M1Wizard } from '@/components/audits/wizard/m1/M1Wizard';
import * as audits from '@/lib/api/audits';

const dataset: audits.DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 100,
  columns: ['sex', 'approved'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

const analysis: audits.DatasetAnalysisOut = {
  columns: [
    { name: 'sex', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['F', 60], ['M', 40]], role_hint: 'protected' },
    { name: 'approved', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['1', 50], ['0', 50]], role_hint: 'decision' },
  ],
  suggested_decision: { column: 'approved', confidence: 0.9, reason: '', favorable_value: '1' },
  suggested_protected: { column: 'sex', confidence: 0.9, reason: '', favorable_value: null },
};

const auditCreated: audits.AuditOut = {
  id: 'a-1', code: 'AUD-2026-001', title: 'X', status: 'pending', error: null,
  module: 'M1', dataset_id: 'd-1', protected_attribute: 'sex',
  decision_column: 'approved', favorable_value: '1', privileged_value: null,
  created_at: '2026-05-30T10:00:00Z', completed_at: null, metrics: null,
  interpretation: null, pre_check: [], config: null,
};

describe('M1Wizard happy path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'uploadDataset').mockResolvedValue(dataset);
    vi.spyOn(audits, 'analyzeDataset').mockResolvedValue(analysis);
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreated);
  });

  it('walks through the 5 steps and creates an audit', async () => {
    const onComplete = vi.fn();
    render(<M1Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1: title
    await user.type(
      screen.getByRole('textbox', { name: /titre/i }),
      'My audit',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: upload — simulate file drop
    const fakeFile = new File(['sex,approved\nF,1\nM,0'], 'credit.csv', {
      type: 'text/csv',
    });
    const fileInput = screen.getByTestId('csv-input') as HTMLInputElement;
    await user.upload(fileInput, fakeFile);
    await waitFor(() => screen.getByText(/credit.csv/));
    await waitFor(() => screen.getByText(/Analyse automatique/i));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3: decision + favorable
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Colonne de décision/i }),
      'approved',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Valeur favorable/i }),
      '1',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4: protected
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Attribut protégé/i }),
      'sex',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5: review + submit
    expect(screen.getByText(/Récapitulatif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          dataset_id: 'd-1',
          title: 'My audit',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-1');
  });

  it('shows a non-blocking warning when /analyze fails', async () => {
    vi.spyOn(audits, 'analyzeDataset').mockRejectedValue(new Error('500'));
    render(<M1Wizard onComplete={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(
      screen.getByRole('textbox', { name: /titre/i }),
      'X',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    const fakeFile = new File(['sex,approved\nF,1'], 'x.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('csv-input') as HTMLInputElement;
    await user.upload(fileInput, fakeFile);
    await waitFor(() => screen.getByText(/Analyse indisponible/i));
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```
cd apps/web && pnpm test wizard-m1-flow
```

Expected: FAIL — `M1Wizard` not found.

- [ ] **Step 3: Create the orchestrator**

Create `apps/web/components/audits/wizard/m1/M1Wizard.tsx`:

```typescript
'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { HelpPanel } from '@/components/audits/wizard/HelpPanel';
import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import { Step1Context } from '@/components/audits/wizard/m1/Step1Context';
import { Step2Data } from '@/components/audits/wizard/m1/Step2Data';
import { Step3Decision } from '@/components/audits/wizard/m1/Step3Decision';
import { Step4Protected } from '@/components/audits/wizard/m1/Step4Protected';
import { Step5Review } from '@/components/audits/wizard/m1/Step5Review';
import {
  analyzeDataset,
  createAudit,
  uploadDataset,
  type DatasetAnalysisOut,
  type DatasetOut,
} from '@/lib/api/audits';
import type { WizardStepDef } from '@/lib/wizard/types';

interface M1Values {
  title: string;
  decision_column: string;
  favorable_value: string;
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
}

const DEFAULT_VALUES: M1Values = {
  title: '',
  decision_column: '',
  favorable_value: '',
  protected_attribute: '',
  privileged_value: '',
  ground_truth_column: '',
  secondary_protected_attribute: '',
};

interface M1WizardProps {
  onComplete: (auditId: string) => void;
}

export function M1Wizard({ onComplete }: M1WizardProps): React.ReactElement {
  const form = useForm<M1Values>({ defaultValues: DEFAULT_VALUES });
  const values = form.watch();

  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [analysis, setAnalysis] = React.useState<DatasetAnalysisOut | null>(
    null,
  );
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

  const steps: ReadonlyArray<WizardStepDef<M1Values>> = [
    {
      id: 'context',
      title: 'Contexte',
      helpKey: 'm1.step1',
      isValid: (v) => v.title.trim().length > 0,
    },
    {
      id: 'data',
      title: 'Données',
      helpKey: 'm1.step2',
      isValid: () => dataset !== null,
    },
    {
      id: 'decision',
      title: 'Décision',
      helpKey: 'm1.step3',
      isValid: (v) =>
        v.decision_column.length > 0 && v.favorable_value.length > 0,
    },
    {
      id: 'protected',
      title: 'Attribut protégé',
      helpKey: 'm1.step4',
      isValid: (v) => v.protected_attribute.length > 0,
    },
    {
      id: 'review',
      title: 'Résumé',
      helpKey: 'm1.step5',
      isValid: () => true,
    },
  ];

  const onSubmit = async () => {
    if (!dataset) return;
    const v = form.getValues();
    setSubmitError(null);
    try {
      const audit = await createAudit({
        dataset_id: dataset.id,
        title: v.title,
        decision_column: v.decision_column,
        favorable_value: v.favorable_value,
        protected_attribute: v.protected_attribute,
        privileged_value: v.privileged_value || null,
        ...(v.ground_truth_column
          ? { ground_truth_column: v.ground_truth_column }
          : {}),
        ...(v.secondary_protected_attribute
          ? {
              secondary_protected_attribute: v.secondary_protected_attribute,
            }
          : {}),
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
              <p
                role="alert"
                className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail"
              >
                {submitError}
              </p>
            )}
            <WizardShell<M1Values>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context':
                    return <Step1Context />;
                  case 'data':
                    return (
                      <Step2Data
                        dataset={dataset}
                        analysis={analysis}
                        analysisError={analysisError}
                        onUpload={handleUpload}
                        busy={busy}
                      />
                    );
                  case 'decision':
                    return (
                      <Step3Decision
                        columns={dataset?.columns ?? []}
                        analysis={analysis}
                      />
                    );
                  case 'protected':
                    return (
                      <Step4Protected
                        columns={dataset?.columns ?? []}
                        analysis={analysis}
                      />
                    );
                  case 'review':
                    return <Step5Review dataset={dataset} values={values} />;
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

- [ ] **Step 4: Run test, verify PASS**

```
cd apps/web && pnpm test wizard-m1-flow
```

Expected: PASS (2 tests).

- [ ] **Step 5: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/m1/M1Wizard.tsx apps/web/__tests__/wizard-m1-flow.test.tsx
git commit -m "feat(web): M1Wizard orchestrator (form state + 5 steps + WizardShell/HelpPanel)"
```

---

## Task 9: page.tsx integration — swap M1Form → M1Wizard

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Modify: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Read existing `nouveau-page.test.tsx` to understand current assertions**

```
cd apps/web && cat __tests__/nouveau-page.test.tsx
```

Identify which existing tests target the M1 branch — those will need to be updated because the M1 UI changes from a single form to a 5-step wizard. M2 and M3 tests must remain untouched.

- [ ] **Step 2: Update the failing integration test**

In `apps/web/__tests__/nouveau-page.test.tsx`, update M1 test scenarios:
- Replace assertions like "find input[name=title]" + "submit form" with "find wizard step indicators" + "walk through steps".
- Keep at minimum: a smoke test that picking M1 module shows the wizard's Step 1 (title input) rather than the old M1Form's combined fields.

Add this minimal M1 smoke test (adapt fixture imports to existing patterns in the file):

```typescript
it('M1 module choice shows the new wizard (step 1: title)', async () => {
  const user = userEvent.setup();
  render(<NouveauPage />);
  await user.click(screen.getByRole('button', { name: /Audit supervisé/i }));
  // New wizard: Step 1 shows only the title field, plus step indicators
  expect(
    screen.getByRole('textbox', { name: /titre/i }),
  ).toBeInTheDocument();
  // Old form fields should NOT be visible at step 1
  expect(
    screen.queryByLabelText(/Attribut protégé/i),
  ).toBeNull();
});
```

If existing tests assume specific M1 fields are visible immediately after module choice (e.g. `expect(screen.getByLabelText(/Attribut protégé/)).toBeInTheDocument()`), DELETE or UPDATE those assertions — the new wizard hides those fields behind step 4.

- [ ] **Step 3: Run test, verify some pre-existing M1 tests FAIL**

```
cd apps/web && pnpm test nouveau-page
```

Expected: existing M1 tests fail (old form fields not visible immediately). M2/M3 tests still pass.

- [ ] **Step 4: Update `page.tsx` to use `M1Wizard` for the M1 branch**

Modify `apps/web/app/app/audits/nouveau/page.tsx`:

1. Add import at top:
   ```typescript
   import { M1Wizard } from '@/components/audits/wizard/m1/M1Wizard';
   ```

2. Locate the rendering branch for M1 (currently uses `<M1Form ...>` after dataset upload):

   ```typescript
   ) : module === 'M1' && dataset ? (
     <M1Form
       dataset={dataset}
       busy={busy}
       setBusy={setBusy}
       setError={setError}
       onDone={(id) => router.push(`/app/audits/${id}`)}
     />
   ```

3. Replace the M1 branch — AND remove the M1 dataset-upload guard above it, since `M1Wizard` handles its own upload (Step 2 of the wizard). The new flow for M1 is:

   ```typescript
   {module === null ? (
     /* … module choice — unchanged … */
   ) : module === 'M1' ? (
     <M1Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
   ) : (module === 'M2' || module === 'M3') && !dataset && module === 'M2' ? (
     <DatasetUploadCard
       module="M2"
       busy={busy}
       onSelected={handleFile}
     />
   ) : module === 'M2' && dataset ? (
     <M2Form
       dataset={dataset}
       busy={busy}
       setBusy={setBusy}
       setError={setError}
       onDone={(id) => router.push(`/app/audits/${id}`)}
     />
   ) : (
     <M3Form
       busy={busy}
       setBusy={setBusy}
       setError={setError}
       onDone={(id) => router.push(`/app/audits/${id}`)}
     />
   )}
   ```

4. **Verify** that `M1Form` is no longer referenced after the change. You can remove its definition from the file (it's a local component in `page.tsx`) OR keep it — leaving dead code is risky; prefer to delete to satisfy lint `unused-vars`. Same for the M1Schema and M1Values type aliases.

- [ ] **Step 5: Run all relevant tests**

```
cd apps/web && pnpm test
```

Expected: all tests pass (M1 with new wizard, M2/M3 unchanged, new wizard-m1-* tests pass).

- [ ] **Step 6: typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors (especially no `unused-vars` from removed M1Form).

- [ ] **Step 7: Commit**

```
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): switch M1 branch of /audits/nouveau to the new M1Wizard"
```

---

## Task 10: Playwright wizard-m1-guided.spec.ts

**Files:**
- Create: `apps/web/e2e/wizard-m1-guided.spec.ts`

- [ ] **Step 1: Read existing Playwright config + a similar spec for patterns**

```
cd apps/web && cat playwright.config.ts e2e/global-setup.ts
ls e2e/*.spec.ts
cat e2e/m1-simple.spec.ts  # if exists, copy its skeleton
```

Note the storageState path, baseURL, fixtures (login, dataset upload helpers).

- [ ] **Step 2: Create the spec**

Create `apps/web/e2e/wizard-m1-guided.spec.ts` (skeleton — ADAPT fixture imports to match the existing E2E suite):

```typescript
import { test, expect } from '@playwright/test';

import { uploadM1Csv } from './helpers/upload';  // adapt to actual helper

test.describe('M1 wizard guided flow', () => {
  test('walks through 5 steps and creates an audit', async ({ page }) => {
    await page.goto('/app/audits/nouveau');

    // Module choice
    await page.getByRole('button', { name: /Audit supervisé/i }).click();

    // Step 1: title
    await page
      .getByRole('textbox', { name: /titre/i })
      .fill('E2E M1 wizard test');
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 2: upload
    const fileInput = page.getByTestId('csv-input');
    await fileInput.setInputFiles('e2e/fixtures/m1-simple.csv');
    // Wait for upload + analysis
    await expect(page.getByText(/Analyse automatique/i)).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 3: decision (auto-suggestion may be applied via Suggéré badge)
    await page
      .getByRole('combobox', { name: /Colonne de décision/i })
      .selectOption({ label: /approved/ });
    // favorable value dropdown should be populated with top_values
    await page
      .getByRole('combobox', { name: /Valeur favorable/i })
      .selectOption({ index: 1 });
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 4: protected attribute
    await page
      .getByRole('combobox', { name: /Attribut protégé/i })
      .selectOption({ label: /sex/ });
    await page.getByRole('button', { name: /Suivant/i }).click();

    // Step 5: review
    await expect(page.getByText(/Récapitulatif/i)).toBeVisible();
    await page.getByRole('button', { name: /Terminer/i }).click();

    // Should land on /app/audits/<id>
    await page.waitForURL(/\/app\/audits\/[a-f0-9-]+$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /E2E M1 wizard/i })).toBeVisible({
      timeout: 90000,
    });
  });
});
```

If the helper paths or fixture names differ in the repo, ADAPT. Use the existing `m1-simple.spec.ts` (if present) as reference for fixture imports and authentication setup.

- [ ] **Step 3: Run `playwright test --list` to confirm the spec parses**

```
cd apps/web && pnpm exec playwright test --list e2e/wizard-m1-guided.spec.ts
```

Expected: 1 test listed, no parse errors. NOTE: do NOT run the test (`pnpm e2e`) here — it requires the live stack (API + PDF + Web on local ports + Supabase). Just validate the spec loads.

- [ ] **Step 4: Commit**

```
git add apps/web/e2e/wizard-m1-guided.spec.ts
git commit -m "test(web): Playwright E2E for M1 guided wizard happy path"
```

---

## Task 11: Final gate + push + PR

- [ ] **Step 1: Full vitest**

```
cd apps/web && pnpm test
```

Expected: 68 baseline (post-SP2) + ~25 new = ~93 passed, 0 failed.

- [ ] **Step 2: typecheck + eslint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors (no leftover `unused-vars` from removed M1Form definitions).

- [ ] **Step 3: Verify all commit identities + worktree HEAD**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/wizard-sp3a-m1
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

Expected: every commit `Franck F <franck-dilane1.fambou@epitech.digital>`, zero `Co-Authored-By: Claude`. ~11 commits.

- [ ] **Step 4: Push + open PR**

```
git push -u origin worktree-wizard-sp3a-m1
gh pr create --title "feat(web): wizard orientation SP3-A — M1 guided wizard (5 steps + Playwright E2E)" --body "$(cat <<'EOF'
## Summary

Sous-projet 3-A du wizard d'audit orienté (spec `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` §3, §4.7, §6, §7).

Bascule la branche **M1** du formulaire d'audit (`/app/audits/nouveau`) vers un wizard guidé en 5 étapes :

1. **Contexte** — saisie du titre.
2. **Données** — réutilise `DatasetUploadCard` (PR #27), appelle `/datasets/{id}/analyze` (PR #28 SP1), affiche les suggestions de colonnes.
3. **Décision à auditer** — dropdown `decision_column` avec badge « Suggéré » sur la suggestion API ; dropdown `favorable_value` peuplé avec les valeurs uniques de la colonne (via `top_values` de l'analyse).
4. **Attribut protégé** — dropdown principal avec suggestion ; options dépliables (`privileged_value`, `ground_truth_column`, `secondary_protected_attribute`).
5. **Résumé & lancement** — récap visuel + liste conditionnelle des analyses (DI, 4/5, +EO si vérité-terrain, +intersectionnel si attribut secondaire).

Utilise `WizardShell`/`HelpPanel`/`WizardContext` de SP2 (PR #29). Aide contextuelle : 12 entrées dans `STEP_HELP` couvrant chaque étape + chaque champ M1.

**M2 et M3 sont intacts** — leurs branches dans `page.tsx` continuent d'utiliser les anciens `M2Form`/`M3Form`. SP3-B et SP3-C les migreront.

## Test plan

- [x] vitest ~93 passing (de 68, +25 nouveaux : audits-api +1, help-content +1, 5 step components +18, flow +2, nouveau-page mis à jour)
- [x] tsc strict + noUncheckedIndexedAccess clean
- [x] eslint 0 errors (M1Form / M1Schema / M1Values supprimés de page.tsx)
- [x] Playwright spec parse OK (`playwright test --list` ; pas d'exécution car DNS Meraki bloque la stack live — sera lancée manuellement par le user post-merge avec WARP)
- [x] 11 commits Franck F, zéro trailer Claude

## Dépendances

- **Hard-dep** : PR #29 (SP2 shell components) — utilise `WizardShell`/`HelpPanel`/`WizardContext`.
- **Soft-dep** : PR #28 (SP1 backend) — si non mergé, l'appel `/analyze` retournera 404 et le wizard affichera le bandeau jaune « Analyse indisponible » sans bloquer l'utilisateur.

## Hors scope SP3-A

- M2 wizard (SP3-B)
- M3 wizard (SP3-C — inclut l'étape de test connexion)
- Bottom-sheet mobile du HelpPanel (YAGNI tant que pas réclamé par UX testing)
- Markdown rendering du `body` via react-markdown (raw text suffit)
EOF
)"
```

- [ ] **Step 5: Plan-sync commit if needed**

If during execution any task revealed an inaccuracy in this plan (wrong fixture name, missed dep, helper path), append a final commit:

```
git add docs/superpowers/plans/2026-05-30-sp3a-wizard-orientation-m1.md
git commit -m "chore(plan): sync SP3-A plan with discoveries during execution"
```

---

## Spec coverage check

| Spec section / item | Covered by |
|---|---|
| §3 — Architecture M1 wizard composants | Tasks 3-8 |
| §4.7 — M1 5 étapes (contexte → données → décision → protégé → résumé) | Tasks 3, 4, 5, 6, 7 |
| §4.7 — Step 2 réutilise DatasetUploadCard existant + carte analyse auto | Task 4 |
| §4.7 — Step 3 dropdown valeurs uniques pour favorable_value | Task 5 |
| §4.7 — Step 4 options avancées dépliables | Task 6 |
| §4.5 — STEP_HELP entries M1 | Task 2 |
| §4.5 — getHelp lookup mécanisme déjà testé en SP2 ; M1 keys ajoutés | Task 2 |
| §4.6 — HelpPanel composition avec wizard | Task 8 (M1Wizard) |
| §6 — `/analyze` lent ou échec : bandeau non-bloquant | Task 4 + Task 8 (try/catch) |
| §6 — `createAudit` 5xx : bandeau d'erreur + bouton Réessayer | Task 8 (submitError state) — bouton Réessayer = appuyer à nouveau sur Terminer ; pas de bouton dédié pour SP3-A (YAGNI) |
| §7 — vitest M1Wizard navigation + suggestion + édition étape passée | Task 8 (M1Wizard flow + WizardShell navigation déjà testée en SP2) |
| §7 — Playwright wizard-m1-guided.spec.ts | Task 10 |

**Out-of-scope for SP3-A (couvert par SP3-B / SP3-C / hors scope global SP3):**
- M2 wizard 5 steps + test components + Playwright M2 → SP3-B
- M3 wizard 5 steps + test components + Playwright M3 (+ test-connection step using `/audits/m3/test-connection` from SP1) → SP3-C
- Bottom-sheet mobile pour HelpPanel
- react-markdown rendering du body
- Persistance de brouillon entre sessions
- Clonage d'audit précédent
