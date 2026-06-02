import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RapportsPage from '@/app/app/rapports/page';
import * as useDashboardModule from '@/lib/query/use-dashboard';
import * as auditsModule from '@/lib/api/audits';

vi.mock('@/lib/query/use-dashboard');
vi.mock('@/lib/api/audits');

describe('RapportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 metric cards with correct data from useDashboard', () => {
    const mockDashboard = {
      total_audits: 12,
      failing_audits: 2,
      warning_audits: 1,
      risk_score: 68,
      module_usage: {},
      recent_audits: [
        {
          id: 'aud-001',
          code: 'AUD-001',
          title: 'Audit fairness Q2',
          module: 'M1',
          verdict: 'pass' as const,
          risk_score: 45,
          created_at: '2026-05-15T10:00:00Z',
        },
        {
          id: 'aud-002',
          code: 'AUD-002',
          title: 'Audit fraude',
          module: 'M2',
          verdict: 'fail' as const,
          risk_score: 78,
          created_at: '2026-05-20T14:00:00Z',
        },
        {
          id: 'aud-003',
          code: null,
          title: 'Audit recrutement',
          module: 'M1',
          verdict: null,
          risk_score: null,
          created_at: '2026-05-25T09:00:00Z',
        },
      ],
    };

    vi.mocked(useDashboardModule.useDashboard).mockReturnValue({
      data: mockDashboard,
      isLoading: false,
    } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);

    vi.mocked(auditsModule.downloadReport).mockResolvedValue(undefined);

    render(<RapportsPage />);

    expect(screen.getByText('Rapports générés')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    const signedCard = screen.getByText('Signés & opposables').closest('div');
    expect(signedCard).toBeInTheDocument();
    expect(within(signedCard!).getByText('2')).toBeInTheDocument();

    const pendingCard = screen.getByText('En attente de revue').closest('div');
    expect(pendingCard).toBeInTheDocument();
    expect(within(pendingCard!).getByText('10')).toBeInTheDocument();
  });

  it('renders table with signed and unsigned audits', () => {
    const mockDashboard = {
      total_audits: 3,
      failing_audits: 1,
      warning_audits: 0,
      risk_score: 50,
      module_usage: {},
      recent_audits: [
        {
          id: 'aud-001',
          code: 'AUD-001',
          title: 'Signed audit pass',
          module: 'M1',
          verdict: 'pass' as const,
          risk_score: 30,
          created_at: '2026-05-15T10:00:00Z',
        },
        {
          id: 'aud-002',
          code: 'AUD-002',
          title: 'Signed audit fail',
          module: 'M2',
          verdict: 'fail' as const,
          risk_score: 80,
          created_at: '2026-05-20T14:00:00Z',
        },
        {
          id: 'aud-003',
          code: null,
          title: 'Pending audit draft',
          module: 'M1',
          verdict: null,
          risk_score: null,
          created_at: '2026-05-25T09:00:00Z',
        },
      ],
    };

    vi.mocked(useDashboardModule.useDashboard).mockReturnValue({
      data: mockDashboard,
      isLoading: false,
    } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);

    vi.mocked(auditsModule.downloadReport).mockResolvedValue(undefined);

    render(<RapportsPage />);

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(4);

    const signedLabels = screen.getAllByText('Signé');
    expect(signedLabels.length).toBe(2);

    const draftLabels = screen.getAllByText('Brouillon');
    expect(draftLabels.length).toBe(1);
  });

  it('calls downloadReport with correct format on PDF button click', async () => {
    const user = userEvent.setup();
    const mockDownload = vi.fn();

    const mockDashboard = {
      total_audits: 1,
      failing_audits: 0,
      warning_audits: 0,
      risk_score: 30,
      module_usage: {},
      recent_audits: [
        {
          id: 'aud-001',
          code: 'AUD-001',
          title: 'Test audit',
          module: 'M1',
          verdict: 'pass' as const,
          risk_score: 30,
          created_at: '2026-05-15T10:00:00Z',
        },
      ],
    };

    vi.mocked(useDashboardModule.useDashboard).mockReturnValue({
      data: mockDashboard,
      isLoading: false,
    } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);

    vi.mocked(auditsModule.downloadReport).mockImplementation(mockDownload);

    render(<RapportsPage />);

    const pdfButton = screen.getByText('PDF');
    await user.click(pdfButton);

    expect(mockDownload).toHaveBeenCalledWith('aud-001', 'pdf');
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no audits exist', () => {
    const mockDashboard = {
      total_audits: 0,
      failing_audits: 0,
      warning_audits: 0,
      risk_score: 0,
      module_usage: {},
      recent_audits: [],
    };

    vi.mocked(useDashboardModule.useDashboard).mockReturnValue({
      data: mockDashboard,
      isLoading: false,
    } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);

    vi.mocked(auditsModule.downloadReport).mockResolvedValue(undefined);

    render(<RapportsPage />);

    expect(screen.getByText('Aucun rapport encore généré.')).toBeInTheDocument();
    expect(screen.getByText('Commencez par créer un audit')).toBeInTheDocument();
  });
});
