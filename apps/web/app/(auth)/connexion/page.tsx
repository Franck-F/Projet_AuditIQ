'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const ConnexionSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Requis'),
  remember: z.boolean().optional(),
});

type ConnexionValues = z.infer<typeof ConnexionSchema>;

// Official Google "G" mark, 4-color brand. 24×24 viewBox kept; consumer sets size via Tailwind.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// GitHub octocat mark, monochrome — uses currentColor so it adapts to the surrounding text colour.
function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function OAuthButton({
  provider,
  label,
  onClick,
  children,
}: {
  provider: 'google' | 'github';
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Continuer avec ${label}`}
      data-provider={provider}
      className="flex items-center justify-center gap-3 rounded-md border border-border-default bg-surface px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-border-strong"
    >
      {children}
      <span>Continuer avec {label}</span>
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
  const [showPassword, setShowPassword] = React.useState(false);

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

  const handleOAuth = async (provider: 'google' | 'github') => {
    setAuthError(null);
    const supabase = createClient();
    // signInWithOAuth triggers a top-level browser redirect to the provider.
    // The await only resolves locally on an immediate error (e.g. provider
    // not enabled in the Supabase dashboard).
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/app` : undefined,
      },
    });
    if (error) {
      setAuthError(
        `Connexion ${provider === 'google' ? 'Google' : 'GitHub'} indisponible. Vérifiez que le provider est activé dans Supabase.`,
      );
    }
  };

  return (
    <AuthShell
      activeTab="login"
      heading="Connectez-vous"
      intro="Accédez à votre console AuditIQ pour lancer un audit, consulter vos rapports ou gérer votre équipe."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <OAuthButton
            provider="google"
            label="Google"
            onClick={() => handleOAuth('google')}
          >
            <GoogleLogo className="size-5" />
          </OAuthButton>
          <OAuthButton
            provider="github"
            label="GitHub"
            onClick={() => handleOAuth('github')}
          >
            <GitHubLogo className="size-5" />
          </OAuthButton>
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
            <div className="relative">
              <input
                id="pwd"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  // pr-11 reserves room for the eye toggle so the bullets don't overlap
                  'w-full rounded-md border bg-surface px-3.5 py-2.5 pr-11 text-sm text-fg placeholder:text-fg-muted',
                  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  errors.password ? 'border-status-fail' : 'border-border-default',
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg"
              >
                {/* sr-only (instead of aria-label) avoids interfering with
                    Testing Library's getByLabelText(/mot de passe/i) match
                    on the input above — same accessible name for AT, but
                    the matcher walks text content rather than aria-label. */}
                <span className="sr-only">
                  {showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                </span>
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
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
      </form>
    </AuthShell>
  );
}
