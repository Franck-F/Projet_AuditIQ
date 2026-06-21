import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { MeOut, OrgOut } from '@/lib/api/org';

const hooks = vi.hoisted(() => ({
  useMe: vi.fn(),
  useOrg: vi.fn(),
  useUpdateOrg: vi.fn(),
  useUpdateOrgSettings: vi.fn(),
  useUpdateMe: vi.fn(),
}));
vi.mock('@/lib/query/use-org', () => hooks);
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ParametresPage from '@/app/app/parametres/page';

const ME: MeOut = { id: 'u', email: 'a@b.fr', first_name: 'A', role: 'admin', org_id: 'o' };
const ORG: OrgOut = {
  id: 'o',
  name: 'Org Test',
  siren: '111',
  sector: 'other',
  country: 'FR',
  company_size: 'pme',
  dpo_name: 'X',
  settings: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  hooks.useMe.mockReturnValue({ data: ME, isLoading: false, isError: false });
  hooks.useOrg.mockReturnValue({ data: ORG, isLoading: false, isError: false });
  hooks.useUpdateOrg.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  hooks.useUpdateOrgSettings.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  hooks.useUpdateMe.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

describe('ParametresPage — onglet Entreprise par défaut', () => {
  it('affiche le formulaire Entreprise câblé sur les données réelles', () => {
    render(<ParametresPage />);
    expect(screen.getByText("Informations de l'organisation")).toBeInTheDocument();
    expect(screen.getByDisplayValue('Org Test')).toBeInTheDocument();
  });

  it('affiche un état de chargement tant que /org n’est pas résolu', () => {
    hooks.useOrg.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<ParametresPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
