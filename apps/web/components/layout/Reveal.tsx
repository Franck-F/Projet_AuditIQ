'use client';

import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

/**
 * Reveal scroll-reveal wrapper. Animates child(ren) once when in view.
 * - Respect prefers-reduced-motion : disables animation.
 * - `as` permet de wrapper sur section/article/li sans imbriquer un div en plus.
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

export function Reveal({
  children,
  delay = 0,
  y = 16,
  duration = 0.6,
  once = true,
  className,
  as = 'div',
}: RevealProps) {
  const reduce = useReducedMotion();

  const variants: Variants = reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, delay, ease: [0.16, 1, 0.3, 1] },
        },
      };

  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-15% 0px -10% 0px' }}
      variants={variants}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * Stagger container for lists / grids. Children must be wrapped in
 * <RevealItem> to participate in the stagger.
 */
export function RevealStagger({
  children,
  stagger = 0.08,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'ol';
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    visible: { transition: reduce ? {} : { staggerChildren: stagger } },
  };
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={variants}
      className={className}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  className,
  as = 'div',
  y = 16,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
  y?: number;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
      };
  const Component = motion[as] as typeof motion.div;
  return (
    <Component variants={variants} className={className}>
      {children}
    </Component>
  );
}
