import Link from 'next/link';
import { Mail, ArrowRight, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Page publique d'invitation. Le rattachement à l'organisation se fait lors de
 * l'inscription (côté backend, via l'adresse e-mail invitée) : il n'existe pas
 * d'endpoint public pour résoudre le token, cette page reste donc informative.
 */
export default function InvitationPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl bg-accent text-accent-fg">
          <Mail size={22} aria-hidden />
        </div>

        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
          Vous avez été invité à rejoindre une organisation sur AuditIQ
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed text-fg-secondary">
          Pour rejoindre l&apos;espace de votre équipe, créez votre compte
          <strong className="font-medium text-fg"> avec l&apos;adresse e-mail
          qui a reçu cette invitation</strong>. Le rattachement à
          l&apos;organisation est automatique au moment de l&apos;inscription.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/inscription" className="gap-2">
              Créer mon compte
              <ArrowRight size={16} aria-hidden />
            </Link>
          </Button>

          <p className="text-sm text-fg-muted">
            Vous avez déjà un compte avec cette adresse ?{' '}
            <Link href="/connexion" className="font-medium text-accent hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-fg-muted">
          <Shield size={13} aria-hidden />
          <span>
            Si vous ne vous attendiez pas à cette invitation, vous pouvez ignorer
            cette page en toute sécurité.
          </span>
        </div>
      </div>
    </main>
  );
}
