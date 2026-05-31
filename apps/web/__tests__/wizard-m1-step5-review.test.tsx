import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Step5Review } from '@/components/audits/wizard/m1/Step5Review';
import type { DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 1234,
  columns: ['sex', 'age', 'approved'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

describe('Step5Review', () => {
  it('renders the recap card with dataset + decision + protected attribute', () => {
    render(
      <Step5Review
        dataset={dataset}
        values={{
          title: 'Audit recrutement Q1',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
          privileged_value: '',
          ground_truth_column: '',
          secondary_protected_attribute: '',
        }}
      />,
    );
    expect(screen.getByText(/Audit recrutement Q1/)).toBeInTheDocument();
    expect(screen.getByText(/credit.csv/)).toBeInTheDocument();
    expect(screen.getAllByText(/approved/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sex/).length).toBeGreaterThan(0);
  });

  it('lists Equal Opportunity in analyses when ground_truth_column set', () => {
    render(
      <Step5Review
        dataset={dataset}
        values={{
          title: 'X',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
          privileged_value: '',
          ground_truth_column: 'true_label',
          secondary_protected_attribute: '',
        }}
      />,
    );
    expect(screen.getByText(/Equal Opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/Equalized Odds/i)).toBeInTheDocument();
  });

  it('lists intersectional analysis when secondary attribute set', () => {
    render(
      <Step5Review
        dataset={dataset}
        values={{
          title: 'X',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
          privileged_value: '',
          ground_truth_column: '',
          secondary_protected_attribute: 'age_group',
        }}
      />,
    );
    expect(
      screen.getByText(/Analyse intersectionnelle/i),
    ).toBeInTheDocument();
  });
});
