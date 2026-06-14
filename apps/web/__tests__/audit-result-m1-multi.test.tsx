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

/* ── Fixture: M1 with 2 marginals + 1 pairwise ───────────────────────── */

const M1_MULTI_FIXTURE = {
  id: 'a1',
  code: 'AUD-M1-MULTI-001',
  title: 'Recrutement multi-attributs',
  status: 'done',
  module: 'M1',
  protected_attribute: 'sexe',
  decision_column: 'embauche',
  favorable_value: 'oui',
  privileged_value: 'H',
  dataset_id: 'd1',
  created_at: '2026-06-07T10:00:00Z',
  completed_at: '2026-06-07T10:05:00Z',
  pre_check: [],
  config: {},
  metrics: {
    // Top-level aggregate (from first marginal)
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
    // Per-attribute marginals
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
      },
      {
        attribute: 'age',
        groups: [
          { value: 'senior', n: 200, favorable: 110, selection_rate: 0.55, disparate_impact: 1.0 },
          { value: 'junior', n: 400, favorable: 180, selection_rate: 0.45, disparate_impact: 0.82 },
        ],
        reference_value: 'senior',
        disparate_impact: 0.82,
        demographic_parity_diff: 0.1,
        worst_group: 'junior',
        verdict: 'warn' as const,
        risk_score: 50,
        warnings: [],
      },
    ],
    // Pairwise intersectional
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
      },
    ],
  },
  interpretation: {
    narrative: 'Des biais intersectionnels sont détectés sur sexe et age.',
    ai_act_anchors: ['AI Act art. 10'],
    disclaimers: [],
    provider: 'fallback',
    model: 'deterministic',
    recommendations: [],
  },
};

describe('M1 multi-attribute result page', () => {
  it('renders the aggregate verdict hero', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_MULTI_FIXTURE });
    render(<AuditResultPage />);
    expect(screen.getAllByText('Recrutement multi-attributs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Risque élevé').length).toBeGreaterThan(0);
  });

  it('shows the narrative from interpretation', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_MULTI_FIXTURE });
    render(<AuditResultPage />);
    expect(screen.getAllByText(/biais intersectionnels/i).length).toBeGreaterThan(0);
  });

  it('renders Groupes tab with per-attribute marginal cards', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_MULTI_FIXTURE });
    render(<AuditResultPage />);

    const groupesTab = screen.getByRole('tab', { name: /groupes/i });
    await userEvent.click(groupesTab);

    // Both marginal attribute names should appear
    expect(screen.getAllByText(/sexe/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/age/i).length).toBeGreaterThan(0);
  });

  it('renders pairwise section titled "sexe × age"', async () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_MULTI_FIXTURE });
    render(<AuditResultPage />);

    const groupesTab = screen.getByRole('tab', { name: /groupes/i });
    await userEvent.click(groupesTab);

    // The pairwise matrix section should have a title with both attribute names
    expect(screen.getByText(/sexe\s*×\s*age/i)).toBeInTheDocument();
  });

  it('renders 4 standard tabs', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_MULTI_FIXTURE });
    render(<AuditResultPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });
});
