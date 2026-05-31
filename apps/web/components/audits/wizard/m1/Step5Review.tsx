'use client';

import * as React from 'react';

import type { DatasetOut } from '@/lib/api/audits';

interface Step5ReviewValues {
  title: string;
  decision_column: string;
  favorable_value: string;
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
}

interface Step5ReviewProps {
  dataset: DatasetOut | null;
  values: Step5ReviewValues;
}

export function Step5Review({
  dataset,
  values,
}: Step5ReviewProps): React.ReactElement {
  const analyses: string[] = [
    'Disparate Impact (DI)',
    'Règle des 4/5',
    'Demographic Parity',
  ];
  if (values.ground_truth_column) {
    analyses.push('Equal Opportunity');
    analyses.push('Equalized Odds');
  }
  if (values.secondary_protected_attribute) {
    analyses.push(
      `Analyse intersectionnelle (${values.protected_attribute} × ${values.secondary_protected_attribute})`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Récapitulatif</h2>
      <p className="text-sm text-fg-secondary">
        Vérifiez les paramètres avant de lancer l&apos;audit. Le calcul prend
        généralement 5-30 secondes selon la taille du dataset.
      </p>

      <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface p-4">
        <p className="text-base font-medium text-fg">{values.title}</p>
        {dataset !== null && (
          <p className="text-sm text-fg-secondary">
            Dataset&nbsp;: <strong>{dataset.filename}</strong> (
            {dataset.row_count.toLocaleString('fr-FR')} lignes)
          </p>
        )}
        <p className="text-sm text-fg-secondary">
          Décision&nbsp;: <code>{values.decision_column}</code> ={' '}
          <code>{values.favorable_value}</code> est l&apos;issue favorable
        </p>
        <p className="text-sm text-fg-secondary">
          Attribut protégé&nbsp;: <code>{values.protected_attribute}</code>
          {values.privileged_value && (
            <>
              {' '}
              (référence&nbsp;: <code>{values.privileged_value}</code>)
            </>
          )}
        </p>
      </div>

      <div className="rounded-md border border-border-default bg-surface p-4">
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
