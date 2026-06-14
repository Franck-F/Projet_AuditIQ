'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import { testConnectionM3 } from '@/lib/api/audits';
import { buildTarget } from '@/components/audits/wizard/unified/types';
import type { UnifiedValues } from '@/components/audits/wizard/unified/types';

interface Step4VerifyProps {
  values: UnifiedValues;
}

// ─── M1: tabular-known ───────────────────────────────────────────────────────

function Step4VerifyM1(): React.ReactElement {
  const { control } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();

  const groundTruth = useWatch({ control, name: 'ground_truth_column' });
  const protectedAttributes = useWatch({ control, name: 'protected_attributes' }) as string[];

  React.useEffect(() => {
    setHelpKey('wizard.step4.metrics');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  const attrs: string[] = Array.isArray(protectedAttributes) ? protectedAttributes : [];
  const hasPairwise = attrs.length >= 2;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Métriques de l&apos;audit</h2>
      <p className="text-sm text-fg-secondary">
        Les analyses suivantes seront calculées sur votre jeu de données.
      </p>

      <div className="rounded-md border border-border-default bg-surface-muted p-4">
        <ul className="flex flex-col gap-2 text-sm text-fg">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-fg-muted">•</span>
            <span>
              <strong>Écart de taux d&apos;acceptation entre groupes</strong> (Disparate
              Impact) + règle des <strong>4/5</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-fg-muted">•</span>
            <span>
              <strong>Parité démographique</strong> (Demographic Parity)
            </span>
          </li>
          {groundTruth && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-fg-muted">•</span>
              <span>
                <strong>Égalité des chances</strong> et <strong>calibration</strong>{' '}
                (Equal Opportunity / Equalized Odds){' '}
                <span className="text-fg-muted">
                  (résultat réel des décisions fourni : <code>{groundTruth}</code>)
                </span>
              </span>
            </li>
          )}
          {attrs.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-fg-muted">•</span>
              <span>
                <strong>Analyse marginale par attribut</strong>{' '}
                <span className="text-fg-muted">
                  ({attrs.map((a) => <code key={a}>{a}</code>).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])})
                </span>
              </span>
            </li>
          )}
          {hasPairwise && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-fg-muted">•</span>
              <span>
                <strong>Analyse intersectionnelle par paire</strong>{' '}
                <span className="text-fg-muted">
                  ({attrs.length * (attrs.length - 1) / 2} paire{attrs.length * (attrs.length - 1) / 2 > 1 ? 's' : ''})
                </span>
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ─── M2: tabular-unknown ─────────────────────────────────────────────────────

function Step4VerifyM2(): React.ReactElement {
  const { register } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    setHelpKey('wizard.step4.advanced');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Réglages de la détection de groupes</h2>
      <p className="text-sm text-fg-secondary">
        Les valeurs par défaut conviennent dans la grande majorité des cas.
        Ajustez uniquement si vous avez une raison précise.
      </p>

      <div className="rounded-md border border-border-default">
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-fg"
          aria-expanded={expanded}
        >
          <span>Personnaliser les réglages</span>
          <span
            className="ml-2 text-fg-muted transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {!expanded && (
          <div className="border-t border-border-default px-4 py-3">
            <p className="text-sm text-fg-muted">
              Valeurs par défaut adaptées à la plupart des cas
            </p>
          </div>
        )}

        {expanded && (
          <div className="grid gap-4 border-t border-border-default p-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="s4-k"
                className="text-sm font-medium text-fg-secondary"
              >
                Nombre de groupes recherchés (k)
              </label>
              <input
                id="s4-k"
                type="number"
                min={2}
                max={20}
                placeholder="5"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('k')}
                onFocus={() => setHelpKey('wizard.step4.advanced')}
                onBlur={() => clearHelpKey()}
                aria-label="Nombre de groupes recherchés"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="s4-dev"
                className="text-sm font-medium text-fg-secondary"
              >
                Seuil de déviation (pts)
              </label>
              <input
                id="s4-dev"
                type="number"
                min={1}
                max={100}
                placeholder="20"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('deviation_pp')}
                onFocus={() => setHelpKey('wizard.step4.advanced')}
                onBlur={() => clearHelpKey()}
                aria-label="Seuil de déviation"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="s4-alpha"
                className="text-sm font-medium text-fg-secondary"
              >
                Niveau d&apos;exigence statistique (α)
              </label>
              <input
                id="s4-alpha"
                type="number"
                step="0.01"
                min={0.001}
                max={0.5}
                placeholder="0.05"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('chi2_alpha')}
                onFocus={() => setHelpKey('wizard.step4.advanced')}
                onBlur={() => clearHelpKey()}
                aria-label="Niveau d'exigence statistique"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── M3: llm-api ─────────────────────────────────────────────────────────────

type ConnectionState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; ok: true; extracted_value: string; elapsed_ms: number }
  | { status: 'done'; ok: false; reason: string };

function Step4VerifyM3({ values }: { values: UnifiedValues }): React.ReactElement {
  const { setHelpKey, clearHelpKey } = useWizard();
  const [state, setState] = React.useState<ConnectionState>({ status: 'idle' });

  React.useEffect(() => {
    setHelpKey('wizard.step4.test_connection');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  const handleTest = React.useCallback(async () => {
    setState({ status: 'busy' });
    try {
      const result = await testConnectionM3({
        target: buildTarget(values),
        test_prompt: 'Bonjour',
      });
      if (result.ok) {
        setState({
          status: 'done',
          ok: true,
          extracted_value: result.extracted_value ?? '',
          elapsed_ms: result.elapsed_ms ?? 0,
        });
      } else {
        setState({
          status: 'done',
          ok: false,
          reason: result.reason ?? 'Erreur inconnue',
        });
      }
    } catch {
      // Pas de message technique brut (Axios) à l'écran : message français générique.
      setState({
        status: 'done',
        ok: false,
        reason:
          "La vérification n'a pas pu être effectuée. Vérifiez l'URL et l'authentification, puis réessayez.",
      });
    }
  }, [values]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Test de connexion LLM
      </h2>

      <div className="rounded-md border border-border-default bg-surface-muted p-4">
        <p className="text-sm text-fg-secondary">
          Étape facultative&nbsp;: vous pouvez passer à l&apos;étape suivante. Un échec
          du test ne bloque pas l&apos;audit complet.
        </p>
      </div>

      <button
        type="button"
        disabled={state.status === 'busy'}
        onClick={handleTest}
        className="self-start rounded-md border border-border-default bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Tester la connexion"
      >
        {state.status === 'busy' ? 'Test en cours…' : 'Tester la connexion'}
      </button>

      {state.status === 'done' && state.ok && (
        <div className="rounded-md border border-success bg-success-muted p-3">
          <p className="text-sm font-medium text-success-fg">Connexion réussie</p>
          <p className="mt-1 text-xs text-success-fg">
            Réponse extraite :{' '}
            <code className="font-mono">{state.extracted_value}</code>
            {' '}— {state.elapsed_ms} ms
          </p>
        </div>
      )}

      {state.status === 'done' && !state.ok && (
        <div className="rounded-md border border-danger bg-danger-muted p-3">
          <p className="text-sm font-medium text-danger-fg">Échec de la connexion</p>
          <p className="mt-1 text-xs text-danger-fg">{state.reason}</p>
        </div>
      )}
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function Step4Verify({ values }: Step4VerifyProps): React.ReactElement {
  const { control } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();

  const auditType = useWatch({ control, name: 'audit_type' });

  React.useEffect(() => {
    setHelpKey('wizard.step4');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  if (auditType === 'tabular-unknown') {
    return <Step4VerifyM2 />;
  }

  if (auditType === 'llm-api') {
    return <Step4VerifyM3 values={values} />;
  }

  // Default: tabular-known (M1)
  return <Step4VerifyM1 />;
}
