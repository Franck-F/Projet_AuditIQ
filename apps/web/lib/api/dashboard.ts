import { api } from '@/lib/api/client';

export type RecentAudit = {
  id: string;
  code: string | null;
  title: string;
  module: string;
  verdict: 'pass' | 'warn' | 'fail' | null;
  risk_score: number | null;
  created_at: string;
};

export type DashboardSummary = {
  total_audits: number;
  failing_audits: number;
  warning_audits: number;
  risk_score: number;
  module_usage: Record<string, number>;
  recent_audits: RecentAudit[];
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary');
  return data;
}
