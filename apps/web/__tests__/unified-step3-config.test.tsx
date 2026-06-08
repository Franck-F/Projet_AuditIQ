import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import * as React from 'react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step3Config } from '@/components/audits/wizard/unified/Step3Config';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

function Harness({
  initial,
  ...props
}: { initial?: Partial<UnifiedValues> } & React.ComponentProps<typeof Step3Config>) {
  const form = useForm<UnifiedValues>({
    defaultValues: { ...DEFAULT_VALUES, ...initial },
  });
  return (
    <FormProvider {...form}>
      <Step3Config {...props} />
    </FormProvider>
  );
}

const cols = ['sex', 'age', 'approved'];

const dataset: DatasetOut = {
  id: 'd1',
  filename: 'test.csv',
  row_count: 100,
  columns: cols,
  status: 'ready',
  created_at: '2026-06-02T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: cols.map((c) => ({
    name: c,
    dtype: 'categorical',
    unique_count: c === 'approved' ? 2 : 5,
    null_ratio: 0,
    top_values:
      c === 'approved'
        ? ([['1', 80], ['0', 20]] as Array<[unknown, number]>)
        : ([] as Array<[unknown, number]>),
    role_hint: c === 'approved' ? 'decision' : 'feature',
  })),
  suggested_decision: {
    column: 'approved',
    confidence: 0.92,
    reason: 'Nom évocateur',
    favorable_value: '1',
  },
  suggested_protected: {
    column: 'sex',
    confidence: 0.85,
    reason: 'Colonne sensible',
    favorable_value: null,
  },
};

describe('Unified Step3Config', () => {
  describe('tabular-known (M1)', () => {
    it('shows decision_column dropdown, favorable_value dropdown, and protected_attributes checkbox group', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'tabular-known' }}
            dataset={dataset}
            analysis={analysis}
          />
        </WizardProvider>,
      );
      expect(
        screen.getByRole('combobox', { name: /Colonne de décision/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: /Valeur favorable/i }),
      ).toBeInTheDocument();
      // protected_attributes is now a checkbox group
      expect(
        screen.getByRole('group', { name: /Attributs protégés/i }),
      ).toBeInTheDocument();
    });

    it('shows "Suggéré" badge on suggested decision column option', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'tabular-known' }}
            dataset={dataset}
            analysis={analysis}
          />
        </WizardProvider>,
      );
      // The suggested option renders with "— Suggéré" text
      const decisionSelect = screen.getByRole('combobox', { name: /Colonne de décision/i });
      const options = Array.from(decisionSelect.querySelectorAll('option')).map(
        (o) => (o as HTMLOptionElement).textContent,
      );
      expect(options.some((t) => t?.includes('Suggéré'))).toBe(true);
    });

    it('shows collapsible advanced options section (closed by default)', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'tabular-known' }}
            dataset={dataset}
            analysis={analysis}
          />
        </WizardProvider>,
      );
      expect(screen.getByText(/Options avancées/i)).toBeInTheDocument();
      // Advanced fields should not be visible initially
      expect(
        screen.queryByRole('combobox', { name: /Vérité-terrain/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('tabular-unknown (M2)', () => {
    it('shows decision_column and favorable_value but NOT protected_attributes group', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'tabular-unknown' }}
            dataset={dataset}
            analysis={analysis}
          />
        </WizardProvider>,
      );
      expect(
        screen.getByRole('combobox', { name: /Colonne de décision/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: /Valeur favorable/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: /Attributs protégés/i }),
      ).not.toBeInTheDocument();
    });

    it('shows M2 info card about automatic cluster detection', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'tabular-unknown' }}
            dataset={dataset}
            analysis={analysis}
          />
        </WizardProvider>,
      );
      expect(screen.getByText(/détecte automatiquement/i)).toBeInTheDocument();
    });
  });

  describe('llm-api (M3)', () => {
    it('shows preset dropdown, body_template textarea, and response_path input', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'llm-api' }}
            dataset={null}
            analysis={null}
          />
        </WizardProvider>,
      );
      expect(
        screen.getByRole('combobox', { name: /Préréglage/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: /Corps de requête/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: /Chemin de la réponse/i }),
      ).toBeInTheDocument();
    });

    it('does NOT show decision_column or protected_attributes group for M3', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'llm-api' }}
            dataset={null}
            analysis={null}
          />
        </WizardProvider>,
      );
      expect(
        screen.queryByRole('combobox', { name: /Colonne de décision/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: /Attributs protégés/i }),
      ).not.toBeInTheDocument();
    });
  });
});
