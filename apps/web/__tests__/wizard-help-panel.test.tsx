import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';

import {
  WizardProvider,
  useWizard,
} from '@/components/audits/wizard/WizardContext';
import { HelpPanel } from '@/components/audits/wizard/HelpPanel';

let setKey: ((k: string) => void) | null = null;
let clearKey: (() => void) | null = null;

function HelpKeyController() {
  const ctx = useWizard();
  useEffect(() => {
    setKey = ctx.setHelpKey;
    clearKey = ctx.clearHelpKey;
  }, [ctx]);
  return null;
}

function renderPanel() {
  return render(
    <WizardProvider totalSteps={3}>
      <HelpKeyController />
      <HelpPanel />
    </WizardProvider>
  );
}

describe('HelpPanel', () => {
  it('shows a fallback when no helpKey set', () => {
    renderPanel();
    expect(screen.getByText(/Aide contextuelle/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sélectionnez un champ pour voir une explication/i)
    ).toBeInTheDocument();
  });

  it('shows the entry when helpKey resolves', () => {
    renderPanel();
    act(() => setKey?.('canary.test'));
    expect(screen.getByRole('heading', { name: /Canary/ })).toBeInTheDocument();
    expect(
      screen.getByText(/test pour valider la mécanique de lookup/i)
    ).toBeInTheDocument();
  });

  it('shows a friendly fallback when helpKey is unknown', () => {
    renderPanel();
    act(() => setKey?.('does.not.exist'));
    expect(
      screen.getByText(/Aucune aide spécifique pour ce champ/i)
    ).toBeInTheDocument();
  });

  it('clearing helpKey returns to the fallback', () => {
    renderPanel();
    act(() => setKey?.('canary.test'));
    expect(screen.getByRole('heading', { name: /Canary/ })).toBeInTheDocument();
    act(() => clearKey?.());
    expect(
      screen.getByText(/Sélectionnez un champ pour voir une explication/i)
    ).toBeInTheDocument();
  });

  it('does not render Example section when entry has no example', () => {
    renderPanel();
    act(() => setKey?.('canary.test'));
    // canary has no example, so no example block
    expect(screen.queryByText(/^Exemple/i)).toBeNull();
  });
});
