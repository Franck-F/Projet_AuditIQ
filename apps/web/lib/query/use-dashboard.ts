import { useQuery } from '@tanstack/react-query';

import { type DashboardSummary, fetchDashboardSummary } from '@/lib/api/dashboard';

export function useDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  });
}
