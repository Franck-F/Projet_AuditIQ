import * as React from 'react';

/**
 * Reveal — institutional layout wrapper.
 *
 * Vague 2 design decision: the marketing site keeps a SINGLE, minimal animation
 * system (the CSS `.rv` + RevealObserver), reserved for the hero. Below-the-fold
 * institutional content renders visible immediately — no generalized fade-up, no
 * stagger cascade — for credibility, SEO and no-JS resilience.
 *
 * These components used to wrap children in framer-motion. They are kept as
 * plain structural wrappers so the ~10 marketing pages that import them don't
 * need to change, while framer-motion is dropped from the bundle entirely.
 *
 * The `delay`, `y`, `duration`, `once` and `stagger` props are accepted and
 * ignored (no-op) to preserve call-site compatibility.
 */
interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'header';
}

export function Reveal({ children, className, as = 'div' }: RevealProps) {
  const Component = as;
  return <Component className={className}>{children}</Component>;
}

export function RevealStagger({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'ol';
}) {
  const Component = as;
  return <Component className={className}>{children}</Component>;
}

export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
  y?: number;
}) {
  const Component = as;
  return <Component className={className}>{children}</Component>;
}
