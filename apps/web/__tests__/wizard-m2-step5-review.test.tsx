import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Step5Review } from '@/components/audits/wizard/m2/Step5Review';
import type { DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1', filename: 'credit.csv', row_count: 1234,
  columns: ['montant', 'decision'], status: 'ready',
  created_at: '2026-05-30T10:00:00Z', expires_at: null,
};

describe('M2 Step5Review', () => {
  it('renders recap with defaults when advanced empty', () => {
    render(<Step5Review dataset={dataset} values={{ title: 'Détection X', decision_column: 'decision', favorable_value: '1', k: '', deviation_pp: '', chi2_alpha: '' }} />);
    expect(screen.getByText(/Détection X/)).toBeInTheDocument();
    expect(screen.getByText(/credit.csv/)).toBeInTheDocument();
    expect(screen.getByText(/k = 5/)).toBeInTheDocument();
    expect(screen.getByText(/déviation = 20 pp/)).toBeInTheDocument();
    expect(screen.getByText(/alpha = 0.05/)).toBeInTheDocument();
  });

  it('uses custom advanced values when provided', () => {
    render(<Step5Review dataset={dataset} values={{ title: 'X', decision_column: 'decision', favorable_value: '1', k: '8', deviation_pp: '15', chi2_alpha: '0.01' }} />);
    expect(screen.getByText(/k = 8/)).toBeInTheDocument();
    expect(screen.getByText(/déviation = 15 pp/)).toBeInTheDocument();
    expect(screen.getByText(/alpha = 0.01/)).toBeInTheDocument();
  });

  it('lists KMeans + chi² + IQR pre-check in analyses', () => {
    render(<Step5Review dataset={dataset} values={{ title: 'X', decision_column: 'decision', favorable_value: '1', k: '', deviation_pp: '', chi2_alpha: '' }} />);
    expect(screen.getByText(/Analyses qui seront produites/i)).toBeInTheDocument();
    expect(screen.getByText(/KMeans \(k=/i)).toBeInTheDocument();
    expect(screen.getByText(/χ² par cluster/i)).toBeInTheDocument();
    expect(screen.getByText(/IQR/i)).toBeInTheDocument();
  });
});
