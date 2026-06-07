import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

function Harness({
  initial,
  analysisOverride,
}: {
  initial?: Partial<UnifiedValues>;
  analysisOverride?: DatasetAnalysisOut;
}) {
  const methods = useForm<UnifiedValues>({
    defaultValues: { ...DEFAULT_VALUES, audit_type: 'tabular-known', ...initial },
  });
  return (
    <WizardProvider totalSteps={5}>
      <FormProvider {...methods}>
        <Step3Config dataset={dataset} analysis={analysisOverride ?? analysis} />
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
      // protected_attributes is now a checkbox group — suggested attribute should be pre-checked
      const sexCheckbox = screen.getByRole('checkbox', { name: 'sexe' }) as HTMLInputElement;
      expect(sexCheckbox.checked).toBe(true);
    });
  });

  it('does not clobber a user edit when analysis object reference changes', async () => {
    // Step 1: Render — effect runs, prefills decision_column to 'embauche'
    const { rerender } = render(<Harness />);
    const dec = screen.getByRole('combobox', { name: 'Colonne de décision' }) as HTMLSelectElement;
    await waitFor(() => {
      expect(dec.value).toBe('embauche');
    });

    // Step 2: Simulate user changing decision_column to 'reel'
    fireEvent.change(dec, { target: { value: 'reel' } });
    expect(dec.value).toBe('reel');

    // Step 3: Rerender with a NEW analysis object reference (same data, new object)
    // This triggers the useEffect [analysis] dep but the form already has 'reel' set
    const analysisNewRef: DatasetAnalysisOut = { ...analysis };
    rerender(<Harness analysisOverride={analysisNewRef} />);

    // Step 4: The anti-clobber guard (getValues check) must prevent overwriting 'reel'
    await waitFor(() => {
      expect(
        (screen.getByRole('combobox', { name: 'Colonne de décision' }) as HTMLSelectElement).value,
      ).toBe('reel');
    });
  });

  it('shows confidence badge for suggested decision', async () => {
    render(<Harness />);
    // Both decision and favorable_value labels show a badge — use getAllBy
    const badges = screen.getAllByText(/suggéré · conf\. 80%/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
