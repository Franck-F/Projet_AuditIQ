'use client';

import * as React from 'react';

/* ============================================================================
   RevealObserver
   Mounts a single IntersectionObserver that watches every `.rv` element on
   the current page. When an element enters the viewport, the observer adds
   `is-visible` to it (vitrine.css then transitions opacity + translateY).
   The observer disconnects after each element fires once, so the animation
   never replays on scroll-back.

   Drop the component anywhere in the marketing layout — it has no visual
   output, just a side effect bound to the lifetime of the route.

   The mutation observer keeps it resilient to client-side route transitions
   that swap the DOM under the observer (e.g. navigating /tarifs → /).
   ============================================================================ */
export function RevealObserver() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Selector list: explicit opt-in (.rv) + every <section> directly under
    // the marketing main wrapper (auto-reveal for secondary pages).
    const SELECTOR = '.rv, main#top > section';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Skip entirely — CSS handles the "always visible" branch.
      document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observed = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      {
        // 12 % of the element must be visible — feels right on tall sections.
        threshold: 0.12,
        // Negative bottom margin so we trigger a bit before reaching the edge.
        rootMargin: '0px 0px -8% 0px',
      },
    );

    function observeAll(root: ParentNode) {
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        // If element is already in view at mount, reveal immediately to avoid
        // a one-frame flash of empty space (above-the-fold elements).
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-visible');
          return;
        }
        io.observe(el);
      });
    }

    observeAll(document);

    // Watch for nodes added later (e.g. Suspense boundaries resolving,
    // accordions opening, RSC streaming).
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== Node.ELEMENT_NODE) return;
          observeAll(n as Element);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
