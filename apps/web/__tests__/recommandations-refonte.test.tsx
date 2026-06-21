import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import RecommandationsPage from '@/app/app/recommandations/page';
import * as useAuditModule from '@/lib/query/use-audit';
import * as useDashboardModule from '@/lib/query/use-dashboard';
import * as navigationModule from 'next/navigation';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('@/lib/query/use-audit');
vi.mock('@/lib/query/use-dashboard');

const createQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('RecommandationsPage — R3 refonte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('State A: Dashboard list (no auditId)', () => {
    it('renders 2 audit rows when useDashboard returns 2 recent_audits with verdicts', () => {
      const mockUseSearchParams = vi.mocked(navigationModule.useSearchParams);
      mockUseSearchParams.mockReturnValue(new URLSearchParams('') as unknown as ReturnType<typeof navigationModule.useSearchParams>);

      const mockUseDashboard = vi.mocked(useDashboardModule.useDashboard);
      mockUseDashboard.mockReturnValue({
        data: {
          total_audits: 5,
          failing_audits: 1,
          warning_audits: 1,
          risk_score: 0.65,
          module_usage: { M1: 3, M2: 2 },
          recent_audits: [
            {
              id: 'aud-1',
              code: 'AUD-001',
              title: 'Scoring crédit Q2',
              module: 'M1',
              verdict: 'fail',
              risk_score: 0.78,
              created_at: '2026-06-01T10:00:00Z',
            },
            {
              id: 'aud-2',
              code: 'AUD-002',
              title: 'Modèle hiring',
              module: 'M1',
              verdict: 'warn',
              risk_score: 0.45,
              created_at: '2026-05-30T14:30:00Z',
            },
          ],
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useDashboardModule.useDashboard>);

      render(<RecommandationsPage />, { wrapper: Wrapper });

      // Check header
      expect(screen.getByText(/2 audit.*complété/i)).toBeInTheDocument();

      // Check 2 audit rows
      expect(screen.getByText('Scoring crédit Q2')).toBeInTheDocument();
      expect(screen.getByText('Modèle hiring')).toBeInTheDocument();
      expect(screen.getByText('AUD-001')).toBeInTheDocument();
      expect(screen.getByText('AUD-002')).toBeInTheDocument();

      // Check "Voir le plan" buttons
      const buttons = screen.getAllByRole('link', { name: /Voir le plan/i });
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveAttribute('href', '/app/recommandations?auditId=aud-1');
      expect(buttons[1]).toHaveAttribute('href', '/app/recommandations?auditId=aud-2');
    });
  });

  describe('State B: Audit detail (with ?auditId)', () => {
    it('renders 3 recommendation cards with titles when useAudit returns interpretation with 3 recos', () => {
      const mockUseSearchParams = vi.mocked(navigationModule.useSearchParams);
      const params = new URLSearchParams('auditId=aud-1');
      mockUseSearchParams.mockReturnValue(params as unknown as ReturnType<typeof navigationModule.useSearchParams>);

      const mockUseAudit = vi.mocked(useAuditModule.useAudit);
      mockUseAudit.mockReturnValue({
        data: {
          id: 'aud-1',
          code: 'AUD-001',
          title: 'Scoring crédit Q2',
          status: 'completed',
          module: 'M1',
          dataset_id: 'dataset-1',
          protected_attribute: 'gender',
          decision_column: 'approved',
          favorable_value: '1',
          privileged_value: 'M',
          created_at: '2026-06-01T10:00:00Z',
          completed_at: '2026-06-01T10:30:00Z',
          metrics: null,
          interpretation: {
            narrative: 'Model shows bias against females.',
            ai_act_anchors: ['Article 10'],
            disclaimers: [],
            provider: 'openai',
            model: 'gpt-4',
            recommendations: [
              {
                title: 'Recalibrer le seuil de décision par groupe',
                detail: 'Appliquer un seuil ajusté pour rétablir la parité.',
                rationale: 'Appliquer un seuil ajusté pour rétablir la parité.',
                priority: 'high',
                priority_level: 1,
                category: 'correction_aval',
                owner: 'Direction',
                horizon: 'immediat',
                legal_ref: 'AI Act art. 10',
                steps: ['Définir le seuil cible', 'Valider avec le métier'],
              },
              {
                title: 'Réentraîner sans la variable « code postal »',
                detail: 'Cette variable agit comme proxy de l\'origine.',
                rationale: 'Cette variable agit comme proxy de l\'origine.',
                priority: 'medium',
                priority_level: 2,
                category: 'usage_outil',
                owner: 'DPO',
                horizon: 'court_terme',
                legal_ref: null,
                steps: [],
              },
              {
                title: 'Documenter la justification métier du seuil',
                detail: 'Si l\'écart est partiellement justifié.',
                rationale: 'Si l\'écart est partiellement justifié.',
                priority: 'low',
                priority_level: 3,
                category: 'documentation',
                owner: 'Juridique',
                horizon: 'continu',
                legal_ref: null,
                steps: [],
              },
            ],
          },
          pre_check: [],
          config: null,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useAuditModule.useAudit>);

      render(<RecommandationsPage />, { wrapper: Wrapper });

      // Check hero card — "Plan d'action — {titre}"
      expect(screen.getByText(/Plan d'action/i)).toHaveTextContent(
        "Plan d'action — Scoring crédit Q2",
      );

      // Check 3 recommendation titles
      expect(screen.getByText('Recalibrer le seuil de décision par groupe')).toBeInTheDocument();
      expect(screen.getByText('Réentraîner sans la variable « code postal »')).toBeInTheDocument();
      expect(screen.getByText('Documenter la justification métier du seuil')).toBeInTheDocument();

      // Check priority badges
      expect(screen.getByText('Priorité 1')).toBeInTheDocument();
      expect(screen.getByText('Priorité 2')).toBeInTheDocument();
      expect(screen.getByText('Priorité 3')).toBeInTheDocument();

      // Check numbered cards (1, 2, 3)
      const numberDivs = screen.getAllByText(/^[123]$/);
      expect(numberDivs.length).toBeGreaterThanOrEqual(3);

      // Structured fields surfaced from the deployer engine
      expect(screen.getByText('Correction en aval')).toBeInTheDocument();
      expect(screen.getByText("Usage de l'outil")).toBeInTheDocument();
      expect(screen.getByText('Documenter & tracer')).toBeInTheDocument();
      expect(screen.getByText(/Responsable\s*:\s*Direction/)).toBeInTheDocument();
      expect(screen.getByText('Immédiat')).toBeInTheDocument();
      expect(screen.getByText('Court terme')).toBeInTheDocument();
      expect(screen.getByText('En continu')).toBeInTheDocument();
      expect(screen.getByText(/AI Act art\. 10/)).toBeInTheDocument();
      // Steps render only when non-empty
      expect(screen.getByText('Définir le seuil cible')).toBeInTheDocument();
      expect(screen.getByText('Valider avec le métier')).toBeInTheDocument();
    });

    it('shows InlineNote when audit has no recommendations', () => {
      const mockUseSearchParams = vi.mocked(navigationModule.useSearchParams);
      const params = new URLSearchParams('auditId=aud-1');
      mockUseSearchParams.mockReturnValue(params as unknown as ReturnType<typeof navigationModule.useSearchParams>);

      const mockUseAudit = vi.mocked(useAuditModule.useAudit);
      mockUseAudit.mockReturnValue({
        data: {
          id: 'aud-1',
          code: 'AUD-001',
          title: 'Empty audit',
          status: 'completed',
          module: 'M1',
          dataset_id: 'dataset-1',
          protected_attribute: 'gender',
          decision_column: 'approved',
          favorable_value: '1',
          privileged_value: 'M',
          created_at: '2026-06-01T10:00:00Z',
          completed_at: '2026-06-01T10:30:00Z',
          metrics: null,
          interpretation: {
            narrative: 'No bias detected.',
            ai_act_anchors: [],
            disclaimers: [],
            provider: 'openai',
            model: 'gpt-4',
            recommendations: [],
          },
          pre_check: [],
          config: null,
        },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useAuditModule.useAudit>);

      render(<RecommandationsPage />, { wrapper: Wrapper });

      expect(screen.getByText('Aucune recommandation générée pour cet audit.')).toBeInTheDocument();
    });
  });
});
