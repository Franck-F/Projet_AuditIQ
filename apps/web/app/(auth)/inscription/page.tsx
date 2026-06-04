'use client';

import * as React from 'react';
import Link from 'next/link';
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

const InscriptionSchema = z.object({
  prenom: z.string().min(1, 'Requis'),
  nom: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  entreprise: z.string().min(1, 'Requis'),
  role: z.string().optional(),
  password: z
    .string()
    .min(12, '12 caractères minimum')
    .regex(PWD_REGEX, 'Doit contenir 1 majuscule, 1 chiffre, 1 symbole'),
  cgu: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter les CGU' }) }),
  newsletter: z.boolean().optional(),
});

type InscriptionValues = z.infer<typeof InscriptionSchema>;


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

  // Pick a leading icon based on the input id (no extra prop needed)
  const LeadIcon =
    isPassword ? Lock
    : type === 'email' ? Mail
    : id === 'prenom' || id === 'nom' || id === 'entreprise' || id === 'role'
      ? User
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
    });
    if (error) {
      setAuthError(
        "L'inscription a échoué. Cet email est peut-être déjà utilisé.",
      );
      return;
    }
    // When Supabase project has email confirmation enabled, signUp returns
    // success but session=null until the user clicks the link in the email.
    // We route them to the verification-email page so they know to check
    // their inbox. When email confirmation is OFF (dev shortcut), session
    // is present and we proceed straight to /app.
    if (data.session == null) {
      router.push(`/verification-email?email=${encodeURIComponent(v.email)}`);
      return;
    }
    router.push('/app');
  };

  return (
    <AuthShell
      activeTab="signup"
      heading="Commencez gratuitement"
      intro="14 jours d'essai, sans carte bancaire."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField
              id="prenom"
              label="Prénom"
              type="text"
              required
              autoComplete="given-name"
              error={errors.prenom?.message}
              {...register('prenom')}
            />
            <InputField
              id="nom"
              label="Nom"
              type="text"
              required
              autoComplete="family-name"
              error={errors.nom?.message}
              {...register('nom')}
            />
          </div>

          <InputField
            id="email"
            label="Email professionnel"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@entreprise.fr"
            hint="Pas d'adresses Gmail / Yahoo personnelles, sauf pour les freelances."
            error={errors.email?.message}
            {...register('email')}
          />

          <InputField
            id="entreprise"
            label="Nom de l'entreprise"
            type="text"
            required
            autoComplete="organization"
            error={errors.entreprise?.message}
            {...register('entreprise')}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="role" className="text-sm font-medium text-fg-secondary">
              Votre fonction
            </label>
            <select
              id="role"
              defaultValue=""
              className="w-full rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              {...register('role')}
            >
              <option value="">—</option>
              <option>Responsable conformité / DPO</option>
              <option>DRH / RH</option>
              <option>Direction générale</option>
              <option>Direction innovation</option>
              <option>CTO / Engineering</option>
              <option>Data / ML</option>
              <option>Autre</option>
            </select>
          </div>

          <InputField
            id="pwd"
            label="Mot de passe"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Minimum 12 caractères"
            hint="12 caractères minimum, dont une majuscule, un chiffre et un symbole."
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-accent"
            {...register('cgu')}
          />
          <span>
            J&apos;accepte les{' '}
            <Link href="/cgu" className="text-accent hover:underline">
              CGU
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="text-accent hover:underline">
              politique de confidentialité
            </Link>
            . Mes données sont hébergées en France et ne servent pas à entraîner des modèles
            tiers.
          </span>
        </label>
        {errors.cgu && <p className="text-xs text-status-fail">{errors.cgu.message}</p>}

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-accent"
            {...register('newsletter')}
          />
          <span>
            Je souhaite recevoir la newsletter mensuelle (actualité réglementaire AI Act,
            méthodologie, retours d&apos;expérience). Désinscription en un clic.
          </span>
        </label>

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
