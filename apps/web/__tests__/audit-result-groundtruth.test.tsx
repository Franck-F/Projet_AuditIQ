import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useAudit } = vi.hoisted(() => ({ useAudit: vi.fn() }));
vi.mock('@/lib/query/use-audit', () => ({ useAudit }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'a1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const { downloadReport } = vi.hoisted(() => ({ downloadReport: vi.fn() }));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  downloadReport,
}));

vi.mock('@/lib/query/use-org', () => ({ useMe: () => ({ data: undefined }) }));
vi.mock('@/components/audits/AuditRowActions', () => ({ AuditRowActions: () => null }));
import AuditResultPage from '@/app/app/audits/[id]/page';

const _TL_REASON =
  'Equal Opportunity / Equalized Odds non calculable : moins de 2 groupes ' +
  'avec un taux de vrais positifs défini.';

function _base(metricsExtra: Record<string, unknown>) {
  return {
    id: 'a1',
    code: 'AUD-GT-001',
    title: 'Audit recrutement',
    status: 'done',
    module: 'M1',
    protected_attribute: 'sexe',
    decision_column: 'embauche',
    favorable_value: 'oui',
    dataset_id: 'd1',
    created_at: '2026-06-12T10:00:00Z',
    completed_at: '2026-06-12T10:05:00Z',
    pre_check: [],
    config: {},
    metrics: {
      groups: [
        { value: 'H', n: 300, favorable: 210, selection_rate: 0.7, disparate_impact: 1.0 },
        { value: 'F', n: 300, favorable: 150, selection_rate: 0.5, disparate_impact: 0.71 },
      ],
      reference_value: 'H',
      disparate_impact: 0.71,
      demographic_parity_diff: 0.2,
      worst_group: 'F',
      verdict: 'fail' as const,
      risk_score: 75,
      warnings: [],
      equal_opportunity_diff: null,
      equalized_odds_diff: null,
      marginals: [
        {
          attribute: 'sexe',
          groups: [
            { value: 'H', n: 300, favorable: 210, selection_rate: 0.7, disparate_impact: 1.0 },
            { value: 'F', n: 300, favorable: 150, selection_rate: 0.5, disparate_impact: 0.71 },
          ],
          reference_value: 'H',
          disparate_impact: 0.71,
          demographic_parity_diff: 0.2,
          worst_group: 'F',
          verdict: 'fail' as const,
          risk_score: 75,
          warnings: [],
          demographic_parity_ratio: 0.714,
          equal_opportunity_ratio: null,
          equalized_odds_ratio: null,
        },
      ],
      pairwise: [],
      ...metricsExtra,
    },
    interpretation: null,
  };
}

describe('M1 result — ground-truth status row', () => {
  it('surfaces truelabel_reason (NOT the "no ground truth" message) when GT was provided but EO is uncomputable', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: _base({ truelabel_reason: _TL_REASON }),
    });
    render(<AuditResultPage />);

    expect(
      screen.getByText(/moins de 2 groupes avec un taux de vrais positifs/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Aucune donnée de (ground truth|vérité-terrain)/i),
    ).not.toBeInTheDocument();
  });

  it('shows the no-ground-truth message only when none was provided (truelabel_reason null)', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: _base({ truelabel_reason: null }),
    });
    render(<AuditResultPage />);

    expect(
      screen.getByText(/Votre fichier ne contient pas le résultat réel des décisions/i),
    ).toBeInTheDocument();
    // and it must state that the dependent metrics (calibration incluse) could NOT be computed
    expect(
      screen.getByText(/n'ont pas pu être calculées/i),
    ).toBeInTheDocument();
  });
});
