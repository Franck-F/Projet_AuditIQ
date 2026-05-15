import * as React from 'react';
import { cn } from '@/lib/utils';

export type Verdict = 'pass' | 'warn' | 'fail';

interface StoplightProps {
  verdict: Verdict;
  size?: 'sm' | 'md';
  className?: string;
  /** Accessible label — defaults to the human-readable verdict. */
  label?: string;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  pass: 'Conforme',
  warn: 'Vigilance',
  fail: 'Critique',
};

const LAMP_COLORS: Record<Verdict, string> = {
  pass: 'bg-status-pass shadow-[0_0_12px_var(--status-pass-bg)] border-status-pass',
  warn: 'bg-status-warn shadow-[0_0_12px_var(--status-warn-bg)] border-status-warn',
  fail: 'bg-status-fail shadow-[0_0_12px_var(--status-fail-bg)] border-status-fail',
};

const OFFSET = ['pass', 'warn', 'fail'] as const;

export function Stoplight({ verdict, size = 'md', className, label }: StoplightProps) {
  const lampSize = size === 'sm' ? 'size-3.5' : 'size-[18px]';
  const a11yLabel = label ?? `Verdict : ${VERDICT_LABEL[verdict]}`;
  return (
    <div
      role="status"
      aria-label={a11yLabel}
      className={cn(
        'inline-flex flex-col gap-1.5 rounded-md border border-border-subtle bg-surface-2 p-2.5',
        className,
      )}
    >
      {OFFSET.map((v) => {
        const active = v === verdict;
        return (
          <span
            key={v}
            aria-hidden
            className={cn(
              'rounded-full border',
              lampSize,
              active ? LAMP_COLORS[v] : 'border-border-default bg-surface-3',
            )}
          />
        );
      })}
    </div>
  );
}
