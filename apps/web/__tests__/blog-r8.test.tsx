import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ARTICLES, getArticleBySlug } from '@/lib/articles/data';

describe('R8 article data', () => {
  it('exposes exactly 10 articles', () => {
    expect(ARTICLES).toHaveLength(10);
  });

  it('every article has slug, title, lede, category, body', () => {
    for (const a of ARTICLES) {
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.lede.length).toBeGreaterThan(0);
      expect(a.category.length).toBeGreaterThan(0);
      expect(a.body.length).toBeGreaterThan(0);
    }
  });

  it('getArticleBySlug returns the matching article', () => {
    const a = getArticleBySlug('regle-4-5');
    expect(a).toBeDefined();
    expect(a?.title).toMatch(/quatre cinquièmes/i);
  });

  it('getArticleBySlug returns undefined for unknown slug', () => {
    expect(getArticleBySlug('unknown-slug-xyz')).toBeUndefined();
  });
});

describe('R8 article page', () => {
  it('renders the article title for a valid slug', async () => {
    const Page = (await import('@/app/(marketing)/blog/[slug]/page')).default;
    const ui = await Page({ params: Promise.resolve({ slug: 'regle-4-5' }) });
    render(ui as React.ReactElement);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/quatre cinquièmes/i);
  });
});
