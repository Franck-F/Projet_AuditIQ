// apps/web/components/product/RatioBar.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface RatioGroup {
  label: string;
  value: number;
  n?: number;
}

interface RatioBarProps {
  groups: RatioGroup[];
  threshold?: number;
  format?: (v: number) => string;
  className?: string;
}

type BarStatus = 'reference' | 'pass' | 'warn' | 'fail';

const BAR_COLOR: Record<BarStatus, string> = {
  reference: 'bg-accent',
  pass: 'bg-status-pass',
  warn: 'bg-status-warn',
  fail: 'bg-status-fail',
};

const TEXT_COLOR: Record<BarStatus, string> = {
  reference: 'text-accent',
  pass: 'text-status-pass',
  warn: 'text-status-warn',
  fail: 'text-status-fail',
};

function getStatus(ratio: number, threshold: number, isRef: boolean): BarStatus {
  if (isRef) return 'reference';
  if (ratio >= threshold) return 'pass';
  if (ratio >= threshold * 0.8) return 'warn';
  return 'fail';
}

export function RatioBar({
  groups,
  threshold = 0.8,
  format = (v) => `${(v * 100).toFixed(0)}%`,
  className,
}: RatioBarProps) {
  if (groups.length === 0) return null;

  const maxValue = Math.max(...groups.map((g) => g.value));
  const refGroup = groups.find((g) => g.value === maxValue) ?? groups[0]!;
  const thresholdPct = (threshold * maxValue) / maxValue; // = threshold in relative space

  // Build aria summary
  const summary = groups
    .map((g) => {
      const ratio = g.value / (refGroup?.value ?? 1);
      const st = getStatus(ratio, threshold, g === refGroup);
      return `${g.label}: ${format(g.value)} (${st})`;
    })
    .join('; ');

  return (
    <div
      role="img"
      aria-label={`Comparaison des groupes. ${summary}. Seuil 4/5 à ${(threshold * 100).toFixed(0)}%.`}
      className={cn('flex flex-col gap-3', className)}
    >
      {groups.map((group) => {
        const widthPct = maxValue > 0 ? (group.value / maxValue) * 100 : 0;
        const ratio = maxValue > 0 ? group.value / maxValue : 1;
        const isRef = group === refGroup;
        const status = getStatus(ratio, threshold, isRef);

        return (
          <div key={group.label} className="flex flex-col gap-1">
            {/* Label row */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-fg-secondary">{group.label}</span>
              <span className={cn('font-mono text-sm font-medium tabular-nums', TEXT_COLOR[status])}>
                {format(group.value)}
                {group.n !== undefined && (
                  <span className="ml-1 text-xs text-fg-muted">n={group.n}</span>
                )}
              </span>
            </div>
            {/* Bar track */}
            <div className="relative h-2 w-full overflow-visible rounded-full bg-surface-3">
              {/* Fill */}
              <div
                className={cn('h-full rounded-full transition-[width] duration-700 ease-out', BAR_COLOR[status])}
                style={{ width: `${widthPct}%` }}
              />
              {/* Threshold marker — positioned at threshold% of the full bar */}
              <span
                aria-hidden
                className="absolute -top-0.5 bottom-[-2px] w-0.5 rounded-full bg-fg-secondary opacity-70"
                style={{ left: `${thresholdPct * 100}%` }}
              />
            </div>
          </div>
        );
      })}
      {/* Threshold label */}
      <div className="flex justify-end">
        <span className="font-mono text-[11px] text-fg-muted">
          Seuil 4/5 · {format(maxValue * threshold)}
        </span>
      </div>
    </div>
  );
}
