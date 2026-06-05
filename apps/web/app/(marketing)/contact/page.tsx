'use client';

import * as React from 'react';
import Link from 'next/link';

/* ============================================================================
   Contact — R8a rewrite per maquette docs/design/auditiq-vitrine-v3/contact.html
   Keeps existing form handler pattern (POST /api/contact).
   Styles: ./vitrine.css (imported in layout.tsx)
   ============================================================================ */

export default function ContactPage() {
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <header className="page-head">
        <div className="wrap">
          <p className="kicker">Contact</p>
          <h1>Parlons de votre conformité.</h1>
          <p className="lead">
            Une question sur le produit, un devis pour l&apos;offre Sur devis, un questionnaire de
            sécurité&nbsp;? Écrivez-nous — un membre de l&apos;équipe vous répond sous 24 heures
            ouvrées. Pour démarrer tout de suite, l&apos;essai est gratuit et immédiat.
          </p>
        </div>
      </header>

      <section style={{ paddingTop: 'clamp(36px,5vw,56px)' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '52px', alignItems: 'start' }}>

            {/* ── LEFT : channels ─────────────────────────────────────── */}
            <div>
              {/* E-mail */}
              <div style={{ display: 'flex', gap: '14px', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                </span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>E-mail</h4>
                  <p className="lede" style={{ fontSize: '13.5px', marginTop: '2px' }}>Commercial &amp; questions générales</p>
                  <a href="mailto:contact@auditiq.fr" className="mono" style={{ fontSize: '13.5px', color: 'var(--accent)' }}>contact@auditiq.fr</a>
                </div>
              </div>

              {/* Sécurité & RGPD */}
              <div style={{ display: 'flex', gap: '14px', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>
                </span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>Sécurité &amp; RGPD</h4>
                  <p className="lede" style={{ fontSize: '13.5px', marginTop: '2px' }}>DPO &amp; questionnaires de sécurité</p>
                  <a href="mailto:dpo@auditiq.fr" className="mono" style={{ fontSize: '13.5px', color: 'var(--accent)' }}>dpo@auditiq.fr</a>
                </div>
              </div>

              {/* Adresse */}
              <div style={{ display: 'flex', gap: '14px', padding: '16px 0' }}>
                <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                </span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>Adresse</h4>
                  <p className="lede" style={{ fontSize: '13.5px', marginTop: '2px' }}>Siège social</p>
                  <p className="mono" style={{ fontSize: '13.5px', color: 'var(--fg-secondary)' }}>12 rue de la Conformité, 75002 Paris</p>
                </div>
              </div>

              {/* CTA rapide */}
              <div style={{ marginTop: '24px', padding: '16px 18px', borderRadius: '11px', background: 'var(--accent-softer)', border: '1px solid var(--accent-border)' }}>
                <div style={{ display: 'flex', gap: '11px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: '1px' }} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Pas besoin de nous attendre</div>
                    <p className="lede" style={{ fontSize: '13px', marginTop: '3px' }}>Créez un compte et lancez votre premier audit gratuitement, sans carte bancaire.</p>
                    <Link className="btn btn-primary sm" href="/inscription" style={{ marginTop: '11px', display: 'inline-flex' }}>Essayer gratuitement</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT : form ─────────────────────────────────────────── */}
            {status === 'sent' ? (
              <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>✓</div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Message envoyé.</h3>
                <p className="lede" style={{ fontSize: '14px' }}>Un membre de l&apos;équipe vous répond sous 24 heures ouvrées.</p>
              </div>
            ) : (
              <form className="card" style={{ padding: '28px' }} onSubmit={handleSubmit} noValidate>
                <h3 style={{ fontSize: '18px' }}>Envoyez-nous un message</h3>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px', marginBottom: '22px' }}>
                  Les champs marqués d&apos;un astérisque sont obligatoires.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="field">
                      <label htmlFor="nom">Nom complet <span className="req">*</span></label>
                      <input id="nom" name="nom" className="input" placeholder="Léa Moreau" required />
                    </div>
                    <div className="field">
                      <label htmlFor="email">E-mail professionnel <span className="req">*</span></label>
                      <input id="email" name="email" type="email" className="input" placeholder="vous@entreprise.fr" required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="field">
                      <label htmlFor="societe">Société</label>
                      <input id="societe" name="societe" className="input" placeholder="Nom de votre organisation" />
                    </div>
                    <div className="field">
                      <label htmlFor="sujet">Sujet</label>
                      <div style={{ position: 'relative' }}>
                        <select id="sujet" name="sujet" className="select">
                          <option>Découvrir le produit</option>
                          <option>Demander un devis (offre Sur devis)</option>
                          <option>Questionnaire de sécurité / RGPD</option>
                          <option>Support technique</option>
                          <option>Autre</option>
                        </select>
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--fg-muted)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="message">Message <span className="req">*</span></label>
                    <textarea id="message" name="message" className="textarea" placeholder="Décrivez votre besoin, votre cas d'usage ou votre question…" required />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <span className="lede" style={{ fontSize: '12.5px', maxWidth: '38ch' }}>
                      En envoyant ce formulaire, vous acceptez notre{' '}
                      <Link href="/securite" style={{ color: 'var(--accent)' }}>politique de confidentialité</Link>.
                    </span>
                    <button
                      className="btn btn-primary lg"
                      type="submit"
                      disabled={status === 'sending'}
                      style={{ display: 'inline-flex', gap: '8px' }}
                    >
                      {status === 'sending' ? 'Envoi…' : 'Envoyer le message'}
                      {status !== 'sending' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      )}
                    </button>
                  </div>

                  {status === 'error' && (
                    <p style={{ fontSize: '13px', color: 'var(--fail)' }}>Une erreur est survenue. Merci de réessayer ou de nous écrire directement.</p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
