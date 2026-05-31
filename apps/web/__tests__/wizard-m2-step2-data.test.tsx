import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Data } from '@/components/audits/wizard/m2/Step2Data';
import type { DatasetOut, DatasetAnalysisOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 1234,
  columns: ['montant', 'duree', 'decision'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: dataset.columns.map((c) => ({
    name: c, dtype: 'categorical', unique_count: 2, null_ratio: 0,
    top_values: [], role_hint: c === 'decision' ? 'decision' : 'feature',
  })),
  suggested_decision: { column: 'decision', confidence: 0.85, reason: '', favorable_value: '1' },
  suggested_protected: null,
};

function wrap(children: React.ReactNode) {
  return <WizardProvider totalSteps={5}>{children}</WizardProvider>;
}

describe('M2 Step2Data', () => {
  it('shows the upload card when no dataset', () => {
    render(wrap(<Step2Data dataset={null} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText(/Importez votre jeu de données/i)).toBeInTheDocument();
  });

  it('shows file summary when dataset selected', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText('credit.csv')).toBeInTheDocument();
    expect(screen.getByText(/1\D?234\s+lignes/)).toBeInTheDocument();
  });

  it('shows skeleton while analysis is loading', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={null} analysisError={null} onUpload={vi.fn()} busy={true} />));
    expect(screen.getByText(/Analyse en cours/i)).toBeInTheDocument();
  });

  it('shows analysis suggestion when present', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={analysis} analysisError={null} onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText(/Analyse automatique/i)).toBeInTheDocument();
    expect(screen.getByText(/decision/)).toBeInTheDocument();
  });

  it('shows non-blocking warning on analysis failure', () => {
    render(wrap(<Step2Data dataset={dataset} analysis={null} analysisError="indisponible" onUpload={vi.fn()} busy={false} />));
    expect(screen.getByText(/Analyse indisponible/i)).toBeInTheDocument();
  });
});
