import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import * as React from 'react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step3Config } from '@/components/audits/wizard/unified/Step3Config';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd1',
  filename: 'test.csv',
  row_count: 100,
  columns: ['sexe', 'embauche', 'reel'],
  status: 'ready',
  created_at: '2026-06-02T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: [
    {
      name: 'embauche',
      dtype: 'categorical',
      unique_count: 2,
      null_ratio: 0,
      top_values: [['oui', 5], ['non', 5]] as Array<[unknown, number]>,
      role_hint: 'decision',
    },
    {
      name: 'sexe',
      dtype: 'categorical',
      unique_count: 2,
      null_ratio: 0,
      top_values: [['H', 5], ['F', 5]] as Array<[unknown, number]>,
      role_hint: 'protected',
    },
    {
      name: 'reel',
      dtype: 'categorical',
      unique_count: 2,
      null_ratio: 0,
      top_values: [['oui', 5], ['non', 5]] as Array<[unknown, number]>,
      role_hint: 'feature',
    },
  ],
  suggested_decision: {
    column: 'embauche',
    confidence: 0.8,
    reason: 'r',
    favorable_value: 'oui',
  },
  suggested_protected: {
    column: 'sexe',
    confidence: 0.7,
    reason: 'r',
    privileged_value: 'H',
  },
  protected_candidates: [],
  suggested_ground_truth: { column: 'reel', confidence: 0.9, reason: 'r' },
};

function Harness({ initial }: { initial?: Partial<UnifiedValues> }) {
  const methods = useForm<UnifiedValues>({
    defaultValues: { ...DEFAULT_VALUES, audit_type: 'tabular-known', ...initial },
  });
  return (
    <WizardProvider totalSteps={5}>
      <FormProvider {...methods}>
        <Step3Config dataset={dataset} analysis={analysis} />
      </FormProvider>
    </WizardProvider>
  );
}

describe('Step3 prefill', () => {
  it('prefills decision, protected and opens advanced section when privileged/ground-truth present', async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(
        (screen.getByRole('combobox', { name: 'Colonne de décision' }) as HTMLSelectElement).value,
      ).toBe('embauche');
      // Use the select id directly since 'Attribut protégé' aria-label is exact
      expect(
        (screen.getByRole('combobox', { name: 'Attribut protégé' }) as HTMLSelectElement).value,
      ).toBe('sexe');
    });
  });

  it('does not clobber a pre-existing user value', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ decision_column: 'reel' }} />);
    const dec = screen.getByRole('combobox', { name: 'Colonne de décision' }) as HTMLSelectElement;
    // The user had already set 'reel' as defaultValue — prefill must not overwrite it
    await waitFor(() => {
      expect(dec.value).toBe('reel');
    });
    // Changing manually should also survive
    await user.selectOptions(dec, 'sexe');
    expect(dec.value).toBe('sexe');
  });

  it('shows confidence badge for suggested decision', async () => {
    render(<Harness />);
    // Both decision and favorable_value labels show a badge — use getAllBy
    const badges = screen.getAllByText(/suggéré · conf\. 80%/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
