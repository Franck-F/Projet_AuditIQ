import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Recommendations } from '@/components/audits/Recommendations';
import type { RecommendationOut } from '@/lib/api/audits';

const items: RecommendationOut[] = [
  { title: 'Re-collecter données', detail: 'Détail haute prio.', priority: 'high' },
  { title: 'Auditer features', detail: 'Détail moyenne prio.', priority: 'medium' },
  { title: 'Maintenir veille', detail: 'Détail basse prio.', priority: 'low' },
];

describe('Recommendations', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<Recommendations items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all items with title + detail', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Re-collecter données')).toBeInTheDocument();
    expect(screen.getByText('Détail haute prio.')).toBeInTheDocument();
    expect(screen.getByText('Auditer features')).toBeInTheDocument();
    expect(screen.getByText('Maintenir veille')).toBeInTheDocument();
  });

  it('renders priority badge label for each priority level', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Priorité 1')).toBeInTheDocument();
    expect(screen.getByText('Priorité 2')).toBeInTheDocument();
    expect(screen.getByText('Priorité 3')).toBeInTheDocument();
  });

  it('applies different CSS classes per priority', () => {
    render(<Recommendations items={items} />);
    const high = screen.getByText('Priorité 1');
    const medium = screen.getByText('Priorité 2');
    const low = screen.getByText('Priorité 3');
    // each priority maps to a different class — the exact class names don't
    // matter here, just that they differ (priority is visually distinguished)
    expect(high.className).not.toBe(medium.className);
    expect(medium.className).not.toBe(low.className);
  });
});
