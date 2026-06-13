import * as React from 'react';

// Newsletter du hub /ressources. L'inscription automatisée n'est pas encore
// branchée : pas de faux formulaire ni de faux état de succès — un mailto.
export function NewsletterInline() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '22px' }}>
        <a
          className="btn btn-primary"
          href="mailto:contact@auditiq.fr?subject=Inscription%20%C3%A0%20la%20lettre%20AuditIQ"
        >
          S&apos;abonner par e-mail
        </a>
      </div>
      <p className="lede" style={{ fontSize: '12px', marginTop: '12px' }}>
        Envoyez-nous un e-mail, nous vous ajoutons à la liste. Désinscription en un clic, aucune
        donnée revendue.
      </p>
    </>
  );
}
