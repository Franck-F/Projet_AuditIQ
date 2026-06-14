import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { MeOut, OrgOut } from '@/lib/api/org';

/* ── Mocks ─────────────────────────────────────────────────────────────── */
const mutate = vi.hoisted(() => ({
  org: vi.fn(),
  settings: vi.fn(),
  me: vi.fn(),
}));

const hooks = vi.hoisted(() => ({
  useMe: vi.fn(),
  useOrg: vi.fn(),
  useUpdateOrg: vi.fn(),
  useUpdateOrgSettings: vi.fn(),
  useUpdateMe: vi.fn(),
}));

vi.mock('@/lib/query/use-org', () => hooks);

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import ParametresPage from '@/app/app/parametres/page';

/* ── Fixtures ──────────────────────────────────────────────────────────── */
const ME_ADMIN: MeOut = {
  id: 'u-me',
  email: 'admin@cabinet.fr',
  first_name: 'Claire',
  role: 'admin',
  org_id: 'org-1',
};

const ORG: OrgOut = {
  id: 'org-1',
  name: 'Mon Cabinet SAS',
  siren: '824561832',
  sector: 'hr',
  country: 'FR',
  company_size: 'pme',
  dpo_name: 'Claire Dupont',
  settings: { di_threshold: 0.8, retention_days: 30, report_options: {} },
};

function setupHooks(over: {
  me?: Partial<ReturnType<typeof hooks.useMe>>;
  org?: Partial<ReturnType<typeof hooks.useOrg>>;
} = {}) {
  hooks.useMe.mockReturnValue({ data: ME_ADMIN, isLoading: false, isError: false, ...over.me });
  hooks.useOrg.mockReturnValue({ data: ORG, isLoading: false, isError: false, ...over.org });
  hooks.useUpdateOrg.mockReturnValue({ mutateAsync: mutate.org, isPending: false });
  hooks.useUpdateOrgSettings.mockReturnValue({ mutateAsync: mutate.settings, isPending: false });
  hooks.useUpdateMe.mockReturnValue({ mutateAsync: mutate.me, isPending: false });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHooks();
});

function getNav() {
  return screen.getByRole('navigation', { name: /Navigation paramètres/i });
}

describe('ParametresPage — câblage réel', () => {
  it('n’affiche que les 4 onglets conservés (plus de Facturation/Intégrations/Sécurité)', () => {
    render(<ParametresPage />);
    const nav = getNav();
    expect(within(nav).getAllByRole('button')).toHaveLength(4);
    expect(within(nav).getByRole('button', { name: /Entreprise/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Profil/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Audit & seuils/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Rapports/i })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /Facturation/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /Intégrations/i })).not.toBeInTheDocument();
  });

  it('n’affiche plus la bannière « Aperçu »', () => {
    render(<ParametresPage />);
    expect(screen.queryByText(/section est en\s+cours de développement/i)).not.toBeInTheDocument();
  });

  it('pré-remplit Entreprise avec les vraies valeurs de /org', () => {
    render(<ParametresPage />);
    expect(screen.getByDisplayValue('Mon Cabinet SAS')).toBeInTheDocument();
    expect(screen.getByDisplayValue('824561832')).toBeInTheDocument();
    // Plus de valeurs fictives.
    expect(screen.queryByDisplayValue(/Cabinet Tessier/)).not.toBeInTheDocument();
  });

  it('persiste les infos Entreprise via PATCH /org', async () => {
    mutate.org.mockResolvedValue(ORG);
    const user = userEvent.setup();
    render(<ParametresPage />);
    const name = screen.getByLabelText('Raison sociale');
    await user.clear(name);
    await user.type(name, 'Nouveau Nom');
    await user.click(screen.getByRole('button', { name: /^Enregistrer$/i }));
    expect(mutate.org).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nouveau Nom', siren: '824561832', sector: 'hr' }),
    );
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('désactive le formulaire Entreprise pour un non-admin', () => {
    setupHooks({ me: { data: { ...ME_ADMIN, role: 'viewer' } } });
    render(<ParametresPage />);
    expect(screen.getByLabelText('Raison sociale')).toBeDisabled();
    expect(screen.getByText(/Seuls les administrateurs peuvent modifier/i)).toBeInTheDocument();
  });

  it('Profil : prénom éditable, e-mail en lecture seule', async () => {
    mutate.me.mockResolvedValue(ME_ADMIN);
    const user = userEvent.setup();
    render(<ParametresPage />);
    await user.click(within(getNav()).getByRole('button', { name: /Profil/i }));
    expect(screen.getByDisplayValue('Claire')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('readonly');
    const first = screen.getByLabelText('Prénom');
    await user.clear(first);
    await user.type(first, 'Marie');
    await user.click(screen.getByRole('button', { name: /^Enregistrer$/i }));
    expect(mutate.me).toHaveBeenCalledWith({ first_name: 'Marie' });
  });

  it('Audit & seuils : persiste di_threshold et retention_days via PATCH /org/settings', async () => {
    mutate.settings.mockResolvedValue(ORG);
    const user = userEvent.setup();
    render(<ParametresPage />);
    await user.click(within(getNav()).getByRole('button', { name: /Audit & seuils/i }));
    await user.selectOptions(screen.getByLabelText(/Seuil de disparate impact/i), '0.9');
    await user.selectOptions(screen.getByLabelText(/Rétention des datasets/i), '90');
    await user.click(screen.getByRole('button', { name: /^Enregistrer$/i }));
    expect(mutate.settings).toHaveBeenCalledWith({ di_threshold: 0.9, retention_days: 90 });
  });

  it('ne contient plus de fausse clé API', () => {
    render(<ParametresPage />);
    expect(screen.queryByText(/clé API/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sk-/i)).not.toBeInTheDocument();
  });

  it('Rapports : persiste report_options via PATCH /org/settings', async () => {
    mutate.settings.mockResolvedValue(ORG);
    const user = userEvent.setup();
    render(<ParametresPage />);
    await user.click(within(getNav()).getByRole('button', { name: /Rapports/i }));
    // Active le filigrane confidentiel (off par défaut).
    await user.click(screen.getByRole('switch', { name: /Filigrane/i }));
    await user.click(screen.getByRole('button', { name: /^Enregistrer$/i }));
    expect(mutate.settings).toHaveBeenCalledWith(
      expect.objectContaining({ report_options: expect.objectContaining({ confidential_watermark: true }) }),
    );
  });

  it('affiche un état d’erreur si /org échoue', () => {
    setupHooks({ org: { data: undefined, isLoading: false, isError: true } });
    render(<ParametresPage />);
    expect(screen.getByText(/Impossible de charger les paramètres/i)).toBeInTheDocument();
  });
});
