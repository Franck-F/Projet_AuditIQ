// apps/web/components/product/TocSticky.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  label: string;
}

interface TocStickyProps {
  items: TocItem[];
  offsetTop?: number;
  className?: string;
}

export function TocSticky({ items, offsetTop = 80, className }: TocStickyProps) {
  const [activeId, setActiveId] = React.useState<string | null>(
    items[0]?.id ?? null,
  );

  React.useEffect(() => {
    if (items.length === 0) return;

    const observers: IntersectionObserver[] = [];

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(id);
            }
          });
        },
        {
          rootMargin: `-${offsetTop}px 0px -60% 0px`,
          threshold: 0,
        },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [items, offsetTop]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetTop - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <nav
      role="navigation"
      aria-label="Sommaire"
      className={cn('flex flex-col gap-1', className)}
    >
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
        Sommaire
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map(({ id, label }) => {
          const isActive = id === activeId;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(id);
                  setActiveId(id);
                }}
                className={cn(
                  'block border-l-2 py-1.5 pl-3 text-sm transition-colors',
                  isActive
                    ? 'border-accent font-medium text-accent'
                    : 'border-transparent text-fg-secondary hover:text-fg',
                )}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
