import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { uploadDataset, createAudit, push } = vi.hoisted(() => ({
  uploadDataset: vi.fn(),
  createAudit: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  uploadDataset,
  createAudit,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import NouveauPage from '@/app/app/audits/nouveau/page';

const DATASET = {
  id: 'd1',
  filename: 'r.csv',
  row_count: 2,
  columns: ['genre', 'age', 'decision'],
  status: 'ready',
  created_at: '',
  expires_at: null,
};

describe('audit wizard', () => {
  it('M1: upload, choose module, map columns, create, redirect', async () => {
    uploadDataset.mockResolvedValue(DATASET);
    createAudit.mockResolvedValue({ id: 'aud-9', status: 'done' });
    render(<NouveauPage />);

    const file = new File(['genre,age,decision\nH,30,oui\n'], 'r.csv', {
      type: 'text/csv',
    });
    await userEvent.upload(screen.getByTestId('csv-input'), file);
    await waitFor(() => expect(uploadDataset).toHaveBeenCalledWith(file));

    await userEvent.click(
      screen.getByRole('button', { name: /audit supervisé/i }),
    );
    await userEvent.type(screen.getByLabelText(/titre/i), 'Recrutement Q2');
    await userEvent.selectOptions(
      screen.getByLabelText(/attribut prot/i),
      'genre',
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/colonne de d/i),
      'decision',
    );
    await userEvent.type(screen.getByLabelText(/valeur favorable/i), 'oui');
    await userEvent.click(
      screen.getByRole('button', { name: /lancer l'audit/i }),
    );

    await waitFor(() =>
      expect(createAudit).toHaveBeenCalledWith({
        dataset_id: 'd1',
        title: 'Recrutement Q2',
        protected_attribute: 'genre',
        decision_column: 'decision',
        favorable_value: 'oui',
        privileged_value: null,
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/app/audits/aud-9'),
    );
  });

  it('M2: choose unsupervised module, configure, create, redirect', async () => {
    uploadDataset.mockResolvedValue(DATASET);
    createAudit.mockResolvedValue({ id: 'aud-m2', status: 'done' });
    render(<NouveauPage />);

    await userEvent.upload(
      screen.getByTestId('csv-input'),
      new File(['x'], 'r.csv', { type: 'text/csv' }),
    );
    await waitFor(() => expect(uploadDataset).toHaveBeenCalled());

    await userEvent.click(
      screen.getByRole('button', { name: /détection non supervisée/i }),
    );
    await userEvent.type(screen.getByLabelText(/titre/i), 'Détection Q2');
    await userEvent.selectOptions(
      screen.getByLabelText(/colonne de décision/i),
      'decision',
    );
    await userEvent.type(screen.getByLabelText(/valeur favorable/i), 'oui');
    await userEvent.click(
      screen.getByRole('button', { name: /lancer l'audit/i }),
    );

    await waitFor(() =>
      expect(createAudit).toHaveBeenCalledWith({
        dataset_id: 'd1',
        title: 'Détection Q2',
        module: 'M2',
        decision_column: 'decision',
        favorable_value: 'oui',
        config: {},
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/app/audits/aud-m2'),
    );
  });

  it('shows an error if the upload fails', async () => {
    uploadDataset.mockRejectedValue(new Error('bad csv'));
    render(<NouveauPage />);
    await userEvent.upload(
      screen.getByTestId('csv-input'),
      new File(['x'], 'x.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/échou/i);
  });
});
