import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useAudit } = vi.hoisted(() => ({ useAudit: vi.fn() }));
vi.mock('@/lib/query/use-audit', () => ({ useAudit }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'a1' }) }));

const { downloadReport } = vi.hoisted(() => ({ downloadReport: vi.fn() }));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  downloadReport,
}));

import AuditResultPage from '@/app/app/audits/[id]/page';

const M1_FIXTURE = {
  id: 'a1',
  code: 'AUD-R3-001',
  title: 'Scoring crédit — Particuliers Q2',
  status: 'done',
  module: 'M1',
  protected_attribute: 'genre',
  decision_column: 'credit',
  favorable_value: 'accorde',
  privileged_value: 'Hommes',
  created_at: '2026-06-01T10:00:00Z',
  completed_at: '2026-06-01T10:05:00Z',
  pre_check: [],
  config: {},
  metrics: {
    groups: [
      { value: 'Hommes', n: 62140, favorable: 44119, selection_rate: 0.71, disparate_impact: 1.0 },
      { value: 'Femmes', n: 58920, favorable: 28870, selection_rate: 0.49, disparate_impact: 0.69 },
    ],
    reference_value: 'Hommes',
    disparate_impact: 0.69,
    demographic_parity_diff: 0.22,
    worst_group: 'Femmes',
    verdict: 'fail' as const,
    risk_score: 52,
    warnings: [],
  },
  interpretation: {
    narrative:
      'Le modèle accorde le crédit aux femmes 1,4 fois moins souvent qu’aux hommes à situation comparable.',
    ai_act_anchors: ['AI Act art. 10'],
    disclaimers: ['Aide à l\'analyse, pas un verdict de conformité.'],
    provider: 'fallback',
    model: 'deterministic',
    recommendations: [
      { title: 'Ré-équilibrer le seuil', detail: 'Ajuster le seuil de décision.', priority: 'high' as const },
      { title: 'Audit post-correctif', detail: 'Relancer un audit après correction.', priority: 'medium' as const },
    ],
  },
};

describe('audit result page — R3 refonte', () => {
  it('renders the verdict hero text', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_FIXTURE });
    render(<AuditResultPage />);

    // narrative from interpretation (appears in hero and synthèse tab)
    expect(screen.getAllByText(/1,4 fois moins souvent/).length).toBeGreaterThan(0);
    // title in hero
    expect(screen.getByText('Scoring crédit — Particuliers Q2')).toBeInTheDocument();
    // verdict text
    expect(screen.getByText('Non conforme')).toBeInTheDocument();
  });

  it('renders 4 tabs with role=tab', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_FIXTURE });
    render(<AuditResultPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    const labels = tabs.map((t) => t.textContent);
    expect(labels).toContain('Synthèse');
    expect(labels).toContain('Métriques détaillées');
    expect(labels).toContain('Groupes');
    expect(labels).toContain('Méthodologie');
  });

  it('has the Rapport PDF button in the topbar action area', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_FIXTURE });
    render(<AuditResultPage />);

    const pdfBtn = screen.getByRole('button', { name: /rapport pdf/i });
    expect(pdfBtn).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useAudit.mockReturnValue({ isLoading: true, isError: false });
    render(<AuditResultPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows running state', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'r1',
        code: 'AUD-R3-002',
        title: 'En cours',
        status: 'running',
        module: 'M1',
        dataset_id: null,
        protected_attribute: null,
        decision_column: null,
        favorable_value: null,
        privileged_value: null,
        created_at: '2026-06-01T10:00:00Z',
        completed_at: null,
        metrics: null,
        interpretation: null,
        error: null,
        pre_check: [],
        config: {},
      },
    });
    render(<AuditResultPage />);
    expect(screen.getByText(/analyse en cours/i)).toBeInTheDocument();
  });

  it('renames Groupes tab to Clusters for M2', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'm2-1',
        code: 'AUD-R3-003',
        title: 'M2 Audit',
        status: 'done',
        module: 'M2',
        dataset_id: 'd',
        protected_attribute: null,
        decision_column: 'embauche',
        favorable_value: 'oui',
        privileged_value: null,
        created_at: '2026-06-01T10:00:00Z',
        completed_at: '2026-06-01T10:05:00Z',
        pre_check: [],
        config: { k: 2 },
        metrics: {
          n: 240,
          k: 2,
          global_positive_rate: 0.5,
          chi2: 88.1,
          p_value: 0.0001,
          dof: 1,
          clusters: [
            { id: 0, n: 120, positive_rate: 0.1, deviation_pp: -40, is_deviant: true, top_features: [] },
            { id: 1, n: 120, positive_rate: 0.9, deviation_pp: 40, is_deviant: false, top_features: [] },
          ],
          deviant_cluster_ids: [0],
          verdict: 'fail' as const,
          risk_score: 88,
          warnings: [],
        },
        interpretation: null,
      },
    });
    render(<AuditResultPage />);
    const tabs = screen.getAllByRole('tab');
    const labels = tabs.map((t) => t.textContent);
    expect(labels).toContain('Clusters');
    expect(labels).not.toContain('Groupes');
  });

  it('renames Groupes tab to Catégories for M3', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'm3-1',
        code: 'AUD-R3-004',
        title: 'M3 Audit',
        status: 'done',
        module: 'M3',
        dataset_id: null,
        protected_attribute: null,
        decision_column: null,
        favorable_value: null,
        privileged_value: null,
        created_at: '2026-06-01T10:00:00Z',
        completed_at: '2026-06-01T10:05:00Z',
        pre_check: [],
        config: { lang: 'fr' },
        metrics: {
          categories: [
            { name: 'genre', length_gap: 0.4, sentiment_gap: 0.2, refusal_rate: 0.5, score: 0.55, verdict: 'warn' as const },
          ],
          global_score: 0.55,
          verdict: 'warn' as const,
          risk_score: 55,
          divergent_examples: [],
          n_pairs: 12,
          n_calls_failed: 0,
          warnings: [],
        },
        interpretation: null,
      },
    });
    render(<AuditResultPage />);
    const tabs = screen.getAllByRole('tab');
    const labels = tabs.map((t) => t.textContent);
    expect(labels).toContain('Catégories');
    expect(labels).not.toContain('Groupes');
  });
});
