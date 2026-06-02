'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { DatasetUploadCard } from '@/components/audits/DatasetUploadCard';
import { useWizard } from '@/components/audits/wizard/WizardContext';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';
import type { UnifiedValues } from '@/components/audits/wizard/unified/types';

interface Step2SourceProps {
  dataset: DatasetOut | null;
  analysis: DatasetAnalysisOut | null;
  analysisError: string | null;
  onUpload: (file: File) => void;
  busy: boolean;
}

export function Step2Source({
  dataset,
  analysis,
  analysisError,
  onUpload,
  busy,
}: Step2SourceProps): React.ReactElement {
  const { register, control } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const auditType = useWatch({ control, name: 'audit_type' });

  React.useEffect(() => {
    setHelpKey('wizard.step2');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  if (auditType === 'llm-api') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-fg">
            Configuration de l&apos;API
          </h2>
          <p className="text-sm text-fg-secondary">
            Saisissez l&apos;URL de votre chatbot et les informations
            d&apos;authentification. AuditIQ envoie des paires de prompts et
            mesure les écarts de traitement.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="wz-url"
            className="text-sm font-medium text-fg-secondary"
          >
            URL de l&apos;API
          </label>
          <input
            id="wz-url"
            type="url"
            placeholder="https://api.openai.com/v1/chat/completions"
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg"
            {...register('url', { required: true })}
            onFocus={() => setHelpKey('wizard.step2.url')}
            onBlur={() => setHelpKey('wizard.step2')}
            aria-label="URL"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="wz-method"
            className="text-sm font-medium text-fg-secondary"
          >
            Méthode HTTP
          </label>
          <input
            id="wz-method"
            type="text"
            placeholder="POST"
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg"
            {...register('method', { required: true })}
            onFocus={() => setHelpKey('wizard.step2.url')}
            onBlur={() => setHelpKey('wizard.step2')}
            aria-label="Méthode HTTP"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="wz-auth"
            className="text-sm font-medium text-fg-secondary"
          >
            En-tête d&apos;authentification
          </label>
          <input
            id="wz-auth"
            type="text"
            placeholder="Bearer sk-proj-..."
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg"
            {...register('auth_header')}
            onFocus={() => setHelpKey('wizard.step2.auth_header')}
            onBlur={() => setHelpKey('wizard.step2')}
            aria-label="En-tête d'authentification"
          />
          <p className="text-xs text-fg-muted">
            Votre clé est utilisée uniquement pour les appels d&apos;audit —
            elle n&apos;est jamais persistée en base.
          </p>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">
          Importez votre jeu de données
        </h2>
        <p className="text-sm text-fg-secondary">
          Glissez-déposez un CSV, choisissez un exemple, ou importez depuis une
          source externe. Après l&apos;import, AuditIQ analyse automatiquement
          vos colonnes pour suggérer les bons paramètres.
        </p>
        <DatasetUploadCard
          module={auditType === 'tabular-unknown' ? 'M2' : 'M1'}
          busy={busy}
          onSelected={(file) => Promise.resolve(onUpload(file))}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Jeu de données importé</h2>
      <div className="rounded-md border border-border-default bg-surface p-4">
        <p className="font-medium text-fg">{dataset.filename}</p>
        <p className="text-xs text-fg-muted">
          {dataset.row_count.toLocaleString('fr-FR')} lignes,{' '}
          {dataset.columns.length} colonnes
        </p>
      </div>

      {busy && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="text-sm text-fg-muted">
            Analyse en cours… cela peut prendre 2-5 secondes.
          </p>
        </div>
      )}

      {analysisError !== null && (
        <div
          role="alert"
          className="rounded-md border border-status-warn-border bg-status-warn-bg p-4 text-sm text-status-warn"
        >
          <p className="font-medium">Analyse indisponible</p>
          <p>
            {analysisError} Vous pouvez continuer en sélectionnant manuellement
            les colonnes aux étapes suivantes.
          </p>
        </div>
      )}

      {analysis !== null && (
        <div className="rounded-md border border-border-default bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-fg">Analyse automatique</p>
          <ul className="flex flex-col gap-1 text-xs text-fg-secondary">
            {analysis.suggested_decision !== null && (
              <li>
                Décision suggérée :{' '}
                <strong>{analysis.suggested_decision.column}</strong> (
                {Math.round(analysis.suggested_decision.confidence * 100)}%)
              </li>
            )}
            {analysis.suggested_protected !== null && (
              <li>
                Attribut protégé suggéré :{' '}
                <strong>{analysis.suggested_protected.column}</strong> (
                {Math.round(analysis.suggested_protected.confidence * 100)}%)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
