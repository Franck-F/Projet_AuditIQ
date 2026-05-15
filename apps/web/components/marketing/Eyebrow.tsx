import * as React from 'react';
import { cn } from '@/lib/utils';

interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  accent?: boolean;
}

export function Eyebrow({ accent = false, className, ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        'font-mono text-xs uppercase tracking-[0.12em] font-normal',
        accent ? 'text-accent' : 'text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}
