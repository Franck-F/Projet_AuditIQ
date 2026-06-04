import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sécurité & RGPD — AuditIQ',
  description:
    'Informations sur la sécurité de la plateforme AuditIQ et la conformité au Règlement Général sur la Protection des Données (RGPD).',
};

export default function SecuritePage() {
  return (
    <div className="wrap" style={{ paddingTop: 'clamp(64px,9vw,104px)', paddingBottom: 'clamp(64px,9vw,104px)' }}>
      <p className="eyebrow acc">Sécurité &amp; RGPD</p>
      <h1 style={{ marginTop: '16px', fontSize: 'clamp(32px,4vw,48px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
        Sécurité de la plateforme<br />et protection des données.
      </h1>
      <p className="lede" style={{ marginTop: '20px', fontSize: '17px', maxWidth: '60ch' }}>
        Cette page est en cours de rédaction. Pour toute question relative à la sécurité ou à vos
        données personnelles, contactez-nous directement.
      </p>
      <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" href="/contact">
          Nous contacter
        </Link>
        <Link className="btn btn-outline" href="/">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
