import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/* ── Fixture: M1 WITH ground truth — ratios + per-group rates present ── */

const M1_WITH_GT_FIXTURE = {
  id: 'a1',
  code: 'AUD-M1-METRICS-001',
  title: 'Recrutement avec ground truth',
  status: 'done',
  module: 'M1',
  protected_attribute: 'sexe',
  decision_column: 'embauche',
  favorable_value: 'oui',
  privileged_value: 'H',
  dataset_id: 'd1',
  created_at: '2026-06-08T10:00:00Z',
  completed_at: '2026-06-08T10:05:00Z',
  pre_check: [],
  config: {},
  metrics: {
    groups: [
      {
        value: 'H',
        n: 300,
        favorable: 210,
        selection_rate: 0.7,
        disparate_impact: 1.0,
        tpr: 0.8,
        fpr: 0.2,
        fnr: 0.2,
        accuracy: 0.8,
        precision: 0.8,
      },
      {
        value: 'F',
        n: 300,
        favorable: 150,
        selection_rate: 0.5,
        disparate_impact: 0.71,
        tpr: 0.3,
        fpr: 0.7,
        fnr: 0.7,
        accuracy: 0.3,
        precision: 0.3,
      },
    ],
    reference_value: 'H',
    disparate_impact: 0.71,
    demographic_parity_diff: 0.2,
    worst_group: 'F',
    verdict: 'fail' as const,
    risk_score: 75,
    warnings: [],
    marginals: [
      {
        attribute: 'sexe',
        groups: [
          {
            value: 'H',
            n: 300,
            favorable: 210,
            selection_rate: 0.7,
            disparate_impact: 1.0,
            tpr: 0.8,
            fpr: 0.2,
            fnr: 0.2,
            accuracy: 0.8,
            precision: 0.8,
          },
          {
            value: 'F',
            n: 300,
            favorable: 150,
            selection_rate: 0.5,
            disparate_impact: 0.71,
            tpr: 0.3,
            fpr: 0.7,
            fnr: 0.7,
            accuracy: 0.3,
            precision: 0.3,
          },
        ],
        reference_value: 'H',
        disparate_impact: 0.71,
        demographic_parity_diff: 0.2,
        worst_group: 'F',
        verdict: 'fail' as const,
        risk_score: 75,
        warnings: [],
        demographic_parity_ratio: 0.714,
        equal_opportunity_ratio: 0.375,
        equalized_odds_ratio: 0.286,
      },
    ],
    pairwise: [
      {
        primary_attribute: 'sexe',
        secondary_attribute: 'age',
        cells: [
          {
            primary_value: 'H',
            secondary_value: 'senior',
            n: 150,
            favorable: 120,
            selection_rate: 0.8,
            disparate_impact: 1.0,
            verdict: 'pass' as const,
          },
          {
            primary_value: 'F',
            secondary_value: 'junior',
            n: 200,
            favorable: 60,
            selection_rate: 0.3,
            disparate_impact: 0.375,
            verdict: 'fail' as const,
          },
        ],
        reference_primary: 'H',
        reference_secondary: 'senior',
        worst_primary: 'F',
        worst_secondary: 'junior',
        disparate_impact: 0.375,
        demographic_parity_diff: 0.5,
        verdict: 'fail' as const,
        risk_score: 88,
        marginal_di: [0.71, 0.82],
        warnings: [],
        demographic_parity_ratio: 0.375,
        equal_opportunity_ratio: 0.25,
        equalized_odds_ratio: 0.2,
      },
    ],
  },
  interpretation: {
    narrative: 'Des biais significatifs sont détectés sur le genre.',
    ai_act_anchors: ['AI Act art. 10'],
    disclaimers: [],
    provider: 'fallback',
    model: 'deterministic',
    recommendations: [],
  },
};

/* ── Fixture: M1 WITHOUT ground truth — no per-group rates, no EO/EOdds ratio ── */

const M1_WITHOUT_GT_FIXTURE = {
  id: 'a1',
  code: 'AUD-M1-METRICS-002',
  title: 'Recrutement sans ground truth',
  status: 'done',
  module: 'M1',
  protected_attribute: 'sexe',
  decision_column: 'embauche',
  favorable_value: 'oui',
  privileged_value: 'H',
  dataset_id: 'd1',
  created_at: '2026-06-08T10:00:00Z',
  completed_at: '2026-06-08T10:05:00Z',
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
        // demographic_parity_ratio present even without GT (computed from selection rates only)
        demographic_parity_ratio: 0.714,
        equal_opportunity_ratio: null,
        equalized_odds_ratio: null,
      },
    ],
    pairwise: [],
  },
  interpretation: null,
};

/* ── Helper: navigate to Groupes tab ─────────────────────────────────── */

async function openGroupesTab() {
  const tab = screen.getByRole('tab', { name: /groupes/i });
  await userEvent.click(tab);
}

/* ── Tests ────────────────────────────────────────────────────────────── */

describe('M1 fairlearn metrics — with ground truth', () => {
  it('renders without crashing and shows verdict', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    expect(screen.getAllByText('Risque élevé').length).toBeGreaterThan(0);
  });

  it('shows DP ratio value in Groupes tab (marginal card)', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // DP ratio = 0.714 → formatted as "0.714"
    expect(screen.getAllByText('0.714').length).toBeGreaterThan(0);
  });

  it('shows EO ratio value in Groupes tab (marginal card)', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // EO ratio = 0.375 → formatted as "0.375"
    expect(screen.getAllByText('0.375').length).toBeGreaterThan(0);
  });

  it('shows EOdds ratio value in Groupes tab (marginal card)', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // EOdds ratio = 0.286 → formatted as "0.286"
    expect(screen.getAllByText('0.286').length).toBeGreaterThan(0);
  });

  it('renders the per-group rate columns (FNR, Précision, Accuracy) for each group', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // Column headers
    expect(screen.getByText('Refus à tort')).toBeInTheDocument();
    expect(screen.getByText('Précision')).toBeInTheDocument();
    expect(screen.getByText('Exactitude')).toBeInTheDocument();
  });

  it('renders per-group rate values for group H (fnr=20%, precision=80%, accuracy=80%)', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // group H: fnr=0.2 → "20.0%", precision=0.8 → "80.0%", accuracy=0.8 → "80.0%"
    const cells80 = screen.getAllByText('80.0%');
    expect(cells80.length).toBeGreaterThan(0);
    const cells20 = screen.getAllByText('20.0%');
    expect(cells20.length).toBeGreaterThan(0);
  });

  it('shows ratios for pairwise matrix', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // Pairwise DP ratio = 0.375, EO = 0.250, EOdds = 0.200
    // 0.375 also appears as EO ratio in marginal; 0.250 and 0.200 are unique to pairwise
    expect(screen.getByText('0.250')).toBeInTheDocument();
    expect(screen.getByText('0.200')).toBeInTheDocument();
  });

  it('marks ratio sections as informatif', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    const informatifLabels = screen.getAllByText(/informatif/i);
    expect(informatifLabels.length).toBeGreaterThan(0);
  });

  it('does not change the verdict/hero section', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITH_GT_FIXTURE });
    render(<AuditResultPage />);

    // verdict hero still present — no impact on verdict display
    expect(screen.getAllByText('Risque élevé').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recrutement avec ground truth').length).toBeGreaterThan(0);
  });
});

describe('M1 fairlearn metrics — without ground truth (backward compat)', () => {
  it('shows DP ratio even without GT', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITHOUT_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // DP ratio = 0.714 is always present
    expect(screen.getByText('0.714')).toBeInTheDocument();
  });

  it('does NOT show EO ratio or EOdds ratio when null (no GT)', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITHOUT_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // "Ratio EO" and "Ratio EOdds" labels should not appear because the values are null
    expect(screen.queryByText('Ratio EO')).not.toBeInTheDocument();
    expect(screen.queryByText('Ratio EOdds')).not.toBeInTheDocument();
  });

  it('does NOT render the per-group rate table when no GT provided', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITHOUT_GT_FIXTURE });
    render(<AuditResultPage />);
    await openGroupesTab();

    // No per-group rate columns (Refus à tort, Précision, Exactitude) should appear
    expect(screen.queryByText('Refus à tort')).not.toBeInTheDocument();
    expect(screen.queryByText('Précision')).not.toBeInTheDocument();
    expect(screen.queryByText('Exactitude')).not.toBeInTheDocument();
  });

  it('still renders verdict correctly without GT', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_WITHOUT_GT_FIXTURE });
    render(<AuditResultPage />);

    expect(screen.getAllByText('Risque élevé').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recrutement sans ground truth').length).toBeGreaterThan(0);
  });
});
