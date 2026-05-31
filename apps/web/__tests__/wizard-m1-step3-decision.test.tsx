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
    top_values:
      c === 'approved'
        ? ([['1', 80], ['0', 120]] as Array<[unknown, number]>)
        : ([] as Array<[unknown, number]>),
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
    const optionValues = Array.from(fav.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(optionValues).toContain('1');
    expect(optionValues).toContain('0');
  });
});
