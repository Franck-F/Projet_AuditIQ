import * as React from 'react';
import { Sparkline } from './Sparkline';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  /** Suffix rendered smaller next to the value (e.g. "%"). */
  suffix?: string;
  /** Short qualifier shown under the value. */
  delta?: { direction: 'up' | 'down' | 'neutral'; text: string };
  /** Optional inline visual under the delta. */
  visual?: React.ReactNode;
  className?: string;
}

const DELTA: Record<NonNullable<MetricCardProps['delta']>['direction'], string> = {
  up: 'text-status-pass',
  down: 'text-status-fail',
  neutral: 'text-fg-muted',
};

const ARROW: Record<NonNullable<MetricCardProps['delta']>['direction'], string> = {
  up: '↑',
  down: '↓',
  neutral: '·',
};

/**
 * KPI card with label, value (tabular-nums mono), optional delta and visual.
 * Reference: .kpi block from app.css.
 */
export function MetricCard({ label, value, suffix, delta, visual, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border border-border-default bg-surface p-5',
        className,
      )}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
        {label}
      </span>
      <span className="font-mono text-[28px] font-medium leading-none tracking-[-0.02em] tabular-nums text-fg">
        {value}
        {suffix && <span className="ml-0.5 text-[18px] text-fg-muted">{suffix}</span>}
      </span>
      {delta && (
        <span
          className={cn(
            'flex items-center gap-1 font-mono text-[11px] tabular-nums',
            DELTA[delta.direction],
          )}
        >
          <span aria-hidden>{ARROW[delta.direction]}</span>
          {delta.text}
        </span>
      )}
      {visual && <div className="mt-2">{visual}</div>}
    </div>
  );
}

/** Convenience wrapper that draws an inline Sparkline as visual. */
export function MetricCardWithSparkline({
  label,
  value,
  suffix,
  delta,
  sparkline,
  className,
}: Omit<MetricCardProps, 'visual'> & {
  sparkline: { values: number[]; tone?: 'accent' | 'warn' | 'fail'; filled?: boolean };
}) {
  return (
    <MetricCard
      label={label}
      value={value}
      suffix={suffix}
      delta={delta}
      className={className}
      visual={
        <Sparkline
          values={sparkline.values}
          tone={sparkline.tone}
          filled={sparkline.filled}
          label={`Évolution — ${label}`}
        />
      }
    />
  );
}
