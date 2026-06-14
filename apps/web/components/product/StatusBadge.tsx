import * as React from 'react';
import { cn } from '@/lib/utils';
import { VERDICT_LABELS } from '@/lib/verdict';

export type StatusTone = 'pass' | 'warn' | 'fail' | 'info' | 'neutral';

const STATUS_PILL: Record<StatusTone, string> = {
  pass: 'border-status-pass-border bg-status-pass-bg text-status-pass',
  warn: 'border-status-warn-border bg-status-warn-bg text-status-warn',
  fail: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  info: 'border-status-info-border bg-status-info-bg text-status-info',
  neutral: 'border-border-default bg-surface-2 text-fg-muted',
};

const DOT: Record<StatusTone, string> = {
  pass: 'bg-status-pass',
  warn: 'bg-status-warn',
  fail: 'bg-status-fail',
  info: 'bg-status-info',
  neutral: 'bg-fg-muted',
};

const LABELS: Record<StatusTone, string> = {
  ...VERDICT_LABELS,
  info: 'Info',
  neutral: 'Neutre',
};

interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone: StatusTone;
  /** If not provided, uses the canonical AuditIQ verdict label. */
  children?: React.ReactNode;
  /** Hide the colored dot. */
  noDot?: boolean;
}

/**
 * Canonical AuditIQ status pill. Always uses tabular-nums for numeric content.
 */
export function StatusBadge({ tone, children, noDot = false, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums',
        STATUS_PILL[tone],
        className,
      )}
      {...props}
    >
      {!noDot && <span aria-hidden className={cn('size-2 rounded-full', DOT[tone])} />}
      {children ?? LABELS[tone]}
    </span>
  );
}

/** Compact mono variant used on result headers (e.g. "PASS · 0.92"). */
export function StatusBadgeMono({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]',
        className,
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', DOT[tone])} />
      {children}
    </span>
  );
}
