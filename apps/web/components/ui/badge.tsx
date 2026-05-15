import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-2 text-fg-secondary border-border-default',
        mono: 'bg-surface-2 text-fg-secondary border-border-default font-mono tracking-wider uppercase',
        accent: 'bg-accent-soft text-accent border-accent-border',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
