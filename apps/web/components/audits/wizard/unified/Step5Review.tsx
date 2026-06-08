'use client';

import * as React from 'react';

import { SECTOR_CARDS } from '@/components/audits/wizard/unified/constants';
import type { UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetOut } from '@/lib/api/audits';

interface Step5ReviewProps {
  values: UnifiedValues;
  dataset: DatasetOut | null;
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <p className="text-sm text-fg-secondary">
      <span className="font-medium text-fg">{label}&nbsp;: </span>
      {children}
    </p>
  );
}

// ─── M1: tabular-known ────────────────────────────────────────────────────────

function Step5ReviewM1({
  values,
  dataset,
}: Step5ReviewProps): React.ReactElement {
  const sectorLabel =
    SECTOR_CARDS.find((c) => c.value === values.sector)?.title ?? values.sector;

  const attrs: string[] = Array.isArray(values.protected_attributes) ? values.protected_attributes : [];
  const hasPairwise = attrs.length >= 2;
  const nPairs = attrs.length * (attrs.length - 1) / 2;

  const analyses: string[] = [
    'Disparate Impact (DI)',
    'Règle des 4/5',
    'Demographic Parity',
  ];
  if (values.ground_truth_column) {
    analyses.push('Equal Opportunity');
    analyses.push('Equalized Odds');
  }
  if (hasPairwise) {
    analyses.push(
      `Analyse intersectionnelle par paire (${nPairs} paire${nPairs > 1 ? 's' : ''} : ${attrs.join(' × ')})`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez les paramètres avant de lancer l&apos;audit. Le calcul prend
        généralement 5-30 secondes selon la taille du dataset.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        <ReviewRow label="Secteur">{sectorLabel}</ReviewRow>
        {dataset !== null && (
          <ReviewRow label="Dataset">
            <strong>{dataset.filename}</strong>{' '}
            ({dataset.row_count.toLocaleString('fr-FR')} lignes)
          </ReviewRow>
        )}
        <ReviewRow label="Décision">
          <code>{values.decision_column}</code> ={' '}
          <code>{values.favorable_value}</code> est l&apos;issue favorable
        </ReviewRow>
        <ReviewRow label="Attributs protégés">
          {attrs.length > 0
            ? attrs.map((a, i) => (
                <React.Fragment key={a}>
                  {i > 0 && ', '}
                  <code>{a}</code>
                </React.Fragment>
              ))
            : <span className="text-fg-muted">— aucun sélectionné</span>}
          {values.privileged_value && attrs.length > 0 && (
            <> (référence&nbsp;: <code>{values.privileged_value}</code>)</>
          )}
        </ReviewRow>
        {values.ground_truth_column && (
          <ReviewRow label="Vérité-terrain">
            <code>{values.ground_truth_column}</code>
          </ReviewRow>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">
          Analyses qui seront produites
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          {analyses.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── M2: tabular-unknown ──────────────────────────────────────────────────────

function Step5ReviewM2({
  values,
  dataset,
}: Step5ReviewProps): React.ReactElement {
  const sectorLabel =
    SECTOR_CARDS.find((c) => c.value === values.sector)?.title ?? values.sector;

  const k = values.k || '5';
  const dev = values.deviation_pp || '20';
  const alpha = values.chi2_alpha || '0.05';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez les paramètres avant de lancer la détection. KMeans + χ²
        prennent généralement 5-30 secondes selon la taille du dataset.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        <ReviewRow label="Secteur">{sectorLabel}</ReviewRow>
        {dataset !== null && (
          <ReviewRow label="Dataset">
            <strong>{dataset.filename}</strong>{' '}
            ({dataset.row_count.toLocaleString('fr-FR')} lignes)
          </ReviewRow>
        )}
        <ReviewRow label="Décision">
          <code>{values.decision_column}</code> ={' '}
          <code>{values.favorable_value}</code> est l&apos;issue favorable
        </ReviewRow>
        <ReviewRow label="Paramètres">
          k = {k}, déviation = {dev} pp, alpha = {alpha}
        </ReviewRow>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">
          Analyses qui seront produites
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          <li>• KMeans (k={k} clusters sur features comportementales)</li>
          <li>• χ² par cluster vs taux global de la décision</li>
          <li>• IQR pré-check (alertes statistiques préalables)</li>
          <li>• Caractérisation top-3 features par cluster déviant</li>
        </ul>
      </div>
    </div>
  );
}

// ─── M3: llm-api ──────────────────────────────────────────────────────────────

function Step5ReviewM3({ values }: Step5ReviewProps): React.ReactElement {
  const sectorLabel =
    SECTOR_CARDS.find((c) => c.value === values.sector)?.title ?? values.sector;

  const authStatus = values.auth_header.trim()
    ? 'fourni (masqué)'
    : 'non fourni';

  const langLabel = values.lang === 'fr' ? 'Français (FR)' : 'English (EN)';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez la configuration avant de lancer l&apos;audit LangBiTe.
        L&apos;audit prend 1-3 minutes selon la latence du chatbot.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        <ReviewRow label="Secteur">{sectorLabel}</ReviewRow>
        <ReviewRow label="URL">
          <code>{values.url}</code>
        </ReviewRow>
        <ReviewRow label="Méthode">{values.method}</ReviewRow>
        <ReviewRow label="Authentification">{authStatus}</ReviewRow>
        <ReviewRow label="Langue">{langLabel}</ReviewRow>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">
          Analyses qui seront produites
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          <li>• 12 paires de prompts paired-counterfactual × 6 catégories</li>
          <li>• Métriques : sentiment, longueur de réponse, refus structuré</li>
          <li>• Métriques de divergence (distribution des scores)</li>
          <li>• Délai maximum : 45 s par paire de prompts</li>
          <li>• AI Act art. 50 + recommandations CNIL</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function Step5Review({ values, dataset }: Step5ReviewProps): React.ReactElement {
  if (values.audit_type === 'tabular-unknown') {
    return <Step5ReviewM2 values={values} dataset={dataset} />;
  }

  if (values.audit_type === 'llm-api') {
    return <Step5ReviewM3 values={values} dataset={dataset} />;
  }

  // Default: tabular-known (M1)
  return <Step5ReviewM1 values={values} dataset={dataset} />;
}
