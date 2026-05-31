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
