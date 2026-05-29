import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProgressBar } from '@/components/audits/wizard/ProgressBar';

describe('ProgressBar', () => {
  it('renders N step indicators', () => {
    render(
      <ProgressBar
        currentStep={1}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={() => {}}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(5);
  });

  it('marks the current step as aria-current="step"', () => {
    render(
      <ProgressBar
        currentStep={3}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={() => {}}
      />
    );
    const current = screen.getByText('C').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('allows clicking on a past step', async () => {
    const onClick = vi.fn();
    render(
      <ProgressBar
        currentStep={3}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={onClick}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /B/ }));
    expect(onClick).toHaveBeenCalledWith(2);
  });

  it('disables future steps (no button rendered)', () => {
    render(
      <ProgressBar
        currentStep={2}
        totalSteps={5}
        stepTitles={['A', 'B', 'C', 'D', 'E']}
        onStepClick={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: /C/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /D/ })).toBeNull();
  });
});
