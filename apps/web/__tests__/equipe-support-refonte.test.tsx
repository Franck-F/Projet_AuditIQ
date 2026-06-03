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
    const searchInput = screen.getByPlaceholderText('Rechercher dans l\'aide…');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders 3 quick-link cards', () => {
    render(<SupportPage />);
    expect(screen.getByText('Démarrage rapide')).toBeInTheDocument();
    expect(screen.getByText('Guide méthodologique')).toBeInTheDocument();
    expect(screen.getByText('Cadre réglementaire')).toBeInTheDocument();
  });

  it('renders quick-link descriptions', () => {
    render(<SupportPage />);
    expect(screen.getByText('Lancez votre premier audit en 7 minutes')).toBeInTheDocument();
    expect(screen.getByText('Comprendre les métriques de fairness')).toBeInTheDocument();
    expect(screen.getByText('AI Act, RGPD, et obligations légales')).toBeInTheDocument();
  });

  it('renders "Besoin d\'un accompagnement personnalisé ?" card', () => {
    render(<SupportPage />);
    expect(screen.getByText('Besoin d\'un accompagnement personnalisé ?')).toBeInTheDocument();
  });

  it('renders "Contacter le support" button', () => {
    render(<SupportPage />);
    expect(screen.getByRole('button', { name: /Contacter le support/ })).toBeInTheDocument();
  });

  it('renders support card description', () => {
    render(<SupportPage />);
    expect(screen.getByText('Nos experts conformité répondent sous 4 h ouvrées.')).toBeInTheDocument();
  });
});
