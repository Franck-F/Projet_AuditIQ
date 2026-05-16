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
  type M2ConfigIn,
  createAudit,
  uploadDataset,
} from '@/lib/api/audits';

type Module = 'M1' | 'M2';

const M1Schema = z.object({
  title: z.string().min(1, 'Requis'),
  protected_attribute: z.string().min(1, 'Requis'),
  decision_column: z.string().min(1, 'Requis'),
  favorable_value: z.string().min(1, 'Requis'),
  privileged_value: z.string().optional(),
});
type M1Values = z.infer<typeof M1Schema>;

const M2Schema = z.object({
  title: z.string().min(1, 'Requis'),
  decision_column: z.string().min(1, 'Requis'),
  favorable_value: z.string().min(1, 'Requis'),
  k: z.string().optional(),
  deviation_pp: z.string().optional(),
  chi2_alpha: z.string().optional(),
});
type M2Values = z.infer<typeof M2Schema>;

const fieldCls =
  'rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg';
const labelCls = 'text-sm font-medium text-fg-secondary';

type FormProps = {
  dataset: DatasetOut;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  onDone: (id: string) => void;
};

function M1Form({ dataset, busy, setBusy, setError, onDone }: FormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<M1Values>({ resolver: zodResolver(M1Schema) });

  const onSubmit = async (v: M1Values) => {
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
      onDone(audit.id);
    } catch {
      setError("Le lancement de l'audit a échoué.");
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-8"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelCls}>
          Titre de l&apos;audit
        </label>
        <input id="title" className={fieldCls} {...register('title')} />
        {errors.title && (
          <span className="text-xs text-status-fail">
            {errors.title.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pa" className={labelCls}>
          Attribut protégé
        </label>
        <select
          id="pa"
          defaultValue=""
          className={fieldCls}
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
        <label htmlFor="dc" className={labelCls}>
          Colonne de décision
        </label>
        <select
          id="dc"
          defaultValue=""
          className={fieldCls}
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
        <label htmlFor="fv" className={labelCls}>
          Valeur favorable
        </label>
        <input id="fv" className={fieldCls} {...register('favorable_value')} />
        {errors.favorable_value && (
          <span className="text-xs text-status-fail">
            {errors.favorable_value.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pv" className={labelCls}>
          Groupe de référence (optionnel)
        </label>
        <input id="pv" className={fieldCls} {...register('privileged_value')} />
      </div>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>
        {busy ? 'Analyse…' : "Lancer l'audit"}
      </Button>
    </form>
  );
}

function M2Form({ dataset, busy, setBusy, setError, onDone }: FormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<M2Values>({ resolver: zodResolver(M2Schema) });

  const onSubmit = async (v: M2Values) => {
    setError(null);
    setBusy(true);
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
      onDone(audit.id);
    } catch {
      setError("Le lancement de l'audit a échoué.");
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-8"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelCls}>
          Titre de l&apos;audit
        </label>
        <input id="title" className={fieldCls} {...register('title')} />
        {errors.title && (
          <span className="text-xs text-status-fail">
            {errors.title.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc" className={labelCls}>
          Colonne de décision
        </label>
        <select
          id="dc"
          defaultValue=""
          className={fieldCls}
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
        <label htmlFor="fv" className={labelCls}>
          Valeur favorable
        </label>
        <input id="fv" className={fieldCls} {...register('favorable_value')} />
        {errors.favorable_value && (
          <span className="text-xs text-status-fail">
            {errors.favorable_value.message}
          </span>
        )}
      </div>
      <details className="rounded-md border border-border-default p-4">
        <summary className="cursor-pointer text-sm font-medium text-fg-secondary">
          Paramètres avancés
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="k" className={labelCls}>
              Nombre de clusters (k)
            </label>
            <input
              id="k"
              type="number"
              placeholder="5"
              className={fieldCls}
              {...register('k')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dpp" className={labelCls}>
              Seuil de déviation (pts)
            </label>
            <input
              id="dpp"
              type="number"
              placeholder="20"
              className={fieldCls}
              {...register('deviation_pp')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="alpha" className={labelCls}>
              Seuil χ² (alpha)
            </label>
            <input
              id="alpha"
              type="number"
              step="0.01"
              placeholder="0.05"
              className={fieldCls}
              {...register('chi2_alpha')}
            />
          </div>
        </div>
      </details>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>
        {busy ? 'Analyse…' : "Lancer l'audit"}
      </Button>
    </form>
  );
}

export default function NouveauPage() {
  const router = useRouter();
  const [dataset, setDataset] = React.useState<DatasetOut | null>(null);
  const [module, setModule] = React.useState<Module | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

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
          Nouvel audit
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
            <label htmlFor="csv" className={labelCls}>
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
        ) : module === null ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-8">
            <p className="text-sm text-fg-secondary">
              <strong className="text-fg">{dataset.filename}</strong> ·{' '}
              {dataset.row_count} lignes · {dataset.columns.length} colonnes
            </p>
            <p className={labelCls}>Type d&apos;audit</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setModule('M1')}
                className="rounded-xl border border-border-default bg-surface p-5 text-left hover:border-fg-muted"
              >
                <div className="font-medium text-fg">Audit supervisé</div>
                <div className="mt-1 text-xs text-fg-muted">
                  M1 — écart de traitement sur un attribut protégé déclaré
                  (Disparate Impact, règle des 4/5).
                </div>
              </button>
              <button
                type="button"
                onClick={() => setModule('M2')}
                className="rounded-xl border border-border-default bg-surface p-5 text-left hover:border-fg-muted"
              >
                <div className="font-medium text-fg">
                  Détection non supervisée
                </div>
                <div className="mt-1 text-xs text-fg-muted">
                  M2 — clusters de traitement déviants, sans aucune donnée
                  sensible.
                </div>
              </button>
            </div>
          </div>
        ) : module === 'M1' ? (
          <M1Form
            dataset={dataset}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            onDone={(id) => router.push(`/app/audits/${id}`)}
          />
        ) : (
          <M2Form
            dataset={dataset}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            onDone={(id) => router.push(`/app/audits/${id}`)}
          />
        )}
      </main>
    </>
  );
}
