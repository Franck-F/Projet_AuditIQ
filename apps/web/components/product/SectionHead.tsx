import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  className?: string;
}

export function SectionHead({ eyebrow, title, sub, className }: SectionHeadProps) {
  return (
    <header className={cn('mb-4', className)}>
      {eyebrow && (
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          {eyebrow}
        </div>
      )}
      <h2 className="text-[16px] font-medium tracking-[-0.01em] text-fg">{title}</h2>
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{sub}</p>}
    </header>
  );
}
