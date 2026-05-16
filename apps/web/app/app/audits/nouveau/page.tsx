'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Topbar } from '@/components/app/Topbar';
import { Button } from '@/components/ui/button';
import {
  type DatasetOut,
  createAudit,
  uploadDataset,
} from '@/lib/api/audits';

const MapSchema = z.object({
  title: z.string().min(1, 'Requis'),
  protected_attribute: z.string().min(1, 'Requis'),
  decision_column: z.string().min(1, 'Requis'),
  favorable_value: z.string().min(1, 'Requis'),
  privileged_value: z.string().optional(),
});
type MapValues = z.infer<typeof MapSchema>;

export default function NouveauPage() {
  const router = useRouter();
  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MapValues>({ resolver: zodResolver(MapSchema) });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setDataset(await uploadDataset(file));
    } catch {
      setError("L'import du fichier a échoué. Vérifiez le CSV.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (v: MapValues) => {
    if (!dataset) return;
    setError(null);
    setBusy(true);
    try {
      const audit = await createAudit({
        dataset_id: dataset.id,
        title: v.title,
        protected_attribute: v.protected_attribute,
        decision_column: v.decision_column,
        favorable_value: v.favorable_value,
        privileged_value: v.privileged_value ? v.privileged_value : null,
      });
      router.push(`/app/audits/${audit.id}`);
    } catch {
      setError("Le lancement de l'audit a échoué.");
      setBusy(false);
    }
  };

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Audits', href: '/app/audits' },
          { label: 'Nouvel audit' },
        ]}
      />
      <main className="flex-1 px-8 py-8">
        <h1 className="mb-6 text-[28px] font-semibold tracking-[-0.02em] text-fg">
          Nouvel audit M1
        </h1>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-status-fail-border bg-status-fail-bg p-3 text-sm text-status-fail"
          >
            {error}
          </p>
        )}

        {!dataset ? (
          <div className="rounded-2xl border border-border-default bg-surface p-8">
            <label
              htmlFor="csv"
              className="text-sm font-medium text-fg-secondary"
            >
              Jeu de données (CSV)
            </label>
            <input
              id="csv"
              data-testid="csv-input"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={onFile}
              className="mt-2 block w-full text-sm text-fg-secondary"
            />
            <p className="mt-3 text-xs text-fg-muted">
              Le fichier est stocké de façon sécurisée et supprimé après la
              durée de rétention de votre organisation.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-8"
            noValidate
          >
            <p className="text-sm text-fg-secondary">
              <strong className="text-fg">{dataset.filename}</strong> ·{' '}
              {dataset.row_count} lignes · {dataset.columns.length} colonnes
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-medium text-fg-secondary">
                Titre de l&apos;audit
              </label>
              <input
                id="title"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('title')}
              />
              {errors.title && (
                <span className="text-xs text-status-fail">
                  {errors.title.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pa" className="text-sm font-medium text-fg-secondary">
                Attribut protégé
              </label>
              <select
                id="pa"
                defaultValue=""
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('protected_attribute')}
              >
                <option value="" disabled>
                  —
                </option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.protected_attribute && (
                <span className="text-xs text-status-fail">
                  {errors.protected_attribute.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dc" className="text-sm font-medium text-fg-secondary">
                Colonne de décision
              </label>
              <select
                id="dc"
                defaultValue=""
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('decision_column')}
              >
                <option value="" disabled>
                  —
                </option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.decision_column && (
                <span className="text-xs text-status-fail">
                  {errors.decision_column.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fv" className="text-sm font-medium text-fg-secondary">
                Valeur favorable
              </label>
              <input
                id="fv"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('favorable_value')}
              />
              {errors.favorable_value && (
                <span className="text-xs text-status-fail">
                  {errors.favorable_value.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pv" className="text-sm font-medium text-fg-secondary">
                Groupe de référence (optionnel)
              </label>
              <input
                id="pv"
                className="rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg"
                {...register('privileged_value')}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" disabled={busy}>
              {busy ? 'Analyse…' : "Lancer l'audit"}
            </Button>
          </form>
        )}
      </main>
    </>
  );
}
