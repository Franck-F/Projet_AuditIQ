import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { FinalCta } from '@/components/marketing/FinalCta';

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "La mission, les principes et l'histoire d'AuditIQ. Plateforme française d'audit de fairness IA pour les PME, en construction et portée par Franck Fambou.",
};

const PRINCIPLES = [
  {
    n: '01',
    title: 'Souveraineté',
    body: "Hébergement en Union européenne (Francfort · Paris). Interprétation en langage clair via Gemini par défaut, avec une option souveraine Mistral.",
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
    body: 'Un palier gratuit permanent et des prix affichés publiquement. Transparence sur les limites de chaque palier.',
  },
  {
    n: '06',
    title: 'Stabilité des rapports',
    body: 'Aucune modification rétroactive de schéma de rapport : vos audits restent comparables dans le temps.',
  },
];

const TEAM = [
  {
    initials: 'FF',
    name: 'Franck Fambou',
    role: 'Fondateur',
    body: "Porte le projet AuditIQ de bout en bout : produit, moteur d'audit, méthodologie et contenu. Conçoit la plateforme pour des responsables conformité, RH et innovation non techniciens.",
  },
];

const HISTORY = [
  {
    date: 'ORIGINE',
    title: 'Un constat',
    body: "Aucun outil en français ne permettait à une PME d'auditer la fairness de son IA sans expertise statistique interne. L'AI Act rend pourtant cet exercice incontournable.",
  },
  {
    date: 'CONSTRUCTION',
    title: 'Le produit',
    body: 'Développement des trois modules : audit supervisé (Disparate Impact, parités, analyse intersectionnelle), détection non supervisée (k-means + test du χ²) et audit LLM (banque versionnée de paires de prompts FR/EN).',
  },
  {
    date: '2026',
    title: "Aujourd'hui",
    body: "Le produit est en construction active et s'ouvre à ses premiers utilisateurs. Démarche ISO 27001 engagée. Les fonctionnalités annoncées en feuille de route le sont explicitement.",
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
              AuditIQ est un projet français porté par Franck Fambou. Le produit est en
              construction : nous préférons vous dire exactement où il en est plutôt que de
              raconter une histoire enjolivée — c&apos;est la moindre des choses pour un outil de
              conformité.
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
                Rendre la fairness IA accessible aux PME européennes qui en ont besoin.
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
            <Eyebrow accent>Qui porte le projet</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Un projet porté par son fondateur, ouvert aux contributions.
            </h2>
            <p className="mt-4 text-h4 leading-relaxed text-fg-secondary">
              Pas d&apos;équipe inventée ni de logos d&apos;investisseurs : AuditIQ est aujourd&apos;hui
              un projet individuel, construit méthodiquement, qui documente ses méthodes et ses
              limites.
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
              <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-border-strong bg-surface-2 p-6">
                <h4 className="mb-1 text-[15px] font-medium text-fg">Envie de contribuer ?</h4>
                <div className="mb-3 text-xs text-fg-muted">Retours, pilotes, partenariats</div>
                <p className="text-xs leading-relaxed text-fg-secondary">
                  Vous êtes responsable conformité, DPO, DRH ou data et le sujet vous parle ? Nous
                  cherchons des retours d&apos;usage et des cas pilotes.
                </p>
                <Link
                  href="/contact"
                  className="mt-3 text-xs text-accent transition-colors hover:underline"
                >
                  Nous écrire →
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
                Le projet est né d&apos;un constat simple : aucun outil en français ne permettait
                à une PME d&apos;auditer la fairness de son IA sans expertise statistique. AuditIQ
                est aujourd&apos;hui en construction active — le moteur d&apos;audit, les rapports
                PDF et Excel et l&apos;interprétation en langage clair fonctionnent, et le reste
                est annoncé pour ce qu&apos;il est : une feuille de route.
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

      <FinalCta
        eyebrow="Travaillons ensemble"
        title="Utilisateur pilote, partenaire ou simple curieux ?"
        body="Le projet s'adresse aux PME, cabinets de conseil et intégrateurs. Échangeons sur votre cas d'usage."
        primary={{ label: 'Nous contacter', href: '/contact' }}
        secondary={{ label: 'Essayer gratuitement', href: '/inscription' }}
      />
    </>
  );
}
