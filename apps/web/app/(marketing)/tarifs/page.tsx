import * as React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    "Tarification AuditIQ adaptée à la maturité de votre PME. Quatre paliers, du gratuit à l'enterprise. Engagement annuel sans pénalité.",
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function BillingToggle() {
  return (
    <div className="mt-8 inline-flex gap-0.5 rounded-full border border-border-default bg-surface p-1">
      <button
        type="button"
        className="rounded-full bg-surface-3 px-4 py-2 text-sm font-medium text-fg"
        aria-pressed="true"
      >
        Mensuel
      </button>
      <button
        type="button"
        className="rounded-full px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg"
        aria-pressed="false"
      >
        Annuel
        <span className="ml-1.5 rounded-[4px] bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-accent">
          −15 %
        </span>
      </button>
    </div>
  );
}

function PriceCard({
  name,
  tagline,
  price,
  period,
  bullets,
  cta,
  ctaHref,
  variant = 'default',
  badge,
}: {
  name: string;
  tagline: string;
  price: string;
  period?: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
  variant?: 'default' | 'featured';
  badge?: string;
}) {
  const featured = variant === 'featured';
  return (
    <div
      className={
        featured
          ? 'relative flex h-full flex-col gap-6 rounded-2xl border border-accent-border bg-surface bg-gradient-to-b from-accent-soft to-transparent to-50% p-8'
          : 'relative flex h-full flex-col gap-6 rounded-2xl border border-border-default bg-surface p-8'
      }
    >
      {badge && (
        <span className="absolute -top-3 right-6 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-[#0b1410]">
          {badge}
        </span>
      )}
      <div>
        <span className="font-display text-h4 font-semibold tracking-tight">{name}</span>
        <p className="mt-1 text-sm text-fg-secondary">{tagline}</p>
      </div>
      <div className="font-display text-[44px] font-semibold leading-none tracking-[-0.025em] tabular-nums">
        {price}
        {period && (
          <span className="ml-2 font-sans text-sm font-normal text-fg-muted">{period}</span>
        )}
      </div>
      <ul className="flex flex-col gap-3 text-sm text-fg-secondary">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span aria-hidden className="mt-[3px] text-accent">
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <Button asChild variant={featured ? 'primary' : 'secondary'} className="mt-auto w-full">
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </div>
  );
}

const MATRIX_GROUPS: {
  group: string;
  rows: {
    name: string;
    desc?: string;
    values: [string, string, string, string];
  }[];
}[] = [
  {
    group: 'Audits',
    rows: [
      {
        name: 'Audit Module 1 (supervisé)',
        desc: 'Métriques fairness canoniques',
        values: ['1 / mois', 'Illimité', 'Illimité', 'Illimité'],
      },
      {
        name: 'Audit Module 2 (non supervisé)',
        desc: 'Clustering, proxies',
        values: ['—', '✓', '✓', '✓'],
      },
      {
        name: 'Audit Module 3 (LLM)',
        desc: 'Prompts pairs, scoring',
        values: ['—', '1 000 prompts/mois', 'Illimité', 'Illimité'],
      },
      { name: 'Banque de prompts personnalisée', values: ['—', '—', '✓', '✓'] },
      { name: 'Taille de dataset max', values: ['5 000 lignes', '1M lignes', 'Illimité', 'Illimité'] },
    ],
  },
  {
    group: 'Rapports & documentation',
    rows: [
      { name: 'Rapport PDF executive', values: ['Basique', '✓', '✓', '✓'] },
      { name: 'Rapport Excel Annexe IV', values: ['—', '✓', '✓', '✓'] },
      { name: 'Comparaison entre audits', values: ['—', '✓', '✓', '✓'] },
      {
        name: 'Personnalisation du rapport',
        desc: 'Logo, charte, sections',
        values: ['—', '—', '✓', '✓'],
      },
      { name: 'Conservation des audits', values: ['3 mois', '5 ans', '5 ans', 'Illimitée'] },
    ],
  },
  {
    group: 'Équipe & gouvernance',
    rows: [
      { name: 'Utilisateurs inclus', values: ['3', '15', '50', 'Illimité'] },
      {
        name: 'Permissions par rôle',
        desc: 'Admin · Auditeur · Lecteur',
        values: ['—', '✓', '✓', '✓'],
      },
      {
        name: "Journal d'activité",
        values: ['30 jours', '1 an', '5 ans', 'Illimité'],
      },
      { name: 'Multi-entités / multi-pays', values: ['—', '—', '✓', '✓'] },
    ],
  },
  {
    group: 'Sécurité',
    rows: [
      { name: 'Hébergement', values: ['OVH FR', 'OVH FR', 'OVH FR + DRP', 'SecNumCloud dédié'] },
      { name: 'SSO SAML 2.0 / OIDC', values: ['—', '—', '✓', '✓'] },
      { name: 'BYOK (clé client)', values: ['—', '—', '—', '✓'] },
      {
        name: 'Audit log inviolable horodaté',
        values: ['—', '—', 'Standard', 'Notarié'],
      },
    ],
  },
  {
    group: 'Support & accompagnement',
    rows: [
      { name: 'Support', values: ['Communautaire', '24h ouvrées', '4h', 'SLA dédié'] },
      { name: 'Onboarding accompagné', values: ['—', '4h', '1 jour', '2 jours + formation'] },
      { name: 'Consultant AI Act dédié', values: ['—', '—', '4h/mois', 'Dédié'] },
      { name: "API d'intégration GRC", values: ['—', '—', '✓', '✓'] },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Le palier Découverte est-il vraiment gratuit, sans limite de temps ?',
    a: "Oui. Le palier Découverte n'a aucune date d'expiration. Vous y restez tant que vos besoins se limitent à un audit Module 1 par mois sur des datasets ≤ 5 000 lignes. Aucune carte bancaire requise à l'inscription.",
  },
  {
    q: "Y a-t-il une période d'essai sur les paliers payants ?",
    a: "Oui — 14 jours d'essai gratuit sur le palier PME, sans engagement et sans carte bancaire. Vous accédez à toutes les fonctionnalités, sur vos propres données.",
  },
  {
    q: 'Comment se passe la facturation ?',
    a: "Facturation mensuelle ou annuelle par carte bancaire (SEPA disponible pour l'annuel). Les factures sont émises automatiquement au 1ᵉʳ de chaque mois et envoyées par email. L'annuel offre 15 % de remise sur l'année.",
  },
  {
    q: "Puis-je changer de palier en cours d'abonnement ?",
    a: "Oui, sans pénalité. Une montée de palier est immédiate avec un prorata calculé à la journée. Une descente de palier prend effet à la fin de la période en cours.",
  },
  {
    q: 'Existe-t-il des tarifs spécifiques associations / éducation / secteur public ?',
    a: "Oui. Tarifs réduits de 40 % pour les associations reconnues d'intérêt général, les laboratoires de recherche publique et les établissements d'enseignement supérieur. Contactez-nous avec un justificatif officiel.",
  },
  {
    q: 'Que se passe-t-il si je dépasse le quota de prompts LLM ?',
    a: 'Vous recevez une alerte à 80 % et 100 % du quota. Au-delà, deux options : passer au palier supérieur ou acheter un pack additionnel de 1 000 prompts à 80 € HT, valable 90 jours.',
  },
  {
    q: 'Acceptez-vous les bons de commande publics ?',
    a: "Oui sur les paliers Entreprise et Souverain. Notre direction financière émet des devis sur 30 ou 60 jours et accepte les bons de commande émis par les collectivités, hôpitaux et établissements publics.",
  },
];

/* ============================================================================
   Page
   ============================================================================ */

function MatrixCell({ value }: { value: string }) {
  if (value === '✓') {
    return <span className="font-mono text-accent">✓</span>;
  }
  if (value === '—') {
    return <span className="font-mono text-fg-muted">—</span>;
  }
  return <span className="text-sm">{value}</span>;
}

export default function TarifsPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Tarifs</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Une tarification claire, calée sur la maturité de votre PME.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Démarrez gratuitement, sans carte bancaire. Passez en payant le jour où vos audits
              deviennent récurrents. Pas d&apos;engagement caché, pas de pénalité de sortie. Tarifs
              HT, applicables aux organisations établies en Europe.
            </p>
            <BillingToggle />
          </Reveal>
        </Container>
      </header>

      {/* PRICING */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Reveal>
              <PriceCard
                name="Découverte"
                tagline="Un premier audit pour cadrer le besoin."
                price="0 €"
                period="/ pour toujours"
                bullets={[
                  '1 audit Module 1 / mois',
                  "Dataset jusqu'à 5 000 lignes",
                  'Rapport PDF basique',
                  '3 utilisateurs',
                  'Support communautaire',
                  'Conservation 3 mois',
                ]}
                cta="Créer un compte"
                ctaHref="/inscription"
              />
            </Reveal>
            <Reveal delay={0.05}>
              <PriceCard
                variant="featured"
                badge="Recommandé PME"
                name="PME"
                tagline="Pour une routine de conformité."
                price="490 €"
                period="/ mois"
                bullets={[
                  'Audits illimités · 3 modules',
                  "Dataset jusqu'à 1M lignes",
                  'Module LLM · 1000 prompts/mois',
                  'Rapports PDF & Excel structurés AI Act',
                  '15 utilisateurs · permissions par rôle',
                  "Historique 5 ans · comparaison d'audits",
                  'Support sous 24h ouvrées',
                  'Onboarding accompagné 4h',
                ]}
                cta="Demander une démo"
                ctaHref="/contact"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <PriceCard
                name="Entreprise"
                tagline="Multi-entité, sécurité renforcée."
                price="1 490 €"
                period="/ mois"
                bullets={[
                  'Tout PME +',
                  'Datasets illimités · LLM illimité',
                  'SSO SAML 2.0 · audit log avancé',
                  '50 utilisateurs · multi-entités',
                  'Recommandations expert AI Act 4h/mois',
                  'SLA 99,9 % · support sous 4h',
                  "API d'intégration GRC",
                ]}
                cta="Demander un devis"
                ctaHref="/contact"
              />
            </Reveal>
            <Reveal delay={0.15}>
              <PriceCard
                name="Souverain"
                tagline="Hébergement dédié, données isolées."
                price="Sur devis"
                bullets={[
                  'Tout Entreprise +',
                  'Hébergement souverain dédié (SecNumCloud)',
                  'Chiffrement clé client (BYOK)',
                  'Audit log inviolable horodaté',
                  'Consultants AI Act dédiés',
                  'Formation équipe 2 jours',
                  'Engagement & SLA personnalisés',
                ]}
                cta="Nous contacter"
                ctaHref="/contact"
              />
            </Reveal>
          </div>

          <p className="mt-6 text-center text-xs text-fg-muted">
            Tarifs HT. TVA 20 % applicable en France. Engagement mensuel sans durée minimale.
            Annulation effective au mois suivant.
          </p>
        </Container>
      </section>

      {/* MATRIX */}
      <section className="py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Comparaison détaillée</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Toutes les fonctionnalités, palier par palier.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Pour les décisions d&apos;achat — DPO, direction financière, RSSI.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="overflow-x-auto rounded-xl border border-border-default bg-surface">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="w-[40%] border-b border-t border-border-default bg-surface-2 px-4 py-3.5 text-left font-mono text-xs font-medium uppercase tracking-[0.12em] text-fg-muted"
                    >
                      Fonctionnalité
                    </th>
                    {['Découverte', 'PME', 'Entreprise', 'Souverain'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b border-t border-border-default bg-surface-2 px-4 py-3.5 text-center font-mono text-xs font-medium uppercase tracking-[0.12em] text-fg-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_GROUPS.map((g) => (
                    <React.Fragment key={g.group}>
                      <tr>
                        <td
                          colSpan={5}
                          className="border-b border-border-subtle bg-surface-2 px-4 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-accent"
                        >
                          {g.group}
                        </td>
                      </tr>
                      {g.rows.map((row) => (
                        <tr key={row.name}>
                          <td className="border-b border-border-subtle px-4 py-3.5 align-top">
                            <div className="text-sm">{row.name}</div>
                            {row.desc && (
                              <div className="mt-0.5 text-xs text-fg-muted">{row.desc}</div>
                            )}
                          </td>
                          {row.values.map((v, i) => (
                            <td
                              key={i}
                              className="border-b border-border-subtle px-4 py-3.5 text-center align-top"
                            >
                              <MatrixCell value={v} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Questions sur le pricing</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Avant de signer.
            </h2>
          </Reveal>
          <div className="flex max-w-[800px] flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-md border border-border-default bg-surface p-5 sm:p-6"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-h4 font-medium">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="font-mono text-2xl leading-none text-fg-muted transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow accent>Pas sûr du palier</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Discutons-en. 15 minutes, pas plus.
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  On vous aide à choisir le palier adapté à votre maturité de conformité et à votre
                  volume d&apos;audits prévisionnel.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Réserver un appel</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/comparatif">Comparer aux alternatives</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
