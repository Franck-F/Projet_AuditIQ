import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind class strings safely.
 * `cn('p-2', condition && 'bg-accent', maybeUndefined)` → resolves conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
