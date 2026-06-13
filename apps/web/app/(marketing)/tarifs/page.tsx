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
    'Tarification AuditIQ adaptée à la maturité de votre PME. Quatre paliers, du gratuit au sur-mesure. Sans engagement de durée.',
};

/* ============================================================================
   Page-local components
   ============================================================================ */

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
        desc: 'Disparate Impact, parités, analyse intersectionnelle',
        values: ['1 / mois', 'Illimité', 'Illimité', 'Illimité'],
      },
      {
        name: 'Audit Module 2 (non supervisé)',
        desc: 'Clustering k-means + test du χ²',
        values: ['—', '✓', '✓', '✓'],
      },
      {
        name: 'Audit Module 3 (LLM)',
        desc: 'Banque versionnée de paires de prompts FR/EN',
        values: ['—', '✓', '✓', '✓'],
      },
      { name: 'Taille de dataset max', desc: 'Fichier CSV', values: ['5 000 lignes', '1M lignes', 'Illimité', 'Illimité'] },
    ],
  },
  {
    group: 'Rapports & documentation',
    rows: [
      { name: 'Rapport PDF (synthèse dirigeants)', values: ['✓', '✓', '✓', '✓'] },
      { name: 'Rapport Excel structuré Annexe IV', values: ['—', '✓', '✓', '✓'] },
      { name: 'Explication en langage clair (LLM)', desc: 'Gemini par défaut · option Mistral', values: ['✓', '✓', '✓', '✓'] },
      { name: 'Historique des audits dans votre espace', values: ['✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'Données & sécurité',
    rows: [
      { name: 'Hébergement', values: ['UE', 'UE', 'UE', 'UE (option dédiée à l’étude)'] },
      { name: 'Suppression automatique des datasets', values: ['30 jours', '30 jours', '30 jours', '30 jours'] },
      { name: 'Chiffrement en transit et au repos', values: ['✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'Support & accompagnement',
    rows: [
      { name: 'Support', values: ['E-mail', '24h ouvrées', 'Prioritaire', 'Personnalisé'] },
      { name: 'Onboarding accompagné', values: ['—', '✓', '✓', '✓ + formation'] },
      { name: 'Accompagnement expert AI Act', values: ['—', '—', '✓', '✓'] },
    ],
  },
];

// Fonctionnalités annoncées mais pas encore livrées — affichées honnêtement.
const ROADMAP_ITEMS = [
  'Connecteurs de données (au-delà du CSV : XLSX, entrepôts de données)',
  'Rôles et permissions multiples (administrateur, auditeur, lecteur)',
  'SSO (SAML / OIDC) et authentification multifacteur (MFA)',
  'API publique REST',
  'Banque de prompts personnalisable',
  'Comparaison entre audits et alertes de dérive',
  'Personnalisation des rapports (logo, charte)',
];

const FAQ_ITEMS = [
  {
    q: 'Le palier Découverte est-il vraiment gratuit, sans limite de temps ?',
    a: "Oui. Le palier Découverte n'a aucune date d'expiration. Vous y restez tant que vos besoins se limitent à un audit Module 1 par mois sur des datasets ≤ 5 000 lignes. Aucune carte bancaire requise à l'inscription.",
  },
  {
    q: "Y a-t-il une période d'essai sur les paliers payants ?",
    a: "Le palier Découverte, gratuit et permanent, sert d'essai : vous testez le produit sur vos propres données, sans carte bancaire. Pour évaluer les modules 2 et 3 avant de vous engager, contactez-nous pour une démonstration.",
  },
  {
    q: 'Comment se passe la facturation ?',
    a: "Les paliers payants sont mis en place avec vous, sur devis et facture — il n'y a pas encore de paiement en ligne automatisé. Facturation mensuelle, sans durée minimale d'engagement.",
  },
  {
    q: "Puis-je changer de palier en cours d'abonnement ?",
    a: "Oui, sans pénalité. Une montée de palier est immédiate. Une descente de palier prend effet à la fin de la période en cours.",
  },
  {
    q: 'Existe-t-il des tarifs spécifiques associations / éducation / secteur public ?',
    a: "Oui, des conditions adaptées sont possibles pour les associations reconnues d'intérêt général, les laboratoires de recherche publique et les établissements d'enseignement. Contactez-nous avec un justificatif officiel.",
  },
  {
    q: 'Acceptez-vous les bons de commande publics ?',
    a: 'Oui, sur devis, pour les paliers Entreprise et Souverain. Contactez-nous pour les modalités.',
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
              HT mensuels, applicables aux organisations établies en Europe.
            </p>
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
                  'Rapport PDF',
                  '1 compte propriétaire',
                  'Support par e-mail',
                  'Datasets supprimés après 30 jours',
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
                  'Module LLM (banque de prompts FR/EN)',
                  'Rapports PDF & Excel structurés AI Act',
                  'Historique des audits dans votre espace',
                  'Support sous 24h ouvrées',
                  'Onboarding accompagné',
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
                  'Accompagnement expert AI Act',
                  'Support prioritaire',
                  'Accès anticipé à la feuille de route (SSO, rôles multiples)',
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
                  'Interprétation LLM souveraine (Mistral)',
                  'Étude d’un hébergement dédié',
                  'Formation de vos équipes',
                  'Engagement & conditions personnalisés',
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

          <Reveal delay={0.08}>
            <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface-2 p-6">
              <Eyebrow accent>Feuille de route — pas encore disponible</Eyebrow>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                Les fonctionnalités suivantes sont en cours de développement. Elles ne sont{' '}
                <strong className="font-medium text-fg">pas incluses aujourd&apos;hui</strong>, quel
                que soit le palier, et seront annoncées à leur disponibilité :
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-fg-secondary md:grid-cols-2">
                {ROADMAP_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden className="mt-[7px] inline-block size-1 rounded-full bg-fg-muted" />
                    {item}
                  </li>
                ))}
              </ul>
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
