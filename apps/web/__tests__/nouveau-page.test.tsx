import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  uploadDataset: vi.fn(),
  createAudit: vi.fn(),
  analyzeDataset: vi.fn(),
  testConnectionM3: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import NouveauPage, { launchErrorMessage } from '@/app/app/audits/nouveau/page';

describe('audit wizard', () => {
  it('shows the unified wizard with audit type cards', async () => {
    render(<NouveauPage />);
    expect(await screen.findByRole('textbox', { name: /titre/i })).toBeInTheDocument();
    expect(screen.getByText('Une caractéristique sensible à tester')).toBeInTheDocument();
    expect(screen.getByText('Un chatbot à auditer')).toBeInTheDocument();
  });
});

describe('launchErrorMessage', () => {
  it('surface le vrai motif de validation (fields) en retirant le prefixe « module Mx »', () => {
    const err = {
      response: {
        data: {
          detail: 'La requête est invalide.',
          fields: {
            '': 'module M1 : l’attribut protégé « experience_ans » doit différer des colonnes décision et vérité-terrain.',
          },
        },
      },
    };
    expect(launchErrorMessage(err)).toBe(
      'l’attribut protégé « experience_ans » doit différer des colonnes décision et vérité-terrain.',
    );
  });

  it('utilise detail quand il est specifique (pas de fields)', () => {
    const err = { response: { data: { detail: 'Le jeu de données est introuvable.' } } };
    expect(launchErrorMessage(err)).toBe('Le jeu de données est introuvable.');
  });

  it('retombe sur un message generique pour une erreur inconnue', () => {
    expect(launchErrorMessage(new Error('boom'))).toMatch(/Vérifiez votre configuration/i);
  });
});
