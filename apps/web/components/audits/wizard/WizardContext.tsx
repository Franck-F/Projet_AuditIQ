'use client';

import * as React from 'react';

import type { HelpKey } from '@/lib/wizard/types';

interface WizardContextValue {
  currentStep: number;
  totalSteps: number;
  helpKey: HelpKey | null;
  goNext: () => void;
  goPrev: () => void;
  goTo: (step: number) => void;
  setHelpKey: (key: HelpKey) => void;
  clearHelpKey: () => void;
}

const WizardContext = React.createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  totalSteps: number;
  children: React.ReactNode;
}

export function WizardProvider({
  totalSteps,
  children,
}: WizardProviderProps): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [helpKey, setHelpKeyState] = React.useState<HelpKey | null>(null);

  const goNext = React.useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  }, [totalSteps]);

  const goPrev = React.useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goTo = React.useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const setHelpKey = React.useCallback((key: HelpKey) => {
    setHelpKeyState(key);
  }, []);

  const clearHelpKey = React.useCallback(() => {
    setHelpKeyState(null);
  }, []);

  const value: WizardContextValue = React.useMemo(
    () => ({
      currentStep,
      totalSteps,
      helpKey,
      goNext,
      goPrev,
      goTo,
      setHelpKey,
      clearHelpKey,
    }),
    [
      currentStep,
      totalSteps,
      helpKey,
      goNext,
      goPrev,
      goTo,
      setHelpKey,
      clearHelpKey,
    ]
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = React.useContext(WizardContext);
  if (ctx === null) {
    throw new Error('useWizard must be used inside a WizardProvider');
  }
  return ctx;
}
