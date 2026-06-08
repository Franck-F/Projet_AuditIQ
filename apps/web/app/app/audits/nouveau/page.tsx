'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';

import { Topbar } from '@/components/app/Topbar';
import { HelpPanel } from '@/components/audits/wizard/HelpPanel';
import { WizardProvider, useWizard } from '@/components/audits/wizard/WizardContext';
import { Step1Context } from '@/components/audits/wizard/unified/Step1Context';
import { Step2Source } from '@/components/audits/wizard/unified/Step2Source';
import { Step3Config } from '@/components/audits/wizard/unified/Step3Config';
import { Step4Verify } from '@/components/audits/wizard/unified/Step4Verify';
import { Step5Review } from '@/components/audits/wizard/unified/Step5Review';
import {
  analyzeDataset,
  createAudit,
  uploadDataset,
  type DatasetAnalysisOut,
  type DatasetOut,
  type M2ConfigIn,
} from '@/lib/api/audits';
import {
  backendModuleFor,
  buildTarget,
  DEFAULT_VALUES,
  type UnifiedValues,
} from '@/components/audits/wizard/unified/types';
import { Button } from '@/components/ui/button';

/* ─── Step metadata ──────────────────────────────────────────────────────── */
const STEPS = [
  { id: 'context',  title: 'Contexte',          tagline: 'Cadre & objectif',        helpKey: 'wizard.step1', isValid: (v: UnifiedValues) => v.title.trim().length > 0 && v.audit_type !== '' && v.sector !== '' },
  { id: 'source',   title: 'Données',            tagline: 'Jeu de test',             helpKey: 'wizard.step2', isValid: (v: UnifiedValues) => v.audit_type === 'llm-api' ? v.url.trim().length > 0 : true },
  { id: 'config',   title: 'Configuration',      tagline: 'Attributs & métriques',   helpKey: 'wizard.step3', isValid: (v: UnifiedValues) => { if (v.audit_type === 'llm-api') return v.body_template.includes('{prompt}') && v.response_path.trim().length > 0; if (!v.decision_column || !v.favorable_value) return false; if (v.audit_type === 'tabular-known' && (!Array.isArray(v.protected_attributes) || v.protected_attributes.length === 0)) return false; return true; } },
  { id: 'verify',   title: 'Vérification',       tagline: 'Contrôle qualité',        helpKey: 'wizard.step4', isValid: () => true },
  { id: 'review',   title: 'Revue & lancement',  tagline: 'Confirmation',            helpKey: 'wizard.step5', isValid: () => true },
] as const;

const N_NUMS = ['01', '02', '03', '04', '05'];

/* ─── Vertical stepper rail ──────────────────────────────────────────────── */
function StepRail() {
  const { currentStep, goTo, totalSteps } = useWizard();
  return (
    <aside
      style={{
        width: 236,
        flexShrink: 0,
        position: 'sticky',
        top: 100,
        alignSelf: 'start',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--fg-muted)',
          marginBottom: 14,
          paddingLeft: 4,
        }}
      >
        Configuration · {currentStep}/{totalSteps}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((s, i) => {
          const num = i + 1;
          const isActive = num === currentStep;
          const isDone = num < currentStep;
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => goTo(num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: isActive
                    ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid var(--accent, var(--border-default))'
                    : '1px solid transparent',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: isDone ? 14 : 11,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color: isActive
                      ? '#fff'
                      : isDone
                        ? 'var(--status-pass)'
                        : 'var(--fg-muted)',
                    background: isActive
                      ? 'var(--accent)'
                      : isDone
                        ? 'color-mix(in srgb, var(--status-pass) 15%, transparent)'
                        : 'var(--surface-2)',
                    border: `1px solid ${
                      isActive
                        ? 'var(--accent)'
                        : isDone
                          ? 'var(--status-pass)'
                          : 'var(--border-default)'
                    }`,
                    transition: 'all 0.2s',
                  }}
                >
                  {isDone ? '✓' : N_NUMS[i]}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: isActive || isDone ? 'var(--fg)' : 'var(--fg-muted)',
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      marginTop: 1,
                    }}
                  >
                    {s.tagline}
                  </span>
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 1,
                    height: 8,
                    background: isDone
                      ? 'var(--status-pass)'
                      : 'var(--border-default)',
                    marginLeft: 25,
                    transition: 'background 0.2s',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 10,
          border: '1px solid var(--border-default)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12.5,
          color: 'var(--fg-muted)',
        }}
      >
        ⏱ Durée estimée · ~6 min
      </div>
    </aside>
  );
}

/* ─── Step panel ─────────────────────────────────────────────────────────── */
interface StepPanelProps {
  dataset: DatasetOut | null;
  analysis: DatasetAnalysisOut | null;
  analysisError: string | null;
  onUpload: (f: File) => void;
  busy: boolean;
  onSubmit: () => void;
  submitError: string | null;
}

function StepPanel({
  dataset,
  analysis,
  analysisError,
  onUpload,
  busy,
  onSubmit,
  submitError,
}: StepPanelProps) {
  const { currentStep, goNext, goPrev, totalSteps } = useWizard();
  const { watch } = useFormContext<UnifiedValues>();
  const values = watch();

  const stepIdx = currentStep - 1;
  const step = STEPS[stepIdx];
  const isLast = currentStep === totalSteps;
  const canAdvance = step ? step.isValid(values) : false;

  return (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {submitError && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--status-fail-border)',
            background: 'var(--status-fail-bg)',
            color: 'var(--status-fail)',
            fontSize: 13,
          }}
        >
          {submitError}
        </div>
      )}

      {/* Eyebrow */}
      <div
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--fg-muted)',
          marginBottom: 18,
          textTransform: 'uppercase',
        }}
      >
        Étape {N_NUMS[stepIdx]} · {step?.title}
      </div>

      {/* Step content card */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid var(--border-default)',
          background: 'var(--surface)',
          padding: 24,
          flex: 1,
          marginBottom: 24,
        }}
      >
        {currentStep === 1 && <Step1Context />}
        {currentStep === 2 && (
          <Step2Source
            dataset={dataset}
            analysis={analysis}
            analysisError={analysisError}
            onUpload={onUpload}
            busy={busy}
          />
        )}
        {currentStep === 3 && (
          <Step3Config dataset={dataset} analysis={analysis} />
        )}
        {currentStep === 4 && <Step4Verify values={values} />}
        {currentStep === 5 && <Step5Review values={values} dataset={dataset} />}
      </div>

      {/* Footer nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 20,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <Button type="button" variant="secondary" onClick={goPrev} disabled={currentStep === 1}>
          ← Précédent
        </Button>

        {/* Step dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                height: 4,
                borderRadius: 99,
                transition: 'all 0.3s ease-out',
                width: i === stepIdx ? 22 : 7,
                background:
                  i <= stepIdx ? 'var(--accent)' : 'var(--border-default)',
              }}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={isLast ? onSubmit : goNext}
          disabled={!canAdvance}
        >
          {isLast ? 'Lancer l’audit' : 'Continuer →'}
        </Button>
      </div>
    </main>
  );
}

/* ─── Wizard inner (inside providers) ───────────────────────────────────── */
function WizardInner({ onComplete }: { onComplete: (id: string) => void }) {
  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [analysis, setAnalysis] = React.useState<DatasetAnalysisOut | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<UnifiedValues>({ defaultValues: DEFAULT_VALUES });

  const handleUpload = async (file: File) => {
    setBusy(true);
    setAnalysisError(null);
    try {
      const d = await uploadDataset(file);
      setDataset(d);
      try {
        setAnalysis(await analyzeDataset(d.id));
      } catch {
        setAnalysisError("Le service d'analyse est indisponible.");
      }
    } catch {
      setAnalysisError("L'import du fichier a échoué. Vérifiez le CSV.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    const v = form.getValues();
    setSubmitError(null);
    if (!v.audit_type) return;
    const mod = backendModuleFor(v.audit_type);
    try {
      let audit;
      if (mod === 'M1') {
        if (!dataset) return;
        const protectedAttrs: string[] = Array.isArray(v.protected_attributes) ? v.protected_attributes : [];
        audit = await createAudit({
          dataset_id: dataset.id,
          title: v.title,
          decision_column: v.decision_column,
          favorable_value: v.favorable_value,
          protected_attributes: protectedAttrs,
          protected_attribute: protectedAttrs[0] ?? '',
          privileged_value: v.privileged_value || null,
          ...(v.ground_truth_column ? { ground_truth_column: v.ground_truth_column } : {}),
        });
      } else if (mod === 'M2') {
        if (!dataset) return;
        const config: M2ConfigIn = {};
        if (v.k) config.k = Number(v.k);
        if (v.deviation_pp) config.deviation_pp = Number(v.deviation_pp);
        if (v.chi2_alpha) config.chi2_alpha = Number(v.chi2_alpha);
        audit = await createAudit({
          dataset_id: dataset.id,
          title: v.title,
          module: 'M2',
          decision_column: v.decision_column,
          favorable_value: v.favorable_value,
          config,
        });
      } else {
        audit = await createAudit({
          title: v.title,
          module: 'M3',
          target: buildTarget(v),
          lang: v.lang,
        });
      }
      onComplete(audit.id);
    } catch {
      setSubmitError("Le lancement de l'audit a échoué. Réessayez.");
    }
  };

  return (
    <FormProvider {...form}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '236px 1fr 300px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <StepRail />
        <StepPanel
          dataset={dataset}
          analysis={analysis}
          analysisError={analysisError}
          onUpload={handleUpload}
          busy={busy}
          onSubmit={handleSubmit}
          submitError={submitError}
        />
        <HelpPanel />
      </div>
    </FormProvider>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function NouveauPage() {
  const router = useRouter();

  return (
    <>
      <Topbar
        title="Nouvel audit"
        crumbs={[
          { label: 'AuditIQ' },
          { label: 'Audits', href: '/app/audits' },
          { label: 'Nouvel audit' },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/app/audits">
              <X size={16} />
              Annuler
            </Link>
          </Button>
        }
      />
      <main className="page flex-1">
        <WizardProvider totalSteps={STEPS.length}>
          <WizardInner onComplete={(id) => router.push(`/app/audits/${id}`)} />
        </WizardProvider>
      </main>
    </>
  );
}
