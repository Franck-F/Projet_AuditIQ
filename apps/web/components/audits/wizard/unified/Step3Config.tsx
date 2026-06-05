'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useWizard } from '@/components/audits/wizard/WizardContext';
import type { DatasetAnalysisOut, DatasetOut } from '@/lib/api/audits';
import type { UnifiedValues } from '@/components/audits/wizard/unified/types';

interface Step3ConfigProps {
  dataset: DatasetOut | null;
  analysis: DatasetAnalysisOut | null;
}

// ─── M1: tabular-known ───────────────────────────────────────────────────────

function Step3ConfigM1({
  dataset,
  analysis,
}: Step3ConfigProps): React.ReactElement {
  const { register, control, setValue, getValues } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();

  // The advanced panel opens automatically when analysis provides privileged_value
  // or ground_truth_column. The user can manually override it; we track that with
  // a separate flag so the analysis-driven open always wins unless the user closed it.
  const [userToggled, setUserToggled] = React.useState<boolean | null>(null);
  const analysisOpensAdvanced =
    analysis?.suggested_protected?.privileged_value != null ||
    analysis?.suggested_ground_truth?.column != null;
  // Prefer user's explicit choice; if none, derive from analysis.
  const advancedOpen = userToggled ?? analysisOpensAdvanced;

  const selectedDecision = useWatch({ control, name: 'decision_column' });

  // Prefill from analysis — anti-clobber: only fills empty fields
  React.useEffect(() => {
    if (!analysis) return;
    const setIfEmpty = (name: keyof UnifiedValues, value: unknown) => {
      if (value == null || value === '') return;
      if (getValues(name)) return;
      setValue(name, String(value) as never, { shouldDirty: false });
    };
    setIfEmpty('decision_column', analysis.suggested_decision?.column);
    setIfEmpty('favorable_value', analysis.suggested_decision?.favorable_value);
    setIfEmpty('protected_attribute', analysis.suggested_protected?.column);
    setIfEmpty('privileged_value', analysis.suggested_protected?.privileged_value);
    setIfEmpty('ground_truth_column', analysis.suggested_ground_truth?.column);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  const columns = dataset?.columns ?? [];
  const suggestedDecision = analysis?.suggested_decision?.column ?? null;
  const suggestedProtected = analysis?.suggested_protected?.column ?? null;

  const selectedColumnProfile = React.useMemo(() => {
    if (!analysis || !selectedDecision) return null;
    return analysis.columns.find((c) => c.name === selectedDecision) ?? null;
  }, [analysis, selectedDecision]);

  const favorableOptions = React.useMemo(() => {
    if (!selectedColumnProfile) return [];
    return selectedColumnProfile.top_values.map(([value]) =>
      String(value as string | number | boolean),
    );
  }, [selectedColumnProfile]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Configuration de l&apos;audit
      </h2>
      <p className="text-sm text-fg-secondary">
        Indiquez la colonne de décision, la valeur favorable, et l&apos;attribut
        protégé à auditer.
      </p>

      {/* decision_column */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-decision"
          className="text-sm font-medium text-fg-secondary"
        >
          Colonne de décision
          {analysis?.suggested_decision && (
            <span className="ml-2 text-xs font-normal text-fg-muted">
              suggéré · conf. {Math.round(analysis.suggested_decision.confidence * 100)}%
            </span>
          )}
        </label>
        <select
          id="m1-decision"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('decision_column', { required: true })}
          onFocus={() => setHelpKey('wizard.step3.decision_column')}
          onBlur={() => clearHelpKey()}
          aria-label="Colonne de décision"
        >
          <option value="" disabled>
            —
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === suggestedDecision ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* favorable_value */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-favorable"
          className="text-sm font-medium text-fg-secondary"
        >
          Valeur favorable
          {analysis?.suggested_decision?.favorable_value != null && (
            <span className="ml-2 text-xs font-normal text-fg-muted">
              suggéré · conf. {Math.round(analysis.suggested_decision.confidence * 100)}%
            </span>
          )}
        </label>
        {favorableOptions.length > 0 ? (
          <select
            id="m1-favorable"
            disabled={!selectedDecision}
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('wizard.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          >
            <option value="" disabled>
              —
            </option>
            {favorableOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <select
            id="m1-favorable"
            disabled={!selectedDecision}
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('wizard.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          >
            <option value="" disabled>
              —
            </option>
          </select>
        )}
      </div>

      {/* protected_attribute */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m1-protected"
          className="text-sm font-medium text-fg-secondary"
        >
          Attribut protégé
          {analysis?.suggested_protected && (
            <span className="ml-2 text-xs font-normal text-fg-muted">
              suggéré · conf. {Math.round(analysis.suggested_protected.confidence * 100)}%
            </span>
          )}
        </label>
        <select
          id="m1-protected"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('protected_attribute', { required: true })}
          onFocus={() => setHelpKey('wizard.step3.protected_attribute')}
          onBlur={() => clearHelpKey()}
          aria-label="Attribut protégé"
        >
          <option value="" disabled>
            —
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === suggestedProtected ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced options (collapsible) */}
      <div className="rounded-md border border-border-default">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-fg"
          onClick={() => setUserToggled((v) => !(v ?? analysisOpensAdvanced))}
          aria-expanded={advancedOpen}
        >
          <span>Options avancées</span>
          <span
            className="ml-2 text-fg-muted transition-transform"
            style={{ transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-4 border-t border-border-default px-4 pb-4 pt-3">
            {/* privileged_value */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="m1-privileged"
                className="text-sm font-medium text-fg-secondary"
              >
                Groupe de référence{' '}
                <span className="text-fg-muted">(facultatif)</span>
                {analysis?.suggested_protected?.privileged_value != null && (
                  <span className="ml-2 text-xs font-normal text-fg-muted">
                    suggéré · conf. {Math.round(analysis.suggested_protected.confidence * 100)}%
                  </span>
                )}
              </label>
              <input
                id="m1-privileged"
                type="text"
                placeholder="ex. M, 1, majority…"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('privileged_value')}
                aria-label="Groupe de référence"
              />
            </div>

            {/* ground_truth_column */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="m1-ground-truth"
                className="text-sm font-medium text-fg-secondary"
              >
                Colonne vérité-terrain{' '}
                <span className="text-fg-muted">(facultatif)</span>
                {analysis?.suggested_ground_truth != null && (
                  <span className="ml-2 text-xs font-normal text-fg-muted">
                    suggéré · conf. {Math.round(analysis.suggested_ground_truth.confidence * 100)}%
                  </span>
                )}
              </label>
              <select
                id="m1-ground-truth"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('ground_truth_column')}
                aria-label="Vérité-terrain"
              >
                <option value="">— aucune</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* secondary_protected_attribute */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="m1-secondary"
                className="text-sm font-medium text-fg-secondary"
              >
                Attribut protégé secondaire{' '}
                <span className="text-fg-muted">(intersectionnel, facultatif)</span>
              </label>
              <select
                id="m1-secondary"
                defaultValue=""
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('secondary_protected_attribute')}
                aria-label="Attribut protégé secondaire"
              >
                <option value="">— aucun</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── M2: tabular-unknown ─────────────────────────────────────────────────────

function Step3ConfigM2({
  dataset,
  analysis,
}: Step3ConfigProps): React.ReactElement {
  const { register, control } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();

  const selectedDecision = useWatch({ control, name: 'decision_column' });

  const columns = dataset?.columns ?? [];
  const suggestedDecision = analysis?.suggested_decision?.column ?? null;

  const selectedColumnProfile = React.useMemo(() => {
    if (!analysis || !selectedDecision) return null;
    return analysis.columns.find((c) => c.name === selectedDecision) ?? null;
  }, [analysis, selectedDecision]);

  const favorableOptions = React.useMemo(() => {
    if (!selectedColumnProfile) return [];
    return selectedColumnProfile.top_values.map(([value]) =>
      String(value as string | number | boolean),
    );
  }, [selectedColumnProfile]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Configuration de la détection
      </h2>
      <p className="text-sm text-fg-secondary">
        Indiquez la colonne de décision et la valeur favorable. M2 ne nécessite
        pas d&apos;attribut protégé.
      </p>

      {/* M2 info card */}
      <div className="rounded-md border border-border-default bg-surface-muted p-4">
        <p className="text-sm text-fg-secondary">
          M2 détecte automatiquement les clusters déviants — pas besoin de
          déclarer un attribut protégé. AuditIQ segmente vos données en groupes
          comportementaux et identifie ceux dont le taux de décision s&apos;écarte
          significativement.
        </p>
      </div>

      {/* decision_column */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m2-decision"
          className="text-sm font-medium text-fg-secondary"
        >
          Colonne de décision
        </label>
        <select
          id="m2-decision"
          defaultValue=""
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('decision_column', { required: true })}
          onFocus={() => setHelpKey('wizard.step3.decision_column')}
          onBlur={() => clearHelpKey()}
          aria-label="Colonne de décision"
        >
          <option value="" disabled>
            —
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
              {c === suggestedDecision ? ' — Suggéré' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* favorable_value */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m2-favorable"
          className="text-sm font-medium text-fg-secondary"
        >
          Valeur favorable
        </label>
        {favorableOptions.length > 0 ? (
          <select
            id="m2-favorable"
            defaultValue=""
            disabled={!selectedDecision}
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('wizard.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          >
            <option value="" disabled>
              —
            </option>
            {favorableOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <select
            id="m2-favorable"
            defaultValue=""
            disabled={!selectedDecision}
            className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg disabled:opacity-50"
            {...register('favorable_value', { required: true })}
            onFocus={() => setHelpKey('wizard.step3.favorable_value')}
            onBlur={() => clearHelpKey()}
            aria-label="Valeur favorable"
          >
            <option value="" disabled>
              —
            </option>
          </select>
        )}
      </div>
    </div>
  );
}

// ─── M3: llm-api ─────────────────────────────────────────────────────────────

const OPENAI_DEFAULTS = {
  body_template:
    '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
  response_path: 'choices.0.message.content',
} as const;

function Step3ConfigM3(): React.ReactElement {
  const { register, control, setValue } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();

  const preset = useWatch({ control, name: 'preset' });

  // Auto-fill body_template + response_path when OpenAI preset is selected
  React.useEffect(() => {
    if (preset === 'openai') {
      setValue('body_template', OPENAI_DEFAULTS.body_template);
      setValue('response_path', OPENAI_DEFAULTS.response_path);
    }
  }, [preset, setValue]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">
        Format des requêtes LLM
      </h2>
      <p className="text-sm text-fg-secondary">
        Configurez le gabarit JSON envoyé à votre chatbot et le chemin pour
        extraire la réponse texte.
      </p>

      {/* preset */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m3-preset"
          className="text-sm font-medium text-fg-secondary"
        >
          Préréglage
        </label>
        <select
          id="m3-preset"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
          {...register('preset', { required: true })}
          aria-label="Préréglage"
        >
          <option value="openai">OpenAI / compatible OpenAI</option>
          <option value="custom">Personnalisé</option>
        </select>
      </div>

      {/* body_template */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m3-body"
          className="text-sm font-medium text-fg-secondary"
        >
          Corps de requête{' '}
          <span className="text-fg-muted">(gabarit JSON avec {'{prompt}'})</span>
        </label>
        <textarea
          id="m3-body"
          rows={5}
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 font-mono text-sm text-fg"
          {...register('body_template', {
            required: true,
            validate: (v) =>
              v.includes('{prompt}') ||
              'Le gabarit doit contenir le placeholder {prompt}',
          })}
          onFocus={() => setHelpKey('wizard.step3.body_template')}
          onBlur={() => clearHelpKey()}
          aria-label="Corps de requête"
        />
        <p className="text-xs text-fg-muted">
          Doit contenir <code className="font-mono">{'{prompt}'}</code> — AuditIQ y
          injecte chaque prompt encodé JSON-safe.
        </p>
      </div>

      {/* response_path */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="m3-path"
          className="text-sm font-medium text-fg-secondary"
        >
          Chemin de la réponse{' '}
          <span className="text-fg-muted">(dot-notation)</span>
        </label>
        <input
          id="m3-path"
          type="text"
          placeholder="choices.0.message.content"
          className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 font-mono text-sm text-fg"
          {...register('response_path', { required: true })}
          onFocus={() => setHelpKey('wizard.step3.response_path')}
          onBlur={() => clearHelpKey()}
          aria-label="Chemin de la réponse"
        />
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function Step3Config({
  dataset,
  analysis,
}: Step3ConfigProps): React.ReactElement {
  const { control } = useFormContext<UnifiedValues>();
  const { setHelpKey, clearHelpKey } = useWizard();

  const auditType = useWatch({ control, name: 'audit_type' });

  React.useEffect(() => {
    setHelpKey('wizard.step3');
    return () => clearHelpKey();
  }, [setHelpKey, clearHelpKey]);

  if (auditType === 'tabular-unknown') {
    return <Step3ConfigM2 dataset={dataset} analysis={analysis} />;
  }

  if (auditType === 'llm-api') {
    return <Step3ConfigM3 />;
  }

  // Default: tabular-known (M1) — also handles '' (not yet selected)
  return <Step3ConfigM1 dataset={dataset} analysis={analysis} />;
}
