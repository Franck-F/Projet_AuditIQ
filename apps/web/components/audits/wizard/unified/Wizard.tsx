'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { HelpPanel } from '@/components/audits/wizard/HelpPanel';
import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import { Step1Context } from './Step1Context';
import { Step2Source } from './Step2Source';
import { Step3Config } from './Step3Config';
import { Step4Verify } from './Step4Verify';
import { Step5Review } from './Step5Review';
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
} from './types';
import type { WizardStepDef } from '@/lib/wizard/types';

interface WizardProps {
  onComplete: (auditId: string) => void;
}

export function Wizard({ onComplete }: WizardProps): React.ReactElement {
  const form = useForm<UnifiedValues>({ defaultValues: DEFAULT_VALUES });
  const values = form.watch();

  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [analysis, setAnalysis] = React.useState<DatasetAnalysisOut | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

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

  const steps: ReadonlyArray<WizardStepDef<UnifiedValues>> = [
    {
      id: 'context',
      title: 'Contexte',
      helpKey: 'wizard.step1',
      isValid: (v) =>
        v.title.trim().length > 0 && v.audit_type !== '' && v.sector !== '',
    },
    {
      id: 'source',
      title: 'Source',
      helpKey: 'wizard.step2',
      isValid: (v) =>
        v.audit_type === 'llm-api' ? v.url.trim().length > 0 : dataset !== null,
    },
    {
      id: 'config',
      title: 'Configuration',
      helpKey: 'wizard.step3',
      isValid: (v) => {
        if (v.audit_type === 'llm-api')
          return (
            v.body_template.includes('{prompt}') &&
            v.response_path.trim().length > 0
          );
        if (!v.decision_column || !v.favorable_value) return false;
        if (v.audit_type === 'tabular-known' && (!Array.isArray(v.protected_attributes) || v.protected_attributes.length === 0))
          return false;
        return true;
      },
    },
    {
      id: 'verify',
      title: 'Vérification',
      helpKey: 'wizard.step4',
      isValid: () => true,
    },
    {
      id: 'review',
      title: 'Résumé',
      helpKey: 'wizard.step5',
      isValid: () => true,
    },
  ];

  const onSubmit = async () => {
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
          ...(v.ground_truth_column
            ? { ground_truth_column: v.ground_truth_column }
            : {}),
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
      <WizardProvider totalSteps={steps.length}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            {submitError !== null && (
              <p
                role="alert"
                className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail"
              >
                {submitError}
              </p>
            )}
            <WizardShell<UnifiedValues>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context':
                    return <Step1Context />;
                  case 'source':
                    return (
                      <Step2Source
                        dataset={dataset}
                        analysis={analysis}
                        analysisError={analysisError}
                        onUpload={handleUpload}
                        busy={busy}
                      />
                    );
                  case 'config':
                    return (
                      <Step3Config dataset={dataset} analysis={analysis} />
                    );
                  case 'verify':
                    return <Step4Verify values={values} />;
                  case 'review':
                    return <Step5Review values={values} dataset={dataset} />;
                  default:
                    return null;
                }
              }}
            />
          </div>
          <HelpPanel />
        </div>
      </WizardProvider>
    </FormProvider>
  );
}
