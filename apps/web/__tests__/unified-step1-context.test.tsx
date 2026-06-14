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
    expect(screen.getByText(/outil qui prend des décisions, avec une caractéristique sensible à tester/i)).toBeInTheDocument();
    expect(screen.getByText(/outil qui prend des décisions, sans savoir où le biais se cache/i)).toBeInTheDocument();
    expect(screen.getByText(/assistant conversationnel \/ chatbot/i)).toBeInTheDocument();
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
    const card = screen.getByRole('button', { name: /outil qui prend des décisions, avec une caractéristique sensible à tester/i });
    await user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });
});
