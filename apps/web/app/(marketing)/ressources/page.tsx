import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { NewsletterForm } from '@/components/marketing/NewsletterForm';

export const metadata: Metadata = {
  title: 'Ressources & blog',
  description:
    'Articles, guides AI Act, livres blancs, études sectorielles sur la fairness IA et la conformité européenne.',
};

const CATEGORIES = [
  { label: 'Tous', count: 42, active: true },
  { label: 'AI Act', count: 14 },
  { label: 'Méthodologie', count: 11 },
  { label: 'Études sectorielles', count: 8 },
  { label: "Retours d'expérience", count: 6 },
  { label: 'Produit', count: 3 },
];

type ArtArt = {
  cat: string;
  meta: string;
  title: string;
  excerpt: string;
  mediaBg: string;
  mediaFg: string;
  mediaLabel: string;
  mediaSize?: string;
  mediaFont?: 'mono' | 'display';
  href: string;
};

const ARTICLES: ArtArt[] = [
  {
    cat: 'MÉTHODE',
    meta: '8 mai · 8 min',
    title: 'La règle des quatre cinquièmes, expliquée concrètement.',
    excerpt:
      'Origines (EEOC, US, 1978), application dans la jurisprudence européenne, limites méthodologiques, alternatives modernes. Une fiche de référence.',
    mediaBg: 'from-status-warn-bg to-surface-3',
    mediaFg: 'text-status-warn',
    mediaLabel: '4/5',
    mediaSize: 'text-2xl',
    mediaFont: 'mono',
    href: '/ressources/regle-quatre-cinquiemes',
  },
  {
    cat: 'SECTEUR',
    meta: '5 mai · 10 min',
    title: "Audit fairness des outils de tri de CV : comment s'y prendre concrètement.",
    excerpt:
      "Cinq étapes pour une DRH qui veut auditer son ATS sans équipe data. Avec les écueils typiques et un modèle de cahier des charges fournisseur.",
    mediaBg: 'from-accent-soft to-surface-3',
    mediaFg: 'text-accent',
    mediaLabel: 'RH',
    mediaSize: 'text-2xl',
    mediaFont: 'display',
    href: '/ressources/audit-cv',
  },
  {
    cat: 'SECTEUR',
    meta: '2 mai · 12 min',
    title: 'Scoring crédit et proxies géographiques : ce que dit la jurisprudence française.',
    excerpt:
      "Le code postal comme proxy d'origine présumée : analyse de trois décisions clés de la cour d'appel de Paris (2018, 2022, 2024) et leurs conséquences pratiques.",
    mediaBg: 'from-status-info-bg to-surface-3',
    mediaFg: 'text-status-info',
    mediaLabel: '€',
    mediaSize: 'text-2xl',
    mediaFont: 'display',
    href: '/ressources/scoring-credit',
  },
  {
    cat: 'MÉTHODE',
    meta: '28 avr · 6 min',
    title: 'Counterfactual prompt pairs : la méthode de référence pour auditer un LLM.',
    excerpt:
      "Pourquoi cette méthode, comment construire ses prompts pairs, quels biais elle met en évidence et lesquels elle ne voit pas. Pour les responsables produits IA.",
    mediaBg: 'from-surface-3 to-surface',
    mediaFg: 'text-fg-secondary',
    mediaLabel: 'LLM',
    mediaFont: 'mono',
    href: '/ressources/counterfactual',
  },
  {
    cat: 'AI ACT',
    meta: '24 avr · 9 min',
    title: "Article 10 de l'AI Act : ce que « gouvernance des données » signifie en pratique.",
    excerpt:
      'Lecture article par paragraphe avec analyse des notions clés : pertinence, représentativité, exactitude, exhaustivité, biais.',
    mediaBg: 'from-accent-soft to-surface-2',
    mediaFg: 'text-accent',
    mediaLabel: 'Art. 10',
    mediaFont: 'mono',
    href: '/ressources/article-10',
  },
  {
    cat: "RETOUR D'EXP",
    meta: '20 avr · 11 min',
    title: 'Comment Banque Loiret a corrigé un proxy géographique en 7 mois.',
    excerpt:
      "Récit détaillé d'une mise en conformité réelle. Calendrier précis, choix techniques, coûts cachés, et leçons retenues.",
    mediaBg: 'from-status-fail-bg to-surface-3',
    mediaFg: 'text-status-fail',
    mediaLabel: '!',
    mediaSize: 'text-[28px]',
    mediaFont: 'display',
    href: '/ressources/banque-loiret',
  },
  {
    cat: 'LIVRE BLANC',
    meta: '15 avr · 64 pages',
    title: 'Livre blanc : Préparer son audit AI Act en PME, en six mois.',
    excerpt:
      'Méthodologie complète, modèles de documents, check-lists, références jurisprudentielles. Téléchargement gratuit contre adresse email.',
    mediaBg: 'from-surface-2 to-surface-2',
    mediaFg: 'text-fg-muted',
    mediaLabel: 'PDF GUIDE',
    mediaFont: 'mono',
    href: '/ressources/livre-blanc',
  },
  {
    cat: 'MÉTHODE',
    meta: '10 avr · 7 min',
    title: 'Demographic Parity vs Equal Opportunity : laquelle choisir, et quand ?',
    excerpt:
      'Les deux métriques peuvent donner des conclusions opposées sur le même modèle. Comprendre leurs hypothèses, leur usage en jurisprudence et leur articulation pratique.',
    mediaBg: 'from-status-pass-bg to-surface-3',
    mediaFg: 'text-status-pass',
    mediaLabel: 'DP/EO',
    mediaFont: 'mono',
    href: '/ressources/dp-vs-eo',
  },
  {
    cat: 'PRODUIT',
    meta: '6 avr · 5 min',
    title: 'AuditIQ v2 : comparaison entre audits et alertes de dérive.',
    excerpt:
      'Nouveautés produit du printemps : vue de comparaison longitudinale, alertes de dérive automatiques, et amélioration des recommandations.',
    mediaBg: 'from-surface-2 to-surface-2',
    mediaFg: 'text-accent',
    mediaLabel: 'v2',
    mediaSize: 'text-[28px]',
    mediaFont: 'display',
    href: '/ressources/auditiq-v2',
  },
];

function ArticleMedia({
  bg,
  fg,
  label,
  size = 'text-xl',
  font = 'mono',
}: {
  bg: string;
  fg: string;
  label: string;
  size?: string;
  font?: 'mono' | 'display';
}) {
  return (
    <div
      className={`mb-3 flex aspect-[16/9] items-center justify-center rounded-md bg-gradient-to-br ${bg} ${fg} font-semibold ${size} ${font === 'mono' ? 'font-mono' : 'font-display'}`}
    >
      {label}
    </div>
  );
}

export default function RessourcesPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-12">
        <Container>
          <Reveal>
            <Eyebrow accent>Ressources &amp; blog</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Comprendre la fairness IA, sans détour.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Guides AI Act, études sectorielles, fiches méthodologiques, retours
              d&apos;expérience. Tout est rédigé en français, par notre équipe, avec mention
              explicite des sources et des limites.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span
                  key={c.label}
                  className={
                    c.active
                      ? 'inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-3 px-3.5 py-1.5 text-sm text-fg'
                      : 'inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-3.5 py-1.5 text-sm text-fg-secondary'
                  }
                >
                  {c.label}
                  <span className="font-mono text-[11px] text-fg-muted">{c.count}</span>
                </span>
              ))}
            </div>
          </Reveal>
        </Container>
      </header>

      {/* FEATURED */}
      <section className="py-16">
        <Container>
          <Reveal>
            <Link
              href="/ressources/ai-act-pme-2026"
              className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border-default bg-surface md:grid-cols-2"
            >
              <div className="flex min-h-[220px] items-center justify-center border-b border-border-default bg-gradient-to-br from-accent-soft to-surface-3 md:min-h-[320px] md:border-b-0 md:border-r">
                <div className="p-10 text-center font-mono text-[clamp(48px,6vw,80px)] font-semibold leading-none tracking-[-0.02em] text-accent">
                  AI
                  <br />
                  Act
                </div>
              </div>
              <div className="flex flex-col gap-4 p-10 md:p-12">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                    Guide · AI Act
                  </span>
                  <span className="text-xs text-fg-muted">12 mai 2026 · 14 min de lecture</span>
                </div>
                <h2 className="text-[clamp(24px,2.5vw,32px)] font-display font-medium leading-[1.2] tracking-[-0.015em]">
                  AI Act pour PME : ce qui change le 2 août 2026 (et comment s&apos;y préparer).
                </h2>
                <p className="text-base leading-relaxed text-fg-secondary">
                  Le guide le plus consulté de notre blog : 14 minutes pour comprendre exactement
                  quelles obligations s&apos;appliquent à votre PME, ce que vous devez documenter,
                  et comment cadrer votre plan de mise en conformité.
                </p>
                <div className="mt-auto flex items-center gap-3 border-t border-border-subtle pt-5">
                  <div className="flex size-8 items-center justify-center rounded-full border border-border-default bg-surface-3 text-xs text-fg-secondary">
                    ZK
                  </div>
                  <div>
                    <div className="text-sm font-medium">Zineb Khelifi</div>
                    <div className="text-xs text-fg-muted">Chief Legal Officer · AuditIQ</div>
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        </Container>
      </section>

      {/* GRID */}
      <section className="py-16">
        <Container>
          <Reveal className="mb-10">
            <Eyebrow accent>Articles récents</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">
              Lectures récentes.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((a, i) => (
              <Reveal key={a.title} delay={(i % 3) * 0.04}>
                <Link
                  href={a.href}
                  className="flex h-full flex-col gap-3 rounded-lg border border-border-default bg-surface p-6 transition-colors hover:border-border-strong"
                >
                  <ArticleMedia
                    bg={a.mediaBg}
                    fg={a.mediaFg}
                    label={a.mediaLabel}
                    size={a.mediaSize}
                    font={a.mediaFont}
                  />
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <span className="font-mono uppercase tracking-[0.08em] text-accent">
                      {a.cat}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{a.meta}</span>
                  </div>
                  <h3 className="text-h4 font-medium leading-[1.3] text-fg">{a.title}</h3>
                  <p className="text-sm leading-[1.55] text-fg-secondary">{a.excerpt}</p>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center" delay={0.1}>
            <Button variant="secondary" disabled>
              Voir tous les articles (42)
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* NEWSLETTER */}
      <section className="py-16">
        <Container>
          <Reveal>
            <div className="rounded-2xl border border-border-default bg-surface p-12 text-center">
              <Eyebrow accent>Newsletter</Eyebrow>
              <h2 className="mt-3 mb-3 text-h2 font-display font-medium tracking-[-0.015em] text-fg">
                Une lettre tous les quinze jours, sur la conformité IA en Europe.
              </h2>
              <p className="mx-auto mb-6 max-w-[50ch] text-base leading-relaxed text-fg-secondary">
                Pas de promo produit. Juste l&apos;actualité réglementaire, les décisions
                jurisprudentielles marquantes, et les méthodes que nous testons en interne.
              </p>
              <NewsletterForm />
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
