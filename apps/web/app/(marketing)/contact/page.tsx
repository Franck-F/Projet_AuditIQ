'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { cn } from '@/lib/utils';

/* ============================================================================
   Validation schema
   ============================================================================ */

const ContactSchema = z.object({
  prenom: z.string().min(1, 'Requis'),
  nom: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  entreprise: z.string().min(1, 'Requis'),
  role: z.string().optional(),
  taille: z.string().optional(),
  secteur: z.string().optional(),
  modules: z.array(z.string()).default([]),
  message: z.string().max(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consentement requis' }) }),
});

type ContactValues = z.infer<typeof ContactSchema>;

const MODULES = [
  { value: 'M1', label: 'Module 01 · Audit supervisé' },
  { value: 'M2', label: 'Module 02 · Non supervisé' },
  { value: 'M3', label: 'Module 03 · LLM / chatbot' },
  { value: 'transversale', label: 'Couche transversale / rapports' },
] as const;

/* ============================================================================
   Subcomponents
   ============================================================================ */

function InputField({
  id,
  label,
  required,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      <input
        id={id}
        className={cn(
          'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors placeholder:text-fg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:border-accent',
          error ? 'border-status-fail' : 'border-border-default',
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-err`} className="text-xs text-status-fail">
          {error}
        </span>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  error,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  options: string[];
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:border-accent',
          error ? 'border-status-fail' : 'border-border-default',
        )}
        defaultValue=""
        {...props}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoBlock({
  eyebrow,
  title,
  body,
  values,
  hint,
}: {
  eyebrow: string;
  title: string;
  body: string;
  values?: string[];
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-default bg-surface p-6">
      <Eyebrow accent>{eyebrow}</Eyebrow>
      <h4 className="text-h4 font-medium text-fg">{title}</h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
      {values?.map((v) => (
        <div key={v} className="mt-1 font-mono text-sm text-accent">
          {v}
        </div>
      ))}
      {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

/* ============================================================================
   Page
   ============================================================================ */

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: { modules: [] },
  });

  const onSubmit = async (_values: ContactValues) => {
    // TODO Phase 1 : POST /api/v1/contact (Resend) — pour l'instant simulation
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  };

  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Contact &amp; démo</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Une démo guidée de 30 minutes, sur vos données.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Apportez un cas d&apos;usage et idéalement un dataset (anonymisé si nécessaire). À
              la fin de la démo, vous repartez avec un rapport AuditIQ utilisable pour votre
              comité. Engagement zéro, durée fixe.
            </p>
          </Reveal>
        </Container>
      </header>

      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              {submitted ? (
                <div className="rounded-2xl border border-accent-border bg-surface p-12 text-center">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-[28px] text-accent">
                    ✓
                  </div>
                  <h2 className="mb-3 text-h3 font-display font-medium text-fg">
                    Merci, votre demande est enregistrée.
                  </h2>
                  <p className="mx-auto max-w-[40ch] text-sm text-fg-secondary">
                    Un consultant vous recontacte sous 24h ouvrées pour fixer un créneau de démo.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="rounded-2xl border border-border-default bg-surface p-7 sm:p-10"
                  noValidate
                >
                  <h2 className="mb-2 text-h3 font-display font-medium tracking-[-0.015em] text-fg">
                    Réservez votre démo
                  </h2>
                  <p className="mb-8 text-sm leading-relaxed text-fg-secondary">
                    Un consultant AuditIQ vous recontacte sous 24h ouvrées. Champs{' '}
                    <span className="text-accent">*</span> obligatoires.
                  </p>

                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField
                      id="prenom"
                      label="Prénom"
                      required
                      type="text"
                      autoComplete="given-name"
                      error={errors.prenom?.message}
                      {...register('prenom')}
                    />
                    <InputField
                      id="nom"
                      label="Nom"
                      required
                      type="text"
                      autoComplete="family-name"
                      error={errors.nom?.message}
                      {...register('nom')}
                    />
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField
                      id="email"
                      label="Email professionnel"
                      required
                      type="email"
                      placeholder="prenom.nom@entreprise.fr"
                      autoComplete="email"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                    <InputField
                      id="phone"
                      label="Téléphone"
                      type="tel"
                      placeholder="+33 ..."
                      autoComplete="tel"
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField
                      id="entreprise"
                      label="Entreprise"
                      required
                      type="text"
                      autoComplete="organization"
                      error={errors.entreprise?.message}
                      {...register('entreprise')}
                    />
                    <SelectField
                      id="role"
                      label="Votre fonction"
                      options={[
                        'Responsable conformité / DPO',
                        'DRH / RH',
                        'Direction générale',
                        'Direction innovation',
                        'CTO / VP Engineering',
                        'Data / ML',
                        'Autre',
                      ]}
                      {...register('role')}
                    />
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SelectField
                      id="taille"
                      label="Taille de l'entreprise"
                      options={[
                        '1 - 49 collaborateurs',
                        '50 - 249 collaborateurs',
                        '250 - 999 collaborateurs',
                        '1 000 + collaborateurs',
                      ]}
                      {...register('taille')}
                    />
                    <SelectField
                      id="secteur"
                      label="Secteur"
                      options={[
                        'Banque / finance / assurance',
                        'RH / conseil / recrutement',
                        'SaaS / éditeur logiciel',
                        'Santé / médico-social',
                        'Industrie / manufacturing',
                        'Service public / collectivité',
                        'Autre',
                      ]}
                      {...register('secteur')}
                    />
                  </div>

                  <fieldset className="mb-4">
                    <legend className="mb-3 text-sm font-medium text-fg-secondary">
                      Quels modules vous intéressent ?
                    </legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {MODULES.map((m) => (
                        <label
                          key={m.value}
                          className="group flex cursor-pointer items-center gap-2.5 rounded-md border border-border-default bg-surface-2 px-3.5 py-2.5 text-sm text-fg-secondary transition-colors hover:border-border-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-fg"
                        >
                          <input
                            type="checkbox"
                            value={m.value}
                            className="size-4 accent-accent"
                            {...register('modules')}
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mb-5">
                    <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-fg-secondary">
                      Votre contexte (optionnel)
                    </label>
                    <textarea
                      id="message"
                      className="min-h-[100px] w-full rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      placeholder="Décrivez brièvement votre IA, votre calendrier AI Act, ou toute question. 2-3 lignes suffisent."
                      {...register('message')}
                    />
                  </div>

                  <label className="mb-6 flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-accent"
                      {...register('consent')}
                    />
                    <span>
                      J&apos;accepte que mes données soient traitées par AuditIQ SAS pour me
                      recontacter dans le cadre de cette demande, conformément à la{' '}
                      <a href="/confidentialite" className="text-accent">
                        politique de confidentialité
                      </a>
                      . Mes données ne seront pas transmises à des tiers.
                    </span>
                  </label>
                  {errors.consent && (
                    <p className="mb-3 text-xs text-status-fail">{errors.consent.message}</p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Envoi…' : 'Réserver ma démo'}
                  </Button>
                  <p className="mt-3 text-center text-xs text-fg-muted">
                    Réponse sous 24h ouvrées.
                  </p>
                </form>
              )}
            </Reveal>

            <Reveal delay={0.08}>
              <aside className="flex flex-col gap-7">
                <InfoBlock
                  eyebrow="Vente"
                  title="Demande commerciale"
                  body="Pour les démos, devis, paliers Entreprise et Souverain, marchés publics."
                  values={['contact@auditiq.fr', '+33 1 89 86 02 14']}
                />
                <InfoBlock
                  eyebrow="Support"
                  title="Aide produit"
                  body="Clients existants — pour toute question fonctionnelle, bug ou demande d'évolution."
                  values={['support@auditiq.fr']}
                  hint="Réponse sous 4h à 24h selon votre palier"
                />
                <InfoBlock
                  eyebrow="DPO"
                  title="Données & vie privée"
                  body="Exercice de vos droits RGPD, demandes de suppression, signalements."
                  values={['dpo@auditiq.fr']}
                />
                <InfoBlock
                  eyebrow="Presse"
                  title="Médias & partenariats"
                  body="Journalistes, rédactions, partenaires (cabinets, intégrateurs)."
                  values={['presse@auditiq.fr', 'partners@auditiq.fr']}
                />
                <div className="flex flex-col gap-2 rounded-xl border border-border-default bg-surface p-6">
                  <Eyebrow accent>Siège</Eyebrow>
                  <h4 className="text-h4 font-medium text-fg">AuditIQ SAS</h4>
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    Capital 64 000 €. RCS Paris 924 386 715. TVA FR12924386715.
                  </p>
                  <p className="text-sm text-fg-secondary">
                    12 rue d&apos;Aboukir, 75002 Paris, France
                  </p>
                </div>
              </aside>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
