import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParametresPage from '@/app/app/parametres/page';

describe('ParametresPage — R4 sidenav 6 tabs', () => {
  function getNav() {
    return screen.getByRole('navigation', { name: /Navigation paramètres/i });
  }

  it('renders 6 sidenav buttons', () => {
    render(<ParametresPage />);
    const nav = getNav();
    expect(within(nav).getByRole('button', { name: /Entreprise/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Profil/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Seuils/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /API/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Sécurité/i })).toBeInTheDocument();
  });

  it('defaults to Entreprise tab showing "Banque Mériterre SA"', () => {
    render(<ParametresPage />);
    expect(
      screen.getByDisplayValue('Banque Mériterre SA'),
    ).toBeInTheDocument();
  });

  it('switches to Notifications tab showing 4 Toggle controls', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Notifications/i }));
    // 4 toggle switches in notifications tab
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBe(4);
  });

  it('switches to Sécurité tab showing "Double authentification"', async () => {
    const user = userEvent.setup();
    render(<ParametresPage />);
    const nav = getNav();
    await user.click(within(nav).getByRole('button', { name: /Sécurité/i }));
    expect(screen.getByText(/Double authentification/i)).toBeInTheDocument();
  });
});
