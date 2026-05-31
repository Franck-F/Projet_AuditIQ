import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';
import { Step1Context } from '@/components/audits/wizard/m1/Step1Context';

type Values = { title: string };

function Harness() {
  const form = useForm<Values>({ defaultValues: { title: '' } });
  return (
    <FormProvider {...form}>
      <Step1Context />
    </FormProvider>
  );
}

function HelpKeyProbe() {
  const { helpKey } = useWizard();
  return <span data-testid="hk">{helpKey ?? 'null'}</span>;
}

describe('Step1Context', () => {
  it('renders a title input with placeholder', () => {
    render(
      <WizardProvider totalSteps={5}>
        <Harness />
      </WizardProvider>,
    );
    expect(screen.getByRole('textbox', { name: /titre/i })).toBeInTheDocument();
  });

  it('focusing the input sets helpKey to m1.step1.title', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>,
    );
    const input = screen.getByRole('textbox', { name: /titre/i });
    const user = userEvent.setup();
    await user.click(input);
    expect(screen.getByTestId('hk').textContent).toBe('m1.step1.title');
  });

  it('blurring the input clears helpKey to null', async () => {
    render(
      <WizardProvider totalSteps={5}>
        <HelpKeyProbe />
        <Harness />
      </WizardProvider>,
    );
    const input = screen.getByRole('textbox', { name: /titre/i });
    const user = userEvent.setup();
    await user.click(input);
    await user.tab();
    expect(screen.getByTestId('hk').textContent).toBe('null');
  });
});
