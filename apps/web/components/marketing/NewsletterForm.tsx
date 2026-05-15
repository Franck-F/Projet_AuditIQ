'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export function NewsletterForm() {
  const [subscribed, setSubscribed] = React.useState(false);

  return (
    <>
      {subscribed ? (
        <p className="mx-auto max-w-[480px] rounded-md border border-accent-border bg-accent-soft p-4 text-sm text-fg">
          ✓ Abonné·e. Vous recevrez la prochaine lettre dans deux semaines.
        </p>
      ) : (
        <form
          className="mx-auto flex max-w-[480px] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            // TODO Phase 1 : POST /api/v1/newsletter (Resend)
            setSubscribed(true);
          }}
        >
          <input
            type="email"
            required
            placeholder="vous@entreprise.fr"
            aria-label="Adresse email"
            className="flex-1 rounded-md border border-border-default bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          <Button type="submit" variant="primary">
            S&apos;abonner
          </Button>
        </form>
      )}
      <p className="mt-3 text-xs text-fg-muted">+1 200 abonnés · désinscription en un clic</p>
    </>
  );
}
