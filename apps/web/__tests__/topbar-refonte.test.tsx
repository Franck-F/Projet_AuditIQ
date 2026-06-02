import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Topbar } from '@/components/app/Topbar';

describe('Topbar (refonte)', () => {
  it('renders the search box', () => {
    render(<Topbar />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders the notification icon button', () => {
    render(<Topbar />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders crumbs when provided', () => {
    render(<Topbar crumbs={[{ label: 'Audits', href: '/app/audits' }, { label: 'Nouvel audit' }]} />);
    expect(screen.getByText(/Nouvel audit/i)).toBeInTheDocument();
    expect(screen.getByText(/Audits/i)).toBeInTheDocument();
  });
});
