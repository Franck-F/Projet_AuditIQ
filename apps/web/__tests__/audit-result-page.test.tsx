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
});
