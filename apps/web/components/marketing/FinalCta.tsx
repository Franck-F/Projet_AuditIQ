import * as React from 'react';
import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { Eyebrow } from '@/components/marketing/Eyebrow';
import { Button } from '@/components/ui/button';

interface CtaAction {
  label: string;
  href: string;
}

interface FinalCtaProps {
  /** Mono eyebrow above the title (varies by page intent). */
  eyebrow: string;
  title: string;
  body?: string;
  primary: CtaAction;
  secondary?: CtaAction;
}

/**
 * FinalCta — the closing call-to-action shared across marketing pages.
 *
 * Replaces a card block that was copy-pasted on ~10 pages. The accent gradient
 * the home page used has been dropped for a sober, opaque surface card; the
 * copy varies per page via props so each CTA can match its page intent.
 */
export function FinalCta({ eyebrow, title, body, primary, secondary }: FinalCtaProps) {
  return (
    <section className="py-16">
      <Container>
        <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-border-default bg-surface p-[clamp(40px,6vw,64px)] lg:grid-cols-[1fr_auto]">
          <div>
            <Eyebrow accent>{eyebrow}</Eyebrow>
            <h2 className="mt-3 text-h2 font-display font-medium tracking-tight text-fg">{title}</h2>
            {body && <p className="mt-3 max-w-[56ch] text-fg-secondary">{body}</p>}
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
            {secondary && (
              <Button asChild variant="secondary">
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
