import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Cas d'usage — AuditIQ",
  description:
    "Six scénarios concrets d'audit de fairness IA : RH & recrutement, scoring crédit, chatbot SAV, assurance, marketing, service client.",
};

/* ============================================================================
   Cas d'usage — R8a rewrite per maquette docs/design/auditiq-vitrine-v3/cas-usage.html
   Styles: ./vitrine.css (imported in layout.tsx)
   ============================================================================ */

export default function CasUsagePage() {
  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <header className="page-head">
        <div className="wrap">
          <p className="kicker">Cas d&apos;usage</p>
          <h1>Six scénarios concrets où la fairness compte.</h1>
          <p className="lead">
            AuditIQ a été conçu pour les IA réellement déployées en PME : tri de CV, scoring
            crédit, chatbot SAV, tarification d&apos;assurance, ciblage marketing, routage de
            tickets. Voici comment ça se passe en pratique, dossier par dossier.
          </p>
        </div>
      </header>

      {/* ── ANCHOR NAV ───────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '65px', zIndex: 40, background: 'var(--surface-glass)', backdropFilter: 'blur(14px) saturate(1.4)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="wrap" style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '10px 28px' }}>
          <a href="#rh" style={{ padding: '7px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 450, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>RH &amp; recrutement</a>
          <a href="#credit" style={{ padding: '7px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 450, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Crédit &amp; scoring</a>
          <a href="#chatbot" style={{ padding: '7px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 450, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Chatbot SAV</a>
          <a href="#autres" style={{ padding: '7px 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 450, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Autres cas</a>
        </div>
      </div>

      {/* ── RH ───────────────────────────────────────────────────────────── */}
      <section id="rh" style={{ scrollMarginTop: '130px' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
            <div>
              <span className="eyebrow acc">Ressources humaines</span>
              <h2 className="title" style={{ marginTop: '12px', marginBottom: '6px' }}>IA de tri de CV en cabinet de conseil.</h2>
              <p className="lede" style={{ fontSize: '17px', marginBottom: '24px' }}>180 collaborateurs, 60 recrutements par an, présélection automatique des candidatures.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Le contexte</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Depuis 18 mois, un outil de présélection score chaque CV ; les 20&nbsp;% les mieux notés passent en entretien. Personne en interne n&apos;a la capacité technique de vérifier d&apos;éventuels biais.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>L&apos;audit AuditIQ</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Module 1 (supervisé). Variable cible&nbsp;: <span className="mono" style={{ color: 'var(--accent)' }}>short_listed</span>. Attribut sensible&nbsp;: genre. 412 candidatures de 2024 analysées, quatre métriques calculées.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Le résultat</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Demographic Parity à 0,78, sous le seuil de 0,80&nbsp;: 12 points d&apos;écart de présélection entre profils. Equal Opportunity à 0,92 — le modèle ne pénalise pas les profils qualifiés, mais sur-sélectionne en amont. Recommandation&nbsp;: revoir le poids du critère «&nbsp;expérience continue&nbsp;».</p>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Recrutement_2024.csv</div>
                  <div className="mono" style={{ fontSize: '11.5px', color: 'var(--fg-muted)', marginTop: '2px' }}>Audit du 14 mars 2026</div>
                </div>
                <span className="pill warn">Score 3/5</span>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '9px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.5 }}>412 candidatures · cible&nbsp;: short_listed · attribut&nbsp;: genre · 4 métriques</div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}><span>Demographic Parity</span><span className="pill warn">0.78</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}><span>Equal Opportunity</span><span className="pill pass">0.92</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}><span>Equalized Odds</span><span className="pill warn">0.81</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '12px', padding: '11px 0', fontSize: '14px' }}><span>Règle des 4/5</span><span className="pill fail">0.73</span></div>
              </div>
              <div style={{ padding: '13px 15px', borderRadius: '9px', background: 'var(--info-bg)', border: '1px solid var(--info-border)', fontSize: '12.5px', color: 'var(--fg-secondary)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Recommandation prioritaire.</strong> Revoir le poids du critère «&nbsp;expérience continue&nbsp;»&nbsp;: il pénalise mécaniquement les profils ayant pris un congé parental.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CRÉDIT ───────────────────────────────────────────────────────── */}
      <section id="credit" style={{ borderTop: '1px solid var(--border-subtle)', scrollMarginTop: '130px' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '130px', order: 2 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Demandes_credit_Q3.csv</div>
                  <div className="mono" style={{ fontSize: '11.5px', color: 'var(--fg-muted)', marginTop: '2px' }}>Audit du 22 mars 2026</div>
                </div>
                <span className="pill fail">Score 1/5</span>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: '9px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.5 }}>2 840 demandes · clustering DBSCAN · 4 clusters · proxy détecté</div>
              <div style={{ padding: '15px', borderRadius: '11px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="eyebrow">Cluster déviant C4</span>
                <h4 style={{ fontSize: '15px', marginTop: '6px' }}>60&nbsp;% des refus pour 18&nbsp;% de l&apos;échantillon</h4>
                <p className="lede" style={{ fontSize: '13px', marginTop: '7px' }}>Feature dominante&nbsp;: code postal — information mutuelle de 0,82 avec l&apos;origine présumée. Le code postal agit comme proxy.</p>
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}><span>Demographic Parity (origine)</span><span className="pill fail">0.71</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '12px', padding: '11px 0', fontSize: '14px' }}><span>Règle des 4/5</span><span className="pill fail">0.69</span></div>
              </div>
              <div style={{ padding: '13px 15px', borderRadius: '9px', background: 'var(--fail-bg)', border: '1px solid var(--fail-border)', fontSize: '12.5px', color: 'var(--fg-secondary)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>AI Act, article 10 §&nbsp;2.f.</strong> Risque élevé. Une remédiation est nécessaire avant la mise en application (août 2026).
              </div>
            </div>
            <div style={{ order: 1 }}>
              <span className="eyebrow acc">Crédit &amp; scoring</span>
              <h2 className="title" style={{ marginTop: '12px', marginBottom: '6px' }}>Scoring crédit en banque régionale.</h2>
              <p className="lede" style={{ fontSize: '17px', marginBottom: '24px' }}>420 collaborateurs, 38&nbsp;000 demandes par an, modèle de scoring entraîné en interne.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Le contexte</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Le responsable conformité doit produire avant juillet 2026 une preuve de fairness sur un modèle déployé il y a deux ans, entraîné sur des données historiques sans audit préalable.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>L&apos;audit AuditIQ</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Module 2 (non supervisé) pour détecter d&apos;éventuels proxies, puis Module 1 (supervisé) sur la fonction de décision. 2 840 demandes du Q3 2025 analysées.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Le résultat</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Un cluster sur-représenté dans les refus (60&nbsp;% des refus pour 18&nbsp;% de l&apos;échantillon), tiré par le code postal. Module 1 confirme&nbsp;: Demographic Parity à 0,71 sur l&apos;axe origine présumée.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHATBOT ──────────────────────────────────────────────────────── */}
      <section id="chatbot" style={{ borderTop: '1px solid var(--border-subtle)', scrollMarginTop: '130px' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
            <div>
              <span className="eyebrow acc">Chatbot service client</span>
              <h2 className="title" style={{ marginTop: '12px', marginBottom: '6px' }}>Assistant LLM pour le SAV.</h2>
              <p className="lede" style={{ fontSize: '17px', marginBottom: '24px' }}>Équipement industriel, 240 collaborateurs, chatbot Mistral-7B déployé sur le portail client B2B.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Le contexte</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Le chatbot traite 12&nbsp;000 sollicitations par mois. Une remontée interne signale un traitement «&nbsp;plus court et moins pédagogique&nbsp;» selon l&apos;interlocuteur. L&apos;équipe veut documenter et corriger.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>L&apos;audit AuditIQ</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Module 3 (LLM). 412 prompts pairs sur six axes, métriques par axe&nbsp;: longueur, sentiment, taux de refus. Test en condition de production, sans modifier l&apos;endpoint.</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', marginBottom: '5px' }}>Le résultat</h4>
                  <p className="lede" style={{ fontSize: '14px', lineHeight: 1.6 }}>Score global 3,2/5. Axe handicap à 2,1/5&nbsp;: le chatbot redirige plus souvent vers un «&nbsp;service spécialisé&nbsp;» quand le prompt évoque un handicap, sans répondre directement. Recommandation&nbsp;: revoir l&apos;instruction système et les exemples de fine-tuning.</p>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Chatbot SAV · Mistral-7B</div>
                  <div className="mono" style={{ fontSize: '11.5px', color: 'var(--fg-muted)', marginTop: '2px' }}>Audit du 8 avril 2026</div>
                </div>
                <span className="pill warn">Score 3.2/5</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '13px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <span className="eyebrow">Genre</span>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: 'var(--pass)' }}>4,1<span style={{ color: 'var(--fg-muted)', fontSize: '13px' }}> / 5</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--pass)' }}>Faibles écarts</div>
                </div>
                <div style={{ padding: '13px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <span className="eyebrow">Origine</span>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: 'var(--warn)' }}>2,8<span style={{ color: 'var(--fg-muted)', fontSize: '13px' }}> / 5</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--warn)' }}>Écarts modérés</div>
                </div>
                <div style={{ padding: '13px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <span className="eyebrow">Âge</span>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: 'var(--warn)' }}>3,5<span style={{ color: 'var(--fg-muted)', fontSize: '13px' }}> / 5</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--warn)' }}>Acceptable</div>
                </div>
                <div style={{ padding: '13px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--fail-border)' }}>
                  <span className="eyebrow">Handicap</span>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: 'var(--fail)' }}>2,1<span style={{ color: 'var(--fg-muted)', fontSize: '13px' }}> / 5</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--fail)' }}>Écarts significatifs</div>
                </div>
              </div>
              <div style={{ padding: '13px 15px', borderRadius: '9px', background: 'var(--info-bg)', border: '1px solid var(--info-border)', fontSize: '12.5px', color: 'var(--fg-secondary)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Extrait significatif.</strong> Profil A (handicap non mentionné)&nbsp;: 142 mots, ton informatif. Profil B (handicap mentionné)&nbsp;: 38 mots, redirection systématique.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUTRES CAS ───────────────────────────────────────────────────── */}
      <section id="autres" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)', scrollMarginTop: '130px' }}>
        <div className="wrap">
          <div style={{ maxWidth: '760px' }}>
            <p className="eyebrow acc">Autres cas d&apos;usage</p>
            <h2 className="title" style={{ marginTop: '12px' }}>AuditIQ s&apos;adapte à toutes vos IA en production.</h2>
            <p className="lede" style={{ marginTop: '14px', fontSize: '17px' }}>Trois exemples complémentaires de mise en œuvre, sur des cas vus chez nos clients pilotes.</p>
          </div>
          <div className="g3" style={{ marginTop: '32px' }}>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
              <span className="eyebrow acc">Assurance</span>
              <h4 style={{ fontSize: '16px' }}>Tarification d&apos;assurance auto</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>Modèle de tarification ML d&apos;une mutuelle régionale. Audit Module 1 sur l&apos;âge, par tranches de 5 ans. Détection d&apos;une sur-tarification non justifiée sur les 18–22 ans.</p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--fg-muted)' }}>Module 01 · Audit supervisé</div>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
              <span className="eyebrow acc">Marketing</span>
              <h4 style={{ fontSize: '16px' }}>Ciblage publicitaire B2C</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>Scoring d&apos;appétence pour un e-commerce mode. Audit Module 2 pour détecter des proxies de genre dans les features comportementales (navigation, panier moyen).</p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--fg-muted)' }}>Module 02 · Non supervisé</div>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
              <span className="eyebrow acc">Service client</span>
              <h4 style={{ fontSize: '16px' }}>Routage automatique de tickets</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>Classification de tickets entre niveaux 1, 2 et 3 chez un éditeur SaaS. Audit Module 1 sur la priorité, attributs déduits du contenu — sous-traitement systématique détecté.</p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--fg-muted)' }}>Module 01 · Audit supervisé</div>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
              <span className="eyebrow acc">Santé</span>
              <h4 style={{ fontSize: '16px' }}>Triage en téléconsultation</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>Système de triage symptômes-vers-urgence d&apos;une plateforme de téléconsultation. Audit Module 3 avec banque de prompts médicaux, axes genre et origine.</p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--fg-muted)' }}>Module 03 · LLM</div>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
              <span className="eyebrow acc">RH</span>
              <h4 style={{ fontSize: '16px' }}>IA d&apos;évaluation annuelle</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>Synthèse automatique d&apos;évaluation d&apos;objectifs chez un éditeur SaaS. Audit Module 3 sur les commentaires générés, axes genre et âge.</p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--fg-muted)' }}>Module 03 · LLM</div>
            </div>
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
              <span className="eyebrow acc">Logistique</span>
              <h4 style={{ fontSize: '16px' }}>Modèle de churn client B2B</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>Prédiction de churn pour une PME logistique. Audit Module 2 sur le dataset CRM, recherche de clusters déviants sur la taille d&apos;entreprise et le secteur.</p>
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--fg-muted)' }}>Module 02 · Non supervisé</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="wrap">
          <div className="card" style={{ padding: 'clamp(32px,5vw,52px)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'center', background: 'linear-gradient(110deg, var(--accent-softer), transparent 58%)' }}>
            <div>
              <p className="eyebrow acc">Votre cas d&apos;usage</p>
              <h2 className="title" style={{ marginTop: '12px' }}>Et le vôtre, on en parle&nbsp;?</h2>
              <p className="lede" style={{ marginTop: '12px', maxWidth: '52ch' }}>Lancez un audit pilote gratuit sur l&apos;une de vos IA en production, ou échangez avec notre équipe sur votre périmètre.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link className="btn btn-primary lg" href="/sign-up">Essayer gratuitement</Link>
              <Link className="btn btn-outline lg" href="/contact">Nous contacter</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
