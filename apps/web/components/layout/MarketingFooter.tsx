import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="vitrine-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-col">
            <Link className="brand foot-brand" href="#top" aria-label="AuditIQ — retour à l'accueil">
              <span className="brand-logo" aria-hidden="true">
                <ShieldCheck size={17} strokeWidth={1.7} />
              </span>
              <span className="brand-name">AuditIQ</span>
            </Link>
            <p className="lede" style={{ fontSize: '13.5px', maxWidth: '34ch' }}>
              La plateforme française d&apos;audit de fairness des systèmes d&apos;IA. Hébergement européen.
            </p>
          </div>

          <div className="foot-col">
            <h5>Produit</h5>
            <a href="#produit">Aperçu</a>
            <a href="#modules">Modules</a>
            <Link href="/cas-usage">Cas d&apos;usage</Link>
            <a href="#tarifs">Tarifs</a>
            <Link href="/connexion">L&apos;application</Link>
          </div>

          <div className="foot-col">
            <h5>Ressources</h5>
            <Link href="/blog">Articles &amp; guides</Link>
            <a href="#conformite">AI Act</a>
            <Link href="/securite">Sécurité &amp; RGPD</Link>
          </div>

          <div className="foot-col">
            <h5>Entreprise</h5>
            <Link href="/contact">Contact</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
          </div>
        </div>

        <div className="foot-bottom">
          <span>© 2026 AuditIQ. Tous droits réservés.</span>
          <span className="mono">Conforme AI Act · SOC 2 · ISO 27001 · Hébergé en UE</span>
        </div>
      </div>
    </footer>
  );
}
