import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/layout/Reveal';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { NewsletterForm } from '@/components/marketing/NewsletterForm';

export const metadata: Metadata = {
  title: 'Blog & ressources',
  description:
    "Articles, guides AI Act, livres blancs, études sectorielles sur la fairness IA et la conformité européenne.",
};

/* ============================================================================
   Sample data — hardcoded until CMS integration
   ============================================================================ */

const FEATURED = {
  slug: 'ai-act-pme-2026',
  category: 'Guide · AI Act',
  date: '12 mai 2026',
  readTime: '14 min de lecture',
  title: "AI Act pour PME : ce qui change le 2 août 2026 (et comment s'y préparer).",
  excerpt:
    "Le guide le plus consulté de notre blog : 14 minutes pour comprendre exactement quelles obligations s'appliquent à votre PME, ce que vous devez documenter, et comment cadrer votre plan de mise en conformité.",
  authorInitials: 'ZK',
  authorName: 'Zineb Khelifi',
  authorRole: 'Chief Legal Officer · AuditIQ',
  art: {
    label: 'AI\nAct',
    bg: 'from-accent-soft to-surface-3',
    color: 'text-accent',
  },
};

const ARTICLES = [
  {
    slug: 'regle-quatre-cinquiemes',
    category: 'MÉTHODE',
    date: '8 mai',
    readTime: '8 min',
    title: 'La règle des quatre cinquièmes, expliquée concrètement.',
    excerpt:
      'Origines (EEOC, US, 1978), application dans la jurisprudence européenne, limites méthodologiques, alternatives modernes. Une fiche de référence.',
    art: { label: '4/5', bg: 'from-status-warn-bg to-surface-3', color: 'text-status-warn' },
  },
  {
    slug: 'audit-fairness-outils-cv',
    category: 'SECTEUR',
    date: '5 mai',
    readTime: '10 min',
    title: "Audit fairness des outils de tri de CV : comment s'y prendre concrètement.",
    excerpt:
      "Cinq étapes pour une DRH qui veut auditer son ATS sans équipe data. Avec les écueils typiques et un modèle de cahier des charges fournisseur.",
    art: { label: 'RH', bg: 'from-accent-soft to-surface-3', color: 'text-accent' },
  },
  {
    slug: 'scoring-credit-proxies-geographiques',
    category: 'SECTEUR',
    date: '2 mai',
    readTime: '12 min',
    title: "Scoring crédit et proxies géographiques : ce que dit la jurisprudence française.",
    excerpt:
      "Le code postal comme proxy d'origine présumée : analyse de trois décisions clés de la cour d'appel de Paris (2018, 2022, 2024) et leurs conséquences pratiques.",
    art: { label: '€', bg: 'from-status-info-bg to-surface-3', color: 'text-status-info' },
  },
  {
    slug: 'counterfactual-prompt-pairs-llm',
    category: 'MÉTHODE',
    date: '28 avr',
    readTime: '6 min',
    title: 'Counterfactual prompt pairs : la méthode de référence pour auditer un LLM.',
    excerpt:
      'Pourquoi cette méthode, comment construire ses prompts pairs, quels biais elle met en évidence et lesquels elle ne voit pas. Pour les responsables produits IA.',
    art: { label: 'LLM', bg: 'from-surface-3 to-surface', color: 'text-fg-secondary' },
  },
  {
    slug: 'article-10-ai-act-gouvernance-donnees',
    category: 'AI ACT',
    date: '24 avr',
    readTime: '9 min',
    title: "Article 10 de l'AI Act : ce que « gouvernance des données » signifie en pratique.",
    excerpt:
      "Lecture article par paragraphe avec analyse des notions clés : pertinence, représentativité, exactitude, exhaustivité, biais.",
    art: { label: 'Art. 10', bg: 'from-accent-soft to-surface-2', color: 'text-accent' },
  },
  {
    slug: 'banque-loiret-proxy-geographique',
    category: "RETOUR D'EXP",
    date: '20 avr',
    readTime: '11 min',
    title: 'Comment Banque Loiret a corrigé un proxy géographique en 7 mois.',
    excerpt:
      "Récit détaillé d'une mise en conformité réelle. Calendrier précis, choix techniques, coûts cachés, et leçons retenues.",
    art: { label: '!', bg: 'from-status-fail-bg to-surface-3', color: 'text-status-fail' },
  },
  {
    slug: 'livre-blanc-audit-ai-act-pme',
    category: 'LIVRE BLANC',
    date: '15 avr',
    readTime: '64 pages',
    title: 'Livre blanc : Préparer son audit AI Act en PME, en six mois.',
    excerpt:
      'Méthodologie complète, modèles de documents, check-lists, références jurisprudentielles. Téléchargement gratuit contre adresse email.',
    art: { label: 'PDF\nGUIDE', bg: 'bg-surface-2', color: 'text-fg-muted' },
  },
  {
    slug: 'demographic-parity-vs-equal-opportunity',
    category: 'MÉTHODE',
    date: '10 avr',
    readTime: '7 min',
    title: 'Demographic Parity vs Equal Opportunity : laquelle choisir, et quand ?',
    excerpt:
      "Les deux métriques peuvent donner des conclusions opposées sur le même modèle. Comprendre leurs hypothèses, leur usage en jurisprudence et leur articulation pratique.",
    art: { label: 'DP/EO', bg: 'from-status-pass-bg to-surface-3', color: 'text-status-pass' },
  },
  {
    slug: 'auditiq-v2-comparaison-audits',
    category: 'PRODUIT',
    date: '6 avr',
    readTime: '5 min',
    title: 'AuditIQ v2 : comparaison entre audits et alertes de dérive.',
    excerpt:
      'Nouveautés produit du printemps : vue de comparaison longitudinale, alertes de dérive automatiques, et amélioration des recommandations.',
    art: { label: 'v2', bg: 'bg-surface-2', color: 'text-accent' },
  },
];

const CATEGORIES = [
  { label: 'Tous', count: 42, active: true },
  { label: 'AI Act', count: 14 },
  { label: 'Méthodologie', count: 11 },
  { label: 'Études sectorielles', count: 8 },
  { label: "Retours d'expérience", count: 6 },
  { label: 'Produit', count: 3 },
];

/* ============================================================================
   Page-local components
   ============================================================================ */

function ArticleArt({ art }: { art: { label: string; bg: string; color: string } }) {
  return (
    <div
      className={`flex aspect-video items-center justify-center rounded-md bg-gradient-to-br ${art.bg} mb-3 font-mono text-2xl font-semibold`}
    >
      <span className={`${art.color} whitespace-pre-line text-center`}>
        {art.label}
      </span>
    </div>
  );
}

function ArticleCard({
  article,
}: {
  article: (typeof ARTICLES)[number];
}) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col rounded-xl border border-border-default bg-surface p-5 transition-colors hover:border-border-strong"
    >
      <ArticleArt art={article.art} />
      <div className="mb-2 flex items-center gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
          {article.category}
        </span>
        <span className="text-fg-muted">&middot;</span>
        <span className="text-xs text-fg-muted">
          {article.date} &middot; {article.readTime}
        </span>
      </div>
      <h3 className="mb-2 text-[15px] font-medium leading-snug text-fg transition-colors group-hover:text-accent">
        {article.title}
      </h3>
      <p className="text-sm leading-relaxed text-fg-secondary">{article.excerpt}</p>
    </Link>
  );
}

/* ============================================================================
   Page
   ============================================================================ */

export default function BlogPage() {
  return (
    <>
      <header className="border-b border-border-subtle pt-[clamp(64px,8vw,96px)] pb-10">
        <Container>
          <Reveal>
            <Eyebrow accent>Ressources &amp; blog</Eyebrow>
            <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Comprendre la fairness IA, sans d&eacute;tour.
            </h1>
            <p className="mt-5 max-w-[60ch] text-[clamp(18px,1.3vw,20px)] leading-relaxed text-fg-secondary">
              Guides AI Act, &eacute;tudes sectorielles, fiches m&eacute;thodologiques, retours
              d&apos;exp&eacute;rience. Tout est r&eacute;dig&eacute; en fran&ccedil;ais, par notre
              &eacute;quipe, avec mention explicite des sources et des limites.
            </p>
            {/* Category pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    cat.active
                      ? 'border-border-strong bg-surface-3 text-fg'
                      : 'border-border-default bg-surface-2 text-fg-secondary hover:border-border-strong hover:text-fg'
                  }`}
                >
                  {cat.label}
                  <span className="ml-1.5 font-mono text-[11px] text-fg-muted">{cat.count}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </Container>
      </header>

      {/* FEATURED ARTICLE */}
      <section className="py-12">
        <Container>
          <Reveal>
            <Link
              href={`/blog/${FEATURED.slug}`}
              className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border-default bg-surface no-underline transition-colors hover:border-border-strong md:grid-cols-2 [color:inherit]"
            >
              {/* Media */}
              <div
                className={`flex min-h-[280px] items-center justify-center border-b border-border-default bg-gradient-to-br ${FEATURED.art.bg} md:border-b-0 md:border-r`}
              >
                <div className="text-center">
                  <div
                    className={`whitespace-pre-line font-mono text-[clamp(48px,6vw,80px)] font-semibold leading-none tracking-[-0.02em] ${FEATURED.art.color}`}
                  >
                    {FEATURED.art.label}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-4 p-8 sm:p-12">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-accent">
                    {FEATURED.category}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {FEATURED.date} &middot; {FEATURED.readTime}
                  </span>
                </div>
                <h2 className="text-[clamp(24px,2.5vw,32px)] font-display font-medium leading-[1.2] tracking-[-0.015em] text-fg">
                  {FEATURED.title}
                </h2>
                <p className="leading-relaxed text-fg-secondary">{FEATURED.excerpt}</p>
                <div className="mt-auto flex items-center gap-3 border-t border-border-subtle pt-5">
                  <div
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-full border border-border-default bg-surface-3 text-xs text-fg-secondary"
                  >
                    {FEATURED.authorInitials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-fg">{FEATURED.authorName}</div>
                    <div className="text-xs text-fg-muted">{FEATURED.authorRole}</div>
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        </Container>
      </section>

      {/* ARTICLES GRID */}
      <section className="pb-24">
        <Container>
          <Reveal className="mb-8">
            <Eyebrow accent>Articles r&eacute;cents</Eyebrow>
            <h2 className="mt-2 text-h2 font-display font-medium tracking-tight text-fg">
              Lectures r&eacute;centes.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((article, i) => (
              <Reveal key={article.slug} delay={i * 0.04}>
                <ArticleCard article={article} />
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center" delay={0.1}>
            <Button asChild variant="secondary">
              <Link href="#">Voir tous les articles (42)</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* NEWSLETTER */}
      <section className="border-t border-border-subtle py-16">
        <Container>
          <Reveal className="text-center">
            <Eyebrow accent>Newsletter</Eyebrow>
            <h2 className="mx-auto mt-3 max-w-[28ch] text-h2 font-display font-medium tracking-[-0.015em] text-fg">
              Une lettre tous les quinze jours, sur la conformit&eacute; IA en Europe.
            </h2>
            <p className="mx-auto mt-3 mb-6 max-w-[50ch] leading-relaxed text-fg-secondary">
              Pas de promo produit. Juste l&apos;actualit&eacute; r&eacute;glementaire, les
              d&eacute;cisions jurisprudentielles marquantes, et les m&eacute;thodes que nous
              testons en interne.
            </p>
            <NewsletterForm />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
