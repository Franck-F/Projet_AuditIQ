import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

import { Step5Review } from '@/components/audits/wizard/unified/Step5Review';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetOut } from '@/lib/api/audits';

const dataset: DatasetOut = {
  id: 'ds-abc',
  filename: 'decisions.csv',
  row_count: 5000,
  columns: ['sex', 'age', 'approved'],
  status: 'ready',
  created_at: '2026-06-02T10:00:00Z',
  expires_at: null,
};

function makeValues(overrides: Partial<UnifiedValues>): UnifiedValues {
  return { ...DEFAULT_VALUES, ...overrides };
}

// ─── M1: tabular-known ────────────────────────────────────────────────────────

describe('Step5Review — tabular-known (M1)', () => {
  const values = makeValues({
    audit_type: 'tabular-known',
    sector: 'hr',
    title: 'Audit RH Q1 2026',
    decision_column: 'approved',
    favorable_value: '1',
    protected_attributes: ['sex'],
    privileged_value: 'M',
    ground_truth_column: '',
  });

  it('shows title and sector label', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText('Audit RH Q1 2026')).toBeInTheDocument();
    expect(screen.getByText(/Ressources humaines/i)).toBeInTheDocument();
  });

  it('shows dataset filename and row count', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText('decisions.csv')).toBeInTheDocument();
    expect(screen.getByText(/5\s*000/)).toBeInTheDocument();
  });

  it('shows decision column and protected attribute', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('sex')).toBeInTheDocument();
  });

  it('shows DI / 4-5 / DP analyses always', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText(/Disparate Impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Règle des 4\/5/i)).toBeInTheDocument();
    expect(screen.getByText(/Parité démographique/i)).toBeInTheDocument();
  });

  it('does NOT show EO/EOdds when ground_truth_column is empty', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.queryByText(/Equal Opportunity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Equalized Odds/i)).not.toBeInTheDocument();
  });

  it('shows EO/EOdds when ground_truth_column is provided', () => {
    const v = makeValues({ ...values, ground_truth_column: 'label' });
    render(<Step5Review values={v} dataset={dataset} />);
    expect(screen.getByText(/Equal Opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/Equalized Odds/i)).toBeInTheDocument();
  });

  it('shows intersectional analysis when 2+ protected_attributes are provided', () => {
    const v = makeValues({ ...values, protected_attributes: ['sex', 'age'] });
    render(<Step5Review values={v} dataset={dataset} />);
    expect(screen.getByText(/Analyse intersectionnelle/i)).toBeInTheDocument();
  });

  it('does NOT show intersectional analysis when only one protected_attribute is selected', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.queryByText(/Analyse intersectionnelle/i)).not.toBeInTheDocument();
  });
});

// ─── M2: tabular-unknown ──────────────────────────────────────────────────────

describe('Step5Review — tabular-unknown (M2)', () => {
  const values = makeValues({
    audit_type: 'tabular-unknown',
    sector: 'credit',
    title: 'Audit détection biais',
    decision_column: 'loan_status',
    favorable_value: 'approved',
    k: '',
    deviation_pp: '',
    chi2_alpha: '',
  });

  it('shows title and sector label', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText('Audit détection biais')).toBeInTheDocument();
    expect(screen.getByText(/Crédit & scoring financier/i)).toBeInTheDocument();
  });

  it('shows dataset filename and row count', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText('decisions.csv')).toBeInTheDocument();
  });

  it('shows decision column', () => {
    render(<Step5Review values={values} dataset={dataset} />);
    expect(screen.getByText('loan_status')).toBeInTheDocument();
  });

  it('shows default params (k=5, dev=20, alpha=0.05) when fields are empty', () => {
    render(<Step5Review values={values} dataset={null} />);
    // Réglages affichés en clair : "{k} groupes recherchés, écart d'alerte = {dev} points, exigence statistique α = {alpha}"
    const reglages = screen.getByText(/groupes recherchés, écart d'alerte =/);
    expect(reglages).toHaveTextContent(
      "5 groupes recherchés, écart d'alerte = 20 points, exigence statistique α = 0.05",
    );
  });

  it('shows custom params when set', () => {
    const v = makeValues({ ...values, k: '8', deviation_pp: '15', chi2_alpha: '0.01' });
    render(<Step5Review values={v} dataset={null} />);
    const reglages = screen.getByText(/groupes recherchés, écart d'alerte =/);
    expect(reglages).toHaveTextContent(
      "8 groupes recherchés, écart d'alerte = 15 points, exigence statistique α = 0.01",
    );
  });

  it('shows the detection analyses produced for M2', () => {
    render(<Step5Review values={values} dataset={null} />);
    expect(screen.getByText(/Détection automatique de/i)).toHaveTextContent(
      'Détection automatique de 5 groupes de dossiers similaires',
    );
    expect(screen.getByText(/Comparaison statistique du taux de décision/i)).toBeInTheDocument();
    expect(screen.getByText(/Vérifications préalables de la qualité des données/i)).toBeInTheDocument();
    expect(screen.getByText(/3 caractéristiques dominantes de chaque groupe atypique/i)).toBeInTheDocument();
  });
});

// ─── M3: llm-api ─────────────────────────────────────────────────────────────

describe('Step5Review — llm-api (M3)', () => {
  const values = makeValues({
    audit_type: 'llm-api',
    sector: 'other',
    title: 'Audit ChatBot CNIL',
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    auth_header: 'Bearer sk-secret-token-12345',
    lang: 'fr',
  });

  it('shows title and sector label', () => {
    render(<Step5Review values={values} dataset={null} />);
    expect(screen.getByText('Audit ChatBot CNIL')).toBeInTheDocument();
    expect(screen.getByText(/Autre usage à fort enjeu/i)).toBeInTheDocument();
  });

  it('shows URL and method', () => {
    render(<Step5Review values={values} dataset={null} />);
    expect(screen.getByText('https://api.openai.com/v1/chat/completions')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('MASKS auth header — shows "fourni (masqué)" and NEVER the secret value', () => {
    render(<Step5Review values={values} dataset={null} />);
    expect(screen.getByText('fourni (masqué)')).toBeInTheDocument();
    // The raw token must NEVER appear
    expect(screen.queryByText(/sk-secret-token/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bearer sk/)).not.toBeInTheDocument();
  });

  it('shows "non fourni" when auth_header is empty', () => {
    const v = makeValues({ ...values, auth_header: '' });
    render(<Step5Review values={v} dataset={null} />);
    expect(screen.getByText('non fourni')).toBeInTheDocument();
  });

  it('shows lang label (FR)', () => {
    render(<Step5Review values={values} dataset={null} />);
    expect(screen.getByText(/Français/i)).toBeInTheDocument();
  });

  it('shows lang label (EN)', () => {
    const v = makeValues({ ...values, lang: 'en' });
    render(<Step5Review values={v} dataset={null} />);
    expect(screen.getByText(/English/i)).toBeInTheDocument();
  });

  it('shows LLM analyses list: 12 paires, ton/longueur/refus, écarts, délai', () => {
    render(<Step5Review values={values} dataset={null} />);
    expect(screen.getByText(/12 paires de questions/i)).toBeInTheDocument();
    expect(screen.getByText(/du ton, de la longueur et des refus/i)).toBeInTheDocument();
    expect(screen.getByText(/Mesure des écarts entre les réponses/i)).toBeInTheDocument();
    expect(screen.getByText(/45 s/i)).toBeInTheDocument();
  });
});
