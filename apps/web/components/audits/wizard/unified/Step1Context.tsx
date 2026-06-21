'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import { AUDIT_TYPE_CARDS, SECTOR_CARDS } from '@/components/audits/wizard/unified/constants';
import type { AuditType, Sector, UnifiedValues } from '@/components/audits/wizard/unified/types';

export function Step1Context(): React.ReactElement {
  const { register, control, setValue } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const auditType = useWatch({ control, name: 'audit_type' });
  const sector = useWatch({ control, name: 'sector' });

  React.useEffect(() => { setHelpKey('wizard.step1'); return () => clearHelpKey(); }, [setHelpKey, clearHelpKey]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold text-fg">Contexte de l'audit</h2>
        <p className="text-sm text-fg-secondary">Donnez un nom à votre audit, choisissez le type d'outil que vous souhaitez auditer, et précisez le secteur d'usage.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wz-title" className="text-sm font-medium text-fg-secondary">Titre de l'audit</label>
        <input
          id="wz-title"
          type="text"
          placeholder="Audit recrutement Q1 2026"
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('title', { required: true })}
          onFocus={() => setHelpKey('wizard.step1.title')}
          onBlur={() => setHelpKey('wizard.step1')}
          aria-label="Titre de l'audit"
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow">Type d'audit</legend>
        <div className="grid gap-3 sm:grid-cols-1">
          {AUDIT_TYPE_CARDS.map((c) => {
            const selected = auditType === c.value;
            return (
              <div
                key={c.value}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setValue('audit_type', c.value as AuditType, { shouldValidate: true })}
                  onFocus={() => setHelpKey('wizard.step1.audit_type')}
                  onBlur={() => setHelpKey('wizard.step1')}
                  className="w-full p-4 text-left text-sm font-medium text-fg"
                >
                  {c.title}
                </button>
                <details className="border-t border-border-subtle px-4 py-2.5">
                  <summary className="cursor-pointer select-none text-xs font-medium text-accent">
                    En savoir plus
                  </summary>
                  <p className="mt-2 text-xs text-fg-secondary">{c.description}</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs text-fg-muted">
                    {c.bullets.map((b) => <li key={b}>• {b}</li>)}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow">Secteur d'usage</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTOR_CARDS.map((c) => {
            const selected = sector === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setValue('sector', c.value as Sector, { shouldValidate: true })}
                onFocus={() => setHelpKey('wizard.step1.sector')}
                onBlur={() => setHelpKey('wizard.step1')}
                className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                  selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <p className="text-sm font-medium text-fg">{c.title}</p>
                <p className="text-xs text-fg-muted">{c.description}</p>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
