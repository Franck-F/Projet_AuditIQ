import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ressources — AuditIQ',
  description:
    'Articles, guides AI Act, livres blancs, études sectorielles sur la fairness IA et la conformité européenne. Rédigés en français par notre équipe.',
};

/* ============================================================================
   Ressources — R8a rewrite per maquette docs/design/auditiq-vitrine-v3/ressources.html
   Article slugs hardcoded to match R8b blog routes.
   Styles: ./vitrine.css (imported in layout.tsx)
   ============================================================================ */

const CATEGORIES = [
  { label: 'Tous', count: 42, active: true },
  { label: 'AI Act', count: 14 },
  { label: 'Méthodologie', count: 11 },
  { label: 'Études sectorielles', count: 8 },
  { label: "Retours d'expérience", count: 6 },
  { label: 'Produit', count: 3 },
];

type Article = {
  slug: string;
  cat: string;
  meta: string;
  title: string;
  excerpt: string;
  mediaBg: string;
  mediaFg: string;
  mediaLabel: string;
};

const ARTICLES: Article[] = [
  {
    slug: 'regle-4-5',
    cat: 'Méthode',
    meta: '8 mai · 8 min',
    title: 'La règle des quatre cinquièmes, expliquée concrètement.',
    excerpt: "Origines (EEOC, 1978), application dans la jurisprudence européenne, limites méthodologiques, alternatives modernes. Une fiche de référence.",
    mediaBg: 'linear-gradient(140deg,var(--warn-bg),var(--surface-3))',
    mediaFg: 'var(--warn)',
    mediaLabel: '4/5',
  },
  {
    slug: 'audit-tri-cv',
    cat: 'Secteur',
    meta: '5 mai · 10 min',
    title: "Auditer un outil de tri de CV, concrètement.",
    excerpt: "Cinq étapes pour une DRH qui veut auditer son ATS sans équipe data, avec les écueils typiques et un modèle de cahier des charges fournisseur.",
    mediaBg: 'linear-gradient(140deg,var(--accent-soft),var(--surface-3))',
    mediaFg: 'var(--accent)',
    mediaLabel: 'RH',
  },
  {
    slug: 'scoring-credit-proxies',
    cat: 'Secteur',
    meta: '2 mai · 12 min',
    title: "Scoring crédit et proxies géographiques : le risque du code postal.",
    excerpt: "Le code postal comme proxy d'origine présumée : comment une variable neutre crée une discrimination indirecte, ce que dit le cadre juridique, et comment la détecter.",
    mediaBg: 'linear-gradient(140deg,var(--info-bg),var(--surface-3))',
    mediaFg: 'var(--info)',
    mediaLabel: '€',
  },
  {
    slug: 'counterfactual-prompt-pairs',
    cat: 'Méthode',
    meta: '28 avr · 6 min',
    title: "Counterfactual prompt pairs : la méthode de référence pour auditer un LLM.",
    excerpt: "Pourquoi cette méthode, comment construire ses prompts pairs, quels biais elle révèle et lesquels elle ne voit pas.",
    mediaBg: 'linear-gradient(140deg,var(--surface-3),var(--surface))',
    mediaFg: 'var(--fg-secondary)',
    mediaLabel: 'LLM',
  },
  {
    slug: 'article-10-gouvernance-donnees',
    cat: 'AI Act',
    meta: '24 avr · 9 min',
    title: "Article 10 : ce que « gouvernance des données » signifie en pratique.",
    excerpt: "Lecture paragraphe par paragraphe : pertinence, représentativité, exactitude, exhaustivité, biais.",
    mediaBg: 'linear-gradient(140deg,var(--accent-soft),var(--surface-2))',
    mediaFg: 'var(--accent)',
    mediaLabel: 'Art.10',
  },
  {
    slug: 'corriger-proxy-geographique',
    cat: "Retour d'exp.",
    meta: '20 avr · 11 min',
    title: "Corriger un proxy géographique en sept mois : récit d'une mise en conformité.",
    excerpt: "Calendrier précis, choix techniques, coûts cachés et leçons retenues d'un cas réel en banque régionale.",
    mediaBg: 'linear-gradient(140deg,var(--fail-bg),var(--surface-3))',
    mediaFg: 'var(--fail)',
    mediaLabel: '!',
  },
  {
    slug: 'livre-blanc-audit-ai-act',
    cat: 'Livre blanc',
    meta: '15 avr · 64 pages',
    title: "Préparer son audit AI Act en PME, en six mois.",
    excerpt: "Méthodologie complète, modèles de documents, check-lists, références jurisprudentielles. Téléchargement gratuit.",
    mediaBg: 'var(--surface-2)',
    mediaFg: 'var(--fg-muted)',
    mediaLabel: 'PDF',
  },
  {
    slug: 'dp-vs-eo',
    cat: 'Méthode',
    meta: '10 avr · 7 min',
    title: "Demographic Parity vs Equal Opportunity : laquelle choisir, et quand ?",
    excerpt: "Deux métriques qui peuvent conclure l'inverse sur le même modèle. Comprendre leurs hypothèses et leur articulation pratique.",
    mediaBg: 'linear-gradient(140deg,var(--pass-bg),var(--surface-3))',
    mediaFg: 'var(--pass)',
    mediaLabel: 'DP/EO',
  },
  {
    slug: 'auditiq-v2',
    cat: 'Produit',
    meta: '6 avr · 5 min',
    title: "AuditIQ v2 : comparaison entre audits et alertes de dérive.",
    excerpt: "Vue de comparaison longitudinale, alertes de dérive automatiques, et amélioration des recommandations.",
    mediaBg: 'var(--surface-2)',
    mediaFg: 'var(--accent)',
    mediaLabel: 'v2',
  },
];

export default function RessourcesPage() {
  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <header className="page-head">
        <div className="wrap">
          <p className="kicker">Ressources</p>
          <h1>Comprendre la fairness IA, sans détour.</h1>
          <p className="lead">
            Guides AI Act, études sectorielles, fiches méthodologiques, retours d&apos;expérience.
            Rédigés en français par notre équipe, avec mention explicite des sources et des limites.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '24px' }}>
            {CATEGORIES.map((c) => (
              <span
                key={c.label}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '6px 13px', borderRadius: '99px', fontSize: '13.5px',
                  color: c.active ? 'var(--fg)' : 'var(--fg-secondary)',
                  background: c.active ? 'var(--surface-3)' : 'var(--surface-2)',
                  border: `1px solid ${c.active ? 'var(--border-strong)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {c.label}
                <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── FEATURED ─────────────────────────────────────────────────────── */}
      <section style={{ paddingBottom: 'clamp(28px,4vw,40px)' }}>
        <div className="wrap">
          <Link
            href="/blog/ai-act-pme"
            className="card"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', overflow: 'hidden', borderRadius: '18px' }}
          >
            <div style={{ minHeight: '260px', display: 'grid', placeItems: 'center', borderRight: '1px solid var(--border-subtle)', background: 'linear-gradient(140deg, var(--accent-soft), var(--surface-3))' }}>
              <span className="mono" style={{ fontSize: 'clamp(44px,5vw,72px)', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--accent)', lineHeight: 0.95, textAlign: 'center' }}>
                AI<br />Act
              </span>
            </div>
            <div style={{ padding: 'clamp(28px,3.5vw,44px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--fg-muted)' }}>
                <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)' }}>Guide · AI Act</span>
                <span aria-hidden>·</span>
                <span>12 mai 2026 · 14 min</span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px,2.4vw,30px)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                AI Act pour PME&nbsp;: ce qui change le 2 août 2026, et comment s&apos;y préparer.
              </h2>
              <p className="lede" style={{ fontSize: '15px' }}>
                Quatorze minutes pour comprendre exactement quelles obligations s&apos;appliquent à votre PME, ce que vous devez documenter, et comment cadrer votre plan de mise en conformité.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: 'auto', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 500, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>FF</div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 500 }}>Franck FAMBOU</div>
                  <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>CEO · AuditIQ</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── GRID ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 'clamp(28px,4vw,40px)' }}>
        <div className="wrap">
          <div style={{ marginBottom: '26px' }}>
            <p className="eyebrow acc">Articles récents</p>
            <h2 className="title" style={{ marginTop: '10px' }}>Lectures récentes.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px' }}>
            {ARTICLES.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', height: '100%' }}
              >
                <div style={{ aspectRatio: '16/9', borderRadius: '9px', display: 'grid', placeItems: 'center', background: a.mediaBg, color: a.mediaFg, fontWeight: 600, fontSize: '22px', fontFamily: 'var(--mono)' }}>
                  {a.mediaLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--fg-muted)' }}>
                  <span className="mono" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)' }}>{a.cat}</span>
                  <span aria-hidden>·</span>
                  <span>{a.meta}</span>
                </div>
                <h3 style={{ fontSize: '16px', lineHeight: 1.3, color: 'var(--fg)' }}>{a.title}</h3>
                <p className="lede" style={{ fontSize: '13.5px', lineHeight: 1.55 }}>{a.excerpt}</p>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button className="btn btn-outline" disabled>Voir tous les articles (42)</button>
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="wrap">
          <div className="card" style={{ padding: 'clamp(32px,5vw,52px)', textAlign: 'center' }}>
            <p className="eyebrow acc">Newsletter</p>
            <h2 className="title" style={{ marginTop: '12px', maxWidth: '24ch', marginInline: 'auto' }}>Une lettre tous les quinze jours sur la conformité IA en Europe.</h2>
            <p className="lede" style={{ margin: '14px auto 0', maxWidth: '50ch', fontSize: '15px' }}>
              Pas de promo produit. L&apos;actualité réglementaire, les décisions jurisprudentielles marquantes et les méthodes que nous testons en interne.
            </p>
            <form
              style={{ display: 'flex', gap: '10px', maxWidth: '440px', margin: '22px auto 0' }}
              onSubmit={(e) => e.preventDefault()}
            >
              <input className="input" type="email" placeholder="vous@entreprise.fr" style={{ flex: 1 }} />
              <button className="btn btn-primary" type="submit">S&apos;abonner</button>
            </form>
            <p className="lede" style={{ fontSize: '12px', marginTop: '12px' }}>Désinscription en un clic. Aucune donnée revendue.</p>
          </div>
        </div>
      </section>
    </>
  );
}
