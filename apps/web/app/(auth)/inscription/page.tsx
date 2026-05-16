'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AuthMain, AuthSide, AuthBenefit } from '@/components/auth/AuthShell';
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

const BENEFITS = [
  { n: '01', title: 'Bienvenue & profil', body: "Trois questions : votre secteur, votre cas d'usage prioritaire, votre rôle." },
  {
    n: '02',
    title: 'Import du premier dataset',
    body: "Téléchargez un CSV ou utilisez l'un de nos datasets d'exemple (RH, crédit, santé).",
  },
  {
    n: '03',
    title: 'Configuration assistée',
    body: 'Mapping automatique des colonnes, seuils par défaut adaptés à votre secteur.',
  },
  {
    n: '04',
    title: 'Premier rapport',
    body: 'Feu tricolore, métriques, explications, recommandations. Exportable PDF et Excel.',
  },
];

function InputField({
  id,
  label,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted',
          'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
          error ? 'border-status-fail' : 'border-border-default',
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint && !error && <span className="text-xs text-fg-muted">{hint}</span>}
      {error && <span className="text-xs text-status-fail">{error}</span>}
    </div>
  );
}

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
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
    });
    if (error) {
      setAuthError(
        "L'inscription a échoué. Cet email est peut-être déjà utilisé.",
      );
      return;
    }
    router.push('/app');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2">
      <AuthMain>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div>
            <h1 className="text-h2 font-display font-medium tracking-[-0.02em] text-fg">
              Créez votre compte gratuit
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
              Palier Découverte sans carte bancaire. Un audit par mois, jusqu&apos;à 3
              utilisateurs, conservation 3 mois. Passage payant à tout moment.
            </p>
          </div>

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
          </Button>

          <p className="mt-4 text-center text-sm text-fg-muted">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="text-accent hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </AuthMain>

      <AuthSide
        eyebrow="Vos premières minutes"
        title="Premier audit en moins de 15 minutes après création de compte."
        body="Pas de période d'attente, pas de validation manuelle. Vous chargez un dataset, vous configurez, vous recevez votre rapport."
      >
        <div className="flex flex-col gap-4">
          {BENEFITS.map((b) => (
            <AuthBenefit key={b.n} num={b.n} title={b.title} body={b.body} />
          ))}
        </div>
      </AuthSide>
    </div>
  );
}
