import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import '../../article.css';
import { ARTICLES, getArticleBySlug } from '@/lib/articles/data';
import type { Article, ArticleBlock } from '@/lib/articles/data';
import { Container } from '@/components/layout/Container';

/* ============================================================================
   Static params — one per article
   ============================================================================ */

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: 'Article introuvable · AuditIQ' };
  return {
    title: `${article.title} — AuditIQ`,
    description: article.lede,
  };
}

/* ============================================================================
   Block renderer
   ============================================================================ */

function renderInline(text: string): string {
  // Simple inline markdown: **bold**, *italic*, `code`
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case 'p':
      return (
        <p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />
      );

    case 'h2':
      return <h2 dangerouslySetInnerHTML={{ __html: block.text }} />;

    case 'h3':
      return <h3 dangerouslySetInnerHTML={{ __html: block.text }} />;

    case 'ul':
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol>
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ol>
      );

    case 'callout':
      return (
        <div className="callout">
          <p dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />
        </div>
      );

    case 'note-info':
      return (
        <div
          className="note-info"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );

    case 'note-warn':
      return (
        <div
          className="note-warn"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );

    case 'kpi':
      return (
        <div className="kpi">
          {block.values.map((kv, i) => (
            <div key={i} className="k">
              <div className="v">{kv.value}</div>
              <div className="l">{kv.label}</div>
            </div>
          ))}
        </div>
      );

    case 'sources':
      return (
        <div className="sources">
          {block.items.map((src, i) => (
            <a
              key={i}
              className="source"
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="ic">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 3v5h5" />
                  <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z" />
                </svg>
              </span>
              <div>
                <div className="t">{src.title}</div>
                <div className="u">{new URL(src.url).hostname}</div>
              </div>
            </a>
          ))}
        </div>
      );

    case 'disclaimer':
      return (
        <div
          className="disclaimer"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );

    case 'compare':
      return (
        <div className="compare">
          <div className="col">
            <h4>{block.left.title}</h4>
            {block.left.items.map((item, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            ))}
          </div>
          <div className="col">
            <h4>{block.right.title}</h4>
            {block.right.items.map((item, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            ))}
          </div>
        </div>
      );

    case 'timeline':
      return (
        <div className="timeline">
          {block.items.map((item, i) => (
            <div key={i} className={`tl${item.current ? ' on' : ''}`}>
              <div className="d">{item.date}</div>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/* ============================================================================
   Related articles (3 cards, same-category or any if < 3 available)
   ============================================================================ */

function RelatedArticles({ current }: { current: Article }) {
  const sameCat = ARTICLES.filter(
    (a) => a.slug !== current.slug && a.category === current.category,
  );
  const others = ARTICLES.filter(
    (a) => a.slug !== current.slug && a.category !== current.category,
  );
  const related = [...sameCat, ...others].slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 'clamp(40px,6vw,72px)', padding: 'clamp(32px,4vw,56px) 0' }}>
      <Container>
        <h2 style={{ fontSize: 'clamp(20px,2.2vw,26px)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>
          À lire aussi
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
          {related.map((art) => (
            <Link
              key={art.slug}
              href={`/blog/${art.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '18px 20px',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface)',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                {art.category}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.45,
                  color: 'var(--fg)',
                }}
              >
                {art.title}
              </span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  color: 'var(--fg-muted)',
                }}
              >
                {art.readMinutes} min
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ============================================================================
   Page
   ============================================================================ */

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const toc = article.body
    .filter((b): b is { kind: 'h2'; text: string } => b.kind === 'h2')
    .map((b) => ({
      label: b.text.replace(/<[^>]+>/g, ''),
      id: b.text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/^0\d\s*—\s*/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }));

  const authorInitials = article.author
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const dateFormatted = new Date(article.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      {/* PAGE HEAD */}
      <header className="page-head">
        <div className="wrap">
          {/* Back + category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <Link
              href="/ressources"
              className="mono"
              style={{ fontSize: 12.5, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
              Ressources
            </Link>
            <span style={{ color: 'var(--fg-disabled)' }}>·</span>
            <span className="mono" style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              {article.category}
            </span>
          </div>

          <h1 style={{ maxWidth: '22ch' }}>{article.title}</h1>
          <p className="lead" style={{ maxWidth: '62ch' }}>{article.lede}</p>

          {/* Author chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 24 }}>
            <span style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>
              {authorInitials}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{article.author}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                {article.role} — {dateFormatted} · {article.readMinutes} min
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ARTICLE BODY */}
      <section style={{ paddingTop: 'clamp(36px,5vw,52px)' }}>
        <div className="wrap">
          <div className="article">
            {/* TOC */}
            {toc.length > 0 && (
              <nav className="toc">
                <span className="toc-h">Sommaire</span>
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`}>
                    {item.label}
                  </a>
                ))}
              </nav>
            )}

            {/* Prose */}
            <article className="prose">
              {article.body.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </article>
          </div>
        </div>
      </section>

      {/* RELATED */}
      <RelatedArticles current={article} />

      {/* CTA */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 'clamp(40px,6vw,72px)' }}>
        <div className="wrap">
          <div
            className="card"
            style={{ padding: 'clamp(32px,5vw,52px)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center', background: 'linear-gradient(110deg, var(--accent-softer), transparent 58%)' }}
          >
            <div>
              <p className="eyebrow acc">Passez à la pratique</p>
              <h2 className="title" style={{ marginTop: 12 }}>Auditez la fairness de votre IA dès maintenant.</h2>
              <p className="lede" style={{ marginTop: 12, maxWidth: '52ch' }}>Lancez un premier audit gratuit et obtenez un rapport opposable en moins d&apos;une heure.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link className="btn btn-primary lg" href="/blog">Voir tous les articles</Link>
              <Link className="btn btn-outline lg" href="/contact">Nous contacter</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="wrap" style={{ padding: 'clamp(24px,4vw,40px) var(--wrap-px)' }}>
        <Link
          href="/ressources"
          className="mono"
          style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Retour aux ressources
        </Link>
      </div>
    </>
  );
}
