import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChoiceProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export function Choice({ selected, onClick, title, desc, icon: Icon, className }: ChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        selected ? 'border-accent bg-accent-softer' : 'border-border-default bg-surface hover:border-border-strong',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
          selected ? 'border-accent' : 'border-border-strong',
        )}
      >
        {selected && <span className="size-2 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-medium text-fg">
          {Icon && <Icon size={15} className={selected ? 'text-accent' : 'text-fg-muted'} />}
          {title}
        </span>
        {desc && <span className="mt-1 block text-[12.5px] leading-relaxed text-fg-muted">{desc}</span>}
      </span>
    </button>
  );
}
