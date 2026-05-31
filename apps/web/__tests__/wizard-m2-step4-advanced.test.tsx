import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step4Advanced } from '@/components/audits/wizard/m2/Step4Advanced';

type Values = { k: string; deviation_pp: string; chi2_alpha: string };

function Harness() {
  const form = useForm<Values>({ defaultValues: { k: '', deviation_pp: '', chi2_alpha: '' } });
  return <FormProvider {...form}><Step4Advanced /></FormProvider>;
}

describe('M2 Step4Advanced', () => {
  it('shows defaults message by default (collapsed)', () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    expect(screen.getByText(/Valeurs par défaut/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombre de clusters/i)).toBeNull();
  });

  it('expands to show k, deviation_pp, chi2_alpha inputs', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));
    expect(screen.getByLabelText(/Nombre de clusters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seuil de déviation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seuil χ²/i)).toBeInTheDocument();
  });

  it('toggles back to collapsed', async () => {
    render(<WizardProvider totalSteps={5}><Harness /></WizardProvider>);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /Personnaliser/i });
    await user.click(btn);
    await user.click(btn);
    expect(screen.queryByLabelText(/Nombre de clusters/i)).toBeNull();
  });
});
