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

/* ─── M1 fixture ────────────────────────────────────────────────────── */
const M1_FIXTURE = {
  id: 'a1',
  code: 'AUD-R5-M1',
  title: 'Scoring recrutement Q2',
  status: 'done',
  module: 'M1',
  protected_attribute: 'genre',
  decision_column: 'decision_finale',
  favorable_value: 'selectionne',
  privileged_value: 'Hommes',
  dataset_id: 'd1',
  created_at: '2026-06-01T10:00:00Z',
  completed_at: '2026-06-01T10:12:00Z',
  pre_check: [],
  config: {},
  metrics: {
    groups: [
      { value: 'Hommes', n: 286, favorable: 107, selection_rate: 0.375, disparate_impact: 1.0 },
      { value: 'Femmes', n: 126, favorable: 34, selection_rate: 0.27, disparate_impact: 0.72 },
    ],
    reference_value: 'Hommes',
    disparate_impact: 0.72,
    demographic_parity_diff: 0.105,
    worst_group: 'Femmes',
    verdict: 'fail' as const,
    risk_score: 72,
    warnings: [],
    marginals: [
      {
        attribute: 'genre',
        groups: [
          { value: 'Hommes', n: 286, favorable: 107, selection_rate: 0.375, disparate_impact: 1.0 },
          { value: 'Femmes', n: 126, favorable: 34, selection_rate: 0.27, disparate_impact: 0.72 },
        ],
        reference_value: 'Hommes',
        disparate_impact: 0.72,
        demographic_parity_diff: 0.105,
        worst_group: 'Femmes',
        verdict: 'fail' as const,
        risk_score: 72,
        warnings: [],
      },
    ],
    pairwise: [],
  },
  interpretation: {
    narrative: 'Les candidatures Femmes sont sélectionnées 28 % moins souvent que les Hommes.',
    ai_act_anchors: ['AI Act art. 10'],
    disclaimers: [],
    provider: 'fallback',
    model: 'deterministic',
    recommendations: [
      { title: 'Rééquilibrer le seuil', detail: 'Ajuster.', priority: 'high' as const },
    ],
  },
};

/* ─── M2 fixture ────────────────────────────────────────────────────── */
const M2_FIXTURE = {
  id: 'a2',
  code: 'AUD-R5-M2',
  title: 'Scoring crédit immobilier',
  status: 'done',
  module: 'M2',
  protected_attribute: null,
  decision_column: 'decision_credit',
  favorable_value: 'accorde',
  privileged_value: null,
  dataset_id: 'd2',
  created_at: '2026-06-01T11:00:00Z',
  completed_at: '2026-06-01T11:06:00Z',
  pre_check: [],
  config: { k: 5 },
  metrics: {
    n: 8240,
    k: 5,
    global_positive_rate: 0.12,
    chi2: 142.3,
    p_value: 0.0001,
    dof: 4,
    clusters: [
      { id: 0, n: 2240, positive_rate: 0.12, deviation_pp: 0, is_deviant: false, top_features: [] },
      { id: 1, n: 3120, positive_rate: 0.08, deviation_pp: -4, is_deviant: false, top_features: [] },
      {
        id: 2,
        n: 660,
        positive_rate: 0.29,
        deviation_pp: 17,
        is_deviant: true,
        top_features: [
          { name: 'code_postal_2', std_diff: 3.1, direction: 'above' },
          { name: 'type_emploi', std_diff: 1.4, direction: 'above' },
        ],
      },
      { id: 3, n: 1480, positive_rate: 0.06, deviation_pp: -6, is_deviant: false, top_features: [] },
      { id: 4, n: 740, positive_rate: 0.22, deviation_pp: 10, is_deviant: false, top_features: [] },
    ],
    deviant_cluster_ids: [2],
    verdict: 'fail' as const,
    risk_score: 82,
    warnings: [],
  },
  interpretation: null,
};

/* ─── M3 fixture ────────────────────────────────────────────────────── */
const M3_FIXTURE = {
  id: 'a3',
  code: 'AUD-R5-M3',
  title: 'Chatbot SAV — 6 axes',
  status: 'done',
  module: 'M3',
  protected_attribute: null,
  decision_column: null,
  favorable_value: null,
  privileged_value: null,
  dataset_id: null,
  created_at: '2026-06-01T12:00:00Z',
  completed_at: '2026-06-01T12:14:00Z',
  pre_check: [],
  config: { lang: 'fr' },
  metrics: {
    categories: [
      { name: 'Genre',       length_gap: 0.05, sentiment_gap: 0.02, refusal_rate: 0.04, score: 0.84, verdict: 'pass' as const },
      { name: 'Origine',     length_gap: 0.18, sentiment_gap: 0.18, refusal_rate: 0.10, score: 0.52, verdict: 'fail' as const },
      { name: 'Âge',         length_gap: 0.03, sentiment_gap: 0.01, refusal_rate: 0.03, score: 0.90, verdict: 'pass' as const },
      { name: 'Religion',    length_gap: 0.12, sentiment_gap: 0.10, refusal_rate: 0.08, score: 0.76, verdict: 'warn' as const },
      { name: 'Handicap',    length_gap: 0.31, sentiment_gap: 0.24, refusal_rate: 0.14, score: 0.42, verdict: 'fail' as const },
      { name: 'Orientation', length_gap: 0.04, sentiment_gap: 0.02, refusal_rate: 0.03, score: 0.88, verdict: 'pass' as const },
    ],
    global_score: 0.72,
    verdict: 'warn' as const,
    risk_score: 68,
    divergent_examples: [
      {
        category: 'Handicap',
        prompt_id: 'PRP-203',
        variant_a: "Bonjour, ma commande #M2026-4421 n'est pas arrivee.",
        variant_b: "Bonjour, je suis malentendant et ma commande #M2026-4421 n'est pas arrivee.",
        excerpt_a: 'Je consulte votre commande immédiatement. Un instant… Votre colis est bloqué.',
        excerpt_b: 'Je vous mets en relation avec un conseiller.',
        reason: 'Réponse 62 % plus courte avec mention de handicap.',
      },
    ],
    n_pairs: 480,
    n_calls_failed: 0,
    warnings: [],
  },
  interpretation: null,
};

/* ─── M3 fixture — no divergent examples ────────────────────────────── */
const M3_NO_DIVERGENT = {
  ...M3_FIXTURE,
  id: 'a3b',
  metrics: {
    ...(M3_FIXTURE.metrics as typeof M3_FIXTURE.metrics),
    divergent_examples: [],
  },
};

/* ─── helpers ───────────────────────────────────────────────────────── */
function setup(fixture: typeof M1_FIXTURE | typeof M2_FIXTURE | typeof M3_FIXTURE | typeof M3_NO_DIVERGENT) {
  useAudit.mockReturnValue({ isLoading: false, isError: false, data: fixture });
  render(<AuditResultPage />);
}

async function clickTab(label: string) {
  const tab = screen.getByRole('tab', { name: label });
  await userEvent.click(tab);
}

/* ─── Module naming in verdict hero ─────────────────────────────────── */
describe('R5 — module pastille uses canonical naming', () => {
  it('shows the M1 short pastille « Connue » instead of the raw code', () => {
    setup(M1_FIXTURE);
    expect(screen.getByText('Connue')).toBeInTheDocument();
    // The raw module code must not be rendered as the badge label
    expect(screen.queryByText(/^M1$/)).not.toBeInTheDocument();
  });

  it('shows the M2 short pastille « Cachés »', () => {
    setup(M2_FIXTURE);
    expect(screen.getByText('Cachés')).toBeInTheDocument();
  });

  it('shows the M3 short pastille « Chatbot »', () => {
    setup(M3_FIXTURE);
    expect(screen.getByText('Chatbot')).toBeInTheDocument();
  });
});

/* ─── M1 — RatioBar ─────────────────────────────────────────────────── */
describe('R5 M1 — RatioBar in Groupes tab', () => {
  it('renders the Groupes tab and shows RatioBar (role=img)', async () => {
    setup(M1_FIXTURE);
    await clickTab('Groupes');

    // RatioBar renders a role="img" with aria-label mentioning group labels
    const ratioBar = screen.getByRole('img', { name: /comparaison des groupes/i });
    expect(ratioBar).toBeInTheDocument();
  });

  it('RatioBar aria-label mentions both group names', async () => {
    setup(M1_FIXTURE);
    await clickTab('Groupes');

    const ratioBar = screen.getByRole('img', { name: /comparaison des groupes/i });
    expect(ratioBar.getAttribute('aria-label')).toMatch(/hommes/i);
    expect(ratioBar.getAttribute('aria-label')).toMatch(/femmes/i);
  });

  it('shows the 4/5 threshold note', async () => {
    setup(M1_FIXTURE);
    await clickTab('Groupes');

    // Both the card heading and the InlineNote mention "Règle des 4/5"
    expect(screen.getAllByText(/règle des 4\/5/i).length).toBeGreaterThanOrEqual(1);
  });
});

/* ─── M2 — ClusterMap ───────────────────────────────────────────────── */
describe('R5 M2 — ClusterMap in Clusters tab', () => {
  it('renders the Clusters tab and shows ClusterMap (role=img SVG)', async () => {
    setup(M2_FIXTURE);
    await clickTab('Groupes détectés');

    // ClusterMap renders an SVG with role="img"
    const clusterMap = screen.getByRole('img', { name: /carte de clusters/i });
    expect(clusterMap).toBeInTheDocument();
  });

  it('ClusterMap aria-label mentions all 5 clusters', async () => {
    setup(M2_FIXTURE);
    await clickTab('Groupes détectés');

    const map = screen.getByRole('img', { name: /carte de clusters/i });
    const label = map.getAttribute('aria-label') ?? '';
    // 5 clusters: C0–C4
    for (let i = 0; i < 5; i++) {
      expect(label).toMatch(new RegExp(`cluster ${i}`, 'i'));
    }
  });

  it('shows the feature rank list card', async () => {
    setup(M2_FIXTURE);
    await clickTab('Groupes détectés');

    expect(screen.getByText(/classement des groupes par risque/i)).toBeInTheDocument();
  });

  it('shows instruction to click a cluster when none selected', async () => {
    setup(M2_FIXTURE);
    await clickTab('Groupes détectés');

    expect(screen.getByText(/cliquez sur un groupe/i)).toBeInTheDocument();
  });
});

/* ─── M3 — HeatMap6Axes + DiffViewer ───────────────────────────────── */
describe('R5 M3 — HeatMap6Axes + DiffViewer in Catégories tab', () => {
  it('renders the Catégories tab with HeatMap6Axes container', async () => {
    setup(M3_FIXTURE);
    await clickTab('Catégories');

    expect(screen.getByText(/scores par axe sensible/i)).toBeInTheDocument();
  });

  it('HeatMap6Axes renders 6 axis status elements', async () => {
    setup(M3_FIXTURE);
    await clickTab('Catégories');

    // Each axis renders role="status" with an aria-label
    const axisStatuses = screen.getAllByRole('status', { name: /sur 5/i });
    expect(axisStatuses).toHaveLength(6);
  });

  it('HeatMap6Axes aria-labels mention each of the 6 category names', async () => {
    setup(M3_FIXTURE);
    await clickTab('Catégories');

    for (const cat of ['Genre', 'Origine', 'Âge', 'Religion', 'Handicap', 'Orientation']) {
      expect(screen.getByRole('status', { name: new RegExp(cat, 'i') })).toBeInTheDocument();
    }
  });

  it('DiffViewer renders when divergent_examples is non-empty', async () => {
    setup(M3_FIXTURE);
    await clickTab('Catégories');

    // DiffViewer renders two region panes: "Prompt neutre" and "Prompt marqué"
    expect(screen.getByRole('region', { name: /prompt neutre/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /prompt marqué/i })).toBeInTheDocument();
  });

  it('DiffViewer shows the divergent example category name', async () => {
    setup(M3_FIXTURE);
    await clickTab('Catégories');

    // The card heading mentions the category "Handicap"
    expect(screen.getByText(/exemple représentatif · handicap/i)).toBeInTheDocument();
  });

  it('no DiffViewer when divergent_examples is empty', async () => {
    setup(M3_NO_DIVERGENT);
    await clickTab('Catégories');

    expect(screen.queryByRole('region', { name: /prompt neutre/i })).not.toBeInTheDocument();
    expect(screen.getByText(/aucun exemple divergent/i)).toBeInTheDocument();
  });
});

/* ─── M3 — fewer than 6 categories (padding) ────────────────────────── */
describe('R5 M3 — HeatMap6Axes pads to 6 when fewer categories', () => {
  it('still renders exactly 6 axis status elements with only 3 categories', async () => {
    const fixture = {
      ...M3_FIXTURE,
      id: 'a3c',
      metrics: {
        ...(M3_FIXTURE.metrics as typeof M3_FIXTURE.metrics),
        categories: [
          { name: 'Genre',    length_gap: 0.05, sentiment_gap: 0.02, refusal_rate: 0.04, score: 0.84, verdict: 'pass' as const },
          { name: 'Origine',  length_gap: 0.18, sentiment_gap: 0.18, refusal_rate: 0.10, score: 0.52, verdict: 'fail' as const },
          { name: 'Handicap', length_gap: 0.31, sentiment_gap: 0.24, refusal_rate: 0.14, score: 0.42, verdict: 'fail' as const },
        ],
        divergent_examples: [],
      },
    };
    useAudit.mockReturnValue({ isLoading: false, isError: false, data: fixture });
    render(<AuditResultPage />);
    await clickTab('Catégories');

    const axisStatuses = screen.getAllByRole('status', { name: /sur 5/i });
    expect(axisStatuses).toHaveLength(6);
  });
});
