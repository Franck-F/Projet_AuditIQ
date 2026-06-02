import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import * as React from 'react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step4Verify } from '@/components/audits/wizard/unified/Step4Verify';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import * as audits from '@/lib/api/audits';

function Harness({
  initial,
  values,
}: {
  initial?: Partial<UnifiedValues>;
  values?: Partial<UnifiedValues>;
}) {
  const merged = { ...DEFAULT_VALUES, ...initial };
  const form = useForm<UnifiedValues>({ defaultValues: merged });
  return (
    <FormProvider {...form}>
      <Step4Verify values={{ ...merged, ...values }} />
    </FormProvider>
  );
}

describe('Unified Step4Verify', () => {
  // ─── M1: tabular-known ─────────────────────────────────────────────────────

  describe('tabular-known (M1)', () => {
    it('shows Disparate Impact + règle des 4/5 and Demographic Parity', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness initial={{ audit_type: 'tabular-known' }} />
        </WizardProvider>,
      );
      expect(screen.getByText(/Disparate Impact/i)).toBeInTheDocument();
      expect(screen.getByText(/4\/5/)).toBeInTheDocument();
      expect(screen.getByText(/Demographic Parity/i)).toBeInTheDocument();
    });

    it('does NOT show EO/EOdds bullet when ground_truth_column is empty', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'tabular-known', ground_truth_column: '' }}
          />
        </WizardProvider>,
      );
      expect(screen.queryByText(/Equal Opportunity/i)).not.toBeInTheDocument();
    });

    it('shows EO/EOdds bullet when ground_truth_column is set', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{
              audit_type: 'tabular-known',
              ground_truth_column: 'label',
            }}
          />
        </WizardProvider>,
      );
      expect(screen.getByText(/Equal Opportunity/i)).toBeInTheDocument();
      expect(screen.getByText(/Equalized Odds/i)).toBeInTheDocument();
    });

    it('does NOT show intersectional bullet when secondary_protected_attribute is empty', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{
              audit_type: 'tabular-known',
              secondary_protected_attribute: '',
            }}
          />
        </WizardProvider>,
      );
      expect(
        screen.queryByText(/Analyse intersectionnelle/i),
      ).not.toBeInTheDocument();
    });

    it('shows intersectional bullet when secondary_protected_attribute is set', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{
              audit_type: 'tabular-known',
              secondary_protected_attribute: 'age',
            }}
          />
        </WizardProvider>,
      );
      expect(
        screen.getByText(/Analyse intersectionnelle/i),
      ).toBeInTheDocument();
    });
  });

  // ─── M2: tabular-unknown ───────────────────────────────────────────────────

  describe('tabular-unknown (M2)', () => {
    it('shows collapsible KMeans section, collapsed by default', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness initial={{ audit_type: 'tabular-unknown' }} />
        </WizardProvider>,
      );
      expect(
        screen.getByRole('button', { name: /Personnaliser les paramètres KMeans/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Valeurs par défaut adaptées/i)).toBeInTheDocument();
      // Inputs should not be visible when collapsed
      expect(
        screen.queryByRole('spinbutton', { name: /Nombre de clusters/i }),
      ).not.toBeInTheDocument();
    });

    it('expands to show k, deviation_pp, chi2_alpha inputs', async () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness initial={{ audit_type: 'tabular-unknown' }} />
        </WizardProvider>,
      );
      const user = userEvent.setup();
      await user.click(
        screen.getByRole('button', { name: /Personnaliser les paramètres KMeans/i }),
      );
      expect(
        screen.getByRole('spinbutton', { name: /Nombre de clusters/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('spinbutton', { name: /Seuil de déviation/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('spinbutton', { name: /Seuil χ²/i }),
      ).toBeInTheDocument();
    });
  });

  // ─── M3: llm-api ───────────────────────────────────────────────────────────

  describe('llm-api (M3)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('shows "Tester la connexion" button and optional sub-message', () => {
      render(
        <WizardProvider totalSteps={5}>
          <Harness initial={{ audit_type: 'llm-api' }} />
        </WizardProvider>,
      );
      expect(
        screen.getByRole('button', { name: /Tester la connexion/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Étape FACULTATIVE/i)).toBeInTheDocument();
    });

    it('shows success state after a successful test', async () => {
      vi.spyOn(audits, 'testConnectionM3').mockResolvedValue({
        ok: true,
        extracted_value: 'Bonjour !',
        elapsed_ms: 320,
      });

      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'llm-api', url: 'https://api.example.com' }}
          />
        </WizardProvider>,
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Tester la connexion/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connexion réussie/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Bonjour !/)).toBeInTheDocument();
    });

    it('shows error state after a failed test', async () => {
      vi.spyOn(audits, 'testConnectionM3').mockResolvedValue({
        ok: false,
        reason: 'Timeout après 30s',
      });

      render(
        <WizardProvider totalSteps={5}>
          <Harness
            initial={{ audit_type: 'llm-api', url: 'https://api.example.com' }}
          />
        </WizardProvider>,
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Tester la connexion/i }));

      await waitFor(() => {
        expect(screen.getByText(/Échec de la connexion/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Timeout après 30s/)).toBeInTheDocument();
    });
  });
});
