import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Recommendations } from '@/components/audits/Recommendations';
import type { RecommendationOut } from '@/lib/api/audits';

const items: RecommendationOut[] = [
  {
    title: 'Documenter la supervision humaine',
    detail: 'Détail legacy haute prio.',
    rationale: 'Tracer qui contrôle les décisions et avec quels critères.',
    priority: 'high',
    priority_level: 1,
    category: 'documentation',
    owner: 'DPO',
    horizon: 'immediat',
    legal_ref: 'AI Act art. 14',
    steps: ['Nommer un référent', 'Consigner les contrôles'],
  },
  {
    title: 'Auditer le fournisseur',
    detail: 'Détail moyenne prio.',
    priority: 'medium',
    priority_level: 2,
    category: 'relation_fournisseur',
    owner: 'Achats',
    horizon: 'court_terme',
    legal_ref: null,
    steps: [],
  },
  {
    title: 'Maintenir une veille',
    detail: 'Détail basse prio.',
    priority: 'low',
    priority_level: 3,
    category: 'surveillance',
    owner: 'Direction',
    horizon: 'continu',
    legal_ref: null,
    steps: [],
  },
];

describe('Recommendations', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<Recommendations items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all items with title + rationale', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Documenter la supervision humaine')).toBeInTheDocument();
    expect(
      screen.getByText('Tracer qui contrôle les décisions et avec quels critères.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Auditer le fournisseur')).toBeInTheDocument();
    expect(screen.getByText('Maintenir une veille')).toBeInTheDocument();
  });

  it('falls back to detail when rationale is absent', () => {
    render(<Recommendations items={items} />);
    // The medium reco has no rationale → detail is used
    expect(screen.getByText('Détail moyenne prio.')).toBeInTheDocument();
  });

  it('groups by priority with one heading per used level', () => {
    render(<Recommendations items={items} />);
    // Group headings + per-card badges both carry the label → at least 2 each
    expect(screen.getAllByText('Priorité 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Priorité 2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Priorité 3').length).toBeGreaterThanOrEqual(2);
  });

  it('renders translated category labels', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Documenter & tracer')).toBeInTheDocument();
    expect(screen.getByText('Relation fournisseur')).toBeInTheDocument();
    expect(screen.getByText('Surveillance & re-test')).toBeInTheDocument();
  });

  it('renders owner (responsable) for each reco', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText(/Responsable\s*:\s*DPO/)).toBeInTheDocument();
    expect(screen.getByText(/Responsable\s*:\s*Achats/)).toBeInTheDocument();
    expect(screen.getByText(/Responsable\s*:\s*Direction/)).toBeInTheDocument();
  });

  it('translates horizon codes', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Immédiat')).toBeInTheDocument();
    expect(screen.getByText('Court terme')).toBeInTheDocument();
    expect(screen.getByText('En continu')).toBeInTheDocument();
  });

  it('shows legal reference only when present', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText(/AI Act art\. 14/)).toBeInTheDocument();
  });

  it('renders steps as an ordered list when non-empty', () => {
    render(<Recommendations items={items} />);
    expect(screen.getByText('Nommer un référent')).toBeInTheDocument();
    expect(screen.getByText('Consigner les contrôles')).toBeInTheDocument();
  });

  it('derives priority from legacy field when priority_level is absent', () => {
    const legacy: RecommendationOut[] = [
      { title: 'Legacy haute', detail: 'd1', priority: 'high' },
      { title: 'Legacy basse', detail: 'd2', priority: 'low' },
    ];
    render(<Recommendations items={legacy} />);
    expect(screen.getByText('Legacy haute')).toBeInTheDocument();
    expect(screen.getByText('Legacy basse')).toBeInTheDocument();
    expect(screen.getAllByText('Priorité 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Priorité 3').length).toBeGreaterThanOrEqual(1);
  });
});
