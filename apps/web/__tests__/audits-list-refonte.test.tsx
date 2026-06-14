import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import AuditsListPage from '@/app/app/audits/page';
import { useDashboard } from '@/lib/query/use-dashboard';

vi.mock('@/lib/query/use-dashboard');

const mockDashboardData = {
  total_audits: 4,
  recent_audits: [
    {
      id: 'AUD-1001',
      title: 'Audit conformité fairness 1',
      code: 'AUD-1001',
      module: 'credit-approval',
      verdict: 'pass' as const,
      risk_score: 92,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'AUD-1002',
      title: 'Audit conformité fairness 2',
      code: 'AUD-1002',
      module: 'hiring-model',
      verdict: 'warn' as const,
      risk_score: 65,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'AUD-1003',
      title: 'Audit conformité fairness 3',
      code: 'AUD-1003',
      module: 'ad-targeting',
      verdict: 'warn' as const,
      risk_score: 58,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'AUD-1004',
      title: 'Audit conformité fairness 4',
      code: 'AUD-1004',
      module: 'loan-pricing',
      verdict: 'fail' as const,
      risk_score: 42,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

describe('AuditsListPage - R4 Refonte', () => {
  beforeEach(() => {
    vi.mocked(useDashboard).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboard>);
  });

  it('renders 4 MetricCards with correct labels', () => {
    render(<AuditsListPage />);

    expect(screen.getByText('Total audits')).toBeInTheDocument();
    // MetricCard labels reprennent les libellés de verdict orientés risque
    expect(screen.getAllByText('Risque faible')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Vigilance')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Risque élevé')[0]).toBeInTheDocument();
  });

  it('renders 4 filter tabs', () => {
    render(<AuditsListPage />);

    expect(screen.getByRole('tab', { name: 'Tous' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Risque élevé' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Vigilance' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Risque faible' })).toBeInTheDocument();
  });

  it('shows 4 audits in "Tous" tab by default', () => {
    render(<AuditsListPage />);

    expect(screen.getByText('Audit conformité fairness 1')).toBeInTheDocument();
    expect(screen.getByText('Audit conformité fairness 2')).toBeInTheDocument();
    expect(screen.getByText('Audit conformité fairness 3')).toBeInTheDocument();
    expect(screen.getByText('Audit conformité fairness 4')).toBeInTheDocument();
  });

  it('filters to only "Non conformes" when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AuditsListPage />);

    const tab = screen.getByRole('tab', { name: 'Risque élevé' });
    await user.click(tab);

    // Should show only the 'fail' audit
    expect(screen.getByText('Audit conformité fairness 4')).toBeInTheDocument();
    // Others should not be visible in the table
    expect(screen.queryByText('Audit conformité fairness 1')).not.toBeInTheDocument();
  });

  it('filters to only "Sous vigilance" when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AuditsListPage />);

    const tab = screen.getByRole('tab', { name: 'Vigilance' });
    await user.click(tab);

    // Should show the 2 'warn' audits
    expect(screen.getByText('Audit conformité fairness 2')).toBeInTheDocument();
    expect(screen.getByText('Audit conformité fairness 3')).toBeInTheDocument();
    // Others should not be visible
    expect(screen.queryByText('Audit conformité fairness 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit conformité fairness 4')).not.toBeInTheDocument();
  });

  it('filters to only "Conformes" when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AuditsListPage />);

    const tab = screen.getByRole('tab', { name: 'Risque faible' });
    await user.click(tab);

    // Should show only the 'pass' audit
    expect(screen.getByText('Audit conformité fairness 1')).toBeInTheDocument();
    // Others should not be visible
    expect(screen.queryByText('Audit conformité fairness 2')).not.toBeInTheDocument();
  });

  it('shows metric card values from data', () => {
    render(<AuditsListPage />);

    // Check that metric card values are rendered
    expect(screen.getByText('4')).toBeInTheDocument(); // Total audits
    expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // Conformes (1 pass)
    expect(screen.getByText('2')).toBeInTheDocument(); // Sous vigilance (2 warn)
  });

  it('renders table with audit titles and codes', () => {
    render(<AuditsListPage />);

    // Codes are displayed in a table row with module info
    expect(screen.getByText(/AUD-1001 · credit-approval/)).toBeInTheDocument();
    expect(screen.getByText(/AUD-1002 · hiring-model/)).toBeInTheDocument();
    expect(screen.getByText(/AUD-1003 · ad-targeting/)).toBeInTheDocument();
    expect(screen.getByText(/AUD-1004 · loan-pricing/)).toBeInTheDocument();
  });

  it('renders status badges for each audit', () => {
    render(<AuditsListPage />);

    // Les libellés de verdict apparaissent aussi dans les KPI et les onglets :
    // on restreint la vérification aux badges de statut du tableau.
    const table = screen.getByRole('table');
    const conforme = within(table).getAllByText('Risque faible');
    const vigilance = within(table).getAllByText('Vigilance');
    const critique = within(table).getAllByText('Risque élevé');

    expect(conforme.length).toBe(1); // 1 pass
    expect(vigilance.length).toBe(2); // 2 warn
    expect(critique.length).toBe(1); // 1 fail
  });

  it('displays loading state when isLoading is true', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useDashboard>);

    render(<AuditsListPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays error state when isError is true', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useDashboard>);

    render(<AuditsListPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows "Nouvel audit" button in topbar', () => {
    render(<AuditsListPage />);
    expect(screen.getByRole('link', { name: /Nouvel audit/ })).toBeInTheDocument();
  });

  it('shows the filter tab strip in the table header (no more Filtres/Exporter buttons)', () => {
    render(<AuditsListPage />);
    // La barre d'outils ne contient plus de boutons « Filtres »/« Exporter »
    expect(screen.queryByRole('button', { name: /Filtres/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Exporter/ })).not.toBeInTheDocument();
    // Elle expose désormais les 4 onglets de filtre par verdict
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });
});
