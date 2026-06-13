import * as React from 'react';
import { Info } from 'lucide-react';

/**
 * Bandeau d'honnêteté affiché en haut des sections non encore branchées au
 * backend (Équipe, Paramètres, Support). Les données visibles dessous sont
 * des exemples, et les contrôles sont désactivés.
 */
export function PreviewBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-status-info"
    >
      <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
      <p className="leading-relaxed">
        <strong className="font-medium">Aperçu</strong> — cette section est en
        cours de développement&nbsp;; les données affichées sont des exemples.
      </p>
    </div>
  );
}
