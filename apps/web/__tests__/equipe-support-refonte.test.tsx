import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { InvitationOut, MeOut, MemberOut } from '@/lib/api/org';

/* ── Mocks ─────────────────────────────────────────────────────────────── */
const mutate = vi.hoisted(() => ({
  updateRole: vi.fn(),
  createInvitation: vi.fn(),
  revoke: vi.fn(),
}));

const hooks = vi.hoisted(() => ({
  useMe: vi.fn(),
  useMembers: vi.fn(),
  useInvitations: vi.fn(),
  useUpdateMemberRole: vi.fn(),
  useCreateInvitation: vi.fn(),
  useRevokeInvitation: vi.fn(),
}));

vi.mock('@/lib/query/use-org', () => hooks);

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import EquipePage from '@/app/app/equipe/page';
import SupportPage from '@/app/app/support/page';

/* ── Fixtures ──────────────────────────────────────────────────────────── */
const ME_ADMIN: MeOut = {
  id: 'u-me',
  email: 'admin@cabinet.fr',
  first_name: 'Admin',
  role: 'admin',
  org_id: 'org-1',
};

const MEMBERS: MemberOut[] = [
  { id: 'u-1', email: 'lea@cabinet.fr', first_name: 'Léa', role: 'owner', created_at: '2026-01-01T00:00:00Z' },
  { id: 'u-2', email: 'karim@cabinet.fr', first_name: 'Karim', role: 'editor', created_at: '2026-02-01T00:00:00Z' },
  { id: 'u-3', email: 'sofia@cabinet.fr', first_name: null, role: 'viewer', created_at: '2026-03-01T00:00:00Z' },
];

const INVITES: InvitationOut[] = [
  {
    id: 'inv-1',
    email: 'invite@cabinet.fr',
    role: 'editor',
    status: 'pending',
    created_at: '2026-04-01T00:00:00Z',
    expires_at: '2026-04-08T00:00:00Z',
  },
];

function setupHooks(over: {
  me?: Partial<ReturnType<typeof hooks.useMe>>;
  members?: Partial<ReturnType<typeof hooks.useMembers>>;
  invitations?: Partial<ReturnType<typeof hooks.useInvitations>>;
} = {}) {
  hooks.useMe.mockReturnValue({ data: ME_ADMIN, isLoading: false, isError: false, ...over.me });
  hooks.useMembers.mockReturnValue({ data: MEMBERS, isLoading: false, isError: false, ...over.members });
  hooks.useInvitations.mockReturnValue({ data: INVITES, isLoading: false, isError: false, ...over.invitations });
  hooks.useUpdateMemberRole.mockReturnValue({ mutateAsync: mutate.updateRole, isPending: false });
  hooks.useCreateInvitation.mockReturnValue({ mutateAsync: mutate.createInvitation, isPending: false });
  hooks.useRevokeInvitation.mockReturnValue({ mutateAsync: mutate.revoke, isPending: false });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHooks();
});

/* ── Équipe ────────────────────────────────────────────────────────────── */
describe('EquipePage — données réelles', () => {
  it('rend le Topbar avec le fil d’Ariane', () => {
    render(<EquipePage />);
    expect(screen.getByText('AuditIQ')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Équipe')).toBeInTheDocument();
  });

  it('n’affiche plus la bannière « Aperçu »', () => {
    render(<EquipePage />);
    expect(screen.queryByText(/section est en\s+cours de développement/i)).not.toBeInTheDocument();
  });

  it('n’affiche plus les membres fictifs', () => {
    render(<EquipePage />);
    expect(screen.queryByText('Léa Moreau')).not.toBeInTheDocument();
    expect(screen.queryByText('Karim Belaïd')).not.toBeInTheDocument();
  });

  it('liste les membres réels avec leurs e-mails', () => {
    render(<EquipePage />);
    expect(screen.getByText('lea@cabinet.fr')).toBeInTheDocument();
    expect(screen.getByText('karim@cabinet.fr')).toBeInTheDocument();
    // Sans first_name, l'e-mail sert de nom affiché → présent 2 fois.
    expect(screen.getAllByText('sofia@cabinet.fr').length).toBeGreaterThanOrEqual(1);
  });

  it('calcule les KPI à partir des vraies données', () => {
    render(<EquipePage />);
    expect(screen.getByText('Membres actifs')).toBeInTheDocument();
    expect(screen.getByText('Administrateurs')).toBeInTheDocument();
    // « Invitations en attente » apparaît à la fois en KPI et en titre de section.
    expect(screen.getAllByText('Invitations en attente').length).toBeGreaterThanOrEqual(1);
    // 3 membres, 1 admin (owner), 1 invitation pending
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
  });

  it('affiche un état de chargement des membres', () => {
    setupHooks({ members: { data: undefined, isLoading: true } });
    render(<EquipePage />);
    expect(screen.getByText(/Chargement des membres/i)).toBeInTheDocument();
  });

  it('affiche un état d’erreur des membres', () => {
    setupHooks({ members: { data: undefined, isLoading: false, isError: true } });
    render(<EquipePage />);
    expect(screen.getByText(/Impossible de charger la liste des membres/i)).toBeInTheDocument();
  });

  it('affiche un état vide quand aucun membre', () => {
    setupHooks({ members: { data: [], isLoading: false, isError: false } });
    render(<EquipePage />);
    expect(screen.getByText(/Aucun membre pour le moment/i)).toBeInTheDocument();
  });

  it('liste les invitations en attente avec un bouton « Révoquer »', () => {
    render(<EquipePage />);
    expect(screen.getByText('invite@cabinet.fr')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Révoquer/i })).toBeInTheDocument();
  });

  it('appelle la révocation au clic', async () => {
    mutate.revoke.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<EquipePage />);
    await user.click(screen.getByRole('button', { name: /Révoquer/i }));
    expect(mutate.revoke).toHaveBeenCalledWith('inv-1');
  });

  it('change le rôle d’un membre éditable', async () => {
    mutate.updateRole.mockResolvedValue({});
    const user = userEvent.setup();
    render(<EquipePage />);
    const select = screen.getByLabelText(/Rôle de karim@cabinet.fr/i);
    await user.selectOptions(select, 'admin');
    expect(mutate.updateRole).toHaveBeenCalledWith({ userId: 'u-2', role: 'admin' });
  });

  it('désactive le bouton d’invitation et les actions pour un viewer', () => {
    setupHooks({ me: { data: { ...ME_ADMIN, role: 'viewer' } } });
    render(<EquipePage />);
    expect(screen.getByRole('button', { name: /Inviter un membre/i })).toBeDisabled();
    // Pas de sélecteur de rôle ni de bouton Révoquer pour un viewer.
    expect(screen.queryByLabelText(/Rôle de karim@cabinet.fr/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Révoquer/i })).not.toBeInTheDocument();
  });

  it('ouvre la modal d’invitation et envoie une invitation (email_sent)', async () => {
    mutate.createInvitation.mockResolvedValue({
      invitation: { ...INVITES[0], email: 'new@cabinet.fr' },
      invite_url: 'https://app/inv/abc',
      email_sent: true,
    });
    const user = userEvent.setup();
    render(<EquipePage />);
    await user.click(screen.getByRole('button', { name: /Inviter un membre/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Adresse e-mail/i), 'new@cabinet.fr');
    await user.click(within(dialog).getByRole('button', { name: /Envoyer/i }));
    expect(mutate.createInvitation).toHaveBeenCalledWith({ email: 'new@cabinet.fr', role: 'viewer' });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('new@cabinet.fr'));
  });

  it('affiche le lien à copier quand email_sent est faux', async () => {
    mutate.createInvitation.mockResolvedValue({
      invitation: { ...INVITES[0], email: 'link@cabinet.fr' },
      invite_url: 'https://app/inv/xyz',
      email_sent: false,
    });
    const user = userEvent.setup();
    render(<EquipePage />);
    await user.click(screen.getByRole('button', { name: /Inviter un membre/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Adresse e-mail/i), 'link@cabinet.fr');
    await user.click(within(dialog).getByRole('button', { name: /Envoyer/i }));
    expect(await within(dialog).findByDisplayValue('https://app/inv/xyz')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Copier le lien/i })).toBeInTheDocument();
  });

  it('affiche le détail d’erreur 409 (déjà membre)', async () => {
    mutate.createInvitation.mockRejectedValue({
      response: { data: { detail: 'Cet utilisateur est déjà membre.' } },
    });
    const user = userEvent.setup();
    render(<EquipePage />);
    await user.click(screen.getByRole('button', { name: /Inviter un membre/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Adresse e-mail/i), 'dup@cabinet.fr');
    await user.click(within(dialog).getByRole('button', { name: /Envoyer/i }));
    expect(toastMock.error).toHaveBeenCalledWith('Cet utilisateur est déjà membre.');
  });
});

/* ── Support ───────────────────────────────────────────────────────────── */
describe('SupportPage', () => {
  it('rend le fil d’Ariane', () => {
    render(<SupportPage />);
    expect(screen.getByText('AuditIQ')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('rend le titre principal', () => {
    render(<SupportPage />);
    expect(screen.getByText('Comment pouvons-nous vous aider ?')).toBeInTheDocument();
  });

  it('n’affiche plus la bannière « Aperçu »', () => {
    render(<SupportPage />);
    expect(screen.queryByText(/données affichées sont des exemples/i)).not.toBeInTheDocument();
  });

  it('conserve le lien mailto réel', () => {
    render(<SupportPage />);
    const mailLinks = screen.getAllByRole('link', { name: /support@auditiq\.fr/i });
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
    expect(mailLinks[0]).toHaveAttribute('href', 'mailto:support@auditiq.fr');
  });

  it('rend les 6 cartes de thèmes (feuille de route)', () => {
    render(<SupportPage />);
    expect(screen.getByText('Bien démarrer')).toBeInTheDocument();
    expect(screen.getByText("Modules d'audit")).toBeInTheDocument();
    expect(screen.getByText('AI Act & réglementation')).toBeInTheDocument();
    expect(screen.getByText('Rapports & exports')).toBeInTheDocument();
    expect(screen.getByText('Sécurité & RGPD')).toBeInTheDocument();
    expect(screen.getByText('Paramétrage avancé')).toBeInTheDocument();
  });
});
