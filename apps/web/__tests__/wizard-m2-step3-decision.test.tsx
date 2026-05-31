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
