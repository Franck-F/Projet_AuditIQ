import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions légales — AuditIQ',
  description:
    "Mentions légales d'AuditIQ SAS : éditeur, directeur de publication, hébergeur, propriété intellectuelle, données personnelles, cookies, responsabilité.",
};

/* ============================================================================
   Mentions légales — R8a creation per maquette docs/design/auditiq-vitrine-v3/mentions-legales.html
   Pure static content, vouvoiement.
   Styles: ./vitrine.css (imported in layout.tsx)
   ============================================================================ */

const TOC = [
  { href: '#editeur', label: 'Éditeur' },
  { href: '#publication', label: 'Publication' },
  { href: '#hebergeur', label: 'Hébergeur' },
  { href: '#pi', label: 'Propriété intellectuelle' },
  { href: '#donnees', label: 'Données personnelles' },
  { href: '#cookies', label: 'Cookies' },
  { href: '#responsabilite', label: 'Responsabilité' },
  { href: '#droit', label: 'Droit applicable' },
];

export default function MentionsLegalesPage() {
  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <header className="page-head">
        <div className="wrap-narrow">
          <p className="kicker">Informations légales</p>
          <h1>Mentions légales.</h1>
          <p className="lead">
            Conformément aux articles 6-III et 19 de la loi n°&nbsp;2004-575 du 21 juin 2004 pour
            la confiance dans l&apos;économie numérique, voici les informations relatives à
            l&apos;éditeur et à l&apos;hébergeur de ce site.
          </p>
          <p className="mono" style={{ fontSize: '12.5px', color: 'var(--fg-muted)', marginTop: '14px' }}>
            Dernière mise à jour&nbsp;: janvier 2026
          </p>
        </div>
      </header>

      <section style={{ paddingTop: 'clamp(36px,5vw,56px)' }}>
        <div className="wrap-narrow">
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px', alignItems: 'start' }}>

            {/* ── TOC ─────────────────────────────────────────────────── */}
            <nav style={{ position: 'sticky', top: '92px', display: 'flex', flexDirection: 'column', gap: '2px' }} aria-label="Sommaire">
              {TOC.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{ fontSize: '13.5px', color: 'var(--fg-muted)', padding: '6px 10px', borderRadius: '7px', borderLeft: '2px solid transparent' }}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* ── ARTICLES ─────────────────────────────────────────────── */}
            <div>

              <article id="editeur" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px', paddingTop: 0 }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>01</span>
                  Éditeur du site
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>Le présent site est édité par&nbsp;:</p>
                <dl style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px 18px' }}>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Raison sociale</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>AuditIQ SAS</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Forme juridique</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>Société par actions simplifiée</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Siège social</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>12 rue de la Conformité, 75002 Paris</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>RCS</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>Paris [n°&nbsp;à compléter]</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>SIREN</dt>
                  <dd className="mono" style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>552 100 554</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>TVA intracom.</dt>
                  <dd className="mono" style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>FR [n°&nbsp;à compléter]</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Contact</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>
                    <a href="mailto:contact@auditiq.fr" className="mono" style={{ color: 'var(--accent)' }}>contact@auditiq.fr</a>
                  </dd>
                </dl>
              </article>

              <article id="publication" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>02</span>
                  Directeur de la publication
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  Le directeur de la publication est le représentant légal d&apos;AuditIQ SAS,{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--fg-muted)' }}>[nom du dirigeant à compléter]</span>, en sa qualité de Président.
                </p>
              </article>

              <article id="hebergeur" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>03</span>
                  Hébergement
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>Le site et l&apos;application sont hébergés au sein de l&apos;Union européenne par&nbsp;:</p>
                <dl style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px 18px' }}>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Hébergeur</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>Vercel</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Localisation</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg)', margin: 0 }}>Centres de données situés en Union européenne</dd>
                  <dt style={{ fontSize: '13.5px', color: 'var(--fg-muted)' }}>Adresse</dt>
                  <dd style={{ fontSize: '14px', color: 'var(--fg-muted)', fontStyle: 'italic', margin: 0 }}>[adresse de l&apos;hébergeur]</dd>
                </dl>
              </article>

              <article id="pi" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>04</span>
                  Propriété intellectuelle
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  L&apos;ensemble des éléments composant ce site et l&apos;application AuditIQ — marque, logo, textes, interface, code, méthodologie d&apos;audit et rapports générés — est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive d&apos;AuditIQ SAS, sauf mention contraire.
                </p>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite et constitue une contrefaçon au sens des articles L.335-2 et suivants du Code de la propriété intellectuelle. Les outils tiers cités (Fairlearn, AIF360, Aequitas, SHAP, scikit-learn) restent la propriété de leurs auteurs respectifs.
                </p>
              </article>

              <article id="donnees" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>05</span>
                  Données personnelles
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  AuditIQ traite des données à caractère personnel dans le respect du Règlement général sur la protection des données (RGPD) et de la loi Informatique et Libertés. Les modalités de traitement, la durée de conservation et l&apos;exercice de vos droits sont détaillés sur la page dédiée.
                </p>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  Pour toute demande, vous pouvez contacter notre délégué à la protection des données à l&apos;adresse{' '}
                  <a href="mailto:dpo@auditiq.fr" className="mono" style={{ color: 'var(--accent)' }}>dpo@auditiq.fr</a>.
                  Vous disposez par ailleurs du droit d&apos;introduire une réclamation auprès de la CNIL.
                </p>
                <p style={{ marginTop: '14px' }}>
                  <Link className="btn btn-outline sm" href="/securite">Consulter la page Sécurité &amp; RGPD</Link>
                </p>
              </article>

              <article id="cookies" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>06</span>
                  Cookies
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  Ce site utilise uniquement des cookies strictement nécessaires à son fonctionnement (préférence de thème, session d&apos;authentification). Aucun cookie publicitaire ni traceur tiers à des fins de profilage n&apos;est déposé. Votre préférence de thème est stockée localement dans votre navigateur.
                </p>
              </article>

              <article id="responsabilite" style={{ padding: '26px 0', borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>07</span>
                  Limitation de responsabilité
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  AuditIQ fournit une analyse documentée des écarts mesurés sur les systèmes audités. La qualification réglementaire finale et les décisions de conformité relèvent de la responsabilité de l&apos;utilisateur et de son responsable conformité. AuditIQ n&apos;est pas un organisme notifié au sens de l&apos;article 43 du règlement (UE) 2024/1689 et ne délivre pas de certificat de conformité.
                </p>
              </article>

              <article id="droit" style={{ padding: '26px 0', scrollMarginTop: '92px' }}>
                <h2 style={{ fontSize: '19px', letterSpacing: '-0.02em' }}>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--accent)', marginRight: '10px' }}>08</span>
                  Droit applicable
                </h2>
                <p style={{ color: 'var(--fg-secondary)', fontSize: '14.5px', lineHeight: 1.65, marginTop: '12px' }}>
                  Les présentes mentions légales sont régies par le droit français. Tout litige relatif à leur interprétation ou à l&apos;utilisation du site relève de la compétence des tribunaux français, sous réserve des dispositions légales impératives applicables.
                </p>
              </article>

            </div>
          </div>
        </div>
      </section>
    </>
  );
}
