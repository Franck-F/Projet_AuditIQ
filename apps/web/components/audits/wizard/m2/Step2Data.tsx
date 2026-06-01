'use client';

import * as React from 'react';

import { DatasetUploadCard } from '@/components/audits/DatasetUploadCard';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';

interface Step2DataProps {
  dataset: DatasetOut | null;
  analysis: DatasetAnalysisOut | null;
  analysisError: string | null;
  onUpload: (file: File) => Promise<void>;
  busy: boolean;
}

export function Step2Data({
  dataset,
  analysis,
  analysisError,
  onUpload,
  busy,
}: Step2DataProps): React.ReactElement {
  if (!dataset) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Importez votre jeu de données</h2>
        <p className="text-sm text-fg-secondary">
          M2 détecte les écarts à partir des features comportementales (montant,
          durée, ancienneté…). Inutile d&apos;inclure un attribut protégé.
        </p>
        <DatasetUploadCard module="M2" busy={busy} onSelected={onUpload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Jeu de données importé</h2>
      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="font-medium text-fg">{dataset.filename}</p>
        <p className="text-xs text-fg-muted">
          {dataset.row_count.toLocaleString('fr-FR')} lignes, {dataset.columns.length} colonnes
        </p>
      </div>

      {busy && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="text-sm text-fg-muted">Analyse en cours… cela peut prendre 2-5 secondes.</p>
        </div>
      )}

      {analysisError !== null && (
        <div role="alert" className="rounded-md border border-status-warn-border bg-status-warn-bg p-4 text-sm text-status-warn">
          <p className="font-medium">Analyse indisponible</p>
          <p>{analysisError} Vous pouvez continuer en sélectionnant manuellement les colonnes.</p>
        </div>
      )}

      {analysis !== null && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-fg">Analyse automatique</p>
          <ul className="flex flex-col gap-1 text-xs text-fg-secondary">
            {analysis.suggested_decision !== null && (
              <li>
                Décision suggérée : <strong>{analysis.suggested_decision.column}</strong> (
                {Math.round(analysis.suggested_decision.confidence * 100)}%)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
