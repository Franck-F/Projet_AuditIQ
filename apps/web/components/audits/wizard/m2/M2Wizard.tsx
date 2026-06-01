'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { HelpPanel } from '@/components/audits/wizard/HelpPanel';
import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import { Step1Context } from '@/components/audits/wizard/m2/Step1Context';
import { Step2Data } from '@/components/audits/wizard/m2/Step2Data';
import { Step3Decision } from '@/components/audits/wizard/m2/Step3Decision';
import { Step4Advanced } from '@/components/audits/wizard/m2/Step4Advanced';
import { Step5Review } from '@/components/audits/wizard/m2/Step5Review';
import {
  analyzeDataset,
  createAudit,
  uploadDataset,
  type DatasetAnalysisOut,
  type DatasetOut,
  type M2ConfigIn,
} from '@/lib/api/audits';
import type { WizardStepDef } from '@/lib/wizard/types';

interface M2Values {
  title: string;
  decision_column: string;
  favorable_value: string;
  k: string;
  deviation_pp: string;
  chi2_alpha: string;
}

const DEFAULTS: M2Values = {
  title: '',
  decision_column: '',
  favorable_value: '',
  k: '',
  deviation_pp: '',
  chi2_alpha: '',
};

interface M2WizardProps {
  onComplete: (auditId: string) => void;
}

export function M2Wizard({ onComplete }: M2WizardProps): React.ReactElement {
  const form = useForm<M2Values>({ defaultValues: DEFAULTS });
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
        const a = await analyzeDataset(d.id);
        setAnalysis(a);
      } catch {
        setAnalysisError("Le service d'analyse est indisponible.");
      }
    } catch {
      setAnalysisError("L'import du fichier a échoué. Vérifiez le CSV.");
    } finally {
      setBusy(false);
    }
  };

  const steps: ReadonlyArray<WizardStepDef<M2Values>> = [
    { id: 'context', title: 'Contexte', helpKey: 'm2.step1', isValid: (v) => v.title.trim().length > 0 },
    { id: 'data', title: 'Données', helpKey: 'm2.step2', isValid: () => dataset !== null },
    { id: 'decision', title: 'Décision', helpKey: 'm2.step3', isValid: (v) => v.decision_column.length > 0 && v.favorable_value.length > 0 },
    { id: 'advanced', title: 'Paramètres', helpKey: 'm2.step4', isValid: () => true },
    { id: 'review', title: 'Résumé', helpKey: 'm2.step5', isValid: () => true },
  ];

  const onSubmit = async () => {
    if (!dataset) return;
    const v = form.getValues();
    setSubmitError(null);
    const config: M2ConfigIn = {};
    if (v.k) config.k = Number(v.k);
    if (v.deviation_pp) config.deviation_pp = Number(v.deviation_pp);
    if (v.chi2_alpha) config.chi2_alpha = Number(v.chi2_alpha);

    try {
      const audit = await createAudit({
        dataset_id: dataset.id,
        title: v.title,
        module: 'M2',
        decision_column: v.decision_column,
        favorable_value: v.favorable_value,
        config,
      });
      onComplete(audit.id);
    } catch {
      setSubmitError("Le lancement de la détection a échoué. Réessayez.");
    }
  };

  return (
    <FormProvider {...form}>
      <WizardProvider totalSteps={steps.length}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            {submitError !== null && (
              <p role="alert" className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail">
                {submitError}
              </p>
            )}
            <WizardShell<M2Values>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context': return <Step1Context />;
                  case 'data': return <Step2Data dataset={dataset} analysis={analysis} analysisError={analysisError} onUpload={handleUpload} busy={busy} />;
                  case 'decision': return <Step3Decision columns={dataset?.columns ?? []} analysis={analysis} />;
                  case 'advanced': return <Step4Advanced />;
                  case 'review': return <Step5Review dataset={dataset} values={values} />;
                  default: return null;
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
