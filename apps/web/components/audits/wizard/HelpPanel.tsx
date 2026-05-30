'use client';

import * as React from 'react';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import { getHelp } from '@/lib/wizard/help-content';
import { cn } from '@/lib/utils';

interface HelpPanelProps {
  className?: string;
}

export function HelpPanel({ className }: HelpPanelProps): React.ReactElement {
  const { helpKey } = useWizard();
  const entry = helpKey ? getHelp(helpKey) : undefined;

  return (
    <aside
      role="complementary"
      aria-label="Aide contextuelle"
      className={cn(
        'rounded-2xl border border-border-default bg-surface p-5 lg:sticky lg:top-6 lg:max-w-[320px]',
        className
      )}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
        Aide contextuelle
      </h2>
      {helpKey === null && (
        <p className="text-sm text-fg-secondary">
          Sélectionnez un champ pour voir une explication détaillée et un
          exemple concret.
        </p>
      )}
      {helpKey !== null && entry === undefined && (
        <p className="text-sm text-fg-secondary">
          Aucune aide spécifique pour ce champ. Référez-vous au libellé ou
          consultez la documentation.
        </p>
      )}
      {entry !== undefined && (
        <article className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-fg">{entry.title}</h3>
          <p className="whitespace-pre-wrap text-sm text-fg-secondary">
            {entry.body}
          </p>
          {entry.example !== undefined && (
            <div className="rounded-md border border-border-default bg-bg-subtle p-3 text-xs text-fg-secondary">
              <p className="mb-1 font-medium uppercase tracking-wide text-fg-muted">
                Exemple
              </p>
              <p className="whitespace-pre-wrap">{entry.example}</p>
            </div>
          )}
          {entry.learnMoreHref !== undefined && (
            <a
              href={entry.learnMoreHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fg-muted underline-offset-2 hover:underline"
            >
              En savoir plus →
            </a>
          )}
        </article>
      )}
    </aside>
  );
}
