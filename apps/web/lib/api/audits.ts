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
  ground_truth_column?: string | null;
  secondary_protected_attribute?: string | null;
  secondary_privileged_value?: string | null;
};

export type GroupStatOut = {
  value: string;
  n: number;
  favorable: number;
  selection_rate: number;
  disparate_impact: number;
  tpr?: number | null;
  fpr?: number | null;
};

export type IntersectionalCellOut = {
  primary_value: string;
  secondary_value: string;
  n: number;
  favorable: number;
  selection_rate: number;
  disparate_impact: number;
  verdict: Verdict;
  tpr?: number | null;
  fpr?: number | null;
};

export type IntersectionalOut = {
  cells: IntersectionalCellOut[];
  reference_primary: string;
  reference_secondary: string;
  worst_primary: string;
  worst_secondary: string;
  disparate_impact: number;
  demographic_parity_diff: number;
  verdict: Verdict;
  risk_score: number;
  marginal_di: number[];
  equal_opportunity_diff?: number | null;
  equalized_odds_diff?: number | null;
  demographic_parity_verdict?: Verdict | null;
  equal_opportunity_verdict?: Verdict | null;
  equalized_odds_verdict?: Verdict | null;
  warnings: string[];
  reason?: string | null;
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
  equal_opportunity_diff?: number | null;
  equalized_odds_diff?: number | null;
  demographic_parity_verdict?: Verdict | null;
  equal_opportunity_verdict?: Verdict | null;
  equalized_odds_verdict?: Verdict | null;
  truelabel_reason?: string | null;
  intersectional?: IntersectionalOut | null;
};

export type RecommendationOut = {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

export type InterpretationOut = {
  narrative: string;
  ai_act_anchors: string[];
  disclaimers: string[];
  provider: string;
  model: string;
  recommendations: RecommendationOut[];
};

export type FeatureContributionOut = {
  name: string;
  std_diff: number;
  direction: string;
};

export type ClusterStatOut = {
  id: number;
  n: number;
  positive_rate: number;
  deviation_pp: number;
  is_deviant: boolean;
  top_features: FeatureContributionOut[];
};

export type M2MetricsOut = {
  n: number;
  k: number;
  global_positive_rate: number;
  chi2: number;
  p_value: number;
  dof: number;
  clusters: ClusterStatOut[];
  deviant_cluster_ids: number[];
  verdict: Verdict;
  risk_score: number;
  warnings: string[];
};

export type M2ConfigIn = {
  features?: string[];
  k?: number;
  deviation_pp?: number;
  chi2_alpha?: number;
  random_state?: number;
};

export type M2AuditCreate = {
  dataset_id: string;
  title: string;
  module: 'M2';
  decision_column: string;
  favorable_value: string;
  config?: M2ConfigIn;
};

export type TargetIn = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body_template: string;
  response_path: string;
};

export type M3AuditCreate = {
  title: string;
  module: 'M3';
  target: TargetIn;
  lang: string;
};

export type CategoryStatOut = {
  name: string;
  length_gap: number;
  sentiment_gap: number;
  refusal_rate: number;
  score: number;
  verdict: Verdict;
};

export type DivergentExampleOut = {
  category: string;
  prompt_id: string;
  variant_a: string;
  variant_b: string;
  excerpt_a: string;
  excerpt_b: string;
  reason: string;
};

export type M3MetricsOut = {
  categories: CategoryStatOut[];
  global_score: number;
  verdict: Verdict;
  risk_score: number;
  divergent_examples: DivergentExampleOut[];
  n_pairs: number;
  n_calls_failed: number;
  warnings: string[];
};

export type AuditOut = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  error?: string | null;
  module: string;
  dataset_id: string | null;
  protected_attribute: string | null;
  decision_column: string | null;
  favorable_value: string | null;
  privileged_value: string | null;
  created_at: string;
  completed_at: string | null;
  metrics: M1MetricsOut | M2MetricsOut | M3MetricsOut | null;
  interpretation: InterpretationOut | null;
  pre_check: string[];
  config: Record<string, unknown> | null;
};

export async function uploadDataset(file: File): Promise<DatasetOut> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<DatasetOut>('/datasets', form);
  return data;
}

export async function createAudit(
  body: AuditCreate | M2AuditCreate | M3AuditCreate,
): Promise<AuditOut> {
  const { data } = await api.post<AuditOut>('/audits', body);
  return data;
}

export async function fetchAudit(id: string): Promise<AuditOut> {
  const { data } = await api.get<AuditOut>(`/audits/${id}`);
  return data;
}

export type ReportFormat = 'xlsx' | 'pdf';

const _REPORT_MIME: Record<ReportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

function _filename(contentDisposition: unknown, fallback: string): string {
  if (typeof contentDisposition === 'string') {
    const m = contentDisposition.match(/filename="?([^"]+)"?/);
    if (m && m[1]) return m[1];
  }
  return fallback;
}

export async function downloadReport(
  auditId: string,
  fmt: ReportFormat,
): Promise<void> {
  const res = await api.get<Blob>(`/audits/${auditId}/report.${fmt}`, {
    responseType: 'blob',
  });
  const blob =
    res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: _REPORT_MIME[fmt] });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = _filename(
      res.headers?.['content-disposition'],
      `rapport-${auditId}.${fmt}`,
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type ColumnProfileOut = {
  name: string;
  dtype: string;
  unique_count: number;
  null_ratio: number;
  top_values: Array<[unknown, number]>;
  role_hint: string;
};

export type SuggestionOut = {
  column: string;
  confidence: number;
  reason: string;
  favorable_value?: string | number | boolean | null;
  privileged_value?: string | number | boolean | null;
};

export type DatasetAnalysisOut = {
  columns: ColumnProfileOut[];
  suggested_decision?: SuggestionOut | null;
  suggested_protected?: SuggestionOut | null;
  protected_candidates?: SuggestionOut[];
  suggested_ground_truth?: SuggestionOut | null;
};

export async function analyzeDataset(
  datasetId: string,
): Promise<DatasetAnalysisOut> {
  const { data } = await api.post<DatasetAnalysisOut>(
    `/datasets/${datasetId}/analyze`,
  );
  return data;
}

export type TestConnectionIn = {
  target: TargetIn;
  test_prompt: string;
};

export type TestConnectionOut = {
  ok: boolean;
  extracted_value?: string;
  elapsed_ms?: number;
  reason?: string;
};

export async function testConnectionM3(
  body: TestConnectionIn,
): Promise<TestConnectionOut> {
  const { data } = await api.post<TestConnectionOut>(
    '/audits/m3/test-connection',
    body,
  );
  return data;
}
