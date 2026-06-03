import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, ariaLabel, className, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-border-default bg-surface-3',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-4 rounded-full transition-transform',
          checked ? 'translate-x-5 bg-accent-fg' : 'translate-x-1 bg-fg-muted',
        )}
      />
    </button>
  );
}
