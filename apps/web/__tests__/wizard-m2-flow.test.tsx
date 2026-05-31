import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { M2Wizard } from '@/components/audits/wizard/m2/M2Wizard';
import * as audits from '@/lib/api/audits';

const dataset: audits.DatasetOut = {
  id: 'd-1', filename: 'credit.csv', row_count: 100,
  columns: ['montant', 'duree', 'decision'], status: 'ready',
  created_at: '2026-05-30T10:00:00Z', expires_at: null,
};

const analysis: audits.DatasetAnalysisOut = {
  columns: [
    { name: 'montant', dtype: 'numeric', unique_count: 50, null_ratio: 0, top_values: [], role_hint: 'feature' },
    { name: 'duree', dtype: 'numeric', unique_count: 30, null_ratio: 0, top_values: [], role_hint: 'feature' },
    { name: 'decision', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['1', 50], ['0', 50]], role_hint: 'decision' },
  ],
  suggested_decision: { column: 'decision', confidence: 0.9, reason: '', favorable_value: '1' },
  suggested_protected: null,
};

const auditCreated: audits.AuditOut = {
  id: 'a-1', code: 'AUD-2026-002', title: 'X', status: 'pending', error: null,
  module: 'M2', dataset_id: 'd-1', protected_attribute: null,
  decision_column: 'decision', favorable_value: '1', privileged_value: null,
  created_at: '2026-05-30T10:00:00Z', completed_at: null, metrics: null,
  interpretation: null, pre_check: [], config: null,
};

describe('M2Wizard happy path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'uploadDataset').mockResolvedValue(dataset);
    vi.spyOn(audits, 'analyzeDataset').mockResolvedValue(analysis);
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreated);
  });

  it('walks 5 steps and creates an audit with M2 module', async () => {
    const onComplete = vi.fn();
    render(<M2Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'My detection');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: upload
    const fakeFile = new File(['montant,duree,decision\n100,12,1'], 'credit.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input') as HTMLInputElement, fakeFile);
    await waitFor(() => screen.getByText(/credit.csv/));
    await waitFor(() => screen.getByText(/Analyse automatique/i));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3
    await user.selectOptions(screen.getByRole('combobox', { name: /Colonne de décision/i }), 'decision');
    await user.selectOptions(screen.getByRole('combobox', { name: /Valeur favorable/i }), '1');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4 (advanced collapsed by default — skip)
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5
    expect(screen.getByText(/Récapitulatif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M2',
          dataset_id: 'd-1',
          title: 'My detection',
          decision_column: 'decision',
          favorable_value: '1',
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-1');
  });

  it('forwards advanced params when provided', async () => {
    render(<M2Wizard onComplete={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'X');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    const fakeFile = new File(['x,decision\n1,1'], 'x.csv', { type: 'text/csv' });
    await user.upload(screen.getByTestId('csv-input') as HTMLInputElement, fakeFile);
    await waitFor(() => screen.getByText(/credit.csv/));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Colonne de décision/i }), 'decision');
    await user.selectOptions(screen.getByRole('combobox', { name: /Valeur favorable/i }), '1');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    // Step 4: expand + fill
    await user.click(screen.getByRole('button', { name: /Personnaliser/i }));
    await user.type(screen.getByLabelText(/Nombre de clusters/i), '8');
    await user.type(screen.getByLabelText(/Seuil de déviation/i), '15');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Terminer/i }));
    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M2',
          config: expect.objectContaining({ k: 8, deviation_pp: 15 }),
        }),
      ),
    );
  });
});
