// apps/web/components/product/HeatMap6Axes.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { VERDICT_LABELS } from '@/lib/verdict';

type AxisStatus = 'pass' | 'warn' | 'fail' | 'info';

interface AxisEntry {
  key: string;
  label: string;
  score: number;
  status: AxisStatus;
}

interface HeatMap6AxesProps {
  axes: [AxisEntry, AxisEntry, AxisEntry, AxisEntry, AxisEntry, AxisEntry];
  className?: string;
}

const BAR_COLOR: Record<AxisStatus, string> = {
  pass: 'bg-status-pass',
  warn: 'bg-status-warn',
  fail: 'bg-status-fail',
  info: 'bg-status-info',
};

const TEXT_COLOR: Record<AxisStatus, string> = {
  pass: 'text-status-pass',
  warn: 'text-status-warn',
  fail: 'text-status-fail',
  info: 'text-status-info',
};

const STATUS_LABEL: Record<AxisStatus, string> = {
  ...VERDICT_LABELS,
  info: 'Info',
};

export function HeatMap6Axes({ axes, className }: HeatMap6AxesProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2',
        className,
      )}
      aria-label="Carte de chaleur — 6 axes d'équité"
    >
      {axes.map((axis) => {
        const fillPct = Math.max(0, Math.min(100, (axis.score / 5) * 100));
        return (
          <div
            key={axis.key}
            role="status"
            aria-label={`${axis.label}: ${axis.score.toFixed(1)} sur 5 — ${STATUS_LABEL[axis.status]}`}
            className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-default bg-surface p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-fg">{axis.label}</span>
              <span
                className={cn(
                  'rounded-[var(--r-sm)] border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest',
                  axis.status === 'pass' && 'border-status-pass-border bg-status-pass-bg text-status-pass',
                  axis.status === 'warn' && 'border-status-warn-border bg-status-warn-bg text-status-warn',
                  axis.status === 'fail' && 'border-status-fail-border bg-status-fail-bg text-status-fail',
                  axis.status === 'info' && 'border-status-info-border bg-status-info-bg text-status-info',
                )}
              >
                {STATUS_LABEL[axis.status]}
              </span>
            </div>

            {/* Score */}
            <div className={cn('font-mono text-[2rem] font-medium leading-none tabular-nums', TEXT_COLOR[axis.status])}>
              {axis.score.toFixed(1)}{' '}
              <span className="text-base font-normal text-fg-muted">/ 5</span>
            </div>

            {/* Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn('h-full rounded-full transition-[width] duration-700 ease-out', BAR_COLOR[axis.status])}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
