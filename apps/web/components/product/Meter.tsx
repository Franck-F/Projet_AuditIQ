// apps/web/components/product/Meter.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

type Status = 'pass' | 'warn' | 'fail' | 'info';

interface MeterProps {
  value: number;
  threshold?: number;
  max: number;
  status: Status;
  format?: (v: number) => string;
  className?: string;
  ariaLabel?: string;
}

const FILL: Record<Status, string> = {
  pass: 'bg-status-pass',
  warn: 'bg-status-warn',
  fail: 'bg-status-fail',
  info: 'bg-status-info',
};

export function Meter({ value, threshold, max, status, format, className, ariaLabel }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const thrPct = threshold !== undefined ? Math.max(0, Math.min(100, (threshold / max) * 100)) : null;
  return (
    <div className={cn('w-full', className)}>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel ?? 'Métrique'}
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', FILL[status])} style={{ width: `${pct}%` }} />
        {thrPct !== null && (
          <span aria-hidden className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-fg-muted opacity-70" style={{ left: `${thrPct}%` }} />
        )}
      </div>
      {format && (
        <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-fg-muted">
          <span>{format(value)}</span>
          {threshold !== undefined && <span>Seuil · {format(threshold)}</span>}
        </div>
      )}
    </div>
  );
}
