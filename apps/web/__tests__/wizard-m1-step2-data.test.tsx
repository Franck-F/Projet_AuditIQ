import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Data } from '@/components/audits/wizard/m1/Step2Data';
import type { DatasetOut, DatasetAnalysisOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 1234,
  columns: ['sex', 'age', 'approved'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: dataset.columns.map((c) => ({
    name: c,
    dtype: 'categorical',
    unique_count: 2,
    null_ratio: 0,
    top_values: [],
    role_hint: c === 'sex' ? 'protected' : 'feature',
  })),
  suggested_decision: { column: 'approved', confidence: 0.85, reason: 'Nom évocateur', favorable_value: '1' },
  suggested_protected: { column: 'sex', confidence: 0.9, reason: 'Nom évocateur', favorable_value: null },
};

function wrap(children: React.ReactNode) {
  return <WizardProvider totalSteps={5}>{children}</WizardProvider>;
}

describe('Step2Data', () => {
  it('shows the upload card when no dataset is selected', () => {
    render(
      wrap(
        <Step2Data
          dataset={null}
          analysis={null}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText(/Importez votre jeu de données/i)).toBeInTheDocument();
  });

  it('shows file summary when dataset selected', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={null}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText('credit.csv')).toBeInTheDocument();
    expect(screen.getByText(/1\D?234\s+lignes/)).toBeInTheDocument();
  });

  it('shows skeleton while analysis is loading', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={null}
          analysisError={null}
          onUpload={vi.fn()}
          busy={true}
        />,
      ),
    );
    expect(screen.getByText(/Analyse en cours/i)).toBeInTheDocument();
  });

  it('shows analysis suggestions when present', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={analysis}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText(/Analyse automatique/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/)).toBeInTheDocument();
    expect(screen.getByText(/sex/)).toBeInTheDocument();
  });

  it('shows a non-blocking warning when analysis fails', () => {
    render(
      wrap(
        <Step2Data
          dataset={dataset}
          analysis={null}
          analysisError="Le service d'analyse est indisponible"
          onUpload={vi.fn()}
          busy={false}
        />,
      ),
    );
    expect(screen.getByText(/Analyse indisponible/i)).toBeInTheDocument();
    expect(
      screen.getByText(/sélectionnant manuellement/i),
    ).toBeInTheDocument();
  });
});
