'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Container } from '@/components/layout/Container';

interface AnchorItem {
  href: string;
  label: string;
}

interface AnchorNavProps {
  items: AnchorItem[];
}

export function AnchorNav({ items }: AnchorNavProps) {
  const [active, setActive] = React.useState<string>(items[0]?.href ?? '');

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    );

    for (const item of items) {
      const el = document.querySelector(item.href);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  return (
    <div
      className="sticky top-[var(--nav-h)] z-30 border-b border-border-subtle bg-surface-glass py-2 backdrop-blur-md"
      role="navigation"
      aria-label="Sections de la page"
    >
      <Container className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = active === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3.5 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-surface-2 text-fg'
                  : 'text-fg-secondary hover:bg-surface-2 hover:text-fg',
              )}
            >
              {item.label}
            </a>
          );
        })}
      </Container>
    </div>
  );
}
