import * as React from 'react';
import { cn } from '@/lib/utils';

interface GaugeProps {
  /** 0–100 score */
  value: number;
  /** ARIA label describing the score (e.g. "Score de risque global"). */
  label: string;
  /** Optional caption below the value (e.g. "/100 · risque modéré"). */
  caption?: string;
  /** Segment thresholds — defaults to AuditIQ risk bands. */
  thresholds?: { pass: number; warn: number };
  className?: string;
}

/**
 * Gauge — half-circle meter scored 0..100.
 * Segments: pass (0..thresholds.pass), warn (..thresholds.warn), fail (..100).
 * Accessible via role="meter".
 */
export function Gauge({
  value,
  label,
  caption,
  thresholds = { pass: 30, warn: 70 },
  className,
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  // arc goes from angle 180° (left) to 0° (right) over 80px radius around (100,100)
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const pointOnArc = (pct: number) => {
    const angleDeg = 180 - (pct / 100) * 180;
    return {
      x: cx + radius * Math.cos(toRad(angleDeg)),
      y: cy - radius * Math.sin(toRad(angleDeg)),
    };
  };
  const arc = (fromPct: number, toPct: number) => {
    const a = pointOnArc(fromPct);
    const b = pointOnArc(toPct);
    const largeArc = toPct - fromPct > 50 ? 1 : 0;
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  const needleAngle = 180 - (clamped / 100) * 180;
  const needleEnd = {
    x: cx + (radius - 18) * Math.cos(toRad(needleAngle)),
    y: cy - (radius - 18) * Math.sin(toRad(needleAngle)),
  };

  const activeBand: 'pass' | 'warn' | 'fail' =
    clamped <= thresholds.pass ? 'pass' : clamped <= thresholds.warn ? 'warn' : 'fail';

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative aspect-[2/1.15] w-full max-w-[280px]', className)}
    >
      <svg className="block h-full w-full" viewBox="0 0 200 115" aria-hidden>
        {/* background arc */}
        <path
          d={arc(0, 100)}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* pass segment */}
        <path
          d={arc(0, thresholds.pass)}
          fill="none"
          stroke="var(--status-pass)"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={activeBand === 'pass' ? 1 : 0.35}
        />
        {/* warn segment */}
        <path
          d={arc(thresholds.pass, thresholds.warn)}
          fill="none"
          stroke="var(--status-warn)"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={activeBand === 'warn' ? 1 : 0.35}
        />
        {/* fail segment */}
        <path
          d={arc(thresholds.warn, 100)}
          fill="none"
          stroke="var(--status-fail)"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={activeBand === 'fail' ? 1 : 0.35}
        />
        {/* needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="var(--fg)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="var(--fg)" />
      </svg>
      <div className="absolute left-1/2 top-[78%] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="font-mono text-[44px] font-medium leading-none tracking-[-0.02em] tabular-nums text-fg">
          {Math.round(clamped)}
        </div>
        {caption && (
          <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}
