'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { HelpPanel } from '@/components/audits/wizard/HelpPanel';
import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { WizardShell } from '@/components/audits/wizard/WizardShell';
import { Step1Context } from '@/components/audits/wizard/m1/Step1Context';
import { Step2Data } from '@/components/audits/wizard/m1/Step2Data';
import { Step3Decision } from '@/components/audits/wizard/m1/Step3Decision';
import { Step4Protected } from '@/components/audits/wizard/m1/Step4Protected';
import { Step5Review } from '@/components/audits/wizard/m1/Step5Review';
import {
  analyzeDataset,
  createAudit,
  uploadDataset,
  type DatasetAnalysisOut,
  type DatasetOut,
} from '@/lib/api/audits';
import type { WizardStepDef } from '@/lib/wizard/types';

interface M1Values {
  title: string;
  decision_column: string;
  favorable_value: string;
  protected_attribute: string;
  privileged_value: string;
  ground_truth_column: string;
  secondary_protected_attribute: string;
}

const DEFAULT_VALUES: M1Values = {
  title: '',
  decision_column: '',
  favorable_value: '',
  protected_attribute: '',
  privileged_value: '',
  ground_truth_column: '',
  secondary_protected_attribute: '',
};

interface M1WizardProps {
  onComplete: (auditId: string) => void;
}

export function M1Wizard({ onComplete }: M1WizardProps): React.ReactElement {
  const form = useForm<M1Values>({ defaultValues: DEFAULT_VALUES });
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

  const steps: ReadonlyArray<WizardStepDef<M1Values>> = [
    { id: 'context', title: 'Contexte', helpKey: 'm1.step1', isValid: (v) => v.title.trim().length > 0 },
    { id: 'data', title: 'Données', helpKey: 'm1.step2', isValid: () => dataset !== null },
    { id: 'decision', title: 'Décision', helpKey: 'm1.step3', isValid: (v) => v.decision_column.length > 0 && v.favorable_value.length > 0 },
    { id: 'protected', title: 'Attribut protégé', helpKey: 'm1.step4', isValid: (v) => v.protected_attribute.length > 0 },
    { id: 'review', title: 'Résumé', helpKey: 'm1.step5', isValid: () => true },
  ];

  const onSubmit = async () => {
    if (!dataset) return;
    const v = form.getValues();
    setSubmitError(null);
    try {
      const audit = await createAudit({
        dataset_id: dataset.id,
        title: v.title,
        decision_column: v.decision_column,
        favorable_value: v.favorable_value,
        protected_attribute: v.protected_attribute,
        privileged_value: v.privileged_value || null,
        ...(v.ground_truth_column ? { ground_truth_column: v.ground_truth_column } : {}),
        ...(v.secondary_protected_attribute ? { secondary_protected_attribute: v.secondary_protected_attribute } : {}),
      });
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
              <p role="alert" className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail">
                {submitError}
              </p>
            )}
            <WizardShell<M1Values>
              steps={steps}
              values={values}
              onSubmit={onSubmit}
              renderStep={(step) => {
                switch (step.id) {
                  case 'context': return <Step1Context />;
                  case 'data': return <Step2Data dataset={dataset} analysis={analysis} analysisError={analysisError} onUpload={handleUpload} busy={busy} />;
                  case 'decision': return <Step3Decision columns={dataset?.columns ?? []} analysis={analysis} />;
                  case 'protected': return <Step4Protected columns={dataset?.columns ?? []} analysis={analysis} />;
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
