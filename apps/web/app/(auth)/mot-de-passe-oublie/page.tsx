'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AuthCenter, AuthCard } from '@/components/auth/AuthShell';
import { cn } from '@/lib/utils';

const ResetSchema = z.object({
  email: z.string().email('Email invalide'),
});

type ResetValues = z.infer<typeof ResetSchema>;

export default function MotDePasseOubliePage() {
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(ResetSchema),
  });

  const onSubmit = async (_v: ResetValues) => {
    // TODO Task 12 : POST /api/v1/auth/password/reset (Supabase)
    await new Promise((r) => setTimeout(r, 400));
    setSent(true);
  };

  return (
    <AuthCenter>
      {sent ? (
        <AuthCard>
          <div className="py-4 text-center">
            <div
              aria-hidden
              className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-[26px] text-accent"
            >
              ✓
            </div>
            <h2 className="mb-2 text-h4 font-medium text-fg">Lien envoyé.</h2>
            <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-fg-secondary">
              Si un compte existe avec cette adresse, vous avez reçu un email contenant un lien de
              réinitialisation. Le lien expire dans 30 minutes.
            </p>
          </div>
          <div className="border-t border-border-subtle pt-4 text-center">
            <p className="mb-3 text-xs text-fg-muted">Vous ne recevez rien sous 5 minutes ?</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSent(false)}
            >
              Renvoyer le lien
            </Button>
          </div>
          <p className="text-center text-sm text-fg-muted">
            <Link href="/connexion" className="text-accent hover:underline">
              ← Retour à la connexion
            </Link>
          </p>
        </AuthCard>
      ) : (
        <AuthCard>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            <h1 className="text-h3 font-display font-medium tracking-[-0.015em] text-fg">
              Mot de passe oublié ?
            </h1>
            <p className="text-sm leading-relaxed text-fg-secondary">
              Entrez l&apos;email professionnel associé à votre compte. Nous vous envoyons un lien
              sécurisé valable 30 minutes pour définir un nouveau mot de passe.
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-fg-secondary">
                Email professionnel
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="vous@entreprise.fr"
                autoComplete="email"
                className={cn(
                  'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted',
                  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  errors.email ? 'border-status-fail' : 'border-border-default',
                )}
                {...register('email')}
              />
              {errors.email && (
                <span className="text-xs text-status-fail">{errors.email.message}</span>
              )}
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </Button>
            <p className="text-center text-sm text-fg-muted">
              <Link href="/connexion" className="text-accent hover:underline">
                ← Retour à la connexion
              </Link>
            </p>
          </form>
        </AuthCard>
      )}
    </AuthCenter>
  );
}
