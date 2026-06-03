import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import DashboardPage from '@/app/app/page';
import * as useD from '@/lib/query/use-dashboard';

vi.mock('@/lib/query/use-dashboard');

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Dashboard refonte (R4)', () => {
  it('renders loading state', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<DashboardPage />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement du tableau de bord'
    );
  });

  it('renders error state', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<DashboardPage />);
    expect(screen.getByText('Impossible de charger le tableau de bord.')).toBeInTheDocument();
  });

  it('renders 4 metric cards with correct labels and values', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: {
        total_audits: 18,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 74,
        module_usage: { 'fairness': 8, 'explainability': 5, 'performance': 5 },
        recent_audits: [
          {
            id: 'AUD-001',
            title: 'Prêt immobilier',
            module: 'fairness',
            verdict: 'fail',
            code: 'AUD-001',
            risk_score: 82,
            created_at: '2025-01-15T10:00:00Z',
          },
          {
            id: 'AUD-002',
            title: 'Scoring crédit',
            module: 'fairness',
            verdict: 'warn',
            code: 'AUD-002',
            risk_score: 65,
            created_at: '2025-01-14T09:00:00Z',
          },
          {
            id: 'AUD-003',
            title: 'Détection fraude',
            module: 'explainability',
            verdict: 'pass',
            code: 'AUD-003',
            risk_score: 45,
            created_at: '2025-01-13T08:00:00Z',
          },
          {
            id: 'AUD-004',
            title: 'Classification images',
            module: 'performance',
            verdict: 'pass',
            code: 'AUD-004',
            risk_score: 42,
            created_at: '2025-01-12T07:00:00Z',
          },
          {
            id: 'AUD-005',
            title: 'Recommandations produits',
            module: 'fairness',
            verdict: 'warn',
            code: 'AUD-005',
            risk_score: 68,
            created_at: '2025-01-11T06:00:00Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DashboardPage />);

    // Check 4 metric cards by label
    expect(
      screen.getByText('Score conformité', { selector: '[class*="uppercase"]' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Audits actifs', { selector: '[class*="uppercase"]' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Modèles non conformes', {
        selector: '[class*="uppercase"]',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Délai moyen d'audit", {
        selector: '[class*="uppercase"]',
      })
    ).toBeInTheDocument();

    // Check metric values (may appear multiple times, so use getAllBy)
    expect(screen.getAllByText('74')).toBeTruthy(); // risk_score
    expect(screen.getAllByText('18')).toBeTruthy(); // total_audits
    expect(screen.getAllByText('2')).toBeTruthy(); // failing_audits appears
  });

  it('renders recent audits table with at least 1 row', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: {
        total_audits: 18,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 74,
        module_usage: {},
        recent_audits: [
          {
            id: 'AUD-001',
            title: 'Prêt immobilier',
            module: 'fairness',
            verdict: 'fail',
            code: 'AUD-001',
            risk_score: 82,
            created_at: '2025-01-15T10:00:00Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DashboardPage />);

    // Check table headers
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Attribut')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Statut')).toBeInTheDocument();

    // Check recent audit row
    expect(screen.getByText('Prêt immobilier')).toBeInTheDocument();
  });

  it('renders "Nouvel audit" button in topbar actions', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: {
        total_audits: 18,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 74,
        module_usage: {},
        recent_audits: [],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DashboardPage />);

    const newAuditButton = screen.getAllByText('Nouvel audit');
    expect(newAuditButton.length).toBeGreaterThan(0);
    const link = newAuditButton[0]?.closest('a');
    expect(link).toBeTruthy();
    if (link) {
      expect(link).toHaveAttribute('href', '/app/audits/nouveau');
    }
  });

  it('renders hero greeting', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: {
        total_audits: 18,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 74,
        module_usage: {},
        recent_audits: [],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DashboardPage />);

    // Check hero greeting exists (text split across nodes due to italic)
    expect(screen.getByText(/Bonjour/i)).toBeInTheDocument();
    expect(screen.getByText('fairness', { selector: 'em' })).toBeInTheDocument();
    expect(
      screen.getByText(/modèles en production/i)
    ).toBeInTheDocument();
  });

  it('renders action band with CTA', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: {
        total_audits: 18,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 74,
        module_usage: {},
        recent_audits: [],
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<DashboardPage />);

    expect(
      screen.getByText('Lancez un audit en moins de 7 minutes')
    ).toBeInTheDocument();
    expect(screen.getByText('Commencer')).toBeInTheDocument();
  });
});
