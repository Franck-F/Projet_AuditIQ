import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WizardProvider totalSteps={5}>{children}</WizardProvider>
);

describe('WizardContext', () => {
  it('starts at step 1 with no helpKey', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    expect(result.current.currentStep).toBe(1);
    expect(result.current.helpKey).toBeNull();
  });

  it('goNext advances and stops at totalSteps', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe(2);
    act(() => {
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
    });
    expect(result.current.currentStep).toBe(5);
  });

  it('goPrev rewinds and stops at 1', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => {
      result.current.goNext();
      result.current.goNext();
    });
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.goPrev());
    expect(result.current.currentStep).toBe(2);
    act(() => {
      result.current.goPrev();
      result.current.goPrev();
    });
    expect(result.current.currentStep).toBe(1);
  });

  it('goTo jumps to a valid step (1..totalSteps)', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => result.current.goTo(4));
    expect(result.current.currentStep).toBe(4);
    act(() => result.current.goTo(0));
    expect(result.current.currentStep).toBe(4);
    act(() => result.current.goTo(99));
    expect(result.current.currentStep).toBe(4);
  });

  it('setHelpKey + clearHelpKey work', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });
    act(() => result.current.setHelpKey('m1.step3.decision_column'));
    expect(result.current.helpKey).toBe('m1.step3.decision_column');
    act(() => result.current.clearHelpKey());
    expect(result.current.helpKey).toBeNull();
  });

  it('useWizard throws if not wrapped in WizardProvider', () => {
    expect(() => renderHook(() => useWizard())).toThrow(/WizardProvider/i);
  });
});
