import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sécurité & RGPD — AuditIQ',
  description:
    'Hébergement en Union européenne, chiffrement en transit et au repos, suppression automatique des jeux de données après 30 jours, conformité RGPD.',
};

/* ============================================================================
   Sécurité & RGPD — R8a rewrite per maquette docs/design/auditiq-vitrine-v3/securite.html
   Styles: ./vitrine.css (imported in layout.tsx)
   ============================================================================ */

export default function SecuritePage() {
  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <header className="page-head">
        <div className="wrap">
          <p className="kicker">Sécurité &amp; confidentialité</p>
          <h1>Vos données traitées avec sobriété, en Union européenne.</h1>
          <p className="lead">
            AuditIQ est conçu pour traiter des données sensibles avec un principe simple : ne
            conserver que le nécessaire, le moins longtemps possible. Les jeux de données importés
            sont automatiquement supprimés 30 jours après l&apos;import, et l&apos;ensemble est
            hébergé en Union européenne.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '22px' }}>
            <span className="badge info"><span className="dot" />Hébergé en UE</span>
            <span className="badge info"><span className="dot" />RGPD</span>
            <span className="badge warn"><span className="dot" />ISO 27001 : démarche en cours</span>
          </div>
        </div>
      </header>

      {/* ── PRINCIPES ────────────────────────────────────────────────────── */}
      <section>
        <div className="wrap">
          <h2 className="title" style={{ maxWidth: '20ch' }}>Quatre principes de conception.</h2>
          <div className="g2" style={{ marginTop: '32px' }}>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
              </span>
              <h4 style={{ fontSize: '16px' }}>Conservation limitée à 30 jours</h4>
              <p className="lede" style={{ fontSize: '14px' }}>Les jeux de données importés servent au calcul des métriques, puis sont automatiquement supprimés 30 jours après l&apos;import. Seuls les résultats agrégés et les rapports restent dans votre espace.</p>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z"/></svg>
              </span>
              <h4 style={{ fontSize: '16px' }}>Hébergement en Union européenne</h4>
              <p className="lede" style={{ fontSize: '14px' }}>Traitement et stockage des données en Union européenne (Francfort · Paris). L&apos;interprétation en langage clair s&apos;appuie sur le modèle Gemini par défaut, avec une option souveraine Mistral.</p>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M16 5l2 2M14 7l2 2"/></svg>
              </span>
              <h4 style={{ fontSize: '16px' }}>Chiffrement en transit et au repos</h4>
              <p className="lede" style={{ fontSize: '14px' }}>Chiffrement TLS en transit et chiffrement au repos pour les données, rapports et métadonnées. Cloisonnement strict des données entre organisations.</p>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h12"/></svg>
              </span>
              <h4 style={{ fontSize: '16px' }}>Minimisation des données</h4>
              <p className="lede" style={{ fontSize: '14px' }}>AuditIQ ne demande que les colonnes nécessaires au calcul. Les attributs protégés peuvent être fournis sous forme chiffrée ou pseudonymisée.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RGPD ─────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: '48px', alignItems: 'start' }}>
            <div>
              <p className="eyebrow acc">Conformité RGPD</p>
              <h2 className="title" style={{ marginTop: '12px' }}>Notre rôle vis-à-vis de vos données.</h2>
              <p className="lede" style={{ marginTop: '16px' }}>
                Lorsque vous auditez vos modèles, AuditIQ agit comme{' '}
                <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>sous-traitant</strong> au
                sens de l&apos;article 28 du RGPD. Vous restez responsable de traitement. Un accord
                de traitement des données (DPA) est fourni à la signature.
              </p>
              <Link className="btn btn-outline" href="/contact" style={{ marginTop: '22px', display: 'inline-flex' }}>Demander le DPA</Link>
            </div>
            <div>
              {[
                {
                  title: 'Base légale',
                  body: "Le traitement repose sur l'exécution du contrat qui nous lie et sur votre obligation légale de documenter la conformité de vos systèmes d'IA.",
                },
                {
                  title: 'Droits des personnes',
                  body: "AuditIQ ne traitant que des données agrégées, il ne réidentifie personne. Les demandes d'accès, de rectification ou d'effacement sont relayées au responsable de traitement.",
                },
                {
                  title: 'Durée de conservation',
                  body: "Jeux de données importés : supprimés automatiquement 30 jours après l'import. Résultats d'audit et rapports : conservés dans votre espace tant que votre compte est actif, et supprimés sur demande.",
                },
                {
                  title: 'Sous-traitants ultérieurs',
                  body: "La liste de nos sous-traitants (hébergement, e-mail transactionnel) est tenue à jour et communiquée sur demande. Tous sont localisés en UE.",
                },
                {
                  title: 'Délégué à la protection des données',
                  body: null,
                },
              ].map((row, i) => (
                <div
                  key={row.title}
                  style={{
                    display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px',
                    padding: '20px 0',
                    borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <h4 style={{ fontSize: '15.5px' }}>{row.title}</h4>
                  {row.body ? (
                    <p className="lede" style={{ fontSize: '14px' }}>{row.body}</p>
                  ) : (
                    <p className="lede" style={{ fontSize: '14px' }}>
                      Un DPO est désigné et joignable à{' '}
                      <a href="mailto:dpo@auditiq.fr" className="mono" style={{ color: 'var(--fg)' }}>dpo@auditiq.fr</a>{' '}
                      pour toute question relative à vos données.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MESURES ──────────────────────────────────────────────────────── */}
      <section>
        <div className="wrap">
          <p className="eyebrow acc">Mesures techniques &amp; organisationnelles</p>
          <h2 className="title" style={{ marginTop: '12px', maxWidth: '22ch' }}>Les garanties opérationnelles.</h2>
          <div className="g3" style={{ marginTop: '28px' }}>
            {[
              'Authentification par e-mail ou Google (OAuth)',
              'Suppression automatique des datasets à 30 jours',
              'Cloisonnement par organisation',
              'Chiffrement en transit et au repos',
              'Sauvegardes gérées par l\'hébergeur',
              'Limitation de débit sur l\'API',
              'Procédure de notification d\'incident',
              'Réversibilité & export des rapports (PDF, Excel)',
              'Suppression du compte et des données sur demande',
            ].map((item) => (
              <div
                key={item}
                style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 15px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', fontSize: '14px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5"/></svg>
                {item}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '24px', padding: '16px 18px', borderRadius: '11px', background: 'var(--info-bg)', border: '1px solid var(--info-border)', fontSize: '13.5px', color: 'var(--fg-secondary)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Feuille de route sécurité.</strong> Authentification multifacteur (MFA), SSO (SAML / OIDC), rôles et permissions multiples et journal d&apos;audit détaillé sont en cours de développement et seront annoncés à leur disponibilité. Politique de sécurité, registre des sous-traitants et DPA communiqués sur demande via{' '}
            <Link href="/contact" style={{ color: 'var(--accent)' }}>notre équipe</Link>.
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="wrap">
          <div className="card" style={{ padding: 'clamp(32px,5vw,52px)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'center', background: 'linear-gradient(110deg, var(--accent-softer), transparent 58%)' }}>
            <div>
              <h2 className="title">Une question de sécurité ou de conformité&nbsp;?</h2>
              <p className="lede" style={{ marginTop: '12px', maxWidth: '52ch' }}>Notre équipe et notre DPO répondent aux questionnaires de sécurité et aux demandes de documentation.</p>
            </div>
            <Link className="btn btn-primary lg" href="/contact">Nous contacter</Link>
          </div>
        </div>
      </section>
    </>
  );
}
