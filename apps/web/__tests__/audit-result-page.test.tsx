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

  it('renders the M3 view (categories + divergent examples + gauge)', async () => {
    useAudit.mockReturnValue({
      data: {
        id: 'm3-1', code: 'AUD-2026-040', title: 'Chatbot', status: 'done',
        module: 'M3', dataset_id: null, protected_attribute: null,
        decision_column: null, favorable_value: null, privileged_value: null,
        created_at: '2026-05-17T00:00:00Z', completed_at: '2026-05-17T00:00:00Z',
        metrics: {
          categories: [
            { name: 'genre', length_gap: 0.4, sentiment_gap: 0.2, refusal_rate: 0.5, score: 0.55, verdict: 'warn' },
          ],
          global_score: 0.55, verdict: 'warn', risk_score: 55,
          divergent_examples: [
            { category: 'genre', prompt_id: 'g1', variant_a: 'm', variant_b: 'f',
              excerpt_a: 'réponse longue', excerpt_b: 'Je ne peux pas', reason: 'refus' },
          ],
          n_pairs: 12, n_calls_failed: 0, warnings: [],
        },
        interpretation: {
          narrative: 'Écart de traitement détecté.', ai_act_anchors: ['AI Act, article 50'],
          disclaimers: ['Signal à approfondir.'], provider: 'fallback', model: 'deterministic',
        },
        pre_check: [], config: { lang: 'fr' },
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);

    expect(await screen.findByText('AUD-2026-040')).toBeInTheDocument();
    expect(screen.getAllByText(/genre/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/refus/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Je ne peux pas/)).toBeInTheDocument();
    expect(screen.getByText(/article 50/i)).toBeInTheDocument();
    // M2-only label must NOT appear for an M3 audit:
    expect(screen.queryByText(/Par cluster/i)).not.toBeInTheDocument();
  });

  it('M1 result shows EO/Equalized Odds section when present', async () => {
    useAudit.mockReturnValue({
      data: {
        id: 'm1-gt', code: 'AUD-2026-050', title: 'M1', status: 'done',
        module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
        decision_column: 'embauche', favorable_value: 'oui',
        privileged_value: 'homme', created_at: '2026-05-18T00:00:00Z',
        completed_at: '2026-05-18T00:00:00Z',
        metrics: {
          groups: [{ value: 'homme', n: 40, favorable: 20,
            selection_rate: 0.5, disparate_impact: 1.0, tpr: 0.9, fpr: 0.1 },
            { value: 'femme', n: 40, favorable: 12, selection_rate: 0.3,
            disparate_impact: 0.6, tpr: 0.5, fpr: 0.4 }],
          reference_value: 'homme', disparate_impact: 0.6,
          demographic_parity_diff: 0.2, worst_group: 'femme',
          verdict: 'fail', risk_score: 70, warnings: [],
          equal_opportunity_diff: 0.4, equalized_odds_diff: 0.4,
          demographic_parity_verdict: 'fail',
          equal_opportunity_verdict: 'fail',
          equalized_odds_verdict: 'fail', truelabel_reason: null,
        },
        interpretation: { narrative: 'N.', ai_act_anchors: ['AI Act art. 10'],
          disclaimers: ['Signal.'], provider: 'fallback',
          model: 'deterministic' },
        pre_check: [], config: {},
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);
    expect((await screen.findAllByText(/Equal Opportunity|Égalité des chances/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Equalized Odds|cotes égalisées/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.9|0\.5/).length).toBeGreaterThan(0); // TPR
  });

  it('M1 result WITHOUT EO is unchanged (no EO section)', async () => {
    useAudit.mockReturnValue({
      data: {
        id: 'm1', code: 'AUD-2026-051', title: 'M1', status: 'done',
        module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
        decision_column: 'embauche', favorable_value: 'oui',
        privileged_value: 'homme', created_at: '2026-05-18T00:00:00Z',
        completed_at: '2026-05-18T00:00:00Z',
        metrics: {
          groups: [{ value: 'homme', n: 40, favorable: 20,
            selection_rate: 0.5, disparate_impact: 1.0 },
            { value: 'femme', n: 40, favorable: 12, selection_rate: 0.3,
            disparate_impact: 0.6 }],
          reference_value: 'homme', disparate_impact: 0.6,
          demographic_parity_diff: 0.2, worst_group: 'femme',
          verdict: 'fail', risk_score: 70, warnings: [],
        },
        interpretation: null, pre_check: [], config: {},
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);
    expect(await screen.findByText('AUD-2026-051')).toBeInTheDocument();
    expect(screen.queryByText(/Equalized Odds|cotes égalisées/i))
      .not.toBeInTheDocument();
  });

  it('M1 result shows the intersectional subgroup matrix when present', async () => {
    useAudit.mockReturnValue({
      data: {
        id: 'm1-x', code: 'AUD-2026-060', title: 'M1', status: 'done',
        module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
        decision_column: 'embauche', favorable_value: 'oui',
        privileged_value: 'h', created_at: '2026-05-22T00:00:00Z',
        completed_at: '2026-05-22T00:00:00Z',
        metrics: {
          groups: [{ value: 'h', n: 40, favorable: 28, selection_rate: 0.7,
            disparate_impact: 1.0 }, { value: 'f', n: 40, favorable: 22,
            selection_rate: 0.55, disparate_impact: 0.79 }],
          reference_value: 'h', disparate_impact: 0.3,
          demographic_parity_diff: 0.35, worst_group: 'f', verdict: 'fail',
          risk_score: 80, warnings: [],
          intersectional: {
            cells: [
              { primary_value: 'h', secondary_value: 'fr', n: 20,
                favorable: 18, selection_rate: 0.9, disparate_impact: 1.0,
                verdict: 'pass' },
              { primary_value: 'f', secondary_value: 'etr', n: 20,
                favorable: 3, selection_rate: 0.15, disparate_impact: 0.3,
                verdict: 'fail' },
            ],
            reference_primary: 'h', reference_secondary: 'fr',
            worst_primary: 'f', worst_secondary: 'etr',
            disparate_impact: 0.3, demographic_parity_diff: 0.35,
            verdict: 'fail', risk_score: 80, marginal_di: [0.86, 0.9],
            warnings: [], reason: null,
          },
        },
        interpretation: null, pre_check: [], config: {},
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);
    expect((await screen.findAllByText(/intersection|sous-groupe/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/etr/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.86|0\.9/).length).toBeGreaterThan(0); // marginal DI
  });

  it('M1 result WITHOUT intersectional is unchanged (no matrix)', async () => {
    useAudit.mockReturnValue({
      data: {
        id: 'm1', code: 'AUD-2026-061', title: 'M1', status: 'done',
        module: 'M1', dataset_id: 'd', protected_attribute: 'genre',
        decision_column: 'embauche', favorable_value: 'oui',
        privileged_value: 'h', created_at: '2026-05-22T00:00:00Z',
        completed_at: '2026-05-22T00:00:00Z',
        metrics: {
          groups: [{ value: 'h', n: 40, favorable: 28, selection_rate: 0.7,
            disparate_impact: 1.0 }, { value: 'f', n: 40, favorable: 22,
            selection_rate: 0.55, disparate_impact: 0.79 }],
          reference_value: 'h', disparate_impact: 0.79,
          demographic_parity_diff: 0.15, worst_group: 'f', verdict: 'warn',
          risk_score: 40, warnings: [],
        },
        interpretation: null, pre_check: [], config: {},
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);
    expect(await screen.findByText('AUD-2026-061')).toBeInTheDocument();
    expect(screen.queryByText(/sous-groupe.*crois|matrice/i))
      .not.toBeInTheDocument();
  });

  it('shows the running state while the audit is pending/running', async () => {
    (useAudit as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'r1', code: 'AUD-2026-070', title: 'Chatbot', status: 'running',
        module: 'M3', dataset_id: null, protected_attribute: null,
        decision_column: null, favorable_value: null, privileged_value: null,
        created_at: '2026-05-22T00:00:00Z', completed_at: null,
        metrics: null, interpretation: null, error: null, pre_check: [],
        config: {},
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);
    expect(await screen.findByText(/analyse en cours|en cours/i))
      .toBeInTheDocument();
  });

  it('shows the failure panel when the audit failed', async () => {
    (useAudit as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'r2', code: 'AUD-2026-071', title: 'Chatbot', status: 'failed',
        module: 'M3', dataset_id: null, protected_attribute: null,
        decision_column: null, favorable_value: null, privileged_value: null,
        created_at: '2026-05-22T00:00:00Z', completed_at: null,
        metrics: null, interpretation: null,
        error: 'Le LLM cible est injoignable.', pre_check: [], config: {},
      },
      isLoading: false, isError: false,
    });
    render(<AuditResultPage />);
    expect(await screen.findByText(/injoignable/i)).toBeInTheDocument();
    expect(screen.queryByText(/score de risque/i)).not.toBeInTheDocument();
  });

  it('renders report buttons and downloads Excel/PDF; PDF failure is non-silent', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    useAudit.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'a3', code: 'AUD-2026-010', title: 'Rapport', status: 'done',
        module: 'M1', pre_check: [], config: null,
        metrics: {
          groups: [], reference_value: 'H', disparate_impact: 0.7,
          demographic_parity_diff: 0.1, worst_group: 'F', verdict: 'warn',
          risk_score: 50, warnings: [],
        },
        interpretation: null,
      },
    });
    downloadReport.mockResolvedValue(undefined);
    render(<AuditResultPage />);

    await userEvent.click(screen.getByRole('button', { name: /excel/i }));
    expect(downloadReport).toHaveBeenCalledWith('a3', 'xlsx');

    downloadReport.mockRejectedValueOnce(new Error('502'));
    await userEvent.click(screen.getByRole('button', { name: /pdf/i }));
    expect(downloadReport).toHaveBeenLastCalledWith('a3', 'pdf');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /indisponible|échou/i,
    );
  });

  it('renders Recommendations section when interpretation has recos', async () => {
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
          disclaimers: ['Aide à l\'analyse, pas un verdict de conformité.'],
          provider: 'fallback',
          model: 'deterministic',
          recommendations: [
            { title: 'Re-collecter', detail: 'Détail.', priority: 'high' as const },
          ],
        },
      },
    });
    render(<AuditResultPage />);
    expect(screen.getByText('Recommandations')).toBeInTheDocument();
    expect(screen.getByText('Re-collecter')).toBeInTheDocument();
    expect(screen.getByText('Action prioritaire')).toBeInTheDocument();
  });
});
