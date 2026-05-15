'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthCenter } from '@/components/auth/AuthShell';

export default function VerificationEmailPage() {
  const [resent, setResent] = React.useState(false);

  return (
    <AuthCenter>
      <div className="flex w-full max-w-[480px] flex-col gap-6 rounded-2xl border border-border-default bg-surface p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="mx-auto mb-2 flex size-[72px] items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-[32px] text-accent"
        >
          ✉
        </div>
        <div>
          <h1 className="text-h3 font-display font-medium tracking-[-0.015em] text-fg">
            Vérifiez votre adresse email.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
            Nous venons d&apos;envoyer un lien de vérification à
          </p>
        </div>

        <div className="rounded-md border border-border-default bg-surface-2 px-4 py-3 font-mono text-sm text-fg">
          claire.tessier@tessier-associes.fr
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
            onClick={() => setResent(true)}
            disabled={resent}
          >
            {resent ? 'Lien renvoyé ✓' : 'Renvoyer le lien de vérification'}
          </Button>
          <span className="mt-1 text-xs text-fg-muted">
            Mauvaise adresse ?{' '}
            <Link href="/inscription" className="text-accent hover:underline">
              Modifier l&apos;email
            </Link>
          </span>
        </div>
      </div>
    </AuthCenter>
  );
}
