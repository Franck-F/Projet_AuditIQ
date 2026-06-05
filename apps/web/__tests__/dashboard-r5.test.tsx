import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import DashboardPage from '@/app/app/page';
import * as useD from '@/lib/query/use-dashboard';

vi.mock('@/lib/query/use-dashboard');

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const MOCK_DATA = {
  total_audits: 12,
  failing_audits: 3,
  warning_audits: 5,
  risk_score: 62,
  module_usage: { M1: 5, M2: 4, M3: 3 },
  recent_audits: [
    {
      id: 'AUD-001',
      code: 'AUD-001',
      title: 'Recrutement Q2 2026 — Scoring CV',
      module: 'M1',
      verdict: 'fail' as const,
      risk_score: 72,
      created_at: '2026-05-10T08:00:00Z',
    },
    {
      id: 'AUD-002',
      code: 'AUD-002',
      title: 'Scoring crédit immobilier',
      module: 'M2',
      verdict: 'warn' as const,
      risk_score: 55,
      created_at: '2026-05-09T18:00:00Z',
    },
    {
      id: 'AUD-003',
      code: 'AUD-003',
      title: 'Chatbot SAV — fairness',
      module: 'M3',
      verdict: 'warn' as const,
      risk_score: 48,
      created_at: '2026-05-03T14:00:00Z',
    },
    {
      id: 'AUD-004',
      code: 'AUD-004',
      title: 'Plateforme onboarding',
      module: 'M2',
      verdict: 'pass' as const,
      risk_score: 28,
      created_at: '2026-04-28T11:00:00Z',
    },
    {
      id: 'AUD-005',
      code: 'AUD-005',
      title: 'Modèle attribution prime',
      module: 'M1',
      verdict: 'pass' as const,
      risk_score: 22,
      created_at: '2026-04-22T09:00:00Z',
    },
  ],
};

function mockData(overrides = {}) {
  vi.spyOn(useD, 'useDashboard').mockReturnValue({
    data: { ...MOCK_DATA, ...overrides },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useD.useDashboard>);
}

describe('Dashboard R5 — maquette fidelity', () => {
  it('renders loading state', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

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
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);
    expect(
      screen.getByText('Impossible de charger le tableau de bord.')
    ).toBeInTheDocument();
  });

  it('renders hero greeting', () => {
    mockData();
    render(<DashboardPage />);
    expect(screen.getByText(/Bonjour/i)).toBeInTheDocument();
  });

  it('renders 4 MetricCard labels matching R9 maquette', () => {
    mockData();
    render(<DashboardPage />);

    // R9 maquette labels
    expect(screen.getByText('Score de conformité')).toBeInTheDocument();
    expect(screen.getByText('Audits actifs')).toBeInTheDocument();
    expect(screen.getByText('Modèles non conformes')).toBeInTheDocument();
    expect(screen.getByText("Délai moyen d'audit")).toBeInTheDocument();
  });

  it('renders recent audits section with rows', () => {
    mockData();
    render(<DashboardPage />);

    expect(screen.getByText('Derniers audits exécutés')).toBeInTheDocument();
    expect(screen.getByText('Recrutement Q2 2026 — Scoring CV')).toBeInTheDocument();
    expect(screen.getByText('Scoring crédit immobilier')).toBeInTheDocument();
    expect(screen.getByText('Chatbot SAV — fairness')).toBeInTheDocument();
    expect(screen.getByText('Plateforme onboarding')).toBeInTheDocument();
    expect(screen.getByText('Modèle attribution prime')).toBeInTheDocument();
  });

  it('renders audit status badges for mixed verdicts', () => {
    mockData();
    render(<DashboardPage />);

    const critiques = screen.getAllByText('Critique');
    expect(critiques.length).toBeGreaterThanOrEqual(1);
    const vigilances = screen.getAllByText('Vigilance');
    expect(vigilances.length).toBeGreaterThanOrEqual(1);
    const conformes = screen.getAllByText('Conforme');
    expect(conformes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders right column with tendance and répartition cards', () => {
    mockData();
    render(<DashboardPage />);

    expect(screen.getByText('Conformité globale')).toBeInTheDocument();
    expect(screen.getByText('Répartition des statuts')).toBeInTheDocument();
  });

  it('renders action band CTA with Commencer link', () => {
    mockData();
    render(<DashboardPage />);

    expect(
      screen.getByText('Lancez un audit en moins de 7 minutes')
    ).toBeInTheDocument();
    const commencer = screen.getByText('Commencer');
    expect(commencer.closest('a')).toHaveAttribute('href', '/app/audits/nouveau');
  });

  it('does not render old R5 sections (Alertes prioritaires, M1/M2/M3 cards)', () => {
    mockData();
    render(<DashboardPage />);

    // R9 removed these R5-specific elements
    expect(screen.queryByText('Alertes prioritaires')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit supervisé')).not.toBeInTheDocument();
  });

  it('renders "Tout voir" link to /app/audits', () => {
    mockData();
    render(<DashboardPage />);

    const link = screen.getByText('Tout voir →');
    expect(link.closest('a')).toHaveAttribute('href', '/app/audits');
  });
});
