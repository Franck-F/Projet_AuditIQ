// apps/web/components/product/InlineNote.tsx
import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineNoteProps {
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export function InlineNote({ children, icon: Icon = Info, className }: InlineNoteProps) {
  return (
    <div className={cn('flex gap-3 rounded-lg border border-border-subtle bg-surface-2 px-4 py-3 text-[13px] text-fg-secondary', className)}>
      <Icon size={15} className="mt-0.5 shrink-0 text-fg-muted" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
