import * as React from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Y values (any range). The component normalizes to viewBox 0..100 × 0..30. */
  values: number[];
  /** Tone — drives stroke + fill colors. */
  tone?: 'accent' | 'warn' | 'fail';
  /** If true, draws a filled area under the line. */
  filled?: boolean;
  /** ARIA label (e.g. "Évolution des audits sur 14 jours"). */
  label: string;
  className?: string;
}

const STROKE: Record<NonNullable<SparklineProps['tone']>, string> = {
  accent: 'var(--accent)',
  warn: 'var(--status-warn)',
  fail: 'var(--status-fail)',
};
const FILL: Record<NonNullable<SparklineProps['tone']>, string> = {
  accent: 'var(--accent-soft)',
  warn: 'var(--status-warn-bg)',
  fail: 'var(--status-fail-bg)',
};

export function Sparkline({
  values,
  tone = 'accent',
  filled = false,
  label,
  className,
}: SparklineProps) {
  if (values.length < 2) {
    return null;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  // Y is inverted in SVG; map to 4..26 (with 4px breathing room)
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 26 - ((v - min) / range) * 22;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const fillPath = `${path} L100,30 L0,30 Z`;

  return (
    <svg
      className={cn('block h-9 w-full', className)}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      {filled && <path d={fillPath} fill={FILL[tone]} />}
      <path d={path} fill="none" stroke={STROKE[tone]} strokeWidth={1.5} />
    </svg>
  );
}
