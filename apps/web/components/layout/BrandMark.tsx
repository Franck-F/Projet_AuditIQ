import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  href?: string;
  className?: string;
}

export function BrandMark({ href = '/', className }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2.5 font-display font-semibold text-h4 tracking-tight text-fg',
        className,
      )}
      aria-label="AuditIQ — retour à l'accueil"
    >
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[#0b1410] font-mono font-semibold text-sm leading-none"
        aria-hidden
      >
        A
      </span>
      AuditIQ
    </Link>
  );
}
