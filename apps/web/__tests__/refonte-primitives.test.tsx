// apps/web/__tests__/refonte-primitives.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Meter } from '@/components/product/Meter';
import { Tabs } from '@/components/product/Tabs';
import { InlineNote } from '@/components/product/InlineNote';

describe('R3 primitives', () => {
  it('Meter exposes role=meter and aria-valuenow', () => {
    render(<Meter value={0.69} threshold={0.8} max={1} status="fail" ariaLabel="Règle 4/5" />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0.69');
    expect(meter).toHaveAttribute('aria-label', 'Règle 4/5');
  });

  it('Tabs marks the active tab aria-selected and fires onChange', async () => {
    const onChange = vi.fn();
    render(<Tabs items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} value="a" onChange={onChange} />);
    const b = screen.getByRole('tab', { name: 'B' });
    expect(b).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(b);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('InlineNote renders the icon and text', () => {
    render(<InlineNote>Bonne pratique</InlineNote>);
    expect(screen.getByText('Bonne pratique')).toBeInTheDocument();
  });
});
