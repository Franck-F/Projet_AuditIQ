'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

type Values = { k: string; deviation_pp: string; chi2_alpha: string };

export function Step4Advanced(): React.ReactElement {
  const { register } = useFormContext<Values>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Paramètres avancés</h2>
      <p className="text-sm text-fg-secondary">
        Valeurs par défaut adaptées à la plupart des cas : <code>k=5</code> clusters,
        seuil de déviation <code>20 pp</code>, seuil χ² <code>alpha=0.05</code>.
        N&apos;ajustez que si vous savez ce que vous faites.
      </p>

      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="self-start text-sm text-fg-muted underline-offset-2 hover:underline"
        aria-expanded={expanded}
      >
        {expanded ? '− Personnaliser' : '+ Personnaliser'}
      </button>

      {expanded && (
        <div className="grid gap-4 rounded-md border border-border-default bg-surface p-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m2-k" className="text-sm font-medium text-fg-secondary">
              Nombre de clusters (k)
            </label>
            <input
              id="m2-k"
              type="number"
              min={2}
              max={20}
              placeholder="5"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('k')}
              onFocus={() => setHelpKey('m2.step4.k')}
              onBlur={() => clearHelpKey()}
              aria-label="Nombre de clusters"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m2-dev" className="text-sm font-medium text-fg-secondary">
              Seuil de déviation (pts)
            </label>
            <input
              id="m2-dev"
              type="number"
              min={1}
              max={100}
              placeholder="20"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('deviation_pp')}
              onFocus={() => setHelpKey('m2.step4.deviation_pp')}
              onBlur={() => clearHelpKey()}
              aria-label="Seuil de déviation"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m2-alpha" className="text-sm font-medium text-fg-secondary">
              Seuil χ² (alpha)
            </label>
            <input
              id="m2-alpha"
              type="number"
              step="0.01"
              min={0.001}
              max={0.5}
              placeholder="0.05"
              className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
              {...register('chi2_alpha')}
              onFocus={() => setHelpKey('m2.step4.chi2_alpha')}
              onBlur={() => clearHelpKey()}
              aria-label="Seuil χ²"
            />
          </div>
        </div>
      )}
    </div>
  );
}
