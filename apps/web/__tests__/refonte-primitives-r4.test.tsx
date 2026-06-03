import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Toggle } from '@/components/product/Toggle';
import { Avatar } from '@/components/product/Avatar';
import { SectionHead } from '@/components/product/SectionHead';
import { Choice } from '@/components/product/Choice';

describe('R4 primitives', () => {
  it('Toggle exposes role=switch with aria-checked + fires onChange on click', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} ariaLabel="Notif" />);
    const sw = screen.getByRole('switch', { name: 'Notif' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Avatar renders initials from name', () => {
    render(<Avatar name="Léa Moreau" />);
    expect(screen.getByText('LM')).toBeInTheDocument();
  });

  it('SectionHead renders eyebrow + title + sub', () => {
    render(<SectionHead eyebrow="Activité" title="Audits" sub="Récents" />);
    expect(screen.getByText('Activité')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audits' })).toBeInTheDocument();
    expect(screen.getByText('Récents')).toBeInTheDocument();
  });

  it('Choice toggles aria-checked + onClick fires', async () => {
    const onClick = vi.fn();
    render(<Choice selected={false} onClick={onClick} title="Option A" />);
    const radio = screen.getByRole('radio', { name: /Option A/ });
    expect(radio).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radio);
    expect(onClick).toHaveBeenCalled();
  });
});
