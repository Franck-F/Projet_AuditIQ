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

const BASE_DATA = {
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
      verdict: 'fail' as const,
      code: 'AUD-001',
      risk_score: 82,
      created_at: '2025-01-15T10:00:00Z',
    },
    {
      id: 'AUD-002',
      title: 'Scoring crédit',
      module: 'fairness',
      verdict: 'warn' as const,
      code: 'AUD-002',
      risk_score: 65,
      created_at: '2025-01-14T09:00:00Z',
    },
    {
      id: 'AUD-003',
      title: 'Détection fraude',
      module: 'explainability',
      verdict: 'pass' as const,
      code: 'AUD-003',
      risk_score: 45,
      created_at: '2025-01-13T08:00:00Z',
    },
  ],
};

describe('Dashboard (R9 maquette)', () => {
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
    expect(screen.getByText('Impossible de charger le tableau de bord.')).toBeInTheDocument();
  });

  it('renders 4 metric cards with R9 maquette labels', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: BASE_DATA,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    // R9 maquette labels
    expect(screen.getAllByText('Score de conformité').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Audits actifs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modèles non conformes').length).toBeGreaterThan(0);
    expect(screen.getAllByText("Délai moyen d'audit").length).toBeGreaterThan(0);

    // Check metric values
    expect(screen.getAllByText('18')).toBeTruthy(); // total_audits
    expect(screen.getAllByText('2')).toBeTruthy();  // failing
  });

  it('renders recent audits table section heading', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: {
        ...BASE_DATA,
        recent_audits: [
          {
            id: 'AUD-001',
            title: 'Prêt immobilier',
            module: 'fairness',
            verdict: 'fail' as const,
            code: 'AUD-001',
            risk_score: 82,
            created_at: '2025-01-15T10:00:00Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    // R9 section labels
    expect(screen.getByText('Derniers audits exécutés')).toBeInTheDocument();
    expect(screen.getByText('Prêt immobilier')).toBeInTheDocument();
  });

  it('renders "Nouvel audit" button in topbar actions', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: { ...BASE_DATA, recent_audits: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    const links = screen.getAllByRole('link');
    const newAuditLink = links.find(
      (l) => l.getAttribute('href') === '/app/audits/nouveau'
    );
    expect(newAuditLink).toBeTruthy();
  });

  it('renders hero greeting with Bonjour', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: { ...BASE_DATA, recent_audits: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    // Greeting h1 contains "Bonjour"
    const greetings = screen.getAllByText(/Bonjour/i);
    expect(greetings.length).toBeGreaterThan(0);
  });

  it('renders action band with CTA', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: { ...BASE_DATA, recent_audits: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    expect(
      screen.getByText('Lancez un audit en moins de 7 minutes')
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    const commencer = links.find((l) => l.textContent?.includes('Commencer'));
    expect(commencer).toBeTruthy();
  });

  it('renders "Tout voir" link to /app/audits', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: { ...BASE_DATA, recent_audits: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    const toutVoir = screen.getByText('Tout voir →');
    expect(toutVoir.closest('a')).toHaveAttribute('href', '/app/audits');
  });

  it('renders tendance and répartition right column', () => {
    vi.spyOn(useD, 'useDashboard').mockReturnValue({
      data: { ...BASE_DATA, recent_audits: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useD.useDashboard>);

    render(<DashboardPage />);

    expect(screen.getByText('Conformité globale')).toBeInTheDocument();
    expect(screen.getByText('Répartition des statuts')).toBeInTheDocument();
  });
});
