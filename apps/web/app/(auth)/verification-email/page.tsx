'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase/client';

function VerificationEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [resendState, setResendState] = React.useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [resendError, setResendError] = React.useState<string | null>(null);

  const handleResend = async () => {
    if (!email || resendState === 'sending') return;
    setResendState('sending');
    setResendError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setResendState('error');
      setResendError(
        "Le renvoi a échoué. Réessayez dans quelques minutes ou contactez le support.",
      );
      return;
    }
    setResendState('sent');
  };

  return (
    <AuthShell
      activeTab="signup"
      heading="Vérifiez votre adresse email."
      intro="Cliquez sur le lien dans l'email pour activer votre compte."
    >
      <div className="flex w-full flex-col gap-6 text-center">
        <div
          aria-hidden
          className="mx-auto mb-2 flex size-[72px] items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-[32px] text-accent"
        >
          ✉
        </div>
        <p className="text-sm leading-relaxed text-fg-secondary">
          Nous venons d&apos;envoyer un lien de vérification à
        </p>

        <div className="rounded-md border border-border-default bg-surface-2 px-4 py-3 font-mono text-sm text-fg">
          {email || 'votre adresse email'}
        </div>

        <p className="-mt-2 text-sm leading-relaxed text-fg-secondary">
          Cliquez sur le lien dans l&apos;email pour activer votre compte. Le lien expire dans 24
          heures.
        </p>

        <ol className="flex flex-col gap-3.5 rounded-md border border-border-default bg-surface-2 p-5 text-left">
          {[
            'Ouvrez votre boîte mail (vérifiez les spams si nécessaire).',
            "Cliquez sur le lien de vérification dans l'email d'AuditIQ.",
            'Vous serez automatiquement connecté à votre console.',
          ].map((step, i) => (
            <li
              key={step}
              className="grid grid-cols-[24px_1fr] gap-3 text-sm leading-[1.5] text-fg-secondary"
            >
              <span className="mt-0.5 flex size-[18px] items-center justify-center rounded-full bg-accent font-mono text-[10px] font-semibold text-[#0b1410]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
          <span className="text-xs text-fg-muted">Vous n&apos;avez rien reçu ?</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResend}
            disabled={!email || resendState === 'sending' || resendState === 'sent'}
          >
            {resendState === 'sending' && 'Envoi en cours…'}
            {resendState === 'sent' && 'Lien renvoyé ✓'}
            {(resendState === 'idle' || resendState === 'error') &&
              'Renvoyer le lien de vérification'}
          </Button>
          {resendState === 'error' && resendError && (
            <span role="alert" className="text-xs text-status-fail">
              {resendError}
            </span>
          )}
          <span className="mt-1 text-xs text-fg-muted">
            Mauvaise adresse ?{' '}
            <Link href="/inscription" className="text-accent hover:underline">
              Modifier l&apos;email
            </Link>
          </span>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerificationEmailPage() {
  return (
    <React.Suspense
      fallback={
        <AuthShell
          activeTab="signup"
          heading="Vérifiez votre adresse email."
          intro="Cliquez sur le lien dans l'email pour activer votre compte."
        >
          <div className="w-full py-8 text-center text-sm text-fg-secondary">
            Chargement…
          </div>
        </AuthShell>
      }
    >
      <VerificationEmailContent />
    </React.Suspense>
  );
}
