'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const PWD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

// Strict maquette: nom complet + e-mail + mot de passe only.
// Consent for CGU / privacy is implied by the footer "En continuant…" copy.
const InscriptionSchema = z.object({
  nomComplet: z.string().min(2, 'Requis'),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(12, '12 caractères minimum')
    .regex(PWD_REGEX, 'Doit contenir 1 majuscule, 1 chiffre, 1 symbole'),
});

type InscriptionValues = z.infer<typeof InscriptionSchema>;

// Official Google "G" — same brand mark as on /connexion.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const InputField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    hint?: string;
    error?: string;
  }
>(function InputField({ id, label, hint, error, type, ...props }, ref) {
  const isPassword = type === 'password';
  const [reveal, setReveal] = React.useState(false);
  const effectiveType = isPassword && reveal ? 'text' : type;

  const LeadIcon =
    isPassword ? Lock
    : type === 'email' ? Mail
    : id === 'nomComplet' ? User
    : null;

  const inputClass = cn(
    'w-full rounded-md border bg-surface py-2.5 pr-3.5 text-sm text-fg placeholder:text-fg-muted',
    'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
    LeadIcon ? 'pl-10' : 'pl-3.5',
    isPassword && 'pr-11',
    error ? 'border-status-fail' : 'border-border-default',
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <div className="relative">
        {LeadIcon && (
          <LeadIcon
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
        )}
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          className={inputClass}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-pressed={reveal}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg"
          >
            <span className="sr-only">
              {reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            </span>
            {reveal ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && <span className="text-xs text-fg-muted">{hint}</span>}
      {error && <span className="text-xs text-status-fail">{error}</span>}
    </div>
  );
});

export default function InscriptionPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InscriptionValues>({
    resolver: zodResolver(InscriptionSchema),
  });

  const [authError, setAuthError] = React.useState<string | null>(null);

  const onSubmit = async (v: InscriptionValues) => {
    setAuthError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { data: { full_name: v.nomComplet } },
    });
    if (error) {
      setAuthError("L'inscription a échoué. Cet email est peut-être déjà utilisé.");
      return;
    }
    // Supabase returns session=null when email confirmation is required.
    if (data.session == null) {
      router.push(`/verification-email?email=${encodeURIComponent(v.email)}`);
      return;
    }
    router.push('/app');
  };

  const handleGoogleOAuth = async () => {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/app` : undefined,
      },
    });
    if (error) {
      setAuthError(
        "La connexion Google est momentanément indisponible. Réessayez ou utilisez l'email.",
      );
    }
  };

  return (
    <AuthShell
      activeTab="signup"
      heading="Commencez gratuitement"
      intro="Palier Découverte gratuit — sans carte bancaire."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <button
          type="button"
          onClick={handleGoogleOAuth}
          aria-label="Continuer avec Google"
          className="flex items-center justify-center gap-3 rounded-md border border-border-default bg-surface px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-border-strong"
        >
          <GoogleLogo className="size-5" />
          <span>Continuer avec Google</span>
        </button>

        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.12em] text-fg-muted before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle">
          OU
        </div>

        <div className="flex flex-col gap-4">
          <InputField
            id="nomComplet"
            label="Nom complet"
            type="text"
            required
            autoComplete="name"
            placeholder="Léa Moreau"
            error={errors.nomComplet?.message}
            {...register('nomComplet')}
          />

          <InputField
            id="email"
            label="E-mail professionnel"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@entreprise.fr"
            error={errors.email?.message}
            {...register('email')}
          />

          <InputField
            id="pwd"
            label="Mot de passe"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Minimum 12 caractères"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {authError && (
          <p role="alert" className="text-sm text-status-fail">
            {authError}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Création…' : 'Créer mon compte'}
          {!isSubmitting && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </form>
    </AuthShell>
  );
}
