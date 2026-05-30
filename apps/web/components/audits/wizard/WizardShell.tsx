'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useWizard } from '@/components/audits/wizard/WizardContext';
import { ProgressBar } from '@/components/audits/wizard/ProgressBar';
import type { WizardStepDef } from '@/lib/wizard/types';

interface WizardShellProps<TValues> {
  steps: ReadonlyArray<WizardStepDef<TValues>>;
  values: TValues;
  onSubmit: () => void;
  renderStep: (step: WizardStepDef<TValues>) => React.ReactNode;
}

export function WizardShell<TValues>({
  steps,
  values,
  onSubmit,
  renderStep,
}: WizardShellProps<TValues>): React.ReactElement {
  const { currentStep, goNext, goPrev, goTo } = useWizard();
  const stepIdx = currentStep - 1;
  const step = steps[stepIdx];
  const isLast = currentStep === steps.length;
  const canAdvance = step ? step.isValid(values) : false;

  if (!step) {
    return (
      <div role="alert" className="text-status-fail">
        Erreur interne : étape {currentStep} inconnue.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar
        currentStep={currentStep}
        totalSteps={steps.length}
        stepTitles={steps.map((s) => s.title)}
        onStepClick={goTo}
      />
      <div className="rounded-2xl border border-border-default bg-surface p-6">
        {renderStep(step)}
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={goPrev}
          disabled={currentStep === 1}
        >
          Précédent
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={isLast ? onSubmit : goNext}
          disabled={!canAdvance}
        >
          {isLast ? 'Terminer' : 'Suivant'}
        </Button>
      </div>
    </div>
  );
}
