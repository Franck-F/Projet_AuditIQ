import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useDashboard } = vi.hoisted(() => ({ useDashboard: vi.fn() }));
vi.mock('@/lib/query/use-dashboard', () => ({ useDashboard }));

import DashboardPage from '@/app/app/page';

describe('dashboard module breakdown', () => {
  it('renders M2 alongside M1 in module usage', () => {
    useDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        total_audits: 3,
        failing_audits: 1,
        warning_audits: 0,
        risk_score: 40,
        module_usage: { M1: 2, M2: 1 },
        recent_audits: [],
      },
    });
    render(<DashboardPage />);
    expect(screen.getByText('M2')).toBeInTheDocument();
    expect(screen.getByText('M1')).toBeInTheDocument();
  });
});
