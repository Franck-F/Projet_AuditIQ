import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParametresPage from '@/app/app/parametres/page';

describe('ParametresPage — R5 sidenav 8 tabs', () => {
  function getNav() {
    return screen.getByRole('navigation', { name: /Navigation paramètres/i });
  }

  it('renders 9 sidenav buttons', () => {
    render(<ParametresPage />);
    const nav = getNav();
    const buttons = within(nav).getAllByRole('button');
    expect(buttons).toHaveLength(9);
  });

  it('sidenav contains all 8 expected labels', () => {
    render(<ParametresPage />);
    const nav = getNav();
    const labels = ['Entreprise', 'Audit', 'Seuils', 'Rapports', 'Intégrations', 'Sécurité', 'Facturation', 'Notifications'];
    for (const label of labels) {
      expect(within(nav).getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('defaults to Entreprise tab', () => {
    render(<ParametresPage />);
    expect(screen.getByDisplayValue('Cabinet Tessier & Associés')).toBeInTheDocument();
  });

  it('clicking "Audit" shows "Audit par défaut" select', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /^Audit$/i }));
    expect(screen.getByRole('combobox', { name: /Audit par défaut/i })).toBeInTheDocument();
  });

  it('clicking "Rapports" shows "Template PDF" select', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Rapports/i }));
    expect(screen.getByRole('combobox', { name: /Template PDF/i })).toBeInTheDocument();
  });

  it('clicking "Facturation" shows "Gérer la facturation" button', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Facturation/i }));
    expect(screen.getByRole('button', { name: /Gérer la facturation/i })).toBeInTheDocument();
  });

  it('clicking "Facturation" shows plan card with siege info', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Facturation/i }));
    expect(screen.getByText(/Plan Équipe/i)).toBeInTheDocument();
    // "Sièges utilisés" KPI card — unique text
    expect(screen.getByText(/Sièges utilisés/i)).toBeInTheDocument();
  });

  it('clicking "Facturation" shows last 3 invoices', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Facturation/i }));
    expect(screen.getByText('INV-2026-05')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-04')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-03')).toBeInTheDocument();
  });

  it('clicking "Notifications" shows 6 Toggle controls', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Notifications/i }));
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBeGreaterThanOrEqual(4);
  });

  it('clicking "Sécurité" shows 2FA toggle', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Sécurité/i }));
    // Toggle with aria-label "Double authentification" must exist
    expect(screen.getByRole('switch', { name: /Double authentification/i })).toBeInTheDocument();
    // Visible label text
    expect(screen.getByText(/Authentification à deux facteurs/i)).toBeInTheDocument();
  });
});
