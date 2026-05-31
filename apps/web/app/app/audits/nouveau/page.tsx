'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Topbar } from '@/components/app/Topbar';
import { Button } from '@/components/ui/button';
import { M1Wizard } from '@/components/audits/wizard/m1/M1Wizard';
import { M2Wizard } from '@/components/audits/wizard/m2/M2Wizard';
import {
  createAudit,
} from '@/lib/api/audits';

type Module = 'M1' | 'M2' | 'M3';

const fieldCls =
  'rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg';
const labelCls = 'text-sm font-medium text-fg-secondary';

const M3_PRESETS: Record<
  string,
  { method: string; body_template: string; response_path: string }
> = {
  'OpenAI-compatible (/chat/completions)': {
    method: 'POST',
    body_template:
      '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
    response_path: 'choices.0.message.content',
  },
  Personnalisé: { method: 'POST', body_template: '', response_path: '' },
};

const M3Schema = z.object({
  title: z.string().min(1, 'Requis'),
  url: z.string().url('URL invalide'),
  method: z.string().min(1, 'Requis'),
  auth_header: z.string().optional(),
  body_template: z.string().min(1, 'Requis'),
  response_path: z.string().min(1, 'Requis'),
  lang: z.enum(['fr', 'en']),
});
type M3Values = z.infer<typeof M3Schema>;

type M3FormProps = {
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  onDone: (id: string) => void;
};

function M3Form({ busy, setBusy, setError, onDone }: M3FormProps) {
  const presetNames = Object.keys(M3_PRESETS);
  const firstPreset = presetNames[0] ?? 'Personnalisé';
  const firstCfg = M3_PRESETS[firstPreset] ?? {
    method: 'POST',
    body_template: '',
    response_path: '',
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<M3Values>({
    resolver: zodResolver(M3Schema),
    defaultValues: {
      title: '',
      url: '',
      method: firstCfg.method,
      auth_header: '',
      body_template: firstCfg.body_template,
      response_path: firstCfg.response_path,
      lang: 'fr',
    },
  });
  const [preset, setPreset] = React.useState<string>(firstPreset);

  const applyPreset = (name: string) => {
    setPreset(name);
    const cfg = M3_PRESETS[name];
    if (cfg) {
      reset((prev) => ({
        ...prev,
        method: cfg.method,
        body_template: cfg.body_template,
        response_path: cfg.response_path,
      }));
    }
  };

  const onSubmit = async (v: M3Values) => {
    setError(null);
    setBusy(true);
    try {
      const headers: Record<string, string> = {};
      if (v.auth_header && v.auth_header.trim())
        headers.Authorization = v.auth_header.trim();
      const audit = await createAudit({
        title: v.title,
        module: 'M3',
        target: {
          url: v.url,
          method: v.method,
          headers,
          body_template: v.body_template,
          response_path: v.response_path,
        },
        lang: v.lang,
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
        <label htmlFor="m3-title" className={labelCls}>
          Titre de l&apos;audit
        </label>
        <input id="m3-title" className={fieldCls} {...register('title')} />
        {errors.title && (
          <span className="text-xs text-status-fail">
            {errors.title.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-preset" className={labelCls}>
          Modèle de configuration
        </label>
        <select
          id="m3-preset"
          value={preset}
          onChange={(e) => applyPreset(e.target.value)}
          className={fieldCls}
        >
          {presetNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-url" className={labelCls}>
          URL de l&apos;API du chatbot
        </label>
        <input
          id="m3-url"
          className={fieldCls}
          placeholder="https://…"
          {...register('url')}
        />
        {errors.url && (
          <span className="text-xs text-status-fail">
            {errors.url.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-method" className={labelCls}>
          Méthode HTTP
        </label>
        <input
          id="m3-method"
          className={fieldCls}
          {...register('method')}
        />
        {errors.method && (
          <span className="text-xs text-status-fail">
            {errors.method.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-auth" className={labelCls}>
          En-tête d&apos;authentification (optionnel)
        </label>
        <input
          id="m3-auth"
          className={fieldCls}
          placeholder="Bearer sk-…"
          {...register('auth_header')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-body" className={labelCls}>
          Corps de requête (gabarit, doit contenir {'{prompt}'})
        </label>
        <textarea
          id="m3-body"
          rows={4}
          className={fieldCls}
          {...register('body_template')}
        />
        {errors.body_template && (
          <span className="text-xs text-status-fail">
            {errors.body_template.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-rp" className={labelCls}>
          Chemin de la réponse (response_path, ex.
          choices.0.message.content)
        </label>
        <input
          id="m3-rp"
          className={fieldCls}
          {...register('response_path')}
        />
        {errors.response_path && (
          <span className="text-xs text-status-fail">
            {errors.response_path.message}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="m3-lang" className={labelCls}>
          Langue des prompts
        </label>
        <select id="m3-lang" className={fieldCls} {...register('lang')}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
      <p className="text-xs text-fg-muted">
        Le secret d&apos;authentification n&apos;est jamais enregistré ni
        journalisé.
      </p>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>
        {busy ? 'Analyse…' : "Lancer l'audit"}
      </Button>
    </form>
  );
}

export default function NouveauPage() {
  const router = useRouter();
  const [module, setModule] = React.useState<Module | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

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

        {module === null ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-8">
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
              <button
                type="button"
                onClick={() => setModule('M3')}
                className="rounded-xl border border-border-default bg-surface p-5 text-left hover:border-fg-muted"
              >
                <div className="font-medium text-fg">
                  Audit LLM / chatbot (M3)
                </div>
                <div className="mt-1 text-xs text-fg-muted">
                  M3 — écart de traitement d&apos;un agent conversationnel,
                  sans jeu de données.
                </div>
              </button>
            </div>
          </div>
        ) : module === 'M1' ? (
          <M1Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
        ) : module === 'M2' ? (
          <M2Wizard onComplete={(id) => router.push(`/app/audits/${id}`)} />
        ) : (
          <M3Form
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
