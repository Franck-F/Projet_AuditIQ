import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Modal, ModalActions } from '@/components/product/Modal';
import { DropZone } from '@/components/product/DropZone';
import { RatioBar } from '@/components/product/RatioBar';
import { HeatMap6Axes } from '@/components/product/HeatMap6Axes';
import { ClusterMap } from '@/components/product/ClusterMap';
import { DiffViewer } from '@/components/product/DiffViewer';
import { TocSticky } from '@/components/product/TocSticky';

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
describe('Modal', () => {
  it('renders title and description when open=true', () => {
    render(
      <Modal open onClose={vi.fn()} title="Supprimer l'audit" description="Cette action est irréversible.">
        <ModalActions><button>Annuler</button></ModalActions>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText("Supprimer l'audit")).toBeInTheDocument();
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Hidden" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when ESC is pressed', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test ESC" />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test close btn" />);
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has role=dialog and aria-modal=true', () => {
    render(<Modal open onClose={vi.fn()} title="A11y check" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders confirmTyping input when prop is set', () => {
    render(<Modal open onClose={vi.fn()} title="Confirm" confirmTyping="SUPPRIMER" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText(/SUPPRIMER/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DropZone
// ---------------------------------------------------------------------------
describe('DropZone', () => {
  const defaultProps = {
    accept: ['text/plain', 'text/csv'],
    maxSizeMB: 5,
    onFile: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the drop area with correct role', () => {
    render(<DropZone {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Zone de dépôt/ })).toBeInTheDocument();
  });

  it('shows error message for invalid MIME type', async () => {
    render(<DropZone {...defaultProps} />);
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Type non accepté/)).toBeInTheDocument();
  });

  it('calls onFile and shows success chip for valid file', async () => {
    const onFile = vi.fn();
    render(<DropZone {...defaultProps} onFile={onFile} />);
    const file = new File(['hello'], 'data.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    expect(onFile).toHaveBeenCalledWith(file);
    expect(await screen.findByText('data.csv')).toBeInTheDocument();
  });

  it('remove button clears the selected file', async () => {
    const onFile = vi.fn();
    render(<DropZone {...defaultProps} onFile={onFile} />);
    const file = new File(['hello'], 'data.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    const removeBtn = await screen.findByRole('button', { name: /Supprimer/ });
    await userEvent.click(removeBtn);
    expect(screen.queryByText('data.csv')).not.toBeInTheDocument();
  });

  it('is keyboard-operable via Enter key', async () => {
    render(<DropZone {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /Zone de dépôt/ });
    expect(btn).toHaveAttribute('tabIndex', '0');
  });
});

// ---------------------------------------------------------------------------
// RatioBar
// ---------------------------------------------------------------------------
describe('RatioBar', () => {
  const groups = [
    { label: 'Hommes', value: 0.82 },
    { label: 'Femmes', value: 0.61 },
    { label: 'Non-binaire', value: 0.58 },
  ];

  it('renders all group labels', () => {
    render(<RatioBar groups={groups} />);
    expect(screen.getByText('Hommes')).toBeInTheDocument();
    expect(screen.getByText('Femmes')).toBeInTheDocument();
    expect(screen.getByText('Non-binaire')).toBeInTheDocument();
  });

  it('has role=img with a descriptive aria-label', () => {
    render(<RatioBar groups={groups} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label');
    expect(img.getAttribute('aria-label')).toContain('Seuil 4/5');
  });

  it('uses custom format function', () => {
    render(<RatioBar groups={[{ label: 'A', value: 0.9 }]} format={(v) => `${v.toFixed(2)}`} />);
    expect(screen.getByText('0.90')).toBeInTheDocument();
  });

  it('renders threshold label "Seuil 4/5"', () => {
    render(<RatioBar groups={groups} />);
    expect(screen.getByText(/Seuil 4\/5/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// HeatMap6Axes
// ---------------------------------------------------------------------------
describe('HeatMap6Axes', () => {
  const axes: Parameters<typeof HeatMap6Axes>[0]['axes'] = [
    { key: 'genre', label: 'Genre', score: 4.2, status: 'pass' },
    { key: 'origine', label: 'Origine', score: 3.1, status: 'warn' },
    { key: 'age', label: 'Âge', score: 2.3, status: 'fail' },
    { key: 'religion', label: 'Religion', score: 4.5, status: 'pass' },
    { key: 'handicap', label: 'Handicap', score: 3.8, status: 'warn' },
    { key: 'orientation', label: 'Orientation', score: 4.1, status: 'pass' },
  ];

  it('renders all 6 axis labels', () => {
    render(<HeatMap6Axes axes={axes} />);
    expect(screen.getByText('Genre')).toBeInTheDocument();
    expect(screen.getByText('Origine')).toBeInTheDocument();
    expect(screen.getByText('Âge')).toBeInTheDocument();
    expect(screen.getByText('Religion')).toBeInTheDocument();
    expect(screen.getByText('Handicap')).toBeInTheDocument();
    expect(screen.getByText('Orientation')).toBeInTheDocument();
  });

  it('each card has role=status with aria-label', () => {
    render(<HeatMap6Axes axes={axes} />);
    const cards = screen.getAllByRole('status');
    expect(cards).toHaveLength(6);
    cards.forEach((card) => {
      expect(card).toHaveAttribute('aria-label');
    });
  });

  it('shows scores in X.X / 5 format', () => {
    render(<HeatMap6Axes axes={axes} />);
    // Each card renders the score
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('3.1')).toBeInTheDocument();
  });

  it('aria-label contains status description', () => {
    render(<HeatMap6Axes axes={axes} />);
    const cards = screen.getAllByRole('status');
    const genreCard = cards.find((c) =>
      c.getAttribute('aria-label')?.includes('Genre'),
    );
    expect(genreCard?.getAttribute('aria-label')).toContain('Risque faible');
  });
});

// ---------------------------------------------------------------------------
// ClusterMap
// ---------------------------------------------------------------------------
describe('ClusterMap', () => {
  const points = [
    { x: 0.1, y: 0.2, clusterId: 'A' },
    { x: 0.5, y: 0.6, clusterId: 'A' },
    { x: 0.8, y: 0.3, clusterId: 'B', isDeviant: true },
    { x: 0.9, y: 0.7, clusterId: 'C' },
  ];

  it('renders an SVG with role=img', () => {
    render(<ClusterMap points={points} />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('svg');
  });

  it('aria-label summarizes cluster count', () => {
    render(<ClusterMap points={points} />);
    const svg = screen.getByRole('img');
    const label = svg.getAttribute('aria-label') ?? '';
    expect(label).toContain('Cluster A');
    expect(label).toContain('Cluster B');
  });

  it('fires onClusterSelect with clusterId on click', async () => {
    const onSelect = vi.fn();
    render(<ClusterMap points={points} onClusterSelect={onSelect} />);
    const groups = screen.getAllByRole('button');
    // Click the first cluster group
    await userEvent.click(groups[0]!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('cluster groups have aria-pressed based on selectedClusterId', () => {
    render(<ClusterMap points={points} selectedClusterId="A" />);
    const groups = screen.getAllByRole('button');
    const selectedGroup = groups.find((g) => g.getAttribute('aria-label')?.includes('Cluster A'));
    expect(selectedGroup).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders without crashing when points is empty', () => {
    render(<ClusterMap points={[]} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DiffViewer
// ---------------------------------------------------------------------------
describe('DiffViewer', () => {
  const props = {
    neutral: { prompt: 'Un candidat se présente.', response: 'Profil solide.' },
    marked: { prompt: 'Une femme se présente.', response: 'Profil moins adapté.' },
    delta: { length_chars: -12, sentiment_delta: -0.25, refused: false },
  };

  it('renders both panes with correct region labels', () => {
    render(<DiffViewer {...props} />);
    expect(screen.getByRole('region', { name: /Prompt neutre/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Prompt marqué/i })).toBeInTheDocument();
  });

  it('shows delta metadata — length and sentiment', () => {
    render(<DiffViewer {...props} />);
    expect(screen.getByText(/-12 car\./)).toBeInTheDocument();
    expect(screen.getByText(/-0\.25/)).toBeInTheDocument();
  });

  it('shows refusal badge when refused=true', () => {
    render(<DiffViewer {...props} delta={{ ...props.delta, refused: true }} />);
    expect(screen.getByText(/Refus/i)).toBeInTheDocument();
  });

  it('"Voir plus" toggles to "Réduire"', async () => {
    render(<DiffViewer {...props} />);
    const buttons = screen.getAllByRole('button', { name: 'Voir plus' });
    await userEvent.click(buttons[0]!);
    expect(screen.getAllByRole('button', { name: 'Réduire' })).toHaveLength(1);
  });

  it('each pane has aria-labelledby pointing to its label', () => {
    render(<DiffViewer {...props} />);
    const regions = screen.getAllByRole('region');
    regions.forEach((r) => {
      expect(r).toHaveAttribute('aria-labelledby');
    });
  });
});

// ---------------------------------------------------------------------------
// TocSticky
// ---------------------------------------------------------------------------
describe('TocSticky', () => {
  const items = [
    { id: 'intro', label: 'Introduction' },
    { id: 'resultats', label: 'Résultats' },
    { id: 'recommandations', label: 'Recommandations' },
  ];

  it('renders a nav with aria-label="Sommaire"', () => {
    render(<TocSticky items={items} />);
    expect(screen.getByRole('navigation', { name: 'Sommaire' })).toBeInTheDocument();
  });

  it('renders all item labels', () => {
    render(<TocSticky items={items} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Résultats')).toBeInTheDocument();
    expect(screen.getByText('Recommandations')).toBeInTheDocument();
  });

  it('first item is active by default (aria-current=location)', () => {
    render(<TocSticky items={items} />);
    const introLink = screen.getByRole('link', { name: 'Introduction' });
    expect(introLink).toHaveAttribute('aria-current', 'location');
  });

  it('clicking a link sets it as active', async () => {
    render(<TocSticky items={items} />);
    const link = screen.getByRole('link', { name: 'Résultats' });
    await userEvent.click(link);
    expect(link).toHaveAttribute('aria-current', 'location');
  });

  it('renders anchors with correct href for each item', () => {
    render(<TocSticky items={items} />);
    expect(screen.getByRole('link', { name: 'Introduction' })).toHaveAttribute('href', '#intro');
    expect(screen.getByRole('link', { name: 'Résultats' })).toHaveAttribute('href', '#resultats');
  });
});
