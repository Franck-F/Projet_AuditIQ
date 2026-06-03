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

  it('renders action buttons for each team member row', () => {
    render(<EquipePage />);
    const actionButtons = screen.getAllByRole('button', { name: /Actions/ });
    expect(actionButtons.length).toBe(4);
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

  it('renders search input with correct placeholder', () => {
    render(<SupportPage />);
    const searchInput = screen.getByPlaceholderText(/Tapez votre question/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders 6 topic cards', () => {
    render(<SupportPage />);
    expect(screen.getByText('Bien démarrer')).toBeInTheDocument();
    expect(screen.getByText("Modules d'audit")).toBeInTheDocument();
    expect(screen.getByText('AI Act & conformité')).toBeInTheDocument();
    expect(screen.getByText('Rapports & exports')).toBeInTheDocument();
    expect(screen.getByText('Sécurité & RGPD')).toBeInTheDocument();
    expect(screen.getByText('Paramétrage avancé')).toBeInTheDocument();
  });

  it('renders topic card article counts', () => {
    render(<SupportPage />);
    expect(screen.getByText('22 articles')).toBeInTheDocument();
    expect(screen.getByText('34 articles')).toBeInTheDocument();
  });

  it('renders "Ouvrir un ticket support" section', () => {
    render(<SupportPage />);
    expect(screen.getByText('Ouvrir un ticket support')).toBeInTheDocument();
    expect(screen.getByText("Vous n'avez pas trouvé votre réponse ?")).toBeInTheDocument();
  });

  it('renders "Envoyer le ticket" button', () => {
    render(<SupportPage />);
    expect(screen.getByRole('button', { name: /Envoyer le ticket/ })).toBeInTheDocument();
  });

  it('renders expert contact section with "Réserver" buttons', () => {
    render(<SupportPage />);
    expect(screen.getByText('Contact expert AuditIQ')).toBeInTheDocument();
    const reserverButtons = screen.getAllByRole('button', { name: /Réserver/ });
    expect(reserverButtons.length).toBe(3);
  });
});
