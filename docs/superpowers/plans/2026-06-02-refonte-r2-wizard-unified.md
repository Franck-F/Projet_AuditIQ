# Refonte R2 — Wizard unifié (M1/M2/M3 derrière « type d'audit »)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fusionner les wizards M1Wizard + M2Wizard + (l'ancien) M3Form en un seul wizard 5 étapes piloté par une étape « type d'audit » (3 choix utilisateur → mappés vers M1/M2/M3 backend). Pixel-perfect avec le design `docs/design/auditiq-refonte/pages_wizard.jsx`.

**Architecture:** UN composant `Wizard.tsx` orchestre 5 étapes adaptatives. La Step 1 « Contexte » contient un sélecteur cartes « Type d'audit » qui détermine le module backend invisible (M1 = ML tabulaire avec attribut sensible connu, M2 = ML tabulaire sans attribut déclaré, M3 = chatbot/LLM via API) + le secteur (RGPD/RH/Assurance/Autre). Les Steps 2-5 affichent un contenu différent selon le type sélectionné. Le composant utilise la `WizardShell` existante (SP2) pour la barre de progression et la navigation. Les anciens fichiers `m1/`, `m2/` et `M3Form` deviennent obsolètes — supprimés en fin de plan.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, React Hook Form, Tailwind v4 + tokens R1, vitest, Playwright.

**Design source:** `docs/design/auditiq-refonte/pages_wizard.jsx` (212 lignes — Wizard fonction principale + sous-composants WizardHelp/StepHeader/etc).

**Pré-requis exécution :** R1 mergée (PR #33) avec ses tokens + Geist + shell. Les endpoints backend (M1/M2/M3 + analyze + test-connection) existent déjà depuis SP1-SP3.

---

## File Structure

```
apps/web/
├── lib/api/audits.ts                              [READ]  rien à modifier — toutes les API helpers existent (createAudit M1+M2+M3, analyzeDataset, testConnectionM3, validateUrlM3)
├── lib/wizard/help-content.ts                     [MOD]   +entrées STEP_HELP « wizard.* » (5 étapes unifiées + sous-clés contextes adaptifs)
├── components/audits/wizard/
│   ├── unified/                                   [NEW]   nouveau dossier — wizard unifié
│   │   ├── Wizard.tsx                             [NEW]   orchestrateur principal (forme + WizardShell + 5 steps adaptatifs)
│   │   ├── Step1Context.tsx                       [NEW]   titre + cartes audit type (3) + cartes sector (4)
│   │   ├── Step2Source.tsx                        [NEW]   adaptive : DatasetUploadCard (M1/M2) | API config (M3)
│   │   ├── Step3Config.tsx                        [NEW]   adaptive : protected_attribute (M1) | decision-only (M2) | preset/body/path (M3)
│   │   ├── Step4Verify.tsx                        [NEW]   adaptive : metrics info (M1) | advanced params (M2) | test-connection (M3)
│   │   ├── Step5Review.tsx                        [NEW]   adaptive recap par audit type
│   │   ├── types.ts                               [NEW]   AuditType, Sector, UnifiedValues
│   │   └── constants.ts                           [NEW]   AUDIT_TYPE_CARDS, SECTOR_CARDS
│   └── (existing files in m1/, m2/, ProgressBar/WizardShell/HelpPanel — UNTOUCHED for now ; m1/m2 supprimés en Task 10)
├── app/app/audits/nouveau/page.tsx                [MOD]   remplace <M1Wizard>/<M2Wizard>/<M3Form> par <Wizard onComplete={...} /> unique
└── e2e/wizard-unified.spec.ts                     [NEW]   Playwright happy path (M1 + M2 + M3 paths)

apps/web/__tests__/
├── wizard-help-content.test.ts                    [MOD]   +M3 keys + wizard unified keys coverage
├── unified-step1-context.test.tsx                 [NEW]   audit type cards + sector cards
├── unified-step2-source.test.tsx                  [NEW]   adaptive M1/M2/M3
├── unified-step3-config.test.tsx                  [NEW]   adaptive M1/M2/M3
├── unified-step4-verify.test.tsx                  [NEW]   adaptive M1/M2/M3
├── unified-step5-review.test.tsx                  [NEW]   adaptive recap
└── unified-wizard-flow.test.tsx                   [NEW]   3 integration tests (M1 path / M2 path / M3 path)
```

**Suppression en Task 10** (cleanup): `components/audits/wizard/m1/`, `components/audits/wizard/m2/`, et les blocs M3Form/M3Schema/M3_PRESETS dans `nouveau/page.tsx`. Les tests `wizard-m1-*` et `wizard-m2-*` sont supprimés. Les Playwright `wizard-m1-guided` et `wizard-m2-guided` sont supprimés (remplacés par `wizard-unified`).

---

## Conventions répétées

- **Worktree** : `worktree-refonte-r2-wizard-unified`, créé via `git worktree add .claude/worktrees/refonte-r2-wizard-unified -b worktree-refonte-r2-wizard-unified origin/main`.
- **Identité git** : `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**.
- **Subagent gate** (Step 0 obligatoire) : `git rev-parse --show-toplevel` doit se terminer par `refonte-r2-wizard-unified`.
- **Scope restriction** : chaque tâche modifie strictement ses fichiers listés. `git status --short` doit montrer EXACTEMENT ces fichiers avant commit.
- **Mapping audit type → backend module** (TOUS les step components doivent suivre) :
  - `tabular-known` (« Modèle ML tabulaire — attribut sensible connu ») → backend **M1**
  - `tabular-unknown` (« Modèle ML tabulaire — recherche de biais ») → backend **M2**
  - `llm-api` (« Chatbot / LLM via API ») → backend **M3**
- **Pixel-perfect fidelity** vs `pages_wizard.jsx` (étiquettes, ordre, cartes, espacements).
- **Aucune modif côté `apps/api/` ni `apps/pdf/`**.

---

## Task 1: Types + constants

**Files:**
- Create: `apps/web/components/audits/wizard/unified/types.ts`
- Create: `apps/web/components/audits/wizard/unified/constants.ts`

- [ ] **Step 1: Worktree gate**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r2-wizard-unified
git rev-parse --show-toplevel
```

- [ ] **Step 2: Create `types.ts`**

```typescript
import type { TargetIn } from '@/lib/api/audits';

export type AuditType = 'tabular-known' | 'tabular-unknown' | 'llm-api';
export type Sector = 'credit' | 'hr' | 'insurance' | 'other';
export type WizardLang = 'fr' | 'en';

export interface UnifiedValues {
  // Step 1
  title: string;
  audit_type: AuditType | '';
  sector: Sector | '';
  // Step 2 — M1/M2: filled by upload handler; M3: filled by inputs
  // dataset_id is held in component state (not the form) since it comes from upload
  // M3 only:
  url: string;
  method: string;
  auth_header: string;
  // Step 3
  decision_column: string;
  favorable_value: string;
  protected_attribute: string;            // M1 only
  privileged_value: string;               // M1 optional
  ground_truth_column: string;            // M1 optional (EO/EOdds)
  secondary_protected_attribute: string;  // M1 optional (intersectionnel)
  preset: string;                          // M3 (openai | custom)
  body_template: string;                   // M3
  response_path: string;                   // M3
  // Step 4
  k: string;                               // M2 (clusters)
  deviation_pp: string;                    // M2
  chi2_alpha: string;                      // M2
  lang: WizardLang;                        // M3
}

export const DEFAULT_VALUES: UnifiedValues = {
  title: '',
  audit_type: '',
  sector: '',
  url: '',
  method: 'POST',
  auth_header: '',
  decision_column: '',
  favorable_value: '',
  protected_attribute: '',
  privileged_value: '',
  ground_truth_column: '',
  secondary_protected_attribute: '',
  preset: 'openai',
  body_template:
    '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
  response_path: 'choices.0.message.content',
  k: '',
  deviation_pp: '',
  chi2_alpha: '',
  lang: 'fr',
};

/** Map the user-facing audit_type to the backend module code. */
export function backendModuleFor(t: AuditType): 'M1' | 'M2' | 'M3' {
  if (t === 'tabular-known') return 'M1';
  if (t === 'tabular-unknown') return 'M2';
  return 'M3';
}

export function buildTarget(v: UnifiedValues): TargetIn {
  return {
    url: v.url,
    method: v.method,
    headers: v.auth_header.trim() ? { Authorization: v.auth_header.trim() } : {},
    body_template: v.body_template,
    response_path: v.response_path,
  };
}
```

- [ ] **Step 3: Create `constants.ts`**

```typescript
import type { AuditType, Sector } from './types';

interface CardDef<TValue extends string> {
  value: TValue;
  title: string;
  description: string;
  bullets: string[];
}

export const AUDIT_TYPE_CARDS: ReadonlyArray<CardDef<AuditType>> = [
  {
    value: 'tabular-known',
    title: 'Modèle ML tabulaire — j’ai un attribut sensible à tester',
    description: 'Audit supervisé classique : vous avez un CSV de décisions du modèle ET vous savez quelle caractéristique (sexe, âge, origine…) pourrait être discriminante.',
    bullets: ['Disparate Impact + règle des 4/5', 'Demographic Parity, Equal Opportunity, Equalized Odds', 'Analyse intersectionnelle 2-voies (option)'],
  },
  {
    value: 'tabular-unknown',
    title: 'Modèle ML tabulaire — je cherche où le biais peut se cacher',
    description: 'Détection non supervisée : vous avez un CSV de décisions mais aucun attribut sensible déclaré. AuditIQ découvre des clusters de traitement déviants à partir des features comportementales.',
    bullets: ['KMeans + χ² par cluster', 'Caractérisation top-3 features par cluster déviant', 'Aucune donnée sensible requise (RGPD-friendly)'],
  },
  {
    value: 'llm-api',
    title: 'Chatbot / LLM — j’audite un agent conversationnel via API',
    description: 'Audit LangBiTe : AuditIQ envoie 12 paires de prompts × 6 catégories d’attributs protégés à votre chatbot et mesure les écarts de traitement.',
    bullets: ['12 paires de prompts paired-counterfactual', 'Métriques : sentiment, longueur, refus structuré', 'AI Act art. 50 + recommandations CNIL'],
  },
];

export const SECTOR_CARDS: ReadonlyArray<CardDef<Sector>> = [
  {
    value: 'credit',
    title: 'Crédit & scoring financier',
    description: 'Octroi de prêt, notation, éligibilité',
    bullets: ['RGPD art. 22 (décision automatisée)', 'Directive sur le crédit'],
  },
  {
    value: 'hr',
    title: 'Ressources humaines',
    description: 'Recrutement, tri de CV, promotion',
    bullets: ['Code du travail L.1132-1', 'AI Act annexe III (RH = système à haut risque)'],
  },
  {
    value: 'insurance',
    title: 'Assurance',
    description: 'Tarification, gestion des sinistres',
    bullets: ['Code des assurances', 'Loi anti-discrimination 2008-496'],
  },
  {
    value: 'other',
    title: 'Autre usage à fort enjeu',
    description: 'Santé, justice, accès aux services publics',
    bullets: ['AI Act art. 6 + annexe III', 'Ancrages spécifiques selon secteur'],
  },
];
```

- [ ] **Step 4: Gates + commit**

```
cd apps/web && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r2-wizard-unified
git rev-parse --show-toplevel
git add apps/web/components/audits/wizard/unified/types.ts apps/web/components/audits/wizard/unified/constants.ts
git commit -m "feat(web): unified wizard types + audit_type/sector card constants"
```

---

## Task 2: STEP_HELP entries

**Files:**
- Modify: `apps/web/lib/wizard/help-content.ts`
- Modify: `apps/web/__tests__/wizard-help-content.test.ts`

- [ ] **Step 1: Failing test**

Append :

```typescript
describe('Unified wizard help entries', () => {
  const UNIFIED_KEYS = [
    'wizard.step1', 'wizard.step1.title', 'wizard.step1.audit_type', 'wizard.step1.sector',
    'wizard.step2', 'wizard.step2.upload', 'wizard.step2.url', 'wizard.step2.auth_header',
    'wizard.step3', 'wizard.step3.decision_column', 'wizard.step3.favorable_value',
    'wizard.step3.protected_attribute', 'wizard.step3.body_template', 'wizard.step3.response_path',
    'wizard.step4', 'wizard.step4.metrics', 'wizard.step4.advanced', 'wizard.step4.test_connection',
    'wizard.step5',
  ];

  it('all unified wizard help keys have entries', () => {
    for (const key of UNIFIED_KEYS) {
      const entry = getHelp(key);
      expect(entry, `missing entry for ${key}`).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.body.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Verify FAIL** : `cd apps/web && pnpm test wizard-help-content`

- [ ] **Step 3: Add 19 entries**

Append the 19 entries to `STEP_HELP` (just before the closing `};`). Adapt content per the design's `WZ_HELP` block (lines 14-20 of `pages_wizard.jsx`). Each entry: `{ title, body, example? }`. Example for one :

```typescript
  'wizard.step1': {
    title: 'Pourquoi définir un contexte ?',
    body: "Le cadre d'usage détermine les seuils réglementaires appliqués. Un modèle de scoring crédit relève du RGPD et de la directive sur le crédit ; un outil RH relève du droit du travail. AuditIQ adapte automatiquement les métriques et les seuils légaux.",
  },
  'wizard.step1.title': {
    title: 'Titre de l’audit',
    body: 'Un nom court (3-50 caractères) qui identifie l’audit dans le tableau de bord et les rapports.',
  },
  'wizard.step1.audit_type': {
    title: 'Type d’audit',
    body: "Trois choix possibles selon votre artefact : un modèle ML tabulaire avec un attribut sensible déjà identifié, un modèle ML tabulaire pour lequel vous cherchez où le biais peut se cacher, ou un chatbot/LLM accessible via une API REST.",
  },
  'wizard.step1.sector': {
    title: 'Secteur d’usage',
    body: "Le secteur détermine les ancrages réglementaires affichés dans le rapport (RGPD, droit du travail, code des assurances…) mais ne change pas le calcul des métriques.",
  },
  'wizard.step2': {
    title: 'Source de données',
    body: "Selon le type d’audit : importez un CSV (modèle ML) ou configurez l’URL de l’API du chatbot. AuditIQ ne stocke jamais les données brutes — seules les métriques agrégées sont conservées.",
  },
  'wizard.step2.upload': {
    title: 'Import du CSV',
    body: "Glissez-déposez votre CSV. AuditIQ analyse automatiquement les colonnes pour proposer la colonne de décision et l'attribut protégé probables.",
    example: 'Un CSV de 1 000 décisions de crédit avec colonnes : sex, age, income, approved.',
  },
  'wizard.step2.url': {
    title: 'URL de l’API du chatbot',
    body: "Endpoint HTTPS publiquement résolvable. Les URLs internes (10.x, 127.0.0.1, métadonnées cloud) sont refusées (anti-SSRF).",
    example: 'https://api.openai.com/v1/chat/completions',
  },
  'wizard.step2.auth_header': {
    title: 'En-tête d’authentification',
    body: "Bearer token ou clé API. Le secret est utilisé pour les appels uniquement, JAMAIS persisté en base.",
    example: 'Bearer sk-proj-abc123...',
  },
  'wizard.step3': {
    title: 'Configuration de l’audit',
    body: "Précisez les colonnes à auditer (CSV) ou le format des requêtes (LLM). AuditIQ propose automatiquement les meilleurs candidats.",
  },
  'wizard.step3.decision_column': {
    title: 'Colonne de décision',
    body: "Colonne qui contient la sortie du modèle : acceptation/refus, score, classification.",
    example: '« approved » ou « loan_status »',
  },
  'wizard.step3.favorable_value': {
    title: 'Valeur favorable',
    body: "Valeur qui représente le bénéfice (accepté, embauché, prêt accordé). On vérifie son attribution équitable.",
  },
  'wizard.step3.protected_attribute': {
    title: 'Attribut protégé',
    body: "Caractéristique légalement sensible (sexe, âge, origine…) sur laquelle mesurer l'écart de traitement.",
    example: '« sex », « age_group », « origine »',
  },
  'wizard.step3.body_template': {
    title: 'Corps de requête (gabarit JSON)',
    body: "Le JSON envoyé à votre API. Doit contenir le placeholder {prompt} (sans guillemets autour) — AuditIQ y injecte chaque prompt encodé JSON-safe.",
    example: '{"messages":[{"role":"user","content":"{prompt}"}]}',
  },
  'wizard.step3.response_path': {
    title: 'Chemin de la réponse',
    body: "Chemin dot-notation vers le champ texte dans la réponse JSON. AuditIQ extrait cette valeur pour analyse.",
    example: 'choices.0.message.content',
  },
  'wizard.step4': {
    title: 'Vérification',
    body: "Avant le lancement : récap des métriques qui seront produites, options avancées si pertinent, ou test de connexion pour le LLM.",
  },
  'wizard.step4.metrics': {
    title: 'Métriques de fairness',
    body: "AuditIQ produit toujours le Disparate Impact + la règle des 4/5. Si vous avez fourni une colonne vérité-terrain, Equal Opportunity et Equalized Odds sont ajoutés.",
  },
  'wizard.step4.advanced': {
    title: 'Paramètres avancés (M2)',
    body: "Les valeurs par défaut (k=5, déviation 20 pp, alpha 0.05) conviennent à la plupart des cas. N’ajustez que si vous savez ce que vous faites.",
  },
  'wizard.step4.test_connection': {
    title: 'Tester la connexion',
    body: "Étape facultative : envoie un prompt anodin (« Bonjour ») à votre chatbot pour valider la config avant l’audit complet (12 paires × 6 catégories).",
  },
  'wizard.step5': {
    title: 'Récapitulatif',
    body: "Vérifiez la config avant de lancer. M1/M2 prennent 5-30 secondes ; M3 prend 1-3 minutes selon la latence du chatbot.",
  },
```

- [ ] **Step 4: PASS + gates + commit**

```
cd apps/web && pnpm test wizard-help-content && pnpm typecheck && pnpm lint
git add apps/web/lib/wizard/help-content.ts apps/web/__tests__/wizard-help-content.test.ts
git commit -m "feat(web): unified wizard STEP_HELP entries (19 keys, adaptive 5 steps)"
```

---

## Task 3: Step1Context (titre + audit type cards + sector cards)

**Files:**
- Create: `apps/web/components/audits/wizard/unified/Step1Context.tsx`
- Create: `apps/web/__tests__/unified-step1-context.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step1Context } from '@/components/audits/wizard/unified/Step1Context';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';

function Harness() {
  const form = useForm<UnifiedValues>({ defaultValues: DEFAULT_VALUES });
  return <FormProvider {...form}><Step1Context /></FormProvider>;
}

describe('Unified Step1Context', () => {
  it('renders title input', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  });

  it('renders 3 audit type cards', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByText(/Modèle ML tabulaire.*attribut sensible/i)).toBeInTheDocument();
    expect(screen.getByText(/Modèle ML tabulaire.*biais peut se cacher/i)).toBeInTheDocument();
    expect(screen.getByText(/Chatbot.*LLM/i)).toBeInTheDocument();
  });

  it('renders 4 sector cards', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByText(/Crédit & scoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Ressources humaines/i)).toBeInTheDocument();
    expect(screen.getByText(/^Assurance/i)).toBeInTheDocument();
    expect(screen.getByText(/Autre usage/i)).toBeInTheDocument();
  });

  it('clicking an audit type card selects it (visual selected state)', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    const card = screen.getByRole('button', { name: /Modèle ML tabulaire.*attribut sensible/i });
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: FAIL → create component**

```typescript
'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import { AUDIT_TYPE_CARDS, SECTOR_CARDS } from '@/components/audits/wizard/unified/constants';
import type { AuditType, Sector, UnifiedValues } from '@/components/audits/wizard/unified/types';

export function Step1Context(): React.ReactElement {
  const { register, control, setValue } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const auditType = useWatch({ control, name: 'audit_type' });
  const sector = useWatch({ control, name: 'sector' });

  React.useEffect(() => { setHelpKey('wizard.step1'); return () => clearHelpKey(); }, [setHelpKey, clearHelpKey]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-fg">Contexte de l'audit</h2>
        <p className="text-sm text-fg-secondary">Donnez un nom à votre audit, choisissez le type d'artefact à auditer, et précisez le secteur d'usage.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wz-title" className="text-sm font-medium text-fg-secondary">Titre de l'audit</label>
        <input
          id="wz-title"
          type="text"
          placeholder="Audit recrutement Q1 2026"
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('title', { required: true })}
          onFocus={() => setHelpKey('wizard.step1.title')}
          onBlur={() => setHelpKey('wizard.step1')}
          aria-label="Titre de l'audit"
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow">Type d'audit</legend>
        <div className="grid gap-3 sm:grid-cols-1">
          {AUDIT_TYPE_CARDS.map((c) => {
            const selected = auditType === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="button"
                aria-pressed={selected}
                onClick={() => setValue('audit_type', c.value as AuditType, { shouldValidate: true })}
                onFocus={() => setHelpKey('wizard.step1.audit_type')}
                onBlur={() => setHelpKey('wizard.step1')}
                className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                  selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <p className="text-sm font-medium text-fg">{c.title}</p>
                <p className="text-xs text-fg-secondary">{c.description}</p>
                <ul className="mt-1 flex flex-col gap-1 text-xs text-fg-muted">
                  {c.bullets.map((b) => <li key={b}>• {b}</li>)}
                </ul>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow">Secteur d'usage</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTOR_CARDS.map((c) => {
            const selected = sector === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="button"
                aria-pressed={selected}
                onClick={() => setValue('sector', c.value as Sector, { shouldValidate: true })}
                onFocus={() => setHelpKey('wizard.step1.sector')}
                onBlur={() => setHelpKey('wizard.step1')}
                className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                  selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <p className="text-sm font-medium text-fg">{c.title}</p>
                <p className="text-xs text-fg-muted">{c.description}</p>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test unified-step1-context && pnpm typecheck && pnpm lint
git add apps/web/components/audits/wizard/unified/Step1Context.tsx apps/web/__tests__/unified-step1-context.test.tsx
git commit -m "feat(web): unified Step1Context (title + 3 audit type cards + 4 sector cards)"
```

---

## Task 4: Step2Source (adaptive : CSV upload OR API config)

**Files:**
- Create: `apps/web/components/audits/wizard/unified/Step2Source.tsx`
- Create: `apps/web/__tests__/unified-step2-source.test.tsx`

- [ ] **Step 1: Failing test**

Test must verify : if `audit_type === 'llm-api'`, renders URL/method/auth inputs (no upload). Else renders the existing `DatasetUploadCard`. Also tests that the analyse-auto card shows after CSV upload.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Source } from '@/components/audits/wizard/unified/Step2Source';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetOut, DatasetAnalysisOut } from '@/lib/api/audits';

function Harness({ initial, ...props }: { initial?: Partial<UnifiedValues> } & React.ComponentProps<typeof Step2Source>) {
  const form = useForm<UnifiedValues>({ defaultValues: { ...DEFAULT_VALUES, ...initial } });
  return <FormProvider {...form}><Step2Source {...props} /></FormProvider>;
}

const dataset: DatasetOut = {
  id: 'd', filename: 'x.csv', row_count: 10, columns: ['a', 'b'], status: 'ready',
  created_at: '2026-06-02T10:00:00Z', expires_at: null,
};

describe('Unified Step2Source', () => {
  it('M1/M2: shows upload card when no dataset', () => {
    render(<WizardProvider totalSteps={5}><Harness initial={{ audit_type: 'tabular-known' }} dataset={null} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} /></Harness></WizardProvider>);
    expect(screen.getByText(/Importez votre jeu de données/i)).toBeInTheDocument();
  });

  it('M1/M2: shows file summary when dataset selected', () => {
    render(<WizardProvider totalSteps={5}><Harness initial={{ audit_type: 'tabular-unknown' }} dataset={dataset} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} /></WizardProvider>);
    expect(screen.getByText('x.csv')).toBeInTheDocument();
  });

  it('M3: shows URL + method + auth_header inputs', () => {
    render(<WizardProvider totalSteps={5}><Harness initial={{ audit_type: 'llm-api' }} dataset={null} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} /></WizardProvider>);
    expect(screen.getByRole('textbox', { name: /URL/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Méthode/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /authentification/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL → create component**

`Step2Source.tsx` reads `audit_type` via `useWatch`. If `'llm-api'` → render M3 API config inputs (URL / method / auth_header) with the security note. Else → render existing `DatasetUploadCard` + analysis card pattern from M1 SP3-A.

Props: `dataset`, `analysis`, `analysisError`, `onUpload`, `busy`. Same shape as M1's Step2Data — reuse the pattern.

Wire helpKey: `wizard.step2.upload` on upload card, `wizard.step2.url` on URL input, `wizard.step2.auth_header` on auth.

- [ ] **Step 3: PASS + gates + commit**

```
git add apps/web/components/audits/wizard/unified/Step2Source.tsx apps/web/__tests__/unified-step2-source.test.tsx
git commit -m "feat(web): unified Step2Source (CSV upload OR API config — adaptive)"
```

---

## Task 5: Step3Config (adaptive M1/M2/M3)

**Files:**
- Create: `apps/web/components/audits/wizard/unified/Step3Config.tsx`
- Create: `apps/web/__tests__/unified-step3-config.test.tsx`

- [ ] **Step 1: Failing test**

3 tests : tabular-known → shows protected_attribute + advanced options ; tabular-unknown → shows decision-only (no protected attr) ; llm-api → shows preset + body_template + response_path.

- [ ] **Step 2: FAIL → create component**

`Step3Config.tsx` branches on `audit_type` :
- `tabular-known` (M1) : decision_column dropdown (from dataset.columns) + favorable_value (top_values smart dropdown) + protected_attribute + collapsible options (privileged_value / ground_truth_column / secondary_protected_attribute)
- `tabular-unknown` (M2) : decision_column + favorable_value only (no protected attribute — M2 uses unsupervised KMeans)
- `llm-api` (M3) : preset dropdown (`openai`/`custom`, openai auto-fills body+path) + body_template textarea + response_path input

Props: `dataset` (for column lists), `analysis` (for suggestions/top_values).

- [ ] **Step 3: PASS + gates + commit**

```
git add apps/web/components/audits/wizard/unified/Step3Config.tsx apps/web/__tests__/unified-step3-config.test.tsx
git commit -m "feat(web): unified Step3Config (protected_attribute M1 / decision-only M2 / LLM format M3)"
```

---

## Task 6: Step4Verify (adaptive M1/M2/M3)

**Files:**
- Create: `apps/web/components/audits/wizard/unified/Step4Verify.tsx`
- Create: `apps/web/__tests__/unified-step4-verify.test.tsx`

- [ ] **Step 1: Failing test**

3 tests : tabular-known → shows metrics info card listing 4/5+DP+EO+EOdds ; tabular-unknown → shows collapsible k/deviation_pp/chi2_alpha ; llm-api → shows test connection button.

- [ ] **Step 2: FAIL → create component**

`Step4Verify.tsx` branches on `audit_type` :
- M1 : static info card "Will produce: Disparate Impact, règle des 4/5, Demographic Parity, +EO/EOdds if ground_truth provided, +intersectional if secondary attr provided"
- M2 : collapsible `Step4Advanced` (port from M2 SP3-B) with k/deviation_pp/chi2_alpha inputs
- M3 : `Step4TestConnection` (port from the never-shipped SP3-C plan Task 6) — button "Tester la connexion" that calls `testConnectionM3({ target: buildTarget(values) })`. Shows ok/error result. Optional — user can skip.

Props: `values: UnifiedValues` (to build target for test-connection).

- [ ] **Step 3: PASS + gates + commit**

```
git add apps/web/components/audits/wizard/unified/Step4Verify.tsx apps/web/__tests__/unified-step4-verify.test.tsx
git commit -m "feat(web): unified Step4Verify (metrics info M1 / advanced params M2 / test-connection M3)"
```

---

## Task 7: Step5Review (adaptive recap)

**Files:**
- Create: `apps/web/components/audits/wizard/unified/Step5Review.tsx`
- Create: `apps/web/__tests__/unified-step5-review.test.tsx`

- [ ] **Step 1: Failing test**

3 tests : M1 recap shows protected attribute + decision + analyses list (DI/4-5/DP) ; M2 recap shows decision + k/dev/alpha params + KMeans+χ²+IQR list ; M3 recap shows URL+method+lang + LangBiTe metrics list + auth masked.

- [ ] **Step 2: FAIL → create component**

`Step5Review.tsx` branches on `audit_type` and renders the appropriate recap (titre + sector + dataset/URL + config + analyses list). Auth header MASKED (never display the secret value).

Props: `values: UnifiedValues`, `dataset: DatasetOut | null`.

- [ ] **Step 3: PASS + gates + commit**

```
git add apps/web/components/audits/wizard/unified/Step5Review.tsx apps/web/__tests__/unified-step5-review.test.tsx
git commit -m "feat(web): unified Step5Review (adaptive recap M1/M2/M3 with masked auth)"
```

---

## Task 8: Wizard orchestrator

**Files:**
- Create: `apps/web/components/audits/wizard/unified/Wizard.tsx`
- Create: `apps/web/__tests__/unified-wizard-flow.test.tsx`

- [ ] **Step 1: Failing integration tests**

3 tests (one per audit type path) :

```typescript
describe('Unified Wizard happy paths', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'uploadDataset').mockResolvedValue(dataset);
    vi.spyOn(audits, 'analyzeDataset').mockResolvedValue(analysis);
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreated);
  });

  it('M1 path: tabular-known walks 5 steps and creates an audit with no module field (default M1)', async () => {
    // ... select audit_type=tabular-known + sector=credit
    // ... upload CSV
    // ... pick decision_column + favorable_value + protected_attribute
    // ... skip metrics info
    // ... click Terminer
    // assert: createAudit called with body { dataset_id, title, decision_column, favorable_value, protected_attribute, ... } — NO module field (default M1)
  });

  it('M2 path: tabular-unknown walks 5 steps and creates an audit with module=M2', async () => {
    // similar but tabular-unknown + no protected_attribute
    // assert: createAudit called with module: 'M2'
  });

  it('M3 path: llm-api walks 5 steps and creates an audit with module=M3 + target', async () => {
    // select audit_type=llm-api + sector
    // configure URL + auth
    // accept preset (openai default)
    // skip test step
    // assert: createAudit called with module: 'M3', target: {...}, lang: 'fr'
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
import { Step1Context } from './Step1Context';
import { Step2Source } from './Step2Source';
import { Step3Config } from './Step3Config';
import { Step4Verify } from './Step4Verify';
import { Step5Review } from './Step5Review';
import {
  analyzeDataset, createAudit, uploadDataset,
  type DatasetAnalysisOut, type DatasetOut, type M2ConfigIn,
} from '@/lib/api/audits';
import { backendModuleFor, buildTarget, DEFAULT_VALUES, type UnifiedValues } from './types';
import type { WizardStepDef } from '@/lib/wizard/types';

interface WizardProps {
  onComplete: (auditId: string) => void;
}

export function Wizard({ onComplete }: WizardProps): React.ReactElement {
  const form = useForm<UnifiedValues>({ defaultValues: DEFAULT_VALUES });
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
        setAnalysis(await analyzeDataset(d.id));
      } catch { setAnalysisError("Le service d'analyse est indisponible."); }
    } catch { setAnalysisError("L'import du fichier a échoué. Vérifiez le CSV."); }
    finally { setBusy(false); }
  };

  const isLlm = values.audit_type === 'llm-api';
  const isTabular = values.audit_type === 'tabular-known' || values.audit_type === 'tabular-unknown';

  const steps: ReadonlyArray<WizardStepDef<UnifiedValues>> = [
    { id: 'context', title: 'Contexte', helpKey: 'wizard.step1', isValid: (v) => v.title.trim().length > 0 && v.audit_type !== '' && v.sector !== '' },
    { id: 'source', title: 'Source', helpKey: 'wizard.step2', isValid: (v) => isLlm ? v.url.trim().length > 0 : dataset !== null },
    { id: 'config', title: 'Configuration', helpKey: 'wizard.step3', isValid: (v) => {
      if (isLlm) return v.body_template.includes('{prompt}') && v.response_path.trim().length > 0;
      if (!v.decision_column || !v.favorable_value) return false;
      if (v.audit_type === 'tabular-known' && !v.protected_attribute) return false;
      return true;
    }},
    { id: 'verify', title: 'Vérification', helpKey: 'wizard.step4', isValid: () => true },
    { id: 'review', title: 'Résumé', helpKey: 'wizard.step5', isValid: () => true },
  ];

  const onSubmit = async () => {
    const v = form.getValues();
    setSubmitError(null);
    if (!v.audit_type) return;
    const mod = backendModuleFor(v.audit_type);
    try {
      let audit;
      if (mod === 'M1') {
        if (!dataset) return;
        audit = await createAudit({
          dataset_id: dataset.id,
          title: v.title,
          decision_column: v.decision_column,
          favorable_value: v.favorable_value,
          protected_attribute: v.protected_attribute,
          privileged_value: v.privileged_value || null,
          ...(v.ground_truth_column ? { ground_truth_column: v.ground_truth_column } : {}),
          ...(v.secondary_protected_attribute ? { secondary_protected_attribute: v.secondary_protected_attribute } : {}),
        });
      } else if (mod === 'M2') {
        if (!dataset) return;
        const config: M2ConfigIn = {};
        if (v.k) config.k = Number(v.k);
        if (v.deviation_pp) config.deviation_pp = Number(v.deviation_pp);
        if (v.chi2_alpha) config.chi2_alpha = Number(v.chi2_alpha);
        audit = await createAudit({
          dataset_id: dataset.id,
          title: v.title,
          module: 'M2',
          decision_column: v.decision_column,
          favorable_value: v.favorable_value,
          config,
        });
      } else {
        audit = await createAudit({
          title: v.title,
          module: 'M3',
          target: buildTarget(v),
          lang: v.lang,
        });
      }
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
              <p role="alert" className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail">{submitError}</p>
            )}
            <WizardShell<UnifiedValues>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context': return <Step1Context />;
                  case 'source': return <Step2Source dataset={dataset} analysis={analysis} analysisError={analysisError} onUpload={handleUpload} busy={busy} />;
                  case 'config': return <Step3Config dataset={dataset} analysis={analysis} />;
                  case 'verify': return <Step4Verify values={values} />;
                  case 'review': return <Step5Review values={values} dataset={dataset} />;
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

- [ ] **Step 3: PASS + gates + commit**

```
git add apps/web/components/audits/wizard/unified/Wizard.tsx apps/web/__tests__/unified-wizard-flow.test.tsx
git commit -m "feat(web): unified Wizard orchestrator (5 adaptive steps, M1/M2/M3 routing)"
```

---

## Task 9: page.tsx — replace M1/M2/M3 with unified Wizard + cleanup

**Files:**
- Modify: `apps/web/app/app/audits/nouveau/page.tsx`
- Modify: `apps/web/__tests__/nouveau-page.test.tsx`

- [ ] **Step 1: Update tests**

Replace the existing M1/M2/M3-specific smoke tests with a single test :

```typescript
it('shows the unified wizard with audit type cards', async () => {
  render(<NouveauPage />);
  expect(await screen.findByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  expect(screen.getByText(/Modèle ML tabulaire.*attribut sensible/i)).toBeInTheDocument();
  expect(screen.getByText(/Chatbot.*LLM/i)).toBeInTheDocument();
});
```

Delete the 3 existing module-specific tests (M1, M2, M3) and the module-choice test.

- [ ] **Step 2: Replace page.tsx**

```typescript
'use client';

import { useRouter } from 'next/navigation';

import { Topbar } from '@/components/app/Topbar';
import { Wizard } from '@/components/audits/wizard/unified/Wizard';

export default function NouveauPage() {
  const router = useRouter();
  return (
    <>
      <Topbar crumbs={[{ label: 'Audits', href: '/app/audits' }, { label: 'Nouvel audit' }]} />
      <main className="flex-1 px-8 py-8">
        <h1 className="mb-6 text-[28px] font-semibold tracking-[-0.02em] text-fg">Nouvel audit</h1>
        <Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
      </main>
    </>
  );
}
```

Delete from page.tsx : `M1Wizard` import, `M2Wizard` import, `M3Form` local component, `M3Schema`, `M3Values`, `M3_PRESETS`, the module choice block, the dataset state management (moved into Wizard).

- [ ] **Step 3: PASS + gates + commit**

```
cd apps/web && pnpm test nouveau-page && pnpm typecheck && pnpm lint
git add apps/web/app/app/audits/nouveau/page.tsx apps/web/__tests__/nouveau-page.test.tsx
git commit -m "feat(web): page.tsx uses unified Wizard (removes module choice + M1/M2/M3-specific UI)"
```

---

## Task 10: Cleanup old wizard files

**Files (deletions):**
- Delete: `apps/web/components/audits/wizard/m1/` (entire directory + 6 files)
- Delete: `apps/web/components/audits/wizard/m2/` (entire directory + 6 files)
- Delete: `apps/web/__tests__/wizard-m1-step1-context.test.tsx`
- Delete: `apps/web/__tests__/wizard-m1-step2-data.test.tsx`
- Delete: `apps/web/__tests__/wizard-m1-step3-decision.test.tsx`
- Delete: `apps/web/__tests__/wizard-m1-step4-protected.test.tsx`
- Delete: `apps/web/__tests__/wizard-m1-step5-review.test.tsx`
- Delete: `apps/web/__tests__/wizard-m1-flow.test.tsx`
- Delete: `apps/web/__tests__/wizard-m2-step1-context.test.tsx`
- Delete: `apps/web/__tests__/wizard-m2-step2-data.test.tsx`
- Delete: `apps/web/__tests__/wizard-m2-step3-decision.test.tsx`
- Delete: `apps/web/__tests__/wizard-m2-step4-advanced.test.tsx`
- Delete: `apps/web/__tests__/wizard-m2-step5-review.test.tsx`
- Delete: `apps/web/__tests__/wizard-m2-flow.test.tsx`
- Delete: `apps/web/e2e/wizard-m1-guided.spec.ts`
- Delete: `apps/web/e2e/wizard-m2-guided.spec.ts`

- [ ] **Step 1: Delete all files**

```bash
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r2-wizard-unified
git rm -r apps/web/components/audits/wizard/m1
git rm -r apps/web/components/audits/wizard/m2
git rm apps/web/__tests__/wizard-m1-step1-context.test.tsx \
       apps/web/__tests__/wizard-m1-step2-data.test.tsx \
       apps/web/__tests__/wizard-m1-step3-decision.test.tsx \
       apps/web/__tests__/wizard-m1-step4-protected.test.tsx \
       apps/web/__tests__/wizard-m1-step5-review.test.tsx \
       apps/web/__tests__/wizard-m1-flow.test.tsx \
       apps/web/__tests__/wizard-m2-step1-context.test.tsx \
       apps/web/__tests__/wizard-m2-step2-data.test.tsx \
       apps/web/__tests__/wizard-m2-step3-decision.test.tsx \
       apps/web/__tests__/wizard-m2-step4-advanced.test.tsx \
       apps/web/__tests__/wizard-m2-step5-review.test.tsx \
       apps/web/__tests__/wizard-m2-flow.test.tsx
git rm apps/web/e2e/wizard-m1-guided.spec.ts apps/web/e2e/wizard-m2-guided.spec.ts
```

- [ ] **Step 2: Also remove M1/M2 help entries from help-content.ts (only `wizard.*` keys remain)**

In `apps/web/lib/wizard/help-content.ts`, remove all `m1.step*` and `m2.step*` entries from `STEP_HELP`. Keep `canary.test` and the new `wizard.*` entries.

Update `apps/web/__tests__/wizard-help-content.test.ts` to remove the M1+M2 coverage tests (the file from Task 2 covers `wizard.*` only).

- [ ] **Step 3: Full test + gates**

```
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all remaining tests pass.

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "chore(web): remove M1/M2-specific wizard components, tests, helpers (replaced by unified)"
```

---

## Task 11: Playwright wizard-unified.spec.ts

**Files:**
- Create: `apps/web/e2e/wizard-unified.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Unified wizard guided flow', () => {
  test('M1 path (tabular-known): walks 5 steps + creates audit', async ({ page }) => {
    await page.goto('/app/audits/nouveau');
    // Step 1
    await page.getByRole('textbox', { name: /titre/i }).fill('E2E M1');
    await page.getByRole('button', { name: /Modèle ML tabulaire.*attribut sensible/i }).click();
    await page.getByRole('button', { name: /Crédit/i }).click();
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 2: upload CSV
    await page.getByTestId('csv-input').setInputFiles('e2e/fixtures/m1-simple.csv');
    await expect(page.getByText(/Analyse automatique/i)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 3
    await page.getByRole('combobox', { name: /Colonne de décision/i }).selectOption({ index: 1 });
    await page.getByRole('combobox', { name: /Valeur favorable/i }).selectOption({ index: 1 });
    await page.getByRole('combobox', { name: /Attribut protégé/i }).selectOption({ index: 1 });
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 4
    await page.getByRole('button', { name: /Suivant/i }).click();
    // Step 5
    await expect(page.getByText(/Récapitulatif/i)).toBeVisible();
    await page.getByRole('button', { name: /Terminer/i }).click();
    await page.waitForURL(/\/app\/audits\/[a-f0-9-]+$/, { timeout: 30000 });
  });
});
```

(Adapt fixture filename if needed — the existing M1/M2 fixtures from earlier specs work.)

- [ ] **Step 2: Verify parses**

```
cd apps/web && pnpm exec playwright test --list e2e/wizard-unified.spec.ts
```

- [ ] **Step 3: Commit**

```
git add apps/web/e2e/wizard-unified.spec.ts
git commit -m "test(web): Playwright E2E for unified wizard (M1 happy path)"
```

---

## Task 12: Final gate + push + PR

- [ ] **Step 1: Full gates**

```
cd apps/web && pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 2: Identity check + filter-branch if drift**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r2-wizard-unified
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

If any commit has wrong email, run :

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

- [ ] **Step 3: Push + open PR**

```
git push -u origin worktree-refonte-r2-wizard-unified
gh pr create --title "feat(web): refonte R2 — wizard unifié (M1/M2/M3 derrière audit_type)" --body "$(cat <<'EOF'
## Summary

R2 du chantier de refonte. Fusionne les wizards M1Wizard + M2Wizard + M3Form en UN SEUL wizard 5 étapes adaptatif, piloté par une étape 1 qui demande le « type d'audit » (3 cartes) et le « secteur » (4 cartes). Le module backend (M1/M2/M3) est invisible pour l'utilisateur.

### Mapping audit_type → backend
- « Modèle ML tabulaire — j'ai un attribut sensible à tester » → M1
- « Modèle ML tabulaire — je cherche où le biais peut se cacher » → M2
- « Chatbot / LLM via API » → M3

### Architecture
- `Wizard.tsx` orchestrateur unique. 5 étapes adaptatives selon `audit_type`.
- `Step1Context` : titre + cartes type + cartes secteur.
- `Step2Source` : adaptive — CSV upload (M1/M2) OR API config (M3).
- `Step3Config` : adaptive — protected attribute (M1) / decision-only (M2) / preset+body+path (M3).
- `Step4Verify` : adaptive — metrics info (M1) / advanced params (M2) / test connection (M3).
- `Step5Review` : adaptive recap avec auth masquée pour M3.
- `STEP_HELP` étendu avec 19 entrées `wizard.*`.

### Suppressions
- `components/audits/wizard/m1/` (6 fichiers) + tests M1
- `components/audits/wizard/m2/` (6 fichiers) + tests M2
- M3Form/M3Schema/M3_PRESETS dans page.tsx
- Playwright `wizard-m1-guided` + `wizard-m2-guided` → remplacés par `wizard-unified`
- Entrées `STEP_HELP` `m1.*` + `m2.*`

## Test plan

- [x] vitest passing (replace ~17 anciens tests M1/M2 par les nouveaux unified)
- [x] tsc strict + noUncheckedIndexedAccess clean
- [x] eslint 0 errors
- [x] Playwright `wizard-unified.spec.ts` parse
- [x] ~12 commits Franck F, zéro trailer Claude

## Dépendances

Construit sur R1 (#33) qui fournit Geist, tokens OKLCH, shell. Utilise tous les endpoints backend SP1-SP3 (createAudit M1+M2+M3, analyzeDataset, testConnectionM3).

## Hors scope R2 (R3 + R4 à venir)

- Result page refonte (R3)
- Recos + Reports refonte (R3)
- Dashboard + Audits list + Team + Settings + Auth (R4)
EOF
)"
```

- [ ] **Step 4: Plan-sync commit if needed**

---

## Spec coverage check

| Design package element | Covered by |
|---|---|
| 5-step wizard | Tasks 3-7 (steps) + Task 8 (orchestrator) |
| Domain selector (4 sector cards) | Task 3 (Step1Context) |
| Audit type selector (3 cards, our addition) | Task 3 |
| Help panel sidebar | Uses existing HelpPanel from SP2, content via Task 2 |
| Adaptive contents per type | Tasks 4-7 |
| Pixel-perfect cards | Tasks 3-7 (port from pages_wizard.jsx) |
| Removal of legacy M1/M2/M3-specific UI | Tasks 9-10 |
| Backend unchanged | All tasks (use existing API contracts) |

**Hors scope (R3-R4):** result page, recommandations page, reports page, dashboard, audits list, team, settings, support, auth.
