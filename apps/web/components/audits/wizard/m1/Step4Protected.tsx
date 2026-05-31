'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

interface Step4ProtectedProps {
  columns: ReadonlyArray<string>;
  analysis: DatasetAnalysisOut | null;
}

type Values = {
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
};

export function Step4Protected({
  columns,
  analysis,
}: Step4ProtectedProps): React.ReactElement {
  const { register } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const suggested = analysis?.suggested_protected?.column ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Sur quelle caractéristique chercher des écarts&nbsp;?
      </h2>
      <p className="text-sm text-fg-secondary">
        Choisissez l&apos;attribut protégé sur lequel mesurer un éventuel
        écart de traitement.
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-protected"
          className="text-sm font-medium text-fg-secondary"
        >
          Attribut protégé
        </label>
        <select
          id="m1-protected"
          defaultValue=""
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('protected_attribute', { required: true })}
          onFocus={() => setHelpKey('m1.step4.protected_attribute')}
          onBlur={() => clearHelpKey()}
          aria-label="Attribut protégé"
        >
          <option value="" disabled>
            —
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === suggested ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="self-start text-sm text-fg-muted underline-offset-2 hover:underline"
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? '− Options avancées' : '+ Options avancées'}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-4 rounded-md border border-border-default bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="m1-priv"
              className="text-sm font-medium text-fg-secondary"
            >
              Groupe de référence (facultatif)
            </label>
            <input
              id="m1-priv"
              type="text"
              placeholder="Laisser vide pour détection automatique"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('privileged_value')}
              onFocus={() => setHelpKey('m1.step4.privileged_value')}
              onBlur={() => clearHelpKey()}
              aria-label="Groupe de référence"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="m1-gt"
              className="text-sm font-medium text-fg-secondary"
            >
              Colonne vérité-terrain (facultatif)
            </label>
            <select
              id="m1-gt"
              defaultValue=""
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('ground_truth_column')}
              onFocus={() => setHelpKey('m1.step4.ground_truth_column')}
              onBlur={() => clearHelpKey()}
              aria-label="Colonne vérité-terrain"
            >
              <option value="">—</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="m1-sec"
              className="text-sm font-medium text-fg-secondary"
            >
              Attribut secondaire — analyse intersectionnelle (facultatif)
            </label>
            <select
              id="m1-sec"
              defaultValue=""
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('secondary_protected_attribute')}
              onFocus={() => setHelpKey('m1.step4.secondary_protected_attribute')}
              onBlur={() => clearHelpKey()}
              aria-label="Attribut secondaire"
            >
              <option value="">—</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
