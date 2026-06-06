import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import * as React from 'react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Source } from '@/components/audits/wizard/unified/Step2Source';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'd',
  filename: 'x.csv',
  row_count: 10,
  columns: ['sexe', 'embauche'],
  status: 'ready',
  created_at: '2026-06-02T10:00:00Z',
  expires_at: null,
};

const analysis: DatasetAnalysisOut = {
  columns: [],
  suggested_decision: {
    column: 'embauche',
    confidence: 0.8,
    reason: 'r',
    favorable_value: 'oui',
  },
  suggested_protected: {
    column: 'sexe',
    confidence: 0.7,
    reason: 'r',
  },
  protected_candidates: [
    { column: 'sexe', confidence: 0.7, reason: 'r' },
    { column: 'age', confidence: 0.4, reason: 'r' },
  ],
  suggested_ground_truth: null,
};

function Harness({ a = analysis }: { a?: DatasetAnalysisOut }) {
  const methods = useForm<UnifiedValues>({
    defaultValues: { ...DEFAULT_VALUES, audit_type: 'tabular-known' },
  });
  return (
    <WizardProvider totalSteps={5}>
      <FormProvider {...methods}>
        <Step2Source
          dataset={dataset}
          analysis={a}
          analysisError={null}
          onUpload={vi.fn()}
          busy={false}
        />
      </FormProvider>
    </WizardProvider>
  );
}

describe('Step2 analysis summary', () => {
  it('shows favorable value in summary', () => {
    render(<Harness />);
    expect(screen.getByText('oui')).toBeInTheDocument();
  });

  it('shows other-candidates count when more than 1 candidate', () => {
    render(<Harness />);
    // 2 candidates -> "+1 autre(s)"
    expect(screen.getByText(/1 autre/)).toBeInTheDocument();
  });

  it('shows ground-truth when present', () => {
    const analysisWithGT: DatasetAnalysisOut = {
      ...analysis,
      suggested_ground_truth: { column: 'reel', confidence: 0.9, reason: 'r' },
    };
    render(<Harness a={analysisWithGT} />);
    expect(screen.getByText(/Vérité-terrain détectée/)).toBeInTheDocument();
    expect(screen.getByText('reel')).toBeInTheDocument();
  });

  it('does NOT show other-candidates line when only 1 candidate', () => {
    const singleCandidate: DatasetAnalysisOut = {
      ...analysis,
      protected_candidates: [{ column: 'sexe', confidence: 0.7, reason: 'r' }],
    };
    render(<Harness a={singleCandidate} />);
    expect(screen.queryByText(/autre/)).not.toBeInTheDocument();
  });
});
