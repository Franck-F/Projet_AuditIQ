import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] text-sm font-medium leading-tight transition-[background,border-color,color] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg border border-accent hover:bg-accent-hover hover:border-accent-hover',
        secondary:
          'bg-transparent text-fg border border-border-strong hover:border-border-prominent hover:bg-surface-2',
        outline:
          'bg-transparent text-fg border border-border-default hover:border-border-strong hover:bg-surface-2',
        ghost: 'text-fg-secondary hover:text-fg hover:bg-surface-2',
        destructive:
          'bg-status-fail text-fg border border-status-fail-border hover:bg-status-fail/90',
        dark: 'bg-bg text-fg border border-fg hover:bg-surface',
      },
      size: {
        sm: 'px-3.5 py-1.5 text-xs',
        default: 'px-5 py-2.5',
        lg: 'px-7 py-3.5 text-base',
        icon: 'p-2 size-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
