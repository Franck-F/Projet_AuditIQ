import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function Avatar({ name, size = 32, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-2 font-mono font-medium text-fg-secondary',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
