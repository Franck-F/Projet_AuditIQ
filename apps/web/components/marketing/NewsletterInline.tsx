'use client';

import * as React from 'react';

// Client-side newsletter form for the vitrine /ressources hub.
// Inline styles match the maquette (Site Vitrine / ressources.html) and rely
// on .input + .btn classes from vitrine.css. No backend wiring yet.
export function NewsletterInline() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <>
      <form
        style={{ display: 'flex', gap: '10px', maxWidth: '440px', margin: '22px auto 0' }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <input
          className="input"
          type="email"
          placeholder="vous@entreprise.fr"
          required
          style={{ flex: 1 }}
          aria-label="Adresse e-mail professionnelle"
        />
        <button className="btn btn-primary" type="submit" disabled={submitted}>
          {submitted ? 'Inscrit·e ✓' : "S'abonner"}
        </button>
      </form>
      <p className="lede" style={{ fontSize: '12px', marginTop: '12px' }}>
        Désinscription en un clic. Aucune donnée revendue.
      </p>
    </>
  );
}
