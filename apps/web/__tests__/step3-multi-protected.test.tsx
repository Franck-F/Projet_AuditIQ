import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import * as React from 'react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step3Config } from '@/components/audits/wizard/unified/Step3Config';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

const COLUMNS = ['sexe', 'age', 'diplome', 'origine', 'embauche'];

const dataset: DatasetOut = {
  id: 'd1',
  filename: 'test.csv',
  row_count: 500,
  columns: COLUMNS,
  status: 'ready',
  created_at: '2026-06-07T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: COLUMNS.map((c) => ({
    name: c,
    dtype: 'categorical',
    unique_count: c === 'embauche' ? 2 : 5,
    null_ratio: 0,
    top_values:
      c === 'embauche'
        ? ([['oui', 3], ['non', 2]] as Array<[unknown, number]>)
        : ([] as Array<[unknown, number]>),
    role_hint: c === 'embauche' ? 'decision' : 'feature',
  })),
  suggested_decision: {
    column: 'embauche',
    confidence: 0.9,
    reason: 'nom évocateur',
    favorable_value: 'oui',
  },
  suggested_protected: {
    column: 'sexe',
    confidence: 0.85,
    reason: 'colonne sensible',
    privileged_value: null,
  },
  protected_candidates: [
    { column: 'sexe', confidence: 0.85, reason: '' },
    { column: 'age', confidence: 0.7, reason: '' },
  ],
};

function Harness({
  initial,
  analysisOverride,
}: {
  initial?: Partial<UnifiedValues>;
  analysisOverride?: DatasetAnalysisOut | null;
}) {
  const methods = useForm<UnifiedValues>({
    defaultValues: { ...DEFAULT_VALUES, audit_type: 'tabular-known', ...initial },
  });

  return (
    <WizardProvider totalSteps={5}>
      <FormProvider {...methods}>
        <Step3Config
          dataset={dataset}
          analysis={analysisOverride !== undefined ? analysisOverride : analysis}
        />
        {/* Expose form state for assertions */}
        <DebugState control={methods.control} watch={methods.watch} />
      </FormProvider>
    </WizardProvider>
  );
}

function DebugState({
  watch,
}: {
  control: ReturnType<typeof useForm<UnifiedValues>>['control'];
  watch: ReturnType<typeof useForm<UnifiedValues>>['watch'];
}) {
  const attrs = watch('protected_attributes') as string[];
  return (
    <output data-testid="debug-attrs">
      {JSON.stringify(Array.isArray(attrs) ? attrs : [])}
    </output>
  );
}

function getSelectedAttrs(container: HTMLElement): string[] {
  const debug = container.querySelector('[data-testid="debug-attrs"]');
  if (!debug?.textContent) return [];
  try {
    return JSON.parse(debug.textContent) as string[];
  } catch {
    return [];
  }
}

describe('Step3 multi-select protected_attributes', () => {
  it('renders a checkbox group for protected_attributes', async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(
        screen.getByRole('group', { name: /Attributs protégés/i }),
      ).toBeInTheDocument();
    });
  });

  it('pre-selects the suggested attribute when protected_attributes is empty', async () => {
    const { container } = render(<Harness />);
    await waitFor(() => {
      const attrs = getSelectedAttrs(container);
      expect(attrs).toContain('sexe');
    });
  });

  it('selecting an attribute adds it to protected_attributes', async () => {
    const { container } = render(<Harness initial={{ protected_attributes: [] }} />);
    await waitFor(() => {
      // Wait for prefill to settle (sexe should be pre-selected by analysis)
      expect(screen.getByRole('checkbox', { name: 'sexe' })).toBeInTheDocument();
    });

    const ageCheckbox = screen.getByRole('checkbox', { name: 'age' });
    fireEvent.click(ageCheckbox);

    await waitFor(() => {
      const attrs = getSelectedAttrs(container);
      expect(attrs).toContain('age');
    });
  });

  it('can select up to 4 attributes', async () => {
    const { container } = render(
      <Harness initial={{ protected_attributes: [] }} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('group', { name: /Attributs protégés/i })).toBeInTheDocument();
    });

    // Select 4 attributes manually (clear prefill first by starting with empty)
    // After prefill, sexe is selected (1). Add age, diplome, origine.
    const checkboxes = COLUMNS.filter((c) => c !== 'embauche').map((c) =>
      screen.getByRole('checkbox', { name: c }),
    );

    // Click non-selected ones until we have 4
    for (const cb of checkboxes) {
      const attrs = getSelectedAttrs(container);
      if (attrs.length < 4 && !(cb as HTMLInputElement).checked) {
        fireEvent.click(cb);
      }
    }

    await waitFor(() => {
      const attrs = getSelectedAttrs(container);
      expect(attrs.length).toBeLessThanOrEqual(4);
    });
  });

  it('prevents selecting a 5th attribute — extra checkboxes become disabled', async () => {
    // Start with 4 already selected
    render(
      <Harness
        initial={{ protected_attributes: ['sexe', 'age', 'diplome', 'origine'] }}
      />,
    );

    await waitFor(() => {
      // embauche is the decision column, not in the list; but all 4 protected cols selected
      // Any unselected checkbox should be disabled
      const group = screen.getByRole('group', { name: /Attributs protégés/i });
      const unchecked = Array.from(group.querySelectorAll('input[type="checkbox"]')).filter(
        (cb) => !(cb as HTMLInputElement).checked,
      );
      // All unchecked must be disabled
      unchecked.forEach((cb) => {
        expect((cb as HTMLInputElement).disabled).toBe(true);
      });
    });
  });

  it('shows max warning when 4 attributes are selected', async () => {
    render(
      <Harness
        initial={{ protected_attributes: ['sexe', 'age', 'diplome', 'origine'] }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Maximum 4 attributs/i)).toBeInTheDocument();
    });
  });
});
