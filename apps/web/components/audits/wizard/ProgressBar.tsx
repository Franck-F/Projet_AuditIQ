'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: ReadonlyArray<string>;
  onStepClick: (step: number) => void;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  stepTitles,
  onStepClick,
}: ProgressBarProps): React.ReactElement {
  return (
    <nav aria-label="Étapes du wizard" className="mb-6">
      <ol className="flex items-center justify-between gap-2">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1;
          const isCurrent = stepNum === currentStep;
          const isPast = stepNum < currentStep;
          const isFuture = stepNum > currentStep;
          const title = stepTitles[idx] ?? `Étape ${stepNum}`;

          return (
            <li
              key={stepNum}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex flex-1 items-center gap-2 text-xs',
                isCurrent && 'font-semibold text-fg',
                isPast && 'text-fg-muted',
                isFuture && 'text-fg-muted/60'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[10px]',
                  isCurrent && 'border-fg bg-fg text-bg',
                  isPast && 'border-fg-muted bg-surface text-fg-muted',
                  isFuture && 'border-border-default text-fg-muted/60'
                )}
                aria-hidden
              >
                {stepNum}
              </span>
              {isPast ? (
                <button
                  type="button"
                  onClick={() => onStepClick(stepNum)}
                  className="underline-offset-2 hover:underline"
                >
                  {title}
                </button>
              ) : (
                <span>{title}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
