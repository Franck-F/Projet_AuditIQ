// apps/web/components/product/Tabs.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  items: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ items, value, onChange, className, ariaLabel = 'Onglets' }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex gap-1 border-b border-border-subtle', className)}>
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              'relative -mb-px px-4 py-2.5 text-[13px] font-medium transition-colors',
              active ? 'border-b-2 border-accent text-fg' : 'border-b-2 border-transparent text-fg-muted hover:text-fg-secondary',
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
