/**
 * Phase 0 — mocks pour le dashboard.
 * Sera remplacé par les hooks TanStack Query en Phase 1 (tasks 10–12).
 */

import type * as React from 'react';
import type { StatusTone } from '@/components/product/StatusBadge';

export type AuditRow = {
  id: string;
  title: string;
  subtitle: string;
  status: StatusTone;
  statusLabel: string;
  metaWhen: string;
  metaMetric: string;
  href: string;
};

export type Alert = {
  id: string;
  severity: 'fail' | 'warn' | 'info';
  title: string;
  body: React.ReactNode;
  cta: { label: string; href: string };
};

export const MOCK_USER = {
  firstName: 'Claire',
  lastSessionDays: 2,
  activeAudits: 3,
  pendingRecommendations: 8,
};

export const MOCK_GAUGE = {
  value: 62,
  caption: '/100 · risque modéré',
  total: 12,
};

export const MOCK_KPIS = {
  yearAudits: {
    label: 'Audits cette année',
    value: 12,
    delta: { direction: 'up' as const, text: '↑ 4 vs trimestre dernier' },
    sparkline: [28, 22, 18, 20, 12, 15, 8, 10, 5],
  },
  biases: {
    label: 'Biais détectés (90j)',
    value: 7,
    delta: { direction: 'down' as const, text: '↓ 2 vs précédent' },
    sparkline: [8, 12, 10, 15, 12, 18, 16, 22],
  },
  recos: {
    label: 'Recommandations ouvertes',
    value: 8,
    delta: { direction: 'neutral' as const, text: '3 prioritaires · 5 normales' },
  },
  aiActCoverage: {
    label: 'Couverture AI Act',
    value: 76,
    delta: { direction: 'up' as const, text: '↑ 12 pts en 30 jours' },
  },
};

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    severity: 'fail',
    title:
      "Audit M1 — Recrutement Q2 2026 : règle des 4/5 non respectée pour le groupe Femmes (0.72).",
    body: 'Disparate Impact = 0.72 sur 412 candidatures. Seuil AI Act recommandé : ≥ 0.80. Action suggérée : revoir le pipeline de scoring CV avant déploiement.',
    cta: { label: 'Examiner', href: '/app/audits/AUD-2026-014' },
  },
  {
    id: 'a2',
    severity: 'warn',
    title:
      "M2 — Scoring crédit : cluster déviant détecté (code postal comme proxy d'origine).",
    body: 'Le cluster #3 (8% des dossiers) présente un taux de refus 2.4× supérieur à la moyenne. La feature dominante est code_postal_2.',
    cta: { label: 'Examiner', href: '/app/audits/AUD-2026-013' },
  },
  {
    id: 'a3',
    severity: 'info',
    title:
      "AI Act — l'article 10 (qualité des données d'entraînement) entrera en vigueur le 02/08/2026.",
    body: 'Vos audits supervisés actuels couvrent 76% des exigences. Téléchargez le guide de mise en conformité.',
    cta: { label: 'Lire le guide', href: '/ai-act' },
  },
];

export const MOCK_RECENT_AUDITS: AuditRow[] = [
  {
    id: 'AUD-2026-014',
    title: 'Recrutement Q2 2026 — Scoring CV',
    subtitle: 'M1 supervisé · 412 dossiers · Cabinet Tessier RH',
    status: 'fail',
    statusLabel: 'Critique',
    metaWhen: 'Il y a 2 h',
    metaMetric: 'DP 0.72',
    href: '/app/audits/AUD-2026-014',
  },
  {
    id: 'AUD-2026-013',
    title: 'Scoring crédit immobilier — Banque Loiret',
    subtitle: 'M2 non supervisé · 8 240 dossiers · 2026-T1',
    status: 'warn',
    statusLabel: 'Vigilance',
    metaWhen: 'Hier · 18 h',
    metaMetric: 'IM 0.82',
    href: '/app/audits/AUD-2026-013',
  },
  {
    id: 'AUD-2026-012',
    title: 'Chatbot SAV — campagne fairness genre & origine',
    subtitle: 'M3 LLM · 480 prompts pairs · Mathys SA',
    status: 'warn',
    statusLabel: 'Vigilance',
    metaWhen: '3 mai',
    metaMetric: 'Score 3.4 / 5',
    href: '/app/audits/AUD-2026-012',
  },
  {
    id: 'AUD-2026-011',
    title: 'Plateforme onboarding — vérification de proxies',
    subtitle: 'M2 non supervisé · 1 248 profils · 2026-T1',
    status: 'pass',
    statusLabel: 'Conforme',
    metaWhen: '28 avril',
    metaMetric: 'IM 0.31',
    href: '/app/audits/AUD-2026-011',
  },
  {
    id: 'AUD-2026-010',
    title: 'Modèle de tarification assurance auto',
    subtitle: 'M1 supervisé · 14 320 dossiers · Mutuelle Verte',
    status: 'pass',
    statusLabel: 'Conforme',
    metaWhen: '24 avril',
    metaMetric: 'DP 0.91',
    href: '/app/audits/AUD-2026-010',
  },
];

export const MOCK_MODULE_USAGE = [
  { module: 'M1 — Supervisé', count: 7, percent: 58 },
  { module: 'M2 — Non supervisé', count: 3, percent: 25 },
  { module: 'M3 — LLM', count: 2, percent: 17 },
];
