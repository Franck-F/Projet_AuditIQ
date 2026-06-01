'use client';

import type { RecommendationOut } from '@/lib/api/audits';
import { cn } from '@/lib/utils';

interface RecommendationsProps {
  items: RecommendationOut[];
}

const PRIORITY_LABEL: Record<RecommendationOut['priority'], string> = {
  high: 'Action prioritaire',
  medium: 'À planifier',
  low: 'Maintien / veille',
};

const PRIORITY_CLASS: Record<RecommendationOut['priority'], string> = {
  high: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  medium: 'border-status-warn-border bg-status-warn-bg text-status-warn',
  low: 'border-border-default bg-surface text-fg-muted',
};

export function Recommendations({ items }: RecommendationsProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-fg">Recommandations</h3>
      <ul className="flex flex-col gap-3">
        {items.map((rec, idx) => (
          <li
            key={`${idx}-${rec.title}`}
            className="flex flex-col gap-2 rounded-md border border-border-default bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-fg">{rec.title}</p>
              <span
                className={cn(
                  'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  PRIORITY_CLASS[rec.priority],
                )}
              >
                {PRIORITY_LABEL[rec.priority]}
              </span>
            </div>
            <p className="text-sm text-fg-secondary">{rec.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
