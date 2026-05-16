import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useAudit } = vi.hoisted(() => ({ useAudit: vi.fn() }));
vi.mock('@/lib/query/use-audit', () => ({ useAudit }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'a1' }) }));

import AuditResultPage from '@/app/app/audits/[id]/page';

describe('audit result page', () => {
  it('renders metrics, narrative, anchors and disclaimers', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'a1',
        code: 'AUD-2026-007',
        title: 'Recrutement Q2',
        status: 'done',
        module: 'M1',
        pre_check: [],
        metrics: {
          groups: [
            { value: 'Femmes', n: 200, favorable: 72, selection_rate: 0.36, disparate_impact: 0.72 },
            { value: 'Hommes', n: 200, favorable: 100, selection_rate: 0.5, disparate_impact: 1.0 },
          ],
          reference_value: 'Hommes',
          disparate_impact: 0.72,
          demographic_parity_diff: 0.14,
          worst_group: 'Femmes',
          verdict: 'fail',
          risk_score: 55,
          warnings: [],
        },
        interpretation: {
          narrative: 'Un écart défavorable touche les femmes.',
          ai_act_anchors: ['AI Act art. 10'],
          disclaimers: ['Aide à l’analyse, pas un verdict de conformité.'],
          provider: 'fallback',
          model: 'deterministic',
        },
      },
    });
    render(<AuditResultPage />);
    expect(screen.getByText('Recrutement Q2')).toBeInTheDocument();
    expect(screen.getAllByText(/AUD-2026-007/).length).toBeGreaterThan(0);
    expect(screen.getByText(/écart défavorable/i)).toBeInTheDocument();
    expect(screen.getByText('AI Act art. 10')).toBeInTheDocument();
    expect(screen.getByText(/aide à l/i)).toBeInTheDocument();
    expect(screen.getByText('Femmes')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    useAudit.mockReturnValue({ isLoading: true, isError: false });
    render(<AuditResultPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the M2 view (clusters, p-value, characterization, pre-check)', () => {
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'a2',
        code: 'AUD-2026-009',
        title: 'Détection Q2',
        status: 'done',
        module: 'M2',
        pre_check: ['Feature « age » : 12 valeurs atypiques (12%).'],
        config: { k: 2 },
        metrics: {
          n: 240,
          k: 2,
          global_positive_rate: 0.5,
          chi2: 88.1,
          p_value: 0.0001,
          dof: 1,
          clusters: [
            {
              id: 0,
              n: 120,
              positive_rate: 0.1,
              deviation_pp: -40,
              is_deviant: true,
              top_features: [
                { name: 'code_postal', std_diff: 2.1, direction: 'above' },
              ],
            },
            {
              id: 1,
              n: 120,
              positive_rate: 0.9,
              deviation_pp: 40,
              is_deviant: false,
              top_features: [],
            },
          ],
          deviant_cluster_ids: [0],
          verdict: 'fail',
          risk_score: 88,
          warnings: [],
        },
        interpretation: {
          narrative: 'Un cluster défavorisé apparaît.',
          ai_act_anchors: ['AI Act, article 9'],
          disclaimers: ['Signal à approfondir.'],
          provider: 'fallback',
          model: 'deterministic',
        },
      },
    });
    render(<AuditResultPage />);
    expect(screen.getByText('Détection Q2')).toBeInTheDocument();
    expect(screen.getByText(/valeurs atypiques/i)).toBeInTheDocument();
    expect(screen.getByText(/p.?value/i)).toBeInTheDocument();
    expect(screen.getByText('code_postal')).toBeInTheDocument();
    expect(screen.getByText(/cluster défavorisé/i)).toBeInTheDocument();
  });
});
