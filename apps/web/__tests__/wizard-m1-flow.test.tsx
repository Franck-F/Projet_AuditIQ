import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { M1Wizard } from '@/components/audits/wizard/m1/M1Wizard';
import * as audits from '@/lib/api/audits';

const dataset: audits.DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 100,
  columns: ['sex', 'approved'],
  status: 'ready',
  created_at: '2026-05-30T10:00:00Z',
  expires_at: null,
};

const analysis: audits.DatasetAnalysisOut = {
  columns: [
    { name: 'sex', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['F', 60], ['M', 40]], role_hint: 'protected' },
    { name: 'approved', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['1', 50], ['0', 50]], role_hint: 'decision' },
  ],
  suggested_decision: { column: 'approved', confidence: 0.9, reason: '', favorable_value: '1' },
  suggested_protected: { column: 'sex', confidence: 0.9, reason: '', favorable_value: null },
};

const auditCreated: audits.AuditOut = {
  id: 'a-1', code: 'AUD-2026-001', title: 'X', status: 'pending', error: null,
  module: 'M1', dataset_id: 'd-1', protected_attribute: 'sex',
  decision_column: 'approved', favorable_value: '1', privileged_value: null,
  created_at: '2026-05-30T10:00:00Z', completed_at: null, metrics: null,
  interpretation: null, pre_check: [], config: null,
};

describe('M1Wizard happy path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'uploadDataset').mockResolvedValue(dataset);
    vi.spyOn(audits, 'analyzeDataset').mockResolvedValue(analysis);
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreated);
  });

  it('walks through the 5 steps and creates an audit', async () => {
    const onComplete = vi.fn();
    render(<M1Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'My audit');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: upload
    const fakeFile = new File(['sex,approved\nF,1\nM,0'], 'credit.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('csv-input') as HTMLInputElement;
    await user.upload(fileInput, fakeFile);
    await waitFor(() => screen.getByText(/credit.csv/));
    await waitFor(() => screen.getByText(/Analyse automatique/i));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3
    await user.selectOptions(screen.getByRole('combobox', { name: /Colonne de décision/i }), 'approved');
    await user.selectOptions(screen.getByRole('combobox', { name: /Valeur favorable/i }), '1');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4
    await user.selectOptions(screen.getByRole('combobox', { name: /Attribut protégé/i }), 'sex');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5
    expect(screen.getByText(/Récapitulatif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          dataset_id: 'd-1',
          title: 'My audit',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attribute: 'sex',
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-1');
  });

  it('shows a non-blocking warning when /analyze fails', async () => {
    vi.spyOn(audits, 'analyzeDataset').mockRejectedValue(new Error('500'));
    render(<M1Wizard onComplete={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'X');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    const fakeFile = new File(['sex,approved\nF,1'], 'x.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('csv-input') as HTMLInputElement;
    await user.upload(fileInput, fakeFile);
    await waitFor(() => screen.getByText(/Analyse indisponible/i));
  });
});
