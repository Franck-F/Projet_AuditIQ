import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import EquipePage from '@/app/app/equipe/page';
import SupportPage from '@/app/app/support/page';

describe('EquipePage - R4 Refonte', () => {
  it('renders Topbar with correct breadcrumbs', () => {
    render(<EquipePage />);
    expect(screen.getByText('AuditIQ')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Équipe')).toBeInTheDocument();
  });

  it('renders "Inviter un membre" button in Topbar actions', () => {
    render(<EquipePage />);
    expect(screen.getByRole('button', { name: /Inviter un membre/ })).toBeInTheDocument();
  });

  it('renders 3 MetricCards with correct labels', () => {
    render(<EquipePage />);
    expect(screen.getByText('Membres actifs')).toBeInTheDocument();
    expect(screen.getByText('Administrateurs')).toBeInTheDocument();
    expect(screen.getByText('Accès externes')).toBeInTheDocument();
  });

  it('renders MetricCard values', () => {
    render(<EquipePage />);
    // Find the values in the metric cards
    const values = screen.getAllByText('1');
    const fours = screen.getAllByText('4');
    expect(fours.length).toBeGreaterThan(0); // At least one "4" for "Membres actifs"
    expect(values.length).toBeGreaterThan(0); // At least one "1" for other cards
  });

  it('renders SectionHead with correct title and eyebrow', () => {
    render(<EquipePage />);
    expect(screen.getByText('Membres')).toBeInTheDocument();
    expect(screen.getByText('Qui a accès à l\'espace')).toBeInTheDocument();
  });

  it('renders team member table with 4 rows', () => {
    render(<EquipePage />);
    expect(screen.getByText('Léa Moreau')).toBeInTheDocument();
    expect(screen.getByText('Karim Belaïd')).toBeInTheDocument();
    expect(screen.getByText('Sofia Renard')).toBeInTheDocument();
    expect(screen.getByText('Tom Vasseur')).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    render(<EquipePage />);
    expect(screen.getByText('Membre')).toBeInTheDocument();
    expect(screen.getByText('Rôle')).toBeInTheDocument();
    expect(screen.getByText('Niveau d\'accès')).toBeInTheDocument();
    expect(screen.getByText('Statut')).toBeInTheDocument();
  });

  it('renders member emails in table', () => {
    render(<EquipePage />);
    expect(screen.getByText('lea.moreau@exemple.fr')).toBeInTheDocument();
    expect(screen.getByText('karim.belaid@exemple.fr')).toBeInTheDocument();
    expect(screen.getByText('sofia.renard@exemple.fr')).toBeInTheDocument();
    expect(screen.getByText('tom.vasseur@cabinet.fr')).toBeInTheDocument();
  });

  it('renders status badges for team members', () => {
    render(<EquipePage />);
    const actifBadges = screen.getAllByText('Actif');
    expect(actifBadges.length).toBe(3);
    expect(screen.getByText('Temporaire')).toBeInTheDocument();
  });

  it('renders role information for each member', () => {
    render(<EquipePage />);
    expect(screen.getByText('Responsable conformité')).toBeInTheDocument();
    expect(screen.getByText('Data scientist')).toBeInTheDocument();
    expect(screen.getByText('Juriste IA')).toBeInTheDocument();
    expect(screen.getByText('Auditeur externe')).toBeInTheDocument();
  });

  it('no longer renders a per-row Actions menu (column emptied in refonte)', () => {
    render(<EquipePage />);
    // La colonne d'actions par ligne a été vidée : plus de bouton « Actions ».
    expect(screen.queryAllByRole('button', { name: /Actions/ })).toHaveLength(0);
    // Les 4 lignes de membres restent rendues.
    expect(screen.getByText('Léa Moreau')).toBeInTheDocument();
    expect(screen.getByText('Tom Vasseur')).toBeInTheDocument();
  });
});

describe('SupportPage - R4 Refonte', () => {
  it('renders Topbar with correct breadcrumbs', () => {
    render(<SupportPage />);
    expect(screen.getByText('AuditIQ')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('renders main heading "Comment pouvons-nous vous aider ?"', () => {
    render(<SupportPage />);
    expect(screen.getByText('Comment pouvons-nous vous aider ?')).toBeInTheDocument();
  });

  it('renders the hero email CTA (search bar removed)', () => {
    render(<SupportPage />);
    // La barre de recherche a été retirée ; le héros propose désormais un contact e-mail.
    expect(screen.queryByPlaceholderText(/Tapez votre question/i)).not.toBeInTheDocument();
    const mailLinks = screen.getAllByRole('link', { name: /support@auditiq\.fr/i });
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
    expect(mailLinks[0]).toHaveAttribute('href', 'mailto:support@auditiq.fr');
  });

  it('renders 6 topic cards', () => {
    render(<SupportPage />);
    expect(screen.getByText('Bien démarrer')).toBeInTheDocument();
    expect(screen.getByText("Modules d'audit")).toBeInTheDocument();
    expect(screen.getByText('AI Act & réglementation')).toBeInTheDocument();
    expect(screen.getByText('Rapports & exports')).toBeInTheDocument();
    expect(screen.getByText('Sécurité & RGPD')).toBeInTheDocument();
    expect(screen.getByText('Paramétrage avancé')).toBeInTheDocument();
  });

  it('renders real topic links instead of fake article counts', () => {
    render(<SupportPage />);
    // Plus de compteurs mockés (« 22 articles ») ; les cartes listent de vrais sujets.
    expect(screen.queryByText(/\d+ articles/)).not.toBeInTheDocument();
    expect(screen.getByText('Créer son premier audit en 5 minutes')).toBeInTheDocument();
    expect(screen.getByText('Comprendre les métriques de fairness')).toBeInTheDocument();
  });

  it('renders "Contacter le support" section', () => {
    render(<SupportPage />);
    expect(screen.getByText('Contacter le support')).toBeInTheDocument();
    expect(screen.getByText("Vous n'avez pas trouvé votre réponse ?")).toBeInTheDocument();
  });

  it('renders a support email link in the contact card', () => {
    render(<SupportPage />);
    // Plus de formulaire « Envoyer le ticket » : un lien e-mail le remplace.
    expect(screen.queryByRole('button', { name: /Envoyer le ticket/ })).not.toBeInTheDocument();
    const mailLinks = screen.getAllByRole('link', { name: /support@auditiq\.fr/i });
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('no longer renders the fake expert-booking section', () => {
    render(<SupportPage />);
    // La section « Contact expert AuditIQ » avec boutons « Réserver » mockés a été supprimée.
    expect(screen.queryByText('Contact expert AuditIQ')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /Réserver/ })).toHaveLength(0);
  });
});
