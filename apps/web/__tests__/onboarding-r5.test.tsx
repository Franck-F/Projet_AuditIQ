import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the Topbar component
vi.mock('@/components/app/Topbar', () => ({
  Topbar: ({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) => (
    <div data-testid="topbar">Topbar: {crumbs[0]?.label}</div>
  ),
}));

// Mock the OnboardingStepper component
vi.mock('@/components/onboarding/OnboardingStepper', () => ({
  OnboardingStepper: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="stepper">Step {currentStep} / 5</div>
  ),
}));

import OnboardingPage from '@/app/app/onboarding/page';

describe('Onboarding R5 — 5-step stepper', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageMock[key];
        },
        clear: () => {
          localStorageMock = {};
        },
      },
      writable: true,
    });

    // Mock window.scrollTo
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 (Bienvenue) by default', () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/Bienvenue chez AuditIQ/)).toBeInTheDocument();
    expect(screen.getByText(/Nous allons configurer/)).toBeInTheDocument();
  });

  it('advances to step 2 when clicking Next button', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const nextBtn = screen.getByRole('button', { name: /Commencer/ });
    await user.click(nextBtn);

    expect(screen.getByText(/Quelle est la taille de votre organisation/)).toBeInTheDocument();
    expect(screen.getByText(/Profil entreprise/)).toBeInTheDocument();
  });

  it('populates profile fields and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Navigate to step 2
    const nextBtn = screen.getByRole('button', { name: /Commencer/ });
    await user.click(nextBtn);

    // Fill in profile fields
    const raisonSocialeInput = screen.getByPlaceholderText(/Cabinet Tessier/);
    const sirenInput = screen.getByPlaceholderText(/824 561 832/);

    await user.type(raisonSocialeInput, 'Test Company');
    await user.type(sirenInput, '123456789');

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 600));

    const stored = localStorage.getItem('auditiq.onboarding');
    expect(stored).toBeDefined();
    const state = JSON.parse(stored!);
    expect(state.profile.raison_sociale).toBe('Test Company');
    expect(state.profile.siren).toBe('123456789');
  });

  it('selects organization size and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Navigate to step 2
    const nextBtn = screen.getByRole('button', { name: /Commencer/ });
    await user.click(nextBtn);

    // Click on PME option
    const pmeBtn = screen.getByRole('button', { name: /PME — 10 à 250/ });
    await user.click(pmeBtn);

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 600));

    const stored = localStorage.getItem('auditiq.onboarding');
    const state = JSON.parse(stored!);
    expect(state.profile.taille).toBe('pme');
  });

  it('selects multiple use cases on step 3', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Advance to step 2, then step 3
    await user.click(screen.getByRole('button', { name: /Commencer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByText(/Quel système d'IA voulez-vous auditer/)).toBeInTheDocument();

    // Click use case cards
    const buttons = screen.getAllByRole('button');
    const useCardBtn = buttons.find((b) => b.textContent?.includes('Scoring de candidatures'));
    if (useCardBtn) {
      await user.click(useCardBtn);
    }

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 600));

    const stored = localStorage.getItem('auditiq.onboarding');
    const state = JSON.parse(stored!);
    expect(state.useCases.length).toBeGreaterThan(0);
  });

  it('toggles checklist items on step 4', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Advance to step 4
    await user.click(screen.getByRole('button', { name: /Commencer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    expect(screen.getByText(/Préparons votre premier audit/)).toBeInTheDocument();

    // Find and click checkbox for dataset
    const checkboxes = screen.getAllByRole('checkbox');
    const datasetCheckbox = checkboxes[0];
    await user.click(datasetCheckbox);

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 600));

    const stored = localStorage.getItem('auditiq.onboarding');
    const state = JSON.parse(stored!);
    expect(state.checklist.dataset).toBe(true);
  });

  it('navigates back from step 2 to step 1', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Advance to step 2
    await user.click(screen.getByRole('button', { name: /Commencer/ }));

    expect(screen.getByText(/Quelle est la taille de votre organisation/)).toBeInTheDocument();

    // Click back
    const backBtn = screen.getByRole('button', { name: /Retour/ });
    await user.click(backBtn);

    expect(screen.getByText(/Bienvenue chez AuditIQ/)).toBeInTheDocument();
  });

  it('resumes onboarding from step 3 if stored in localStorage', async () => {
    const storedState = {
      step: 3,
      profile: { raison_sociale: 'Saved Company', siren: '', secteur: '', pays: 'France', taille: 'pme' },
      useCases: [],
      checklist: { dataset: false, modele: false, dpo: false },
    };
    localStorage.setItem('auditiq.onboarding', JSON.stringify(storedState));

    render(<OnboardingPage />);

    // Should render step 3 on mount
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByText(/Quel système d'IA voulez-vous auditer/)).toBeInTheDocument();
  });

  it('clears localStorage when completing onboarding', async () => {
    const user = userEvent.setup();
    const { useRouter } = await import('next/navigation');
    const pushSpy = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: pushSpy } as any);

    render(<OnboardingPage />);

    // Advance all the way to step 5
    await user.click(screen.getByRole('button', { name: /Commencer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // Click final CTA
    const finalBtn = screen.getByRole('button', { name: /Lancer mon premier audit/ });
    await user.click(finalBtn);

    // localStorage should be cleared
    expect(localStorage.getItem('auditiq.onboarding')).toBeNull();
  });

  it('shows stepper on every step with correct current step', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Step 1
    expect(screen.getByTestId('stepper')).toHaveTextContent('Step 1 / 5');

    // Step 2
    await user.click(screen.getByRole('button', { name: /Commencer/ }));
    expect(screen.getByTestId('stepper')).toHaveTextContent('Step 2 / 5');
  });
});
