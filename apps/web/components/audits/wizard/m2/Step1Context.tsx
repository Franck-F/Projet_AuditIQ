'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';

export function Step1Context(): React.ReactElement {
  const { register } = useFormContext<{ title: string }>();
  const { setHelpKey, clearHelpKey } = useWizard();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-fg">
        Donnez un nom à votre détection
      </h2>
      <p className="text-sm text-fg-secondary">
        La détection non supervisée cherche des groupes de décisions inhabituels
        sans connaître l&apos;attribut sensible.
      </p>
      <label htmlFor="m2-title" className="text-sm font-medium text-fg-secondary">
        Titre de la détection
      </label>
      <input
        id="m2-title"
        type="text"
        placeholder="Détection biais octrois crédit 2026"
        className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
        {...register('title', { required: true })}
        onFocus={() => setHelpKey('m2.step1.title')}
        onBlur={() => clearHelpKey()}
        aria-label="Titre de la détection"
      />
    </div>
  );
}
