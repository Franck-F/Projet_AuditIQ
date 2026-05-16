import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useDashboard } = vi.hoisted(() => ({ useDashboard: vi.fn() }));
vi.mock('@/lib/query/use-dashboard', () => ({ useDashboard }));

import DashboardPage from '@/app/app/page';

describe('dashboard page', () => {
  it('renders live API aggregates', () => {
    useDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        total_audits: 12,
        failing_audits: 2,
        warning_audits: 3,
        risk_score: 62,
        module_usage: { M1: 12 },
        recent_audits: [
          {
            id: 'a1',
            code: 'AUD-2026-001',
            title: 'Recrutement Q2',
            module: 'M1',
            verdict: 'fail',
            risk_score: 55,
            created_at: '2026-05-16T10:00:00Z',
          },
        ],
      },
    });
    render(<DashboardPage />);
    expect(screen.getByText('Recrutement Q2')).toBeInTheDocument();
    expect(screen.getByText(/AUD-2026-001/)).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    useDashboard.mockReturnValue({ isLoading: true, isError: false });
    render(<DashboardPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
