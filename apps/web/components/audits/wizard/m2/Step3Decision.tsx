'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import type { DatasetAnalysisOut } from '@/lib/api/audits';

interface Step3DecisionProps {
  columns: ReadonlyArray<string>;
  analysis: DatasetAnalysisOut | null;
}

type Values = { decision_column: string; favorable_value: string };

export function Step3Decision({ columns, analysis }: Step3DecisionProps): React.ReactElement {
  const { register, control } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const selectedDecision = useWatch({ control, name: 'decision_column' });

  const suggestedDecision = analysis?.suggested_decision?.column ?? null;

  const selectedColumnProfile = React.useMemo(() => {
    if (!analysis || !selectedDecision) return null;
    return analysis.columns.find((c) => c.name === selectedDecision) ?? null;
  }, [analysis, selectedDecision]);

  const favorableOptions = React.useMemo(() => {
    if (!selectedColumnProfile) return [];
    return selectedColumnProfile.top_values.map(([v]) => String(v as string | number | boolean));
  }, [selectedColumnProfile]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Quelle décision auditer&nbsp;?</h2>
      <p className="text-sm text-fg-secondary">
        Indiquez la colonne et la valeur favorable. M2 mesurera la distribution
        de cette valeur entre les clusters découverts automatiquement.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m2-decision" className="text-sm font-medium text-fg-secondary">Colonne de décision</label>
        <select
          id="m2-decision"
          defaultValue=""
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('decision_column', { required: true })}
          onFocus={() => setHelpKey('m2.step3.decision_column')}
          onBlur={() => clearHelpKey()}
          aria-label="Colonne de décision"
        >
          <option value="" disabled>—</option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}{c === suggestedDecision ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="m2-favorable" className="text-sm font-medium text-fg-secondary">Valeur favorable</label>
        <select
          id="m2-favorable"
          defaultValue=""
          disabled={!selectedDecision}
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
          {...register('favorable_value', { required: true })}
          onFocus={() => setHelpKey('m2.step3.favorable_value')}
          onBlur={() => clearHelpKey()}
          aria-label="Valeur favorable"
        >
          <option value="" disabled>—</option>
          {favorableOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    </div>
  );
}
