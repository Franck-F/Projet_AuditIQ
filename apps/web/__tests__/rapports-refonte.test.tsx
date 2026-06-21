import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MeOut } from '@/lib/api/org';

/* ── Mocks ─────────────────────────────────────────────────────────────── */
vi.mock('@/lib/query/use-dashboard');
vi.mock('@/lib/api/audits');

const auditHooks = vi.hoisted(() => ({
  useAuditsList: vi.fn(),
  useArchiveAudit: vi.fn(),
  useDeleteAudit: vi.fn(),
}));
vi.mock('@/lib/query/use-audits', () => auditHooks);

const orgHooks = vi.hoisted(() => ({ useMe: vi.fn() }));
vi.mock('@/lib/query/use-org', () => orgHooks);

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import RapportsPage from '@/app/app/rapports/page';
import * as useDashboardModule from '@/lib/query/use-dashboard';
import * as auditsModule from '@/lib/api/audits';

/* ── Fixtures ──────────────────────────────────────────────────────────── */
const ME_ADMIN: MeOut = {
  id: 'u-1', email: 'admin@cab.fr', first_name: 'A', role: 'admin', org_id: 'o-1',
};
const ME_VIEWER: MeOut = {
  id: 'u-2', email: 'view@cab.fr', first_name: 'V', role: 'viewer', org_id: 'o-1',
};

const DASHBOARD = {
  total_audits: 1,
  failing_audits: 0,
  warning_audits: 0,
  risk_score: 30,
  module_usage: {},
  recent_audits: [
    {
      id: 'aud-001',
      code: 'AUD-001',
      title: 'Audit recrutement',
      module: 'M1',
      verdict: 'pass' as const,
      risk_score: 30,
      created_at: '2026-05-15T10:00:00Z',
    },
  ],
};

const ARCHIVED = [
  {
    id: 'aud-arc',
    code: 'AUD-ARC',
    title: 'Vieil audit',
    module: 'M1',
    status: 'completed',
    verdict: 'fail' as const,
    risk_score: 80,
    created_at: '2026-01-01T10:00:00Z',
    archived_at: '2026-02-01T10:00:00Z',
  },
];

const archiveMutate = vi.fn();
const deleteMutate = vi.fn();

function setup(opts: {
  me?: MeOut;
  archivedData?: typeof ARCHIVED;
  archivedLoading?: boolean;
} = {}) {
  vi.mocked(useDashboardModule.useDashboard).mockReturnValue({
    data: DASHBOARD,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);

  vi.mocked(auditsModule.downloadReport).mockResolvedValue(undefined);

  orgHooks.useMe.mockReturnValue({ data: opts.me ?? ME_ADMIN });

  auditHooks.useAuditsList.mockReturnValue({
    data: opts.archivedData ?? ARCHIVED,
    isLoading: opts.archivedLoading ?? false,
    isError: false,
    refetch: vi.fn(),
  });

  archiveMutate.mockReset();
  deleteMutate.mockReset();
  auditHooks.useArchiveAudit.mockReturnValue({ mutate: archiveMutate, isPending: false });
  auditHooks.useDeleteAudit.mockReturnValue({ mutate: deleteMutate, isPending: false });
}

describe('RapportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 metric cards from useDashboard', () => {
    setup();
    render(<RapportsPage />);
    expect(screen.getByText('Rapports générés')).toBeInTheDocument();
    const signedCard = screen.getByText('Horodatés & archivés').closest('div');
    expect(within(signedCard!).getByText('1')).toBeInTheDocument();
  });

  it('shows empty state when no active audits exist', () => {
    setup();
    vi.mocked(useDashboardModule.useDashboard).mockReturnValue({
      data: { ...DASHBOARD, total_audits: 0, recent_audits: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);
    render(<RapportsPage />);
    expect(screen.getByText('Aucun rapport encore généré.')).toBeInTheDocument();
  });

  it('downloads the PDF report on click', async () => {
    setup();
    const user = userEvent.setup();
    render(<RapportsPage />);
    await user.click(screen.getByText('PDF'));
    expect(auditsModule.downloadReport).toHaveBeenCalledWith('aud-001', 'pdf');
  });

  it('toggles to Archivés and lists archived reports', async () => {
    setup();
    const user = userEvent.setup();
    render(<RapportsPage />);

    // Active tab shows the active audit, not the archived one.
    expect(screen.getByText('Audit recrutement')).toBeInTheDocument();
    expect(screen.queryByText('Vieil audit')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Archivés' }));

    expect(screen.getByText('Vieil audit')).toBeInTheDocument();
    expect(screen.queryByText('Audit recrutement')).not.toBeInTheDocument();
  });

  it('shows an empty message when no archived reports', async () => {
    setup({ archivedData: [] });
    const user = userEvent.setup();
    render(<RapportsPage />);
    await user.click(screen.getByRole('tab', { name: 'Archivés' }));
    expect(screen.getByText('Aucun rapport archivé.')).toBeInTheDocument();
  });

  it('Archiver action calls the archive mutation', async () => {
    setup();
    const user = userEvent.setup();
    render(<RapportsPage />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Archiver' }));

    expect(archiveMutate).toHaveBeenCalledTimes(1);
    expect(archiveMutate.mock.calls[0]![0]).toMatchObject({
      id: 'aud-001',
      archived: true,
    });
  });

  it('Supprimer asks for confirmation before calling DELETE', async () => {
    setup();
    const user = userEvent.setup();
    render(<RapportsPage />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer' }));

    // The mutation must NOT fire until the user confirms.
    expect(deleteMutate).not.toHaveBeenCalled();

    // Confirmation dialog lists what gets removed.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/jeu de données associé/i)).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: /Supprimer définitivement/i }),
    );
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate.mock.calls[0]![0]).toBe('aud-001');
  });

  it('hides Supprimer for a viewer (role guard)', async () => {
    setup({ me: ME_VIEWER });
    const user = userEvent.setup();
    render(<RapportsPage />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.queryByRole('menuitem', { name: 'Supprimer' })).not.toBeInTheDocument();
    expect(
      screen.getByText('La suppression est réservée aux administrateurs.'),
    ).toBeInTheDocument();
  });
});
