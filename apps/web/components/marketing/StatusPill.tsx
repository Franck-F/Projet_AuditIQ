import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'pass' | 'warn' | 'fail' | 'info' | 'neutral';

const PILL: Record<Tone, string> = {
  pass: 'border-status-pass-border bg-status-pass-bg text-status-pass',
  warn: 'border-status-warn-border bg-status-warn-bg text-status-warn',
  fail: 'border-status-fail-border bg-status-fail-bg text-status-fail',
  info: 'border-status-info-border bg-status-info-bg text-status-info',
  neutral: 'border-border-default bg-surface-2 text-fg-muted',
};

const DOT: Record<Tone, string> = {
  pass: 'bg-status-pass',
  warn: 'bg-status-warn',
  fail: 'bg-status-fail',
  info: 'bg-status-info',
  neutral: 'bg-fg-muted',
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums',
        PILL[tone],
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', DOT[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function StatusInfo({ children }: { children: React.ReactNode }) {
  return <StatusPill tone="info">{children}</StatusPill>;
}
