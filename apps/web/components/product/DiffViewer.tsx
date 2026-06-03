// apps/web/components/product/DiffViewer.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface PromptPair {
  prompt: string;
  response: string;
}

interface DiffDelta {
  length_chars?: number;
  sentiment_delta?: number;
  refused?: boolean;
}

interface DiffViewerProps {
  neutral: PromptPair;
  marked: PromptPair;
  delta: DiffDelta;
  className?: string;
}

function PaneContent({ pair, label }: { pair: PromptPair; label: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const labelId = React.useId();

  return (
    <div
      role="region"
      aria-labelledby={labelId}
      className="flex flex-col gap-2.5 rounded-[var(--r-md)] border border-border-default bg-surface p-4"
    >
      <p
        id={labelId}
        className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted"
      >
        {label}
      </p>

      {/* Prompt */}
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">Prompt</p>
        <pre
          className={cn(
            'whitespace-pre-wrap font-mono text-sm leading-relaxed text-fg-secondary',
            !expanded && 'line-clamp-[8]',
          )}
        >
          {pair.prompt}
        </pre>
      </div>

      {/* Response */}
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">Réponse</p>
        <pre
          className={cn(
            'whitespace-pre-wrap font-mono text-sm leading-relaxed text-fg-secondary',
            !expanded && 'line-clamp-[8]',
          )}
        >
          {pair.response}
        </pre>
      </div>

      {/* Expander */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-xs text-accent underline-offset-2 hover:underline"
      >
        {expanded ? 'Réduire' : 'Voir plus'}
      </button>
    </div>
  );
}

export function DiffViewer({ neutral, marked, delta, className }: DiffViewerProps) {
  const lengthColor =
    delta.length_chars !== undefined
      ? delta.length_chars > 0
        ? 'text-status-warn'
        : delta.length_chars < 0
        ? 'text-status-pass'
        : 'text-fg-muted'
      : 'text-fg-muted';

  const sentimentColor =
    delta.sentiment_delta !== undefined
      ? delta.sentiment_delta < -0.1
        ? 'text-status-fail'
        : delta.sentiment_delta > 0.1
        ? 'text-status-pass'
        : 'text-fg-muted'
      : 'text-fg-muted';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Two-column panes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PaneContent pair={neutral} label="Prompt neutre" />
        {/* Vertical divider on large screens is implicit via gap */}
        <PaneContent pair={marked} label="Prompt marqué" />
      </div>

      {/* Metadata footer */}
      <div className="flex flex-wrap gap-4 border-t border-border-subtle pt-3">
        {/* Length diff */}
        {delta.length_chars !== undefined && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] tracking-[0.06em] text-fg-muted">Δ Longueur</span>
            <span className={cn('font-mono text-sm font-medium tabular-nums', lengthColor)}>
              {delta.length_chars > 0 ? '+' : ''}{delta.length_chars} car.
            </span>
          </div>
        )}

        {/* Sentiment delta */}
        {delta.sentiment_delta !== undefined && (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] tracking-[0.06em] text-fg-muted">Δ Sentiment</span>
            <span className={cn('font-mono text-sm font-medium tabular-nums', sentimentColor)}>
              {delta.sentiment_delta > 0 ? '+' : ''}{delta.sentiment_delta.toFixed(2)}
            </span>
          </div>
        )}

        {/* Refusal badge */}
        {delta.refused === true && (
          <div className="flex items-center">
            <span className="rounded-[var(--r-sm)] border border-status-fail-border bg-status-fail-bg px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-status-fail">
              Refus
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
