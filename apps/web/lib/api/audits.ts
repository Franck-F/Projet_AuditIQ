import { api } from '@/lib/api/client';

export type Verdict = 'pass' | 'warn' | 'fail';

export type DatasetOut = {
  id: string;
  filename: string;
  row_count: number;
  columns: string[];
  status: string;
  created_at: string;
  expires_at: string | null;
};

export type AuditCreate = {
  dataset_id: string;
  title: string;
  protected_attribute: string;
  decision_column: string;
  favorable_value: string;
  privileged_value: string | null;
};

export type GroupStatOut = {
  value: string;
  n: number;
  favorable: number;
  selection_rate: number;
  disparate_impact: number;
};

export type M1MetricsOut = {
  groups: GroupStatOut[];
  reference_value: string;
  disparate_impact: number;
  demographic_parity_diff: number;
  worst_group: string;
  verdict: Verdict;
  risk_score: number;
  warnings: string[];
};

export type InterpretationOut = {
  narrative: string;
  ai_act_anchors: string[];
  disclaimers: string[];
  provider: string;
  model: string;
};

export type AuditOut = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  module: string;
  dataset_id: string;
  protected_attribute: string;
  decision_column: string;
  favorable_value: string;
  privileged_value: string | null;
  created_at: string;
  completed_at: string | null;
  metrics: M1MetricsOut | null;
  interpretation: InterpretationOut | null;
};

export async function uploadDataset(file: File): Promise<DatasetOut> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<DatasetOut>('/datasets', form);
  return data;
}

export async function createAudit(body: AuditCreate): Promise<AuditOut> {
  const { data } = await api.post<AuditOut>('/audits', body);
  return data;
}

export async function fetchAudit(id: string): Promise<AuditOut> {
  const { data } = await api.get<AuditOut>(`/audits/${id}`);
  return data;
}
