import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import * as React from 'react';

import { WizardProvider } from '@/components/audits/wizard/WizardContext';
import { Step2Source } from '@/components/audits/wizard/unified/Step2Source';
import { DEFAULT_VALUES, type UnifiedValues } from '@/components/audits/wizard/unified/types';
import type { DatasetOut } from '@/lib/api/audits';

function Harness({ initial, ...props }: { initial?: Partial<UnifiedValues> } & React.ComponentProps<typeof Step2Source>) {
  const form = useForm<UnifiedValues>({ defaultValues: { ...DEFAULT_VALUES, ...initial } });
  return <FormProvider {...form}><Step2Source {...props} /></FormProvider>;
}

const dataset: DatasetOut = {
  id: 'd', filename: 'x.csv', row_count: 10, columns: ['a', 'b'], status: 'ready',
  created_at: '2026-06-02T10:00:00Z', expires_at: null,
};

describe('Unified Step2Source', () => {
  it('M1/M2: shows upload card when no dataset', () => {
    render(<WizardProvider totalSteps={5}><Harness initial={{ audit_type: 'tabular-known' }} dataset={null} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} /></WizardProvider>);
    expect(screen.getByText(/Importez votre jeu de données/i)).toBeInTheDocument();
  });

  it('M1/M2: shows file summary when dataset selected', () => {
    render(<WizardProvider totalSteps={5}><Harness initial={{ audit_type: 'tabular-unknown' }} dataset={dataset} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} /></WizardProvider>);
    expect(screen.getByText('x.csv')).toBeInTheDocument();
  });

  it('M3: shows URL + method + auth_header inputs', () => {
    render(<WizardProvider totalSteps={5}><Harness initial={{ audit_type: 'llm-api' }} dataset={null} analysis={null} analysisError={null} onUpload={vi.fn()} busy={false} /></WizardProvider>);
    expect(screen.getByRole('textbox', { name: /URL/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Méthode/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /authentification/i })).toBeInTheDocument();
  });
});
