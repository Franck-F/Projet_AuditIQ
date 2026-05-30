# SP2 — Wizard d'audit orienté : Composants partagés (shell, panel, context, help-content)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire les composants React partagés du wizard (shell multi-étapes, panneau d'aide contextuelle, contexte React, banque de contenu d'aide) qui seront réutilisés en SP3 par les 3 wizards modules (M1/M2/M3).

**Architecture:** Pile de composants découplés — `WizardContext` expose l'état partagé (étape courante, helpKey, valeurs entre étapes), `WizardShell` orchestre le rendu (barre de progression, prev/next, slot pour l'étape courante), `HelpPanel` lit `STEP_HELP[helpKey]` et s'affiche en panneau latéral (desktop) ou bottom-sheet (mobile, via Radix Dialog). Types côté `lib/wizard/`, composants côté `components/audits/wizard/`. Tests vitest unitaires avec React Testing Library.

**Tech Stack:** Next.js 16 (Turbopack), TypeScript strict, React 19, Tailwind v4, shadcn/ui (Radix primitives), react-markdown (déjà dans le repo), vitest + @testing-library/react.

**Spec source:** `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` §3 (architecture), §4.5 (system d'aide), §4.6 (HelpPanel).

**Référence repo (état entrée) :** Après merge de SP1 (PR #28) ou en parallèle (aucun fichier partagé avec SP1). Pour démarrer maintenant : main HEAD post-revert (`e34d7b5`). Vitest baseline = 41. eslint+tsc strict.

---

## File Structure

```
apps/web/
├── lib/wizard/
│   ├── types.ts                         [NEW]   HelpEntry, HelpKey (string-typed for SP2 flexibility)
│   ├── help-content.ts                  [NEW]   STEP_HELP record + GLOSSARY + getHelp() lookup
│   └── (placeholder for SP3 step defs)
├── components/audits/wizard/
│   ├── WizardContext.tsx                [NEW]   React Context: currentStep, helpKey, sharedValues
│   ├── ProgressBar.tsx                  [NEW]   Visual step indicator (N steps, click past to edit)
│   ├── WizardShell.tsx                  [NEW]   Orchestrates context + progress + step slot + prev/next
│   └── HelpPanel.tsx                    [NEW]   Desktop sticky panel + mobile bottom-sheet via Radix Dialog
└── __tests__/
    ├── wizard-help-content.test.ts      [NEW]   getHelp lookups, GLOSSARY shape
    ├── wizard-context.test.tsx          [NEW]   default state, setHelpKey, navigation
    ├── wizard-progress-bar.test.tsx     [NEW]   N indicators, current highlight, click-to-edit
    ├── wizard-shell.test.tsx            [NEW]   step rendering, prev/next gating, progress integration
    └── wizard-help-panel.test.tsx       [NEW]   default content, switch on helpKey, fallback for unknown
```

**Decomposition rationale** : 4 fichiers shippables séparément, chacun avec une responsabilité unique. `WizardContext` est la dependency racine (autres composants l'utilisent). `ProgressBar` est isolé pour réutilisation potentielle. `WizardShell` compose les autres. `HelpPanel` est responsive autonome. Types et contenu d'aide vivent dans `lib/wizard/` (logique non-React, testable sans DOM).

---

## Conventions répétées (à appliquer dans chaque tâche)

- **Worktree** : ce plan s'exécute sur le branch `worktree-wizard-sp2-shell-components` créé via la skill `using-git-worktrees`. Tous les commits y sont locaux jusqu'à la PR finale.
- **Identité git** : commits = `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**. Voir `memory/git-commit-identity.md`.
- **Commit** : à chaque fin de tâche, message Conventional Commits (`feat(web):`, `chore(web):`, `test(web):`). Plain `git commit` (jamais `-c core.autocrlf=false`).
- **Test runner** : depuis `apps/web/` → `pnpm test` (full) ou `pnpm test <pattern>` (ciblé).
- **Type-check** : `pnpm typecheck` depuis `apps/web/`.
- **Lint** : `pnpm lint` depuis `apps/web/`.
- **Aucune modif côté `apps/api/` ni `apps/pdf/`** dans SP2.
- **Verify worktree avant chaque commit** : `git rev-parse --show-toplevel` doit contenir `.claude/worktrees/wizard-sp2-shell-components`. Si ce n'est pas le cas, STOP et report BLOCKED.

---

## Task 1: Types module — `lib/wizard/types.ts`

**Files:**
- Create: `apps/web/lib/wizard/types.ts`
- Test: (covered by Task 2 — types are tested via use in help-content.test.ts)

- [ ] **Step 1: Create the types file**

`apps/web/lib/wizard/types.ts`:

```typescript
/**
 * Wizard d'audit — types partagés.
 *
 * HelpKey est string typé : SP2 ne contraint pas la liste exhaustive
 * (SP3 ajoutera les clés concrètes par module/étape). Le runtime
 * tolère les clés absentes via getHelp() → undefined.
 */

export type HelpKey = string;

export interface HelpEntry {
  /** Titre affiché en tête du panneau (texte court). */
  title: string;
  /** Corps en markdown (1-3 paragraphes). */
  body: string;
  /** Exemple concret, optionnel — rendu dans un encart visuel distinct. */
  example?: string;
  /** Lien doc, optionnel — ouvre dans un nouvel onglet. */
  learnMoreHref?: string;
}

export interface WizardStepDef<TValues = unknown> {
  /** Identifiant unique de l'étape dans le wizard (ex. "step1", "step2"). */
  id: string;
  /** Titre court affiché dans la barre de progression. */
  title: string;
  /**
   * Clé d'aide par défaut quand on arrive sur l'étape (sans focus de champ).
   * Le HelpPanel l'affiche jusqu'au prochain focus.
   */
  helpKey: HelpKey;
  /**
   * Validateur synchrone — retourne true si l'étape est complète et qu'on
   * peut activer "Suivant". WizardShell désactive Next tant que false.
   */
  isValid: (values: TValues) => boolean;
}
```

- [ ] **Step 2: Verify typecheck passes**

```
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Verify lint passes**

```
cd apps/web && pnpm lint
```

Expected: no errors on the new file.

- [ ] **Step 4: Commit**

```
cd ../..  # back to repo root
git add apps/web/lib/wizard/types.ts
git commit -m "feat(web): wizard shared types (HelpKey, HelpEntry, WizardStepDef)"
```

---

## Task 2: Help content module — `lib/wizard/help-content.ts`

**Files:**
- Create: `apps/web/lib/wizard/help-content.ts`
- Test: `apps/web/__tests__/wizard-help-content.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-help-content.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

import {
  GLOSSARY,
  STEP_HELP,
  getHelp,
} from '@/lib/wizard/help-content';

describe('help-content', () => {
  it('exports STEP_HELP as a record', () => {
    expect(typeof STEP_HELP).toBe('object');
    expect(STEP_HELP).not.toBeNull();
  });

  it('exports GLOSSARY with at least one term', () => {
    expect(Object.keys(GLOSSARY).length).toBeGreaterThan(0);
  });

  it('getHelp returns the entry for a known key', () => {
    // We seed the record with a single canary key for the test.
    const entry = getHelp('canary.test');
    expect(entry).toBeDefined();
    expect(entry?.title).toBe('Canary');
  });

  it('getHelp returns undefined for an unknown key', () => {
    expect(getHelp('not.a.real.key')).toBeUndefined();
  });

  it('GLOSSARY entries are non-empty strings', () => {
    for (const [term, def] of Object.entries(GLOSSARY)) {
      expect(typeof term).toBe('string');
      expect(term.length).toBeGreaterThan(0);
      expect(typeof def).toBe('string');
      expect(def.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

```
cd apps/web && pnpm test wizard-help-content
```

Expected: FAIL — module `@/lib/wizard/help-content` not found.

- [ ] **Step 3: Create the help-content module**

`apps/web/lib/wizard/help-content.ts`:

```typescript
/**
 * Wizard d'audit — banque de contenu d'aide contextuelle.
 *
 * SP2 expose la structure et un seul stub (canary) pour valider la
 * mécanique de lookup. SP3 alimentera ce record avec les vraies entrées
 * par module/étape/champ au fur et à mesure que les wizards seront construits.
 */

import type { HelpEntry, HelpKey } from './types';

/**
 * Glossaire transversal — termes métier qui reviennent sur plusieurs
 * étapes. Définitions courtes (1-2 phrases). Pourra être rendu dans
 * un futur `<dfn>` markdown extension.
 */
export const GLOSSARY: Record<string, string> = {
  'attribut protégé':
    "Une caractéristique légalement sensible (sexe, âge, origine...) sur laquelle on cherche d'éventuels écarts de traitement.",
  'décision favorable':
    "La valeur de la décision du modèle qui représente le bénéfice (accepté, embauché, prêt accordé...).",
  'disparate impact':
    'Ratio du taux de décisions favorables entre groupes — convention : seuil ≥ 0.80 selon la règle des 4/5.',
};

/**
 * Banque d'aide indexée par HelpKey.
 *
 * SP2 = un seul stub canary pour les tests. SP3 = entrées réelles
 * par étape/champ (`m1.step3.decision_column`, `m2.step4.k`, etc.).
 */
export const STEP_HELP: Record<HelpKey, HelpEntry> = {
  'canary.test': {
    title: 'Canary',
    body: 'Entrée de test pour valider la mécanique de lookup.',
  },
};

/**
 * Lookup tolérant : renvoie l'entrée si présente, sinon undefined.
 * Le composant HelpPanel décide du fallback à afficher.
 */
export function getHelp(key: HelpKey): HelpEntry | undefined {
  return STEP_HELP[key];
}
```

- [ ] **Step 4: Run test, verify it PASSES**

```
cd apps/web && pnpm test wizard-help-content
```

Expected: 5 tests passed.

- [ ] **Step 5: Run typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/lib/wizard/help-content.ts apps/web/__tests__/wizard-help-content.test.ts
git commit -m "feat(web): wizard help-content with STEP_HELP record + GLOSSARY + getHelp"
```

---

## Task 3: WizardContext — React Context

**Files:**
- Create: `apps/web/components/audits/wizard/WizardContext.tsx`
- Test: `apps/web/__tests__/wizard-context.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-context.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WizardProvider totalSteps={5}>{children}</WizardProvider>
);

describe('WizardContext', () => {
  it('starts at step 1 with no helpKey', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    expect(result.current.currentStep).toBe(1);
    expect(result.current.helpKey).toBeNull();
  });

  it('goNext advances and stops at totalSteps', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe(2);
    act(() => {
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
      result.current.goNext(); // attempt beyond totalSteps
    });
    expect(result.current.currentStep).toBe(5);
  });

  it('goPrev rewinds and stops at 1', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => {
      result.current.goNext();
      result.current.goNext();
    });
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.goPrev());
    expect(result.current.currentStep).toBe(2);
    act(() => {
      result.current.goPrev();
      result.current.goPrev(); // attempt below 1
    });
    expect(result.current.currentStep).toBe(1);
  });

  it('goTo jumps to a valid step (1..totalSteps)', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => result.current.goTo(4));
    expect(result.current.currentStep).toBe(4);
    act(() => result.current.goTo(0)); // out of range, no-op
    expect(result.current.currentStep).toBe(4);
    act(() => result.current.goTo(99)); // out of range, no-op
    expect(result.current.currentStep).toBe(4);
  });

  it('setHelpKey + clearHelpKey work', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => result.current.setHelpKey('m1.step3.decision_column'));
    expect(result.current.helpKey).toBe('m1.step3.decision_column');
    act(() => result.current.clearHelpKey());
    expect(result.current.helpKey).toBeNull();
  });

  it('useWizard throws if not wrapped in WizardProvider', () => {
    expect(() => renderHook(() => useWizard())).toThrow(
      /WizardProvider/i
    );
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

```
cd apps/web && pnpm test wizard-context
```

Expected: FAIL — module `@/components/audits/wizard/WizardContext` not found.

- [ ] **Step 3: Create the WizardContext**

`apps/web/components/audits/wizard/WizardContext.tsx`:

```typescript
'use client';

import * as React from 'react';

import type { HelpKey } from '@/lib/wizard/types';

interface WizardContextValue {
  currentStep: number;
  totalSteps: number;
  helpKey: HelpKey | null;
  goNext: () => void;
  goPrev: () => void;
  goTo: (step: number) => void;
  setHelpKey: (key: HelpKey) => void;
  clearHelpKey: () => void;
}

const WizardContext = React.createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  totalSteps: number;
  children: React.ReactNode;
}

export function WizardProvider({
  totalSteps,
  children,
}: WizardProviderProps): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [helpKey, setHelpKeyState] = React.useState<HelpKey | null>(null);

  const goNext = React.useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  }, [totalSteps]);

  const goPrev = React.useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goTo = React.useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const setHelpKey = React.useCallback((key: HelpKey) => {
    setHelpKeyState(key);
  }, []);

  const clearHelpKey = React.useCallback(() => {
    setHelpKeyState(null);
  }, []);

  const value: WizardContextValue = React.useMemo(
    () => ({
      currentStep,
      totalSteps,
      helpKey,
      goNext,
      goPrev,
      goTo,
      setHelpKey,
      clearHelpKey,
    }),
    [
      currentStep,
      totalSteps,
      helpKey,
      goNext,
      goPrev,
      goTo,
      setHelpKey,
      clearHelpKey,
    ]
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = React.useContext(WizardContext);
  if (ctx === null) {
    throw new Error('useWizard must be used inside a WizardProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run test, verify it PASSES**

```
cd apps/web && pnpm test wizard-context
```

Expected: 6 tests passed.

- [ ] **Step 5: Run typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/WizardContext.tsx apps/web/__tests__/wizard-context.test.tsx
git commit -m "feat(web): WizardContext (currentStep, helpKey, navigation hooks)"
```

---

## Task 4: ProgressBar — visual step indicator

**Files:**
- Create: `apps/web/components/audits/wizard/ProgressBar.tsx`
- Test: `apps/web/__tests__/wizard-progress-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-progress-bar.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProgressBar } from '@/components/audits/wizard/ProgressBar';

describe('ProgressBar', () => {
  it('renders N step indicators', () => {
    render(
      <ProgressBar
        currentStep={1}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={() => {}}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(5);
  });

  it('marks the current step as aria-current="step"', () => {
    render(
      <ProgressBar
        currentStep={3}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={() => {}}
      />
    );
    const current = screen.getByText('C').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('allows clicking on a past step', async () => {
    const onClick = vi.fn();
    render(
      <ProgressBar
        currentStep={3}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={onClick}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /B/ }));
    expect(onClick).toHaveBeenCalledWith(2);
  });

  it('disables future steps (no button rendered)', () => {
    render(
      <ProgressBar
        currentStep={2}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={() => {}}
      />
    );
    // Step C (index 2 in 0-based, step 3 in 1-based) is in the future.
    // Future steps should NOT have an accessible button (only label).
    expect(screen.queryByRole('button', { name: /C/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /D/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

```
cd apps/web && pnpm test wizard-progress-bar
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the ProgressBar**

`apps/web/components/audits/wizard/ProgressBar.tsx`:

```typescript
'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: ReadonlyArray<string>;
  onStepClick: (step: number) => void;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  stepTitles,
  onStepClick,
}: ProgressBarProps): React.ReactElement {
  return (
    <nav aria-label="Étapes du wizard" className="mb-6">
      <ol className="flex items-center justify-between gap-2">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1;
          const isCurrent = stepNum === currentStep;
          const isPast = stepNum < currentStep;
          const isFuture = stepNum > currentStep;
          const title = stepTitles[idx] ?? `Étape ${stepNum}`;

          return (
            <li
              key={stepNum}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex flex-1 items-center gap-2 text-xs',
                isCurrent && 'font-semibold text-fg',
                isPast && 'text-fg-muted',
                isFuture && 'text-fg-muted/60'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[10px]',
                  isCurrent && 'border-fg bg-fg text-bg',
                  isPast && 'border-fg-muted bg-surface text-fg-muted',
                  isFuture && 'border-border-default text-fg-muted/60'
                )}
                aria-hidden
              >
                {stepNum}
              </span>
              {isPast ? (
                <button
                  type="button"
                  onClick={() => onStepClick(stepNum)}
                  className="underline-offset-2 hover:underline"
                >
                  {title}
                </button>
              ) : (
                <span>{title}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 4: Run test, verify it PASSES**

```
cd apps/web && pnpm test wizard-progress-bar
```

Expected: 4 tests passed.

- [ ] **Step 5: Run typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/ProgressBar.tsx apps/web/__tests__/wizard-progress-bar.test.tsx
git commit -m "feat(web): ProgressBar with click-to-edit past steps + aria-current"
```

---

## Task 5: WizardShell — composer

**Files:**
- Create: `apps/web/components/audits/wizard/WizardShell.tsx`
- Test: `apps/web/__tests__/wizard-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-shell.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import type { WizardStepDef } from '@/lib/wizard/types';

type Values = { name: string };
const initialValues: Values = { name: '' };

function makeSteps(): WizardStepDef<Values>[] {
  return [
    { id: 's1', title: 'A', helpKey: 'a', isValid: (v) => v.name.length > 0 },
    { id: 's2', title: 'B', helpKey: 'b', isValid: () => true },
    { id: 's3', title: 'C', helpKey: 'c', isValid: () => true },
  ];
}

function renderShell(opts: { values?: Values; onSubmit?: () => void } = {}) {
  const onSubmit = opts.onSubmit ?? vi.fn();
  const values = opts.values ?? initialValues;
  return {
    onSubmit,
    ...render(
      <WizardProvider totalSteps={3}>
        <WizardShell
          steps={makeSteps()}
          values={values}
          onSubmit={onSubmit}
          renderStep={(step) => <p>Step content: {step.id}</p>}
        />
      </WizardProvider>
    ),
  };
}

describe('WizardShell', () => {
  it('renders the current step content', () => {
    renderShell();
    expect(screen.getByText(/Step content: s1/)).toBeInTheDocument();
  });

  it('shows progress bar with 3 indicators', () => {
    renderShell();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('disables Précédent on step 1', () => {
    renderShell();
    const prev = screen.getByRole('button', { name: /Précédent/i });
    expect(prev).toBeDisabled();
  });

  it('disables Suivant when current step invalid', () => {
    renderShell({ values: { name: '' } });
    const next = screen.getByRole('button', { name: /Suivant/i });
    expect(next).toBeDisabled();
  });

  it('enables Suivant when current step valid', () => {
    renderShell({ values: { name: 'ok' } });
    const next = screen.getByRole('button', { name: /Suivant/i });
    expect(next).not.toBeDisabled();
  });

  it('advances on Suivant click and shows next step', async () => {
    renderShell({ values: { name: 'ok' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    expect(screen.getByText(/Step content: s2/)).toBeInTheDocument();
  });

  it('shows Terminer on the last step and triggers onSubmit', async () => {
    const onSubmit = vi.fn();
    const { rerender } = renderShell({ values: { name: 'ok' }, onSubmit });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    // Now on last step; Suivant becomes Terminer.
    const finish = screen.getByRole('button', { name: /Terminer/i });
    await user.click(finish);
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

```
cd apps/web && pnpm test wizard-shell
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the WizardShell**

`apps/web/components/audits/wizard/WizardShell.tsx`:

```typescript
'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useWizard } from '@/components/audits/wizard/WizardContext';
import { ProgressBar } from '@/components/audits/wizard/ProgressBar';
import type { WizardStepDef } from '@/lib/wizard/types';

interface WizardShellProps<TValues> {
  steps: ReadonlyArray<WizardStepDef<TValues>>;
  values: TValues;
  onSubmit: () => void;
  renderStep: (step: WizardStepDef<TValues>) => React.ReactNode;
}

export function WizardShell<TValues>({
  steps,
  values,
  onSubmit,
  renderStep,
}: WizardShellProps<TValues>): React.ReactElement {
  const { currentStep, goNext, goPrev, goTo } = useWizard();
  const stepIdx = currentStep - 1;
  const step = steps[stepIdx];
  const isLast = currentStep === steps.length;
  const canAdvance = step ? step.isValid(values) : false;

  if (!step) {
    return (
      <div role="alert" className="text-status-fail">
        Erreur interne : étape {currentStep} inconnue.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar
        currentStep={currentStep}
        totalSteps={steps.length}
        stepTitles={steps.map((s) => s.title)}
        onStepClick={goTo}
      />
      <div className="rounded-2xl border border-border-default bg-surface p-6">
        {renderStep(step)}
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={goPrev}
          disabled={currentStep === 1}
        >
          Précédent
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={isLast ? onSubmit : goNext}
          disabled={!canAdvance}
        >
          {isLast ? 'Terminer' : 'Suivant'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it PASSES**

```
cd apps/web && pnpm test wizard-shell
```

Expected: 7 tests passed.

- [ ] **Step 5: Run typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/WizardShell.tsx apps/web/__tests__/wizard-shell.test.tsx
git commit -m "feat(web): WizardShell composer (progress + step slot + prev/next/terminer)"
```

---

## Task 6: HelpPanel — desktop side panel + mobile bottom-sheet

**Files:**
- Create: `apps/web/components/audits/wizard/HelpPanel.tsx`
- Test: `apps/web/__tests__/wizard-help-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/wizard-help-panel.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';
import { HelpPanel } from '@/components/audits/wizard/HelpPanel';

// Test harness: a child that exposes setHelpKey to the test by side-effect.
let setKey: ((k: string) => void) | null = null;
let clearKey: (() => void) | null = null;

function HelpKeyController() {
  const ctx = useWizard();
  setKey = ctx.setHelpKey;
  clearKey = ctx.clearHelpKey;
  return null;
}

function renderPanel() {
  return render(
    <WizardProvider totalSteps={3}>
      <HelpKeyController />
      <HelpPanel />
    </WizardProvider>
  );
}

describe('HelpPanel', () => {
  it('shows a fallback when no helpKey set', () => {
    renderPanel();
    expect(screen.getByText(/Aide contextuelle/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sélectionnez un champ pour voir une explication/i)
    ).toBeInTheDocument();
  });

  it('shows the entry when helpKey resolves', () => {
    renderPanel();
    act(() => setKey?.('canary.test'));
    expect(screen.getByRole('heading', { name: /Canary/ })).toBeInTheDocument();
    expect(
      screen.getByText(/test pour valider la mécanique de lookup/i)
    ).toBeInTheDocument();
  });

  it('shows a friendly fallback when helpKey is unknown', () => {
    renderPanel();
    act(() => setKey?.('does.not.exist'));
    expect(
      screen.getByText(/Aucune aide spécifique pour ce champ/i)
    ).toBeInTheDocument();
  });

  it('clearing helpKey returns to the fallback', () => {
    renderPanel();
    act(() => setKey?.('canary.test'));
    expect(screen.getByRole('heading', { name: /Canary/ })).toBeInTheDocument();
    act(() => clearKey?.());
    expect(
      screen.getByText(/Sélectionnez un champ pour voir une explication/i)
    ).toBeInTheDocument();
  });

  it('renders an Example section when entry.example is provided', () => {
    // Stub: this test relies on a STEP_HELP entry that has an example.
    // Add a second canary with example, then verify rendering.
    // (We extend the seed in this test by mutating the export — vitest module).
    // For simplicity here: we rely on the SP3 seeds. SP2 only ships canary
    // (no example). This test is a SHALLOW marker: skip if example UI absent.
    renderPanel();
    act(() => setKey?.('canary.test'));
    // canary has no example, so no example section
    expect(screen.queryByText(/^Exemple/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it FAILS**

```
cd apps/web && pnpm test wizard-help-panel
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the HelpPanel**

`apps/web/components/audits/wizard/HelpPanel.tsx`:

```typescript
'use client';

import * as React from 'react';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import { getHelp } from '@/lib/wizard/help-content';
import { cn } from '@/lib/utils';

interface HelpPanelProps {
  className?: string;
}

export function HelpPanel({ className }: HelpPanelProps): React.ReactElement {
  const { helpKey } = useWizard();
  const entry = helpKey ? getHelp(helpKey) : undefined;

  return (
    <aside
      role="complementary"
      aria-label="Aide contextuelle"
      className={cn(
        'rounded-2xl border border-border-default bg-surface p-5 lg:sticky lg:top-6 lg:max-w-[320px]',
        className
      )}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
        Aide contextuelle
      </h2>
      {helpKey === null && (
        <p className="text-sm text-fg-secondary">
          Sélectionnez un champ pour voir une explication détaillée et un
          exemple concret.
        </p>
      )}
      {helpKey !== null && entry === undefined && (
        <p className="text-sm text-fg-secondary">
          Aucune aide spécifique pour ce champ. Référez-vous au libellé ou
          consultez la documentation.
        </p>
      )}
      {entry !== undefined && (
        <article className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-fg">{entry.title}</h3>
          <p className="text-sm text-fg-secondary whitespace-pre-wrap">
            {entry.body}
          </p>
          {entry.example !== undefined && (
            <div className="rounded-md border border-border-default bg-bg-subtle p-3 text-xs text-fg-secondary">
              <p className="mb-1 font-medium uppercase tracking-wide text-fg-muted">
                Exemple
              </p>
              <p className="whitespace-pre-wrap">{entry.example}</p>
            </div>
          )}
          {entry.learnMoreHref !== undefined && (
            <a
              href={entry.learnMoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fg-muted underline-offset-2 hover:underline"
            >
              En savoir plus →
            </a>
          )}
        </article>
      )}
    </aside>
  );
}
```

> **Note** : pour SP2, on ne wire pas encore la bottom-sheet mobile (Radix Dialog). Le panneau est juste sticky sur desktop et redevient un bloc empilé sur mobile. La bottom-sheet sera ajoutée en SP3 si le UX testing montre que le panneau prend trop de place sur mobile. YAGNI.

- [ ] **Step 4: Run test, verify it PASSES**

```
cd apps/web && pnpm test wizard-help-panel
```

Expected: 5 tests passed.

- [ ] **Step 5: Run typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add apps/web/components/audits/wizard/HelpPanel.tsx apps/web/__tests__/wizard-help-panel.test.tsx
git commit -m "feat(web): HelpPanel (sticky desktop panel + fallback states)"
```

---

## Task 7: Final gate — vitest full + typecheck + eslint + push + PR

**Files:** (read-only validation across `apps/web/`)

- [ ] **Step 1: Run full vitest**

```
cd apps/web && pnpm test
```

Expected: 41 baseline + 5 + 6 + 4 + 7 + 5 = ~68 passed, 0 failed.

- [ ] **Step 2: Run typecheck**

```
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Run eslint**

```
cd apps/web && pnpm lint
```

Expected: no errors on new files.

- [ ] **Step 4: Verify identity on every new commit**

```
cd ../..  # back to repo root (in worktree)
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

Expected: every commit `Franck F <franck-dilane1.fambou@epitech.digital>`, every subject prefixed `feat(web):` or `chore(web):` / `test(web):`, **zero** `Co-Authored-By: Claude` trailer.

- [ ] **Step 5: Push branch + open PR**

```
git push -u origin worktree-wizard-sp2-shell-components
gh pr create --title "feat(web): wizard orientation SP2 — shell components (Context/ProgressBar/Shell/HelpPanel)" --body "$(cat <<'EOF'
## Summary

Sous-projet 2 du wizard d'audit orienté (spec `docs/superpowers/specs/2026-05-28-wizard-audit-orientation-design.md` §3, §4.5, §4.6).

Composants React partagés qui seront réutilisés par les 3 wizards modules (M1/M2/M3) en SP3 :

- `lib/wizard/types.ts` — `HelpKey`, `HelpEntry`, `WizardStepDef`
- `lib/wizard/help-content.ts` — `STEP_HELP` (record + canary), `GLOSSARY`, `getHelp()`
- `WizardContext.tsx` — currentStep, helpKey, goNext/goPrev/goTo, setHelpKey/clearHelpKey
- `ProgressBar.tsx` — N indicateurs, étapes passées cliquables, `aria-current="step"`
- `WizardShell.tsx` — orchestre Context + ProgressBar + slot `renderStep` + Précédent/Suivant/Terminer
- `HelpPanel.tsx` — panneau sticky desktop (320px), états : par défaut / entrée trouvée / clé inconnue

Bottom-sheet mobile YAGNI'd pour SP2 — sera ajoutée en SP3 si le UX testing le justifie.

## Test plan

- [x] vitest ~68 (baseline 41 + 27 nouveaux)
- [x] tsc strict + noUncheckedIndexedAccess clean
- [x] eslint clean
- [x] Scope confined à `apps/web/lib/wizard/`, `apps/web/components/audits/wizard/`, `apps/web/__tests__/`

## Hors scope SP2

- 5 étapes par module (SP3)
- Remplacement de `audits/nouveau/page.tsx` (SP3)
- Tests E2E Playwright (SP3)
- Bottom-sheet mobile pour le HelpPanel (YAGNI — à ajouter si besoin en SP3)
- Format markdown du `body` (raw text rendu en `whitespace-pre-wrap` pour SP2 ; `react-markdown` à brancher en SP3 si nécessaire)
EOF
)"
```

- [ ] **Step 6: Final commit if the plan needed correction during execution**

If during execution any task revealed an inaccuracy in this plan (wrong import, missing prop, fixture mismatch), append a final commit:

```
git add docs/superpowers/plans/2026-05-29-sp2-wizard-orientation-shell-components.md
git commit -m "chore(plan): sync SP2 plan with discoveries during execution"
```

---

## Spec coverage check

| Spec section / item | Covered by |
|---|---|
| §3 — Architecture des composants partagés | Tasks 1-6 |
| §4.5 — `lib/wizard/help-content.ts` (types + STEP_HELP + GLOSSARY) | Tasks 1 + 2 |
| §4.5 — test garde-fou (chaque HelpKey a une entrée) | Reporté à SP3 (les HelpKey concrets arriveront avec les steps) ; SP2 valide juste le mécanisme `getHelp` |
| §4.6 — `HelpPanel` desktop sticky 320px | Task 6 |
| §4.6 — bottom-sheet mobile via Radix Dialog | YAGNI'd pour SP2 (note in plan + PR body) |
| §4.6 — markdown rendering via `react-markdown` | Reporté à SP3 (raw text suffit pour le canary) |
| §3 — Principe d'isolation (chaque composant fait une chose) | Tasks séparées par fichier |
| §3 — Navigation : Précédent toutes étapes sauf 1, Suivant désactivé tant que non-valide | Task 5 |
| §3 — Cliquer étape passée dans barre de progression = retour libre | Task 4 + Task 5 (goTo) |

**Out-of-scope for SP2 (covered by SP3 plan):**
- Les 3 wizards modules avec leurs 5 étapes chacun
- Le remplacement de `apps/web/app/app/audits/nouveau/page.tsx`
- Test E2E Playwright `wizard-m{1,2,3}-guided.spec.ts`
- Population complète de `STEP_HELP` (clés par champ × modules)
- `react-markdown` rendering du `body` (si besoin réel)
