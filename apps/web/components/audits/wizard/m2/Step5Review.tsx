'use client';

import * as React from 'react';

import type { DatasetOut } from '@/lib/api/audits';

interface Step5ReviewValues {
  title: string;
  decision_column: string;
  favorable_value: string;
  k: string;
  deviation_pp: string;
  chi2_alpha: string;
}

interface Step5ReviewProps {
  dataset: DatasetOut | null;
  values: Step5ReviewValues;
}

export function Step5Review({ dataset, values }: Step5ReviewProps): React.ReactElement {
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

      <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        {dataset !== null && (
          <p className="text-sm text-fg-secondary">
            Dataset&nbsp;: <strong>{dataset.filename}</strong> ({dataset.row_count.toLocaleString('fr-FR')} lignes)
          </p>
        )}
        <p className="text-sm text-fg-secondary">
          Décision&nbsp;: <code>{values.decision_column}</code> = <code>{values.favorable_value}</code> est l&apos;issue favorable
        </p>
        <p className="text-sm text-fg-secondary">
          Paramètres&nbsp;: k = {k}, déviation = {dev} pp, alpha = {alpha}
        </p>
      </div>

      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-fg">Analyses qui seront produites</p>
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
