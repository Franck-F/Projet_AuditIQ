import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import type { WizardStepDef } from '@/lib/wizard/types';

type Values = { name: string };
const initialValues: Values = { name: '' };

function makeSteps(): WizardStepDef<Values>[] {
  return [
    { id: 's1', title: 'A', helpKey: 'a', isValid: (v) => v.name.length > 0 },
    { id: 's2', title: 'B', helpKey: 'b', isValid: () => true },
    { id: 's3', title: 'C', helpKey: 'c', isValid: () => true },
  ];
}

function renderShell(opts: { values?: Values; onSubmit?: () => void } = {}) {
  const onSubmit = opts.onSubmit ?? vi.fn();
  const values = opts.values ?? initialValues;
  return {
    onSubmit,
    ...render(
      <WizardProvider totalSteps={3}>
        <WizardShell
          steps={makeSteps()}
          values={values}
          onSubmit={onSubmit}
          renderStep={(step) => <p>Step content: {step.id}</p>}
        />
      </WizardProvider>
    ),
  };
}

describe('WizardShell', () => {
  it('renders the current step content', () => {
    renderShell();
    expect(screen.getByText(/Step content: s1/)).toBeInTheDocument();
  });

  it('shows progress bar with 3 indicators', () => {
    renderShell();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('disables Précédent on step 1', () => {
    renderShell();
    const prev = screen.getByRole('button', { name: /Précédent/i });
    expect(prev).toBeDisabled();
  });

  it('disables Suivant when current step invalid', () => {
    renderShell({ values: { name: '' } });
    const next = screen.getByRole('button', { name: /Suivant/i });
    expect(next).toBeDisabled();
  });

  it('enables Suivant when current step valid', () => {
    renderShell({ values: { name: 'ok' } });
    const next = screen.getByRole('button', { name: /Suivant/i });
    expect(next).not.toBeDisabled();
  });

  it('advances on Suivant click and shows next step', async () => {
    renderShell({ values: { name: 'ok' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    expect(screen.getByText(/Step content: s2/)).toBeInTheDocument();
  });

  it('shows Terminer on the last step and triggers onSubmit', async () => {
    const onSubmit = vi.fn();
    renderShell({ values: { name: 'ok' }, onSubmit });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    const finish = screen.getByRole('button', { name: /Terminer/i });
    await user.click(finish);
    expect(onSubmit).toHaveBeenCalled();
  });
});
