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
    "Écart de taux d'acceptation entre groupes (Disparate Impact)",
    'Règle des 4/5 (seuil de référence de 80 %)',
    'Parité démographique',
  ];
  if (values.ground_truth_column) {
    analyses.push('Égalité des chances (Equal Opportunity)');
    analyses.push('Calibration (Equalized Odds)');
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
        généralement 5 à 30 secondes selon la taille du jeu de données.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        <ReviewRow label="Secteur">{sectorLabel}</ReviewRow>
        {dataset !== null && (
          <ReviewRow label="Jeu de données">
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
          <ReviewRow label="Résultat réel des décisions">
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
        Vérifiez les paramètres avant de lancer la détection. Le calcul prend
        généralement 5 à 30 secondes selon la taille du jeu de données.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        <ReviewRow label="Secteur">{sectorLabel}</ReviewRow>
        {dataset !== null && (
          <ReviewRow label="Jeu de données">
            <strong>{dataset.filename}</strong>{' '}
            ({dataset.row_count.toLocaleString('fr-FR')} lignes)
          </ReviewRow>
        )}
        <ReviewRow label="Décision">
          <code>{values.decision_column}</code> ={' '}
          <code>{values.favorable_value}</code> est l&apos;issue favorable
        </ReviewRow>
        <ReviewRow label="Réglages">
          {k} groupes recherchés, écart d&apos;alerte = {dev} points, exigence
          statistique α = {alpha}
        </ReviewRow>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">
          Analyses qui seront produites
        </p>
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          <li>• Détection automatique de {k} groupes de dossiers similaires</li>
          <li>• Comparaison statistique du taux de décision de chaque groupe au taux global</li>
          <li>• Vérifications préalables de la qualité des données</li>
          <li>• Explication des 3 caractéristiques dominantes de chaque groupe atypique</li>
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
        Vérifiez la configuration avant de lancer l&apos;audit du chatbot.
        L&apos;audit prend 1 à 3 minutes selon la latence du chatbot.
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
          <li>• 12 paires de questions quasi identiques × 6 catégories d&apos;attributs protégés</li>
          <li>• Comparaison du ton, de la longueur et des refus de réponse</li>
          <li>• Mesure des écarts entre les réponses de chaque paire</li>
          <li>• Délai maximum : 45 s par paire de questions</li>
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
