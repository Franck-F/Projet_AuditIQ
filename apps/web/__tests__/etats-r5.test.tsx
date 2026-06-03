import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import EtatsPage from '@/app/app/etats/page';

/* ─── Tests ──────────────────────────────────────────────────────────── */

describe('etats template gallery — R5', () => {

  it('renders the page heading', () => {
    render(<EtatsPage />);
    expect(screen.getByRole('heading', { name: /bibliothèque d.états ux/i })).toBeInTheDocument();
  });

  it('renders the dev-only badge', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/dev-only/i)).toBeInTheDocument();
  });

  it('renders first-use section (01)', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/first-use/i)).toBeInTheDocument();
    expect(screen.getByText(/lancez votre premier audit/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lancer mon premier audit/i })).toBeInTheDocument();
  });

  it('renders loading skeleton section (02)', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/loading · skeleton card/i)).toBeInTheDocument();
  });

  it('renders error / retry section (03)', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/error · erreur réseau/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });

  it('renders permission denied section (04)', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    expect(screen.getByText(/vous n.avez pas accès/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voir mon rôle/i })).toBeInTheDocument();
  });

  it('renders success section (05)', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/success · rapport généré/i)).toBeInTheDocument();
    expect(screen.getByText(/rapport généré et signé avec succès/i)).toBeInTheDocument();
  });

  it('renders toast cluster section (06)', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/toast cluster/i)).toBeInTheDocument();
    // success toast
    expect(screen.getByText(/audit aud-2026-014 terminé/i)).toBeInTheDocument();
    // warn toast
    expect(screen.getByText(/3 recommandations p1 ouvertes/i)).toBeInTheDocument();
    // info toast
    expect(screen.getByText(/art\. 10 ai act entre en vigueur/i)).toBeInTheDocument();
  });

  it('renders modal section (07) with trigger button', () => {
    render(<EtatsPage />);
    expect(screen.getByText(/modal · confirmation avec saisie/i)).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: /supprimer l.audit aud-2026-014/i });
    expect(trigger).toBeInTheDocument();
  });

  it('opens modal on trigger button click', async () => {
    const user = userEvent.setup();
    render(<EtatsPage />);
    const trigger = screen.getByRole('button', { name: /supprimer l.audit aud-2026-014/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // confirm typing input should be present
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText(/recrutement q2 2026/i)).toBeInTheDocument();
  });

  it('closes modal when Annuler is clicked', async () => {
    const user = userEvent.setup();
    render(<EtatsPage />);
    await user.click(screen.getByRole('button', { name: /supprimer l.audit aud-2026-014/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
