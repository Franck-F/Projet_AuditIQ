import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "L'équipe, la mission, l'histoire d'AuditIQ. Plateforme française d'audit de fairness IA pour les PME.",
};

const PRINCIPLES = [
  {
    n: '01',
    title: 'Souveraineté',
    body: "Hébergement français. Données qui ne sortent pas d'Europe. Pas de dépendance à un cloud non européen, à aucune étape.",
  },
  {
    n: '02',
    title: 'Lisibilité',
    body: 'Chaque métrique technique est traduite en deux à trois phrases compréhensibles. Pas de jargon par défaut.',
  },
  {
    n: '03',
    title: 'Honnêteté méthodologique',
    body: 'Nous documentons nos méthodes, nos seuils par défaut et leurs limites. Pas de magie noire.',
  },
  {
    n: '04',
    title: 'Modération du périmètre',
    body: "Nous ne sommes pas un certificateur. Nous ne sommes pas un cabinet d'avocats. Nous outillons une chaîne, sans la confisquer.",
  },
  {
    n: '05',
    title: 'Accessibilité tarifaire',
    body: 'Un palier gratuit permanent. Pas de pricing « parlons-en » avant 1 000 €/mois. Transparence sur les coûts cachés.',
  },
  {
    n: '06',
    title: "Stabilité de l'API",
    body: 'Aucune modification rétroactive de schéma de rapport. Vos audits restent comparables sur 5 ans.',
  },
];

const TEAM = [
  {
    initials: 'CL',
    name: 'Camille Loiseau',
    role: 'Cofondatrice · CEO',
    body: "Docteure en statistique inférentielle (ENS-Cachan). Ex-Data Lead à la CNAM. Membre du groupe d'experts français sur l'IA équitable.",
  },
  {
    initials: 'YB',
    name: 'Yann Bertin',
    role: 'Cofondateur · CPO',
    body: 'Ex-Lead Product Designer à Doctolib. 12 ans en SaaS B2B. Design des outils de conformité aux normes.',
  },
  {
    initials: 'ZK',
    name: 'Zineb Khelifi',
    role: 'Cofondatrice · Chief Legal Officer',
    body: "Avocate au Barreau de Paris, spécialiste droit numérique. Ex-conseillère de la Présidente du CSA. Co-rédactrice d'une note Ministère.",
  },
  {
    initials: 'MR',
    name: 'Marc Renaud',
    role: 'Head of Engineering',
    body: 'Ex-Staff Engineer à Datadog Paris. 15 ans en architecture distribuée. Responsable de la plateforme.',
  },
  {
    initials: 'FA',
    name: 'Fatou Amadou',
    role: 'Head of ML',
    body: 'Docteure en apprentissage profond (Inria). Ex-Mistral AI. Responsable du Module 3 et de la banque de prompts.',
  },
  {
    initials: 'PG',
    name: 'Pauline Galland',
    role: 'Head of Compliance Research',
    body: "Docteure en droit international (Sciences Po). Ex-rapporteure au Conseil d'État. Suivi des évolutions AI Act.",
  },
];

const HISTORY = [
  {
    date: 'MARS 2024',
    title: 'Fondation',
    body: 'Immatriculation de la SAS. Premiers financements famille et amis (180 k€).',
  },
  {
    date: 'SEPT 2024',
    title: 'v1 Beta',
    body: 'Première version produit, Module 1 uniquement. 12 PME pilotes.',
  },
  {
    date: 'NOV 2024',
    title: 'Premier client payant',
    body: 'Banque Loiret signe le palier PME annuel.',
  },
  {
    date: 'FEV 2025',
    title: 'Levée Pre-seed',
    body: '1,8 M€ avec Elaia Partners et Iris Capital comme lead. Cofondateurs majoritaires.',
  },
  {
    date: 'JUIN 2025',
    title: 'Module 2 + Module 3',
    body: 'Lancement des modules non supervisé et LLM. 32 clients payants.',
  },
  {
    date: 'NOV 2025',
    title: 'Référencement Bpifrance',
    body: 'AuditIQ intégré au catalogue French Tech « IA & conformité ».',
  },
  {
    date: '2026',
    title: "Aujourd'hui",
    body: "47 clients payants. Préparation de l'expansion DACH et Benelux. Certification ISO 27001 en cours.",
  },
];

export default function AProposPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>À propos</Eyebrow>
            <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Nous outillons la conformité IA des PME. Sans jargon, sans promesse.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(20px,1.5vw,24px)] leading-[1.5] text-fg-secondary">
              AuditIQ est une SAS française fondée à Paris en 2024 par trois cofondateurs venus de
              la statistique, du droit numérique et du design produit. Notre équipe compte 14
              personnes au moment où nous écrivons ces lignes. Notre client le plus petit a 32
              collaborateurs, le plus grand en a 1 200.
            </p>
          </Reveal>
        </Container>
      </header>

      {/* MISSION */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow accent>Notre mission</Eyebrow>
              <h2 className="mt-3 mb-6 text-[clamp(28px,3vw,36px)] font-display font-medium tracking-[-0.02em] text-fg">
                Rendre la fairness IA accessible aux 320 000 PME européennes qui en ont besoin.
              </h2>
              <p className="mb-4 text-base leading-relaxed text-fg-secondary">
                Les outils existants ont été conçus pour les grandes équipes data des géants tech
                américains. Les PME européennes, qui représentent 99 % des entreprises et 60 % de
                l&apos;emploi, n&apos;avaient rien à leur portée. Pourtant, ce sont elles que
                l&apos;AI Act va le plus vite obliger à se mettre en règle.
              </p>
              <p className="text-base leading-relaxed text-fg-secondary">
                Notre conviction : la conformité ne doit ni coûter 50 k€ par audit, ni nécessiter
                un doctorat en statistique. Elle doit être routinière, abordable, traçable et
                compréhensible par les personnes qui en portent la responsabilité.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <Eyebrow accent>Nos engagements</Eyebrow>
              <h3 className="mt-3 mb-6 text-h3 font-display font-medium tracking-[-0.015em] text-fg">
                Six principes que nous tenons.
              </h3>
              <div className="flex flex-col gap-6">
                {PRINCIPLES.map((p) => (
                  <div key={p.n} className="grid grid-cols-[40px_1fr] gap-4">
                    <span className="pt-1.5 font-mono text-xs tracking-[0.12em] text-accent">
                      {p.n}
                    </span>
                    <div>
                      <h4 className="mb-2 text-h4 font-medium text-fg">{p.title}</h4>
                      <p className="text-sm leading-relaxed text-fg-secondary">{p.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* TEAM */}
      <section className="bg-surface py-24">
        <Container>
          <Reveal className="mb-12 max-w-[720px]">
            <Eyebrow accent>Équipe</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              14 personnes, 3 cofondateurs, 1 mission.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Statistique, droit numérique, design produit, ingénierie cloud. Notre équipe combine
              des profils rares en France et en Europe.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={(i % 4) * 0.04}>
                <div className="rounded-xl border border-border-default bg-surface p-6">
                  <div
                    aria-hidden
                    className="mb-3.5 flex size-14 items-center justify-center rounded-full border border-border-default bg-surface-2 font-display text-lg font-semibold text-fg-secondary"
                  >
                    {m.initials}
                  </div>
                  <h4 className="mb-1 text-[15px] font-medium text-fg">{m.name}</h4>
                  <div className="mb-2.5 text-xs text-fg-muted">{m.role}</div>
                  <p className="text-xs leading-relaxed text-fg-secondary">{m.body}</p>
                </div>
              </Reveal>
            ))}

            <Reveal delay={0.16}>
              <div className="rounded-xl border border-border-default bg-surface p-6">
                <div
                  aria-hidden
                  className="mb-3.5 flex size-14 items-center justify-center rounded-full border border-border-default bg-surface-2 font-display text-lg font-semibold text-fg-secondary"
                >
                  +8
                </div>
                <h4 className="mb-1 text-[15px] font-medium text-fg">L&apos;équipe étendue</h4>
                <div className="mb-2.5 text-xs text-fg-muted">
                  Engineering · Customer · Sales
                </div>
                <p className="text-xs leading-relaxed text-fg-secondary">
                  Huit autres personnes basées à Paris, Lyon et Nantes. Linguistes, ingénieurs
                  full-stack, customer success, account executives.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-border-strong bg-surface-2 p-6">
                <h4 className="mb-1 text-[15px] font-medium text-fg">Nous recrutons</h4>
                <div className="mb-3 text-xs text-fg-muted">3 postes ouverts</div>
                <p className="text-xs leading-relaxed text-fg-secondary">
                  Senior ML Engineer (Module 2), Account Executive secteur banque, Compliance
                  Researcher.
                </p>
                <Link
                  href="/contact"
                  className="mt-3 text-xs text-accent transition-colors hover:underline"
                >
                  Voir les offres →
                </Link>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* HISTORY */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow accent>Histoire</Eyebrow>
              <h2 className="mt-3 mb-6 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                L&apos;histoire courte.
              </h2>
              <p className="text-base leading-relaxed text-fg-secondary">
                Le projet a commencé fin 2023, autour d&apos;un constat partagé : aucun outil
                français ne permettait à une PME d&apos;auditer la fairness de son IA sans
                expertise statistique. La société a été immatriculée en mars 2024. Première
                version produit en septembre 2024, premier client payant en novembre 2024.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <div>
                {HISTORY.map((h, i) => (
                  <div
                    key={h.date}
                    className={`grid grid-cols-1 gap-1 py-5 sm:grid-cols-[120px_1fr] sm:gap-6 ${i < HISTORY.length - 1 ? 'border-b border-border-subtle' : ''}`}
                  >
                    <span className="font-mono text-sm uppercase tracking-[0.04em] text-accent">
                      {h.date}
                    </span>
                    <div>
                      <h4 className="mb-1 text-[15px] font-medium text-fg">{h.title}</h4>
                      <p className="text-sm leading-relaxed text-fg-secondary">{h.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* INVESTORS */}
      <section className="bg-surface py-16">
        <Container>
          <Reveal className="text-center">
            <Eyebrow accent>Soutenus par</Eyebrow>
          </Reveal>
          <Reveal className="mt-6">
            <div className="grid grid-cols-2 items-center gap-8 py-8 opacity-75 md:grid-cols-3 lg:grid-cols-6">
              {[
                'Elaia Partners',
                'Iris Capital',
                'Bpifrance',
                'French Tech',
                'Région IDF',
                'European AI Office',
              ].map((label) => (
                <span
                  key={label}
                  className="text-center font-display text-sm font-medium tracking-tight text-fg-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow accent>Travaillons ensemble</Eyebrow>
                <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
                  Client, partenaire ou candidat ?
                </h2>
                <p className="mt-3 max-w-[56ch] text-fg-secondary">
                  Nous accompagnons des PME, des cabinets de conseil, des intégrateurs. Et nous
                  recrutons.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/contact">Nous contacter</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/contact">Voir les offres d&apos;emploi</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
