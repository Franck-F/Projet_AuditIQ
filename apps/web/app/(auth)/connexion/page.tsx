'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AuthMain, AuthSide } from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const ConnexionSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Requis'),
  remember: z.boolean().optional(),
});

type ConnexionValues = z.infer<typeof ConnexionSchema>;

function SsoButton({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2.5 rounded-md border border-border-default bg-surface px-4 py-3 text-sm text-fg transition-colors hover:border-border-strong"
    >
      <span
        aria-hidden
        className="inline-flex size-[18px] items-center justify-center rounded-[4px] bg-surface-3 font-mono text-[11px] text-fg-secondary"
      >
        {icon}
      </span>
      {children}
    </button>
  );
}

export default function ConnexionPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConnexionValues>({
    resolver: zodResolver(ConnexionSchema),
  });

  const router = useRouter();
  const [authError, setAuthError] = React.useState<string | null>(null);

  const onSubmit = async (v: ConnexionValues) => {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: v.email,
      password: v.password,
    });
    if (error) {
      setAuthError(
        'Identifiants invalides. Vérifiez votre email et mot de passe.',
      );
      return;
    }
    router.push('/app');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2">
      <AuthMain>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <div>
            <h1 className="text-h2 font-display font-medium tracking-[-0.02em] text-fg">
              Connectez-vous
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
              Accédez à votre console AuditIQ pour lancer un audit, consulter vos rapports ou gérer
              votre équipe.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <SsoButton icon="G">Continuer avec Google</SsoButton>
            <SsoButton icon="M">Continuer avec Microsoft</SsoButton>
            <SsoButton icon="S">Connexion SSO entreprise (SAML)</SsoButton>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.12em] text-fg-muted before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle">
            Ou avec votre email
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-fg-secondary">
                Email professionnel
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="vous@entreprise.fr"
                autoComplete="email"
                className={cn(
                  'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted',
                  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  errors.email ? 'border-status-fail' : 'border-border-default',
                )}
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email && (
                <span className="text-xs text-status-fail">{errors.email.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pwd" className="text-sm font-medium text-fg-secondary">
                Mot de passe
              </label>
              <input
                id="pwd"
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted',
                  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  errors.password ? 'border-status-fail' : 'border-border-default',
                )}
                {...register('password')}
              />
              {errors.password && (
                <span className="text-xs text-status-fail">{errors.password.message}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-fg-secondary">
                <input type="checkbox" className="size-4 accent-accent" {...register('remember')} />
                Rester connecté 30 jours
              </label>
              <Link href="/mot-de-passe-oublie" className="text-accent hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          {authError && (
            <p role="alert" className="text-sm text-status-fail">
              {authError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </Button>

          <p className="mt-auto pt-8 text-center text-sm text-fg-muted">
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="text-accent hover:underline">
              Créer un compte gratuit
            </Link>
          </p>
        </form>
      </AuthMain>

      <AuthSide
        eyebrow="Reprenez où vous en étiez"
        title="Vos audits, vos rapports, votre conformité — en un seul endroit."
        body="AuditIQ centralise vos audits sur cinq ans. Comparez les scores entre deux exécutions, suivez la dérive, et restez prêt pour les contrôles."
        metrics={[
          { label: 'Audits archivés (vous)', value: '12', tone: 'info' },
          { label: 'Score moyen 2026', value: '4,2 / 5', tone: 'pass' },
          { label: 'Alertes ouvertes', value: '2', tone: 'warn' },
        ]}
      />
    </div>
  );
}
