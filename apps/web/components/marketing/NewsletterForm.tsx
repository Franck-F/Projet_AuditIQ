import * as React from 'react';
import { Button } from '@/components/ui/button';

// L'inscription automatisée à la lettre n'est pas encore branchée : pas de
// faux formulaire ni de faux état de succès. Un simple mailto honnête.
export function NewsletterForm() {
  return (
    <>
      <div className="mx-auto flex max-w-[480px] justify-center">
        <Button asChild variant="primary">
          <a href="mailto:contact@auditiq.fr?subject=Inscription%20%C3%A0%20la%20lettre%20AuditIQ">
            S&apos;abonner par e-mail
          </a>
        </Button>
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        Envoyez-nous un e-mail, nous vous ajoutons à la liste. Désinscription en un clic, aucune
        donnée revendue.
      </p>
    </>
  );
}
