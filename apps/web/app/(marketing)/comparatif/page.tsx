import * as React from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FinalCta } from '@/components/marketing/FinalCta';

export const metadata: Metadata = {
  title: 'Comparatif',
  description:
    'AuditIQ comparé aux alternatives : bibliothèques open source, plateformes anglo-saxonnes, audit Excel maison, cabinets de conseil.',
};

/* ============================================================================
   Page-local components
   ============================================================================ */

function PosCard({
  type,
  title,
  body,
  price,
  chip,
  featured,
}: {
  type: string;
  title: string;
  body: string;
  price?: string;
  chip: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? 'flex h-full flex-col gap-4 rounded-xl border border-accent-border bg-surface bg-gradient-to-b from-accent-soft to-transparent to-50% p-7'
          : 'flex h-full flex-col gap-4 rounded-xl border border-border-default bg-surface p-7'
      }
    >
      <span
        className={`font-mono text-xs uppercase tracking-[0.12em] ${featured ? 'text-accent' : 'text-fg-muted'}`}
      >
        {type}
      </span>
      <h4 className="text-h4 font-medium text-fg">{title}</h4>
      <p className="text-sm leading-relaxed text-fg-secondary">{body}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        {price && <span className="font-mono text-[13px] text-fg">{price}</span>}
        {featured ? (
          <Badge variant="accent">{chip}</Badge>
        ) : (
          <Badge>{chip}</Badge>
        )}
      </div>
    </div>
  );
}

type Cell = '✓' | '~' | '—' | string;

function MatrixCell({ value, accent = false }: { value: Cell; accent?: boolean }) {
  if (value === '✓') {
    return (
      <span
        className={`font-mono ${accent ? 'font-medium text-accent' : 'text-accent'}`}
      >
        ✓
      </span>
    );
  }
  if (value === '~') {
    return <span className="font-mono text-fg-muted">~</span>;
  }
  if (value === '—') {
    return <span className="font-mono text-fg-muted">—</span>;
  }
  return <span className="text-sm">{value}</span>;
}

const MATRIX_GROUPS: {
  group: string;
  rows: { name: string; values: [Cell, Cell, Cell, Cell, Cell] }[];
}[] = [
  {
    group: 'Accessibilité',
    rows: [
      { name: 'Sans code requis', values: ['✓', '—', '~', '—', '✓'] },
      { name: 'Interface en français', values: ['✓', '—', '—', '—', '✓'] },
      { name: 'Onboarding pour non-techniques', values: ['✓', '—', '~', '—', '✓'] },
    ],
  },
  {
    group: 'Ancrage réglementaire',
    rows: [
      { name: 'Rattachement AI Act', values: ['✓', '—', '~', '—', '✓'] },
      { name: 'Rapport structuré Annexe IV', values: ['✓', '—', '—', '—', '✓'] },
      { name: 'Droit français référencé', values: ['✓', '—', '—', '—', '✓'] },
    ],
  },
  {
    group: 'Couverture technique',
    rows: [
      { name: 'Module 1 · Caractéristique connue', values: ['✓', '✓', '✓', '~', '✓'] },
      { name: 'Module 2 · Biais cachés', values: ['✓', '~', '~', '—', '~'] },
      { name: 'Module 3 · Assistant conversationnel', values: ['✓', '—', '✓', '—', '—'] },
      { name: 'Détection de proxies', values: ['✓', '~', '✓', '—', '~'] },
    ],
  },
  {
    group: 'Souveraineté',
    rows: [
      { name: 'Hébergement EU / FR', values: ['✓', 'N/A', '—', 'Interne', 'Interne'] },
      { name: 'Données qui restent en Europe', values: ['✓', 'N/A', '—', '✓', '✓'] },
    ],
  },
  {
    group: 'Reproductibilité',
    rows: [
      { name: 'Audits récurrents', values: ['✓', '✓', '✓', '~', '—'] },
      { name: 'Conservation 5 ans', values: ['✓', '—', '✓', '~', '~'] },
      { name: 'Comparaison entre audits', values: ['✓', '—', '✓', '—', '—'] },
    ],
  },
];

const COSTS: [string, string, string, string, string] = [
  '~5 880 €',
  '~25 k€\n(temps interne)',
  '~36 k€',
  '~45 k€\n(temps interne)',
  '~60 k€\n(par audit)',
];

const HEADERS = [
  'AuditIQ',
  'Fairlearn / AIF360',
  'Fiddler / Holistic AI',
  'Audit Excel interne',
  'Cabinet conseil',
];

/* ============================================================================
   Page
   ============================================================================ */

export default function ComparatifPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Comparatif</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Quelle solution choisir pour auditer la fairness de votre IA ?
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Quatre catégories d&apos;alternatives existent. Aucune n&apos;est mauvaise — elles
              répondent à des besoins différents. Voici quand chacune est pertinente, et où
              AuditIQ se positionne. Notre objectif : vous aider à faire le bon choix, pas à nous
              vendre par défaut.
            </p>
          </Reveal>
        </Container>
      </header>

      {/* POSITIONING CARDS */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Reveal>
              <PosCard
                type="Bibliothèques open source"
                title="Fairlearn, AIF360, Aequitas"
                body="Bibliothèques Python développées par Microsoft, IBM et l'Université de Chicago. Excellentes pour des data scientists. Requièrent du code, des notebooks, une expertise statistique."
                price="Gratuit"
                chip="Pour data teams"
              />
            </Reveal>
            <Reveal delay={0.04}>
              <PosCard
                type="Plateformes anglo-saxonnes"
                title="Fiddler AI, Holistic AI"
                body="Plateformes SaaS US/UK. Surface produit moderne, fonctionnalités riches. Pensées pour de grandes équipes ML/MLOps. Interface anglaise, ancrage régulatoire US/UK."
                price="$2k+ / mois"
                chip="Pour grandes équipes"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <PosCard
                type="Cabinets de conseil"
                title="Audit ponctuel"
                body="Cabinets d'avocats, cabinets data ou compliance. Approche projet, livrable PDF. Pas d'outillage récurrent. Coût élevé, calendrier long, difficile à reproduire."
                price="15–60 k€ / audit"
                chip="Ponctuel"
              />
            </Reveal>
            <Reveal delay={0.12}>
              <PosCard
                featured
                type="AuditIQ"
                title="SaaS spécialisé PME EU"
                body="Plateforme française, sans code, alignée AI Act, conçue pour des PME sans data team dédiée. Interface en français, hébergement français, rapports opposables, conservation 5 ans."
                price="À partir de 0 €"
                chip="Pour PME conformité"
              />
            </Reveal>
            <Reveal delay={0.16}>
              <PosCard
                type="Audit Excel maison"
                title="Tableurs internes"
                body="Approche bricolée par les équipes data internes — extraction manuelle, calculs Excel, restitution PowerPoint. Coût caché élevé, traçabilité faible, non reproductible."
                price="5–15 j-h / audit"
                chip="Non viable AI Act"
              />
            </Reveal>
            <Reveal delay={0.2}>
              <PosCard
                type="Plateformes généralistes"
                title="MLflow, Vertex, SageMaker"
                body="Plateformes ML qui incluent des modules de fairness en accessoire. Utiles pour les équipes déjà sur ces stacks. Pas pensées pour la conformité réglementaire EU spécifique."
                price="Inclus dans le stack"
                chip="Accessoire"
              />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* DETAILED MATRIX */}
      <section className="py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Comparaison détaillée</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Critère par critère.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Sept critères qui comptent pour une PME française en 2026.
            </p>
          </Reveal>

          <Reveal>
            <div className="overflow-x-auto rounded-xl border border-border-default bg-surface">
              <table className="w-full min-w-[880px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="w-[28%] border-b border-t border-border-default bg-surface-2 px-4 py-3.5 text-left font-mono text-xs font-medium uppercase tracking-[0.12em] text-fg-muted"
                    >
                      Critère
                    </th>
                    {HEADERS.map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`border-b border-t bg-surface-2 px-4 py-3.5 text-center font-mono text-xs font-medium uppercase tracking-[0.12em] ${i === 0 ? 'border-accent-border bg-accent-soft text-accent' : 'border-border-default text-fg-muted'}`}
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
                          colSpan={6}
                          className="border-b border-border-subtle bg-surface-2 px-4 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-accent"
                        >
                          {g.group}
                        </td>
                      </tr>
                      {g.rows.map((row) => (
                        <tr key={row.name}>
                          <td className="border-b border-border-subtle px-4 py-3.5">
                            {row.name}
                          </td>
                          {row.values.map((v, i) => (
                            <td
                              key={i}
                              className="border-b border-border-subtle px-4 py-3.5 text-center"
                            >
                              <MatrixCell value={v} accent={i === 0} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}

                  <tr>
                    <td
                      colSpan={6}
                      className="border-b border-border-subtle bg-surface-2 px-4 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-accent"
                    >
                      Coût total / an (PME 250 collaborateurs)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3.5">Coût annuel estimé</td>
                    {COSTS.map((c, i) => (
                      <td key={i} className="px-4 py-3.5 text-center">
                        {c.split('\n').map((line, j) => (
                          <React.Fragment key={j}>
                            <strong
                              className={`font-mono ${j === 0 ? (i === 0 ? 'text-accent' : '') : 'block text-[11px] font-normal text-fg-muted'}`}
                            >
                              {line}
                            </strong>
                          </React.Fragment>
                        ))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>

          <p className="mt-3 text-xs text-fg-muted">
            Légende : <strong className="text-accent">✓</strong> couvert ·{' '}
            <span className="text-fg-muted">~</span> partiel ·{' '}
            <span className="text-fg-muted">—</span> non couvert. Coûts estimés sur 4 audits/an,
            équipe de 5 personnes consultant la plateforme.
          </p>
        </Container>
      </section>

      {/* WHEN NOT US */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <Eyebrow accent>Quand ne pas choisir AuditIQ</Eyebrow>
              <h2 className="mt-3 mb-4 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                Notre franchise sur les cas où nous ne sommes pas le bon choix.
              </h2>
              <p className="text-base leading-relaxed text-fg-secondary">
                AuditIQ est pensé pour des PME et ETI françaises et européennes confrontées à
                l&apos;AI Act. Certains contextes méritent un autre outil — voire un cabinet.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-border-default bg-surface-2 p-5">
                  <h4 className="mb-2 text-[15px] font-medium text-fg">
                    Vous êtes une grande équipe ML/MLOps américaine
                  </h4>
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    Fiddler ou Holistic AI seront mieux intégrés à votre stack ML, à votre langue
                    de travail et à votre cadre régulatoire (NIST, EEOC).
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-2 p-5">
                  <h4 className="mb-2 text-[15px] font-medium text-fg">
                    Vous avez une équipe data dédiée et un cas très spécifique
                  </h4>
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    Fairlearn ou AIF360 vous donneront plus de contrôle pour des audits sur mesure
                    ou de la recherche méthodologique.
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-2 p-5">
                  <h4 className="mb-2 text-[15px] font-medium text-fg">
                    Vous avez besoin d&apos;un avis juridique opposable devant une autorité
                  </h4>
                  <p className="text-sm leading-relaxed text-fg-secondary">
                    Un cabinet d&apos;avocats spécialisé en droit numérique reste indispensable.
                    AuditIQ outille la mesure technique ; il ne remplace pas l&apos;expertise
                    juridique.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <FinalCta
        eyebrow="Pas convaincu"
        title="Faisons l'exercice ensemble."
        body="30 minutes : on regarde votre cas, on cite des alternatives honnêtes, on dit où AuditIQ s'inscrit."
        primary={{ label: 'Réserver un échange', href: '/contact' }}
        secondary={{ label: 'Voir les tarifs', href: '/tarifs' }}
      />
    </>
  );
}
