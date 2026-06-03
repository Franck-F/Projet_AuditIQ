// apps/web/components/rapport/RegulatoryCallout.tsx
import * as React from 'react';
import { Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge, type StatusTone } from '@/components/product/StatusBadge';
import { cn } from '@/lib/utils';

export interface RegulatoryCalloutProps {
  /** Short reference code, e.g. "Art. 10 AI Act" */
  article: string;
  /** Full title of the article */
  title: string;
  /** Quoted or paraphrased body of the article */
  body: string;
  /** External link (Eur-Lex or Légifrance) */
  url: string;
  /** Optional status indicator */
  status?: StatusTone;
  /** Optional finding / constat text shown below the body */
  finding?: string;
  className?: string;
}

/**
 * Card-like block for a regulatory article reference.
 * Shows a Scale icon, article ref, title, block-quote body and an external link.
 */
export function RegulatoryCallout({
  article,
  title,
  body,
  url,
  status,
  finding,
  className,
}: RegulatoryCalloutProps) {
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale
            size={16}
            aria-hidden
            className="shrink-0 text-accent"
          />
          <span className="font-mono text-[12px] tracking-[0.06em] text-accent">
            {article}
          </span>
        </div>
        {status && <StatusBadge tone={status} />}
      </div>

      {/* Title */}
      <p className="text-[14px] font-medium text-fg">{title}</p>

      {/* Block-quote body */}
      <blockquote className="border-l-2 border-accent/40 bg-surface-2 py-3 pl-3.5 pr-3 text-[13px] italic leading-relaxed text-fg-secondary">
        {body}
      </blockquote>

      {/* Finding row */}
      {finding && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-fg-muted">Constat AuditIQ</span>
          <span
            className={cn(
              'font-medium',
              status === 'fail' && 'text-status-fail',
              status === 'warn' && 'text-status-warn',
              status === 'pass' && 'text-status-pass',
              (!status || status === 'info' || status === 'neutral') && 'text-fg-secondary',
            )}
          >
            {finding}
          </span>
        </div>
      )}

      {/* External link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
        aria-label={`Voir ${article} (ouvre un nouvel onglet)`}
      >
        Voir le texte officiel
        {/* Arrow icon inline */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M2 10L10 2M10 2H5M10 2v5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </Card>
  );
}
