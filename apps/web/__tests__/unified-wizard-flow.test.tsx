import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

import { Wizard } from '@/components/audits/wizard/unified/Wizard';
import * as audits from '@/lib/api/audits';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const dataset: audits.DatasetOut = {
  id: 'd-1',
  filename: 'credit.csv',
  row_count: 100,
  columns: ['sex', 'income', 'approved'],
  status: 'ready',
  created_at: '2026-06-02T10:00:00Z',
  expires_at: null,
};

const analysis: audits.DatasetAnalysisOut = {
  columns: [
    {
      name: 'sex',
      dtype: 'categorical',
      unique_count: 2,
      null_ratio: 0,
      top_values: [['F', 60], ['M', 40]],
      role_hint: 'protected',
    },
    {
      name: 'income',
      dtype: 'numeric',
      unique_count: 50,
      null_ratio: 0,
      top_values: [],
      role_hint: 'feature',
    },
    {
      name: 'approved',
      dtype: 'categorical',
      unique_count: 2,
      null_ratio: 0,
      top_values: [['1', 50], ['0', 50]],
      role_hint: 'decision',
    },
  ],
  suggested_decision: { column: 'approved', confidence: 0.9, reason: '', favorable_value: '1' },
  suggested_protected: { column: 'sex', confidence: 0.9, reason: '', favorable_value: null },
};

const auditCreatedM1: audits.AuditOut = {
  id: 'a-m1',
  code: 'AUD-2026-001',
  title: 'Test M1',
  status: 'pending',
  error: null,
  module: 'M1',
  dataset_id: 'd-1',
  protected_attribute: 'sex',
  decision_column: 'approved',
  favorable_value: '1',
  privileged_value: null,
  created_at: '2026-06-02T10:00:00Z',
  completed_at: null,
  archived_at: null,
  metrics: null,
  interpretation: null,
  pre_check: [],
  config: null,
};

const auditCreatedM2: audits.AuditOut = {
  id: 'a-m2',
  code: 'AUD-2026-002',
  title: 'Test M2',
  status: 'pending',
  error: null,
  module: 'M2',
  dataset_id: 'd-1',
  protected_attribute: null,
  decision_column: 'approved',
  favorable_value: '1',
  privileged_value: null,
  created_at: '2026-06-02T10:00:00Z',
  completed_at: null,
  archived_at: null,
  metrics: null,
  interpretation: null,
  pre_check: [],
  config: null,
};

const auditCreatedM3: audits.AuditOut = {
  id: 'a-m3',
  code: 'AUD-2026-003',
  title: 'Test M3',
  status: 'pending',
  error: null,
  module: 'M3',
  dataset_id: null,
  protected_attribute: null,
  decision_column: null,
  favorable_value: null,
  privileged_value: null,
  created_at: '2026-06-02T10:00:00Z',
  completed_at: null,
  archived_at: null,
  metrics: null,
  interpretation: null,
  pre_check: [],
  config: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Unified Wizard happy paths', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(audits, 'uploadDataset').mockResolvedValue(dataset);
    vi.spyOn(audits, 'analyzeDataset').mockResolvedValue(analysis);
    vi.spyOn(audits, 'createAudit').mockResolvedValue(auditCreatedM1);
  });

  it('M1 path: tabular-known walks 5 steps and creates an audit with no module field', async () => {
    const onComplete = vi.fn();
    render(<Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1: fill title, select audit_type=tabular-known, select sector=credit
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'Test M1');
    // Use within to target the button that has the exact title for M1
    const m1Card = screen.getByText('Un outil qui prend des décisions, avec une caractéristique sensible à tester').closest('button')!;
    await user.click(m1Card);
    await user.click(screen.getByRole('button', { name: /Crédit & scoring/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: upload CSV
    const fakeFile = new File(
      ['sex,income,approved\nF,50000,1\nM,60000,0'],
      'credit.csv',
      { type: 'text/csv' },
    );
    await user.upload(screen.getByTestId('csv-input') as HTMLInputElement, fakeFile);
    await waitFor(() => screen.getByText(/credit\.csv/));
    await waitFor(() => screen.getByText(/Analyse automatique/i));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3: decision_column + favorable_value + protected_attributes (checkbox)
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Colonne de décision/i }),
      'approved',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Valeur favorable/i }),
      '1',
    );
    // protected_attributes is now a checkbox group — pre-selected by analysis prefill
    // The analysis suggests 'sex', so it should be pre-selected; verify and advance
    await waitFor(() => {
      const sexCheckbox = screen.getByRole('checkbox', { name: /sex/i });
      expect(sexCheckbox).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4: metrics info — just advance
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5: review + submit
    expect(screen.getByText(/Récapitulatif/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          dataset_id: 'd-1',
          title: 'Test M1',
          decision_column: 'approved',
          favorable_value: '1',
          protected_attributes: expect.arrayContaining(['sex']),
          // Sector chosen in step 1 (Crédit & scoring) maps to the API enum 'credit'
          sector: 'credit',
        }),
      ),
    );
    // M1 body must NOT have a module field
    const callArg = vi.mocked(audits.createAudit).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('module');
    expect(onComplete).toHaveBeenCalledWith('a-m1');
  });

  it('M2 path: tabular-unknown walks 5 steps and creates an audit with module=M2', async () => {
    vi.mocked(audits.createAudit).mockResolvedValue(auditCreatedM2);
    const onComplete = vi.fn();
    render(<Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1: fill title, select audit_type=tabular-unknown, select sector=hr
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'Test M2');
    const m2Card = screen.getByText('Un outil qui prend des décisions, sans savoir où le biais se cache').closest('button')!;
    await user.click(m2Card);
    await user.click(screen.getByRole('button', { name: /Ressources humaines/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: upload CSV
    const fakeFile = new File(
      ['sex,income,approved\nF,50000,1\nM,60000,0'],
      'credit.csv',
      { type: 'text/csv' },
    );
    await user.upload(screen.getByTestId('csv-input') as HTMLInputElement, fakeFile);
    await waitFor(() => screen.getByText(/credit\.csv/));
    await waitFor(() => screen.getByText(/Analyse automatique/i));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3: decision_column + favorable_value (M2 has no protected_attribute)
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Colonne de décision/i }),
      'approved',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Valeur favorable/i }),
      '1',
    );
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4: advanced params collapsed — just advance
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5: review + submit
    expect(screen.getByText(/Récapitulatif/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M2',
          dataset_id: 'd-1',
          title: 'Test M2',
          decision_column: 'approved',
          favorable_value: '1',
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-m2');
  });

  it('M3 path: llm-api walks 5 steps and creates an audit with module=M3 + target', async () => {
    vi.mocked(audits.createAudit).mockResolvedValue(auditCreatedM3);
    const onComplete = vi.fn();
    render(<Wizard onComplete={onComplete} />);
    const user = userEvent.setup();

    // Step 1: fill title, select audit_type=llm-api, select sector=other
    await user.type(screen.getByRole('textbox', { name: /titre/i }), 'Test M3');
    await user.click(
      screen.getByRole('button', { name: /assistant conversationnel \/ chatbot/i }),
    );
    await user.click(screen.getByRole('button', { name: /Autre usage/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 2: configure URL (M3 — no CSV upload)
    const urlInput = screen.getByRole('textbox', { name: /URL/i });
    await user.clear(urlInput);
    await user.type(urlInput, 'https://api.openai.com/v1/chat/completions');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 3: preset=openai (default) — body_template + response_path pre-filled
    // Just advance (defaults are valid)
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 4: test connection step — optional, just advance
    await user.click(screen.getByRole('button', { name: /Suivant/i }));

    // Step 5: review + submit
    expect(screen.getByText(/Récapitulatif/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Terminer/i }));

    await waitFor(() =>
      expect(audits.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'M3',
          title: 'Test M3',
          lang: 'fr',
          target: expect.objectContaining({
            url: 'https://api.openai.com/v1/chat/completions',
          }),
        }),
      ),
    );
    expect(onComplete).toHaveBeenCalledWith('a-m3');
  });
});
