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
        Donnez un nom à votre audit
      </h2>
      <p className="text-sm text-fg-secondary">
        Choisissez un titre court et descriptif. Il vous servira à retrouver ce
        rapport plus tard dans le tableau de bord.
      </p>
      <label
        htmlFor="m1-title"
        className="text-sm font-medium text-fg-secondary"
      >
        Titre de l&apos;audit
      </label>
      <input
        id="m1-title"
        type="text"
        placeholder="Audit recrutement Q1 2026"
        className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
        {...register('title', { required: true })}
        onFocus={() => setHelpKey('m1.step1.title')}
        onBlur={() => clearHelpKey()}
        aria-label="Titre de l'audit"
      />
    </div>
  );
}
