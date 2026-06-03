'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStepperProps {
  currentStep: number; // 1-5
  className?: string;
}

const STEPS = [
  { label: 'Bienvenue' },
  { label: 'Profil' },
  { label: 'Cas d\'usage' },
  { label: 'Préparation' },
  { label: 'Démarrer' },
];

export function OnboardingStepper({ currentStep, className }: OnboardingStepperProps) {
  return (
    <div className={cn('sticky top-0 z-40 border-b border-border-subtle bg-surface-glass/95 backdrop-blur-sm', className)}>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const isPending = stepNum > currentStep;

          return (
            <React.Fragment key={stepNum}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 font-mono text-[11px] font-semibold',
                    isCompleted
                      ? 'border-status-pass bg-status-pass text-fg'
                      : isActive
                        ? 'border-accent bg-accent text-accent-fg'
                        : 'border-border-subtle bg-surface text-fg-muted',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'whitespace-nowrap text-[11px] font-medium tracking-wide',
                    isActive
                      ? 'text-accent'
                      : isCompleted
                        ? 'text-fg'
                        : 'text-fg-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {stepNum < STEPS.length && (
                <div
                  className={cn(
                    'mb-2 h-0.5 flex-1',
                    isCompleted ? 'bg-status-pass' : 'bg-border-subtle',
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
