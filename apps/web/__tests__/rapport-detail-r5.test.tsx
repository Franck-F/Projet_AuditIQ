import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

/* IntersectionObserver is not available in jsdom */
const IntersectionObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

/* ── Hoist mocks before imports ─────────────────────────────────────── */
const { useAudit } = vi.hoisted(() => ({ useAudit: vi.fn() }));
vi.mock('@/lib/query/use-audit', () => ({ useAudit }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'rpt-1' }) }));

const { downloadReport } = vi.hoisted(() => ({ downloadReport: vi.fn() }));
vi.mock('@/lib/api/audits', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/audits')>()),
  downloadReport,
}));

import RapportDetailPage from '@/app/app/rapports/[id]/page';

/* ── Fixture ─────────────────────────────────────────────────────────── */

const M1_FIXTURE = {
  id: 'rpt-1',
  code: 'AUD-R5-RPT-001',
  title: 'Recrutement Q2 2026',
  status: 'done',
  module: 'M1',
  protected_attribute: 'genre',
  decision_column: 'decision_finale',
  favorable_value: 'selectionne',
  privileged_value: 'Hommes',
  dataset_id: 'd1',
  created_at: '2026-05-14T10:42:00Z',
  completed_at: '2026-05-14T10:47:18Z',
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
      {
        title: 'Suspendre le déploiement et rééquilibrer le jeu d\'entraînement',
        detail: 'Procéder à un rééchantillonnage stratifié pour atteindre la parité.',
        rationale: 'Procéder à un rééchantillonnage stratifié pour atteindre la parité.',
        priority: 'high' as const,
        priority_level: 1,
        category: 'escalade' as const,
        owner: 'Direction' as const,
        horizon: 'immediat' as const,
        legal_ref: 'AI Act art. 10',
        steps: ['Geler le déploiement', 'Planifier le rééchantillonnage'],
      },
      {
        title: 'Auditer le lexique d\'évaluation',
        detail: 'Évaluer la pondération des tokens et envisager un re-fine-tuning.',
        rationale: 'Évaluer la pondération des tokens et envisager un re-fine-tuning.',
        priority: 'medium' as const,
        priority_level: 2,
        category: 'usage_outil' as const,
        owner: 'RH' as const,
        horizon: 'court_terme' as const,
        legal_ref: null,
        steps: [],
      },
    ],
  },
};

/* ── Tests ───────────────────────────────────────────────────────────── */

describe('rapport detail — R5', () => {

  it('renders loading state while fetching', () => {
    useAudit.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<RapportDetailPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/chargement du rapport/i)).toBeInTheDocument();
  });

  it('renders error state when audit not found', () => {
    useAudit.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<RapportDetailPage />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText(/rapport introuvable/i)).toBeInTheDocument();
  });

  describe('with valid M1 audit', () => {
    beforeEach(() => {
      useAudit.mockReturnValue({ isLoading: false, isError: false, data: M1_FIXTURE });
    });

    it('renders all 7 section headings', () => {
      render(<RapportDetailPage />);
      // headings may appear in both TOC and content — use getAllByText and confirm at least 1
      expect(screen.getAllByText(/résumé exécutif/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/méthodologie/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/résultats fairness/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/ancrage réglementaire/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/recommandations/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/traçabilité/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/disclaimer juridique/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders TocSticky with 7 items', () => {
      render(<RapportDetailPage />);
      // TocSticky renders a nav with aria-label="Sommaire"
      const nav = screen.getByRole('navigation', { name: /sommaire/i });
      expect(nav).toBeInTheDocument();
      const links = nav.querySelectorAll('a');
      expect(links).toHaveLength(7);
    });

    it('renders breadcrumb with Rapports and audit title', () => {
      render(<RapportDetailPage />);
      expect(screen.getByRole('link', { name: 'Rapports' })).toBeInTheDocument();
      // Title appears in multiple places — just verify at least once
      expect(screen.getAllByText('Recrutement Q2 2026').length).toBeGreaterThanOrEqual(1);
    });

    it('renders Télécharger PDF button in Topbar', () => {
      render(<RapportDetailPage />);
      const pdfButtons = screen.getAllByRole('button', { name: /pdf/i });
      expect(pdfButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Télécharger Excel button in Topbar', () => {
      render(<RapportDetailPage />);
      const excelButtons = screen.getAllByRole('button', { name: /excel/i });
      expect(excelButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders executive summary with narrative', () => {
      render(<RapportDetailPage />);
      expect(
        screen.getByText(/les candidatures femmes sont sélectionnées 28 %/i),
      ).toBeInTheDocument();
    });

    it('renders regulatory section with AI Act articles', () => {
      render(<RapportDetailPage />);
      expect(screen.getByText(/art\. 10 · ai act/i)).toBeInTheDocument();
      expect(screen.getByText(/art\. 13 · ai act/i)).toBeInTheDocument();
      expect(screen.getByText(/art\. 15 · ai act/i)).toBeInTheDocument();
      expect(screen.getByText(/art\. l\.1132-1 · code du travail/i)).toBeInTheDocument();
      expect(screen.getByText(/rgpd · art\. 22/i)).toBeInTheDocument();
    });

    it('renders recommendations with priority badges', () => {
      render(<RapportDetailPage />);
      expect(screen.getByText(/suspendre le déploiement/i)).toBeInTheDocument();
      expect(screen.getByText(/auditer le lexique/i)).toBeInTheDocument();
      expect(screen.getByText(/priorité 1/i)).toBeInTheDocument();
      expect(screen.getByText(/priorité 2/i)).toBeInTheDocument();
    });

    it('renders structured recommendation fields (category, owner, horizon, legal ref, steps)', () => {
      const { container } = render(<RapportDetailPage />);
      expect(screen.getByText('Escalade')).toBeInTheDocument();
      expect(screen.getByText("Usage de l'outil")).toBeInTheDocument();
      expect(screen.getByText(/Responsable\s*:\s*Direction/)).toBeInTheDocument();
      expect(screen.getByText('Immédiat')).toBeInTheDocument();
      expect(screen.getByText('Court terme')).toBeInTheDocument();
      expect(screen.getByText('Geler le déploiement')).toBeInTheDocument();
      expect(screen.getByText('Planifier le rééchantillonnage')).toBeInTheDocument();
      // The legal_ref is rendered inside the recommendations section (scoped to
      // avoid colliding with the regulatory callouts that also cite AI Act art. 10)
      const recoSection = container.querySelector('#recommendations')!;
      expect(recoSection.textContent).toMatch(/Réf\. légale\s*:\s*AI Act art\. 10/);
    });

    it('renders the full module name in the version row (no raw M1 code)', () => {
      render(<RapportDetailPage />);
      expect(
        screen.getByText(/Module 1 · Caractéristique connue · v1/),
      ).toBeInTheDocument();
    });

    it('renders signature section with report code', () => {
      render(<RapportDetailPage />);
      // Code appears in signature table — at least one instance expected
      expect(screen.getAllByText('AUD-R5-RPT-001').length).toBeGreaterThanOrEqual(1);
    });

    it('renders disclaimer section', () => {
      render(<RapportDetailPage />);
      expect(screen.getAllByText(/nature de ce rapport/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/pas un avis juridique/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders section anchors for scroll navigation', () => {
      const { container } = render(<RapportDetailPage />);
      const sections = [
        'executive-summary',
        'methodology',
        'findings',
        'regulatory',
        'recommendations',
        'signature',
        'disclaimer',
      ];
      for (const id of sections) {
        const el = container.querySelector(`#${id}`);
        expect(el, `Section #${id} missing`).not.toBeNull();
      }
    });
  });
});
