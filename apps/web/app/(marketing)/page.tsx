import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, CircleAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'AuditIQ — Auditez la fairness de votre IA' },
  description:
    "Plateforme SaaS d'audit de biais des systèmes d'IA pour PME. Détectez, expliquez et documentez les écarts — premier audit en moins de 10 minutes. Pensé pour les exigences de l'AI Act européen.",
};

/* ============================================================================
   Landing — R7 vitrine rewrite (tunnel-hero + ledger + 8 sections per maquette)
   Styles: ./vitrine.css (imported in layout.tsx)
   ============================================================================ */

export default function LandingPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header className="hero">
        {/* Tunnel rings (decorative) */}
        <div className="tunnel" aria-hidden="true">
          <div className="tunnel-glow" />
          <div className="tunnel-rings">
            <i style={{ animationDelay: '0s', transform: 'translate(-50%,-50%) scale(0.060)' }} />
            <i style={{ animationDelay: '-0.57s', transform: 'translate(-50%,-50%) scale(0.132)' }} />
            <i style={{ animationDelay: '-1.14s', transform: 'translate(-50%,-50%) scale(0.205)' }} />
            <i style={{ animationDelay: '-1.71s', transform: 'translate(-50%,-50%) scale(0.277)' }} />
            <i style={{ animationDelay: '-2.29s', transform: 'translate(-50%,-50%) scale(0.349)' }} />
            <i style={{ animationDelay: '-2.86s', transform: 'translate(-50%,-50%) scale(0.422)' }} />
            <i style={{ animationDelay: '-3.43s', transform: 'translate(-50%,-50%) scale(0.494)' }} />
            <i style={{ animationDelay: '-4.00s', transform: 'translate(-50%,-50%) scale(0.566)' }} />
            <i style={{ animationDelay: '-4.57s', transform: 'translate(-50%,-50%) scale(0.639)' }} />
            <i style={{ animationDelay: '-5.14s', transform: 'translate(-50%,-50%) scale(0.711)' }} />
            <i style={{ animationDelay: '-5.71s', transform: 'translate(-50%,-50%) scale(0.783)' }} />
            <i style={{ animationDelay: '-6.29s', transform: 'translate(-50%,-50%) scale(0.855)' }} />
            <i style={{ animationDelay: '-6.86s', transform: 'translate(-50%,-50%) scale(0.928)' }} />
            <i style={{ animationDelay: '-7.43s', transform: 'translate(-50%,-50%) scale(1.000)' }} />
          </div>
        </div>

        <div className="wrap">
          <div className="hero-lead rv">
            <p className="hero-kicker">Audit de fairness · Pensé pour l&apos;AI Act</p>
            <h1>
              Détectez les biais de votre IA. Documentez votre <em>conformité</em>.
            </h1>
            <p className="hero-sub">
              AuditIQ mesure l&apos;équité de vos modèles et chatbots, explique chaque écart en
              langage clair et génère un rapport documenté et traçable, aligné sur l&apos;AI Act.
              Sans écrire une ligne de code.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary lg" href="/inscription">
                Essayer gratuitement
                <ArrowRight size={17} strokeWidth={1.7} />
              </Link>
              <a className="tlink" href="#etapes">
                Voir comment ça marche
                <ArrowRight size={16} strokeWidth={1.8} />
              </a>
            </div>
            <div className="hero-meta">
              <span><b />Premier audit gratuit</span>
              <span><b />Hébergement européen</span>
              <span><b />Premier audit en moins de 10 minutes</span>
            </div>
          </div>

          {/* Ledger card */}
          <div className="ledger rv">
            <div className="ledger-top">
              <div className="ledger-id">
                <span className="mono" style={{ fontSize: '12px', letterSpacing: '.05em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                  AUD-2026-0314
                </span>
                <span style={{ fontSize: '15px', fontWeight: 500 }}>Recrutement_2024.csv</span>
                <span className="pill" style={{ color: 'var(--fg-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  Module 1 · attribut genre
                </span>
              </div>
              <div className="ledger-verdict">
                <span className="dots">
                  <i style={{ background: 'var(--warn)' }} />
                  <i style={{ background: 'var(--warn)' }} />
                  <i />
                </span>
                <span className="pill warn">Vigilance · 2 alertes sur 5</span>
              </div>
            </div>

            <div className="ledger-body">
              {/* Metric 1 — Demographic Parity */}
              <div className="ledger-metric">
                <div className="lv">
                  <span className="eyebrow" style={{ fontSize: '11px' }}>Égalité de traitement (Demographic Parity)</span>
                  <span className="val" style={{ color: 'var(--warn)' }}>0.78</span>
                </div>
                <div className="meter">
                  <span style={{ width: '78%', background: 'var(--warn)' }} />
                  <span className="tick" style={{ left: '80%' }} />
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--fg-muted)' }}>
                  Sous le seuil de 0.80 · règle des 4/5
                </div>
              </div>

              {/* Metric 2 — Equal Opportunity */}
              <div className="ledger-metric">
                <div className="lv">
                  <span className="eyebrow" style={{ fontSize: '11px' }}>Égalité des chances (Equal Opportunity)</span>
                  <span className="val" style={{ color: 'var(--accent)' }}>0.92</span>
                </div>
                <div className="meter">
                  <span style={{ width: '92%', background: 'var(--accent)' }} />
                  <span className="tick" style={{ left: '80%' }} />
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--fg-muted)' }}>
                  Conforme · écart résiduel
                </div>
              </div>

              {/* Metric 3 — Equalized Odds */}
              <div className="ledger-metric">
                <div className="lv">
                  <span className="eyebrow" style={{ fontSize: '11px' }}>Égalité des taux d&apos;erreur (Equalized Odds)</span>
                  <span className="val" style={{ color: 'var(--warn)' }}>0.74</span>
                </div>
                <div className="meter">
                  <span style={{ width: '74%', background: 'var(--warn)' }} />
                  <span className="tick" style={{ left: '80%' }} />
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--fg-muted)' }}>
                  Sous le seuil de 0.80 · à corriger
                </div>
              </div>
            </div>

            <div className="ledger-foot">
              <CircleAlert size={14} strokeWidth={1.7} style={{ flexShrink: 0 }} />
              <span>Aperçu produit — valeurs issues d&apos;un scénario RH fictif, à titre d&apos;illustration.</span>
            </div>
          </div>

          {/* Marquee */}
          <div className="cloud-wrap rv" style={{ marginTop: 'clamp(48px,6vw,72px)' }}>
            <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '18px' }}>
              S&apos;appuie sur les outils et méthodes de référence de la fairness
            </p>
            <div className="marquee">
              <div className="marquee-track">
                <span className="marquee-item">Disparate Impact</span>
                <span className="marquee-item">Règle des 4/5</span>
                <span className="marquee-item">Demographic Parity</span>
                <span className="marquee-item">Equal Opportunity</span>
                <span className="marquee-item">Equalized Odds</span>
                <span className="marquee-item">Analyse intersectionnelle</span>
                <span className="marquee-item">Clustering k-means</span>
                <span className="marquee-item">Test du χ²</span>
                <span className="marquee-item">Prompts contrefactuels</span>
                <span className="marquee-item">Fairlearn</span>
                <span className="marquee-item">scikit-learn</span>
                {/* duplicate for infinite loop */}
                <span className="marquee-item" aria-hidden="true">Disparate Impact</span>
                <span className="marquee-item" aria-hidden="true">Règle des 4/5</span>
                <span className="marquee-item" aria-hidden="true">Demographic Parity</span>
                <span className="marquee-item" aria-hidden="true">Equal Opportunity</span>
                <span className="marquee-item" aria-hidden="true">Equalized Odds</span>
                <span className="marquee-item" aria-hidden="true">Analyse intersectionnelle</span>
                <span className="marquee-item" aria-hidden="true">Clustering k-means</span>
                <span className="marquee-item" aria-hidden="true">Test du χ²</span>
                <span className="marquee-item" aria-hidden="true">Prompts contrefactuels</span>
                <span className="marquee-item" aria-hidden="true">Fairlearn</span>
                <span className="marquee-item" aria-hidden="true">scikit-learn</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── PROBLEM ──────────────────────────────────────────────────────── */}
      <section id="produit">
        <div className="wrap g2">
          <div className="rv">
            <p className="eyebrow acc">Le problème</p>
            <h2 className="title" style={{ marginTop: '12px' }}>
              L&apos;AI Act s&apos;applique. Votre PME n&apos;a ni data scientist, ni juriste IA.
            </h2>
            <p className="lede" style={{ marginTop: '18px', fontSize: '17px' }}>
              Dès août 2026, les systèmes d&apos;IA à haut risque devront documenter la détection
              et la maîtrise de leurs biais, sous peine d&apos;amendes pouvant atteindre 3 % du
              chiffre d&apos;affaires mondial (article 99 du règlement).
            </p>
            <p className="lede" style={{ marginTop: '14px' }}>
              AuditIQ traduit la complexité technique et réglementaire en un produit que vos équipes
              savent utiliser : vous chargez vos données, nous calculons les métriques reconnues,
              expliquons les écarts et produisons un rapport documenté et traçable.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card prob rv">
              <span className="prob-mark">!</span>
              <div>
                <h4 style={{ fontSize: '16px' }}>Des biais invisibles</h4>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px' }}>
                  Un écart entre groupes peut passer inaperçu des mois — jusqu&apos;à la première
                  plainte ou au premier contrôle.
                </p>
              </div>
            </div>
            <div className="card prob rv">
              <span className="prob-mark">!</span>
              <div>
                <h4 style={{ fontSize: '16px' }}>Une expertise hors budget</h4>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px' }}>
                  Un cabinet fairness facture 15 à 60 k€ par audit, hors temps interne. Inaccessible
                  à la plupart des PME.
                </p>
              </div>
            </div>
            <div className="card prob rv">
              <span className="prob-mark">!</span>
              <div>
                <h4 style={{ fontSize: '16px' }}>Des outils pour data teams</h4>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px' }}>
                  Fairlearn, AIF360 ou Aequitas réclament Python. Le besoin réel parle conformité,
                  pas F1-score.
                </p>
              </div>
            </div>
            <div className="card prob rv">
              <span className="prob-mark">!</span>
              <div>
                <h4 style={{ fontSize: '16px' }}>Une charge documentaire lourde</h4>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px' }}>
                  Annexe IV, registre des systèmes, gouvernance des données : une traçabilité
                  difficile à produire à la main.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEPS ────────────────────────────────────────────────────────── */}
      <section
        id="etapes"
        style={{ borderBlock: '1px solid var(--border-subtle)', background: 'var(--surface)' }}
      >
        <div className="wrap">
          <div className="sec-center rv">
            <p className="eyebrow acc">Comment ça marche</p>
            <h2 className="title" style={{ marginTop: '12px' }}>
              Quatre étapes. Quelques minutes. Aucune ligne de code.
            </h2>
            <p className="lede" style={{ marginTop: '14px', fontSize: '17px' }}>
              Un parcours conçu pour des responsables RH, conformité ou innovation — pas pour des
              statisticiens.
            </p>
          </div>

          {/* Demo video — rendered with Remotion, see apps/remotion/ */}
          <div className="demo-video" style={{ marginTop: '44px' }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/video/comment-ca-marche-poster.jpg"
              aria-label="Démo : un audit AuditIQ en 4 étapes"
            >
              <source src="/video/comment-ca-marche.mp4" type="video/mp4" />
              <source src="/video/comment-ca-marche.webm" type="video/webm" />
            </video>
          </div>

          <div className="g4" style={{ marginTop: '44px' }}>
            <div className="card step rv">
              <span className="step-n">Étape 01</span>
              <h4 style={{ fontSize: '16px' }}>Importez vos données</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Un fichier CSV suffit aujourd&apos;hui. Les colonnes sont détectées et suggérées
                automatiquement.
              </p>
            </div>
            <div className="card step rv">
              <span className="step-n">Étape 02</span>
              <h4 style={{ fontSize: '16px' }}>Configurez l&apos;audit</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Désignez la variable de décision et les attributs sensibles. Gardez les seuils par
                défaut ou ajustez-les.
              </p>
            </div>
            <div className="card step rv">
              <span className="step-n">Étape 03</span>
              <h4 style={{ fontSize: '16px' }}>Recevez le diagnostic</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Feu tricolore, écarts par groupe, explication en langage clair et niveau de risque
                réglementaire.
              </p>
            </div>
            <div className="card step rv">
              <span className="step-n">Étape 04</span>
              <h4 style={{ fontSize: '16px' }}>Exportez la trace</h4>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Rapport PDF et Excel structurés selon l&apos;annexe IV de l&apos;AI Act, prêts pour
                votre DPO ou un auditeur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODULES ──────────────────────────────────────────────────────── */}
      <section id="modules">
        <div className="wrap">
          <div className="rv" style={{ maxWidth: '720px' }}>
            <p className="eyebrow acc">Trois modules d&apos;audit</p>
            <h2 className="title" style={{ marginTop: '12px' }}>
              Une couverture calée sur les IA réellement déployées en PME.
            </h2>
          </div>
          <div className="g3" style={{ marginTop: '40px' }}>
            {/* Module 01 */}
            <div className="card mod rv">
              <span className="step-n">Module 01</span>
              <h3 className="sub">Audit supervisé</h3>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Pour les modèles de classification ou de scoring (RH, crédit, assurance). Métriques
                fairness canoniques et écarts visualisés.
              </p>
              <ul>
                <li>Égalité de traitement, égalité des chances, égalité des taux d&apos;erreur</li>
                <li>Disparate Impact et règle des quatre cinquièmes (4/5)</li>
                <li>Analyse intersectionnelle par groupe et sous-groupe</li>
                <li>Explication en langage naturel</li>
              </ul>
              <Link className="mod-link" href="/modules">
                Détail du module
                <ArrowRight size={14} strokeWidth={1.8} />
              </Link>
            </div>

            {/* Module 02 */}
            <div className="card mod rv">
              <span className="step-n">Module 02</span>
              <h3 className="sub">Détection non supervisée</h3>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Pour les jeux de données sans variable cible. Identification de clusters déviants
                où un groupe protégé est sur-représenté — un signal possible de proxy.
              </p>
              <ul>
                <li>Clustering k-means paramétré</li>
                <li>Test du χ² sur la composition des clusters</li>
                <li>Variables dominantes par cluster</li>
                <li>Lecture pédagogique du risque</li>
              </ul>
              <Link className="mod-link" href="/modules">
                Détail du module
                <ArrowRight size={14} strokeWidth={1.8} />
              </Link>
            </div>

            {/* Module 03 */}
            <div className="card mod rv">
              <span className="step-n">Module 03</span>
              <h3 className="sub">Audit LLM &amp; chatbot</h3>
              <p className="lede" style={{ fontSize: '13.5px' }}>
                Pour les assistants conversationnels (SAV, RH, médical). Paires de prompts
                contrefactuels, comparaison des réponses, scoring multi-axes.
              </p>
              <ul>
                <li>Banque versionnée de paires de prompts (FR/EN)</li>
                <li>Longueur, polarité, taux de refus</li>
                <li>6 axes : genre, origine, âge, religion, handicap, orientation</li>
                <li>Extraits significatifs annotés</li>
              </ul>
              <Link className="mod-link" href="/modules">
                Détail du module
                <ArrowRight size={14} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI ACT ───────────────────────────────────────────────────────── */}
      <section
        id="conformite"
        style={{ borderBlock: '1px solid var(--border-subtle)', background: 'var(--surface)' }}
      >
        <div className="wrap">
          <div
            className="card rv"
            style={{
              padding: 'clamp(28px,4vw,48px)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '48px',
              alignItems: 'center',
            }}
          >
            <div>
              <p className="eyebrow acc">Ancrage réglementaire</p>
              <h2
                className="title"
                style={{ marginTop: '12px', fontSize: 'clamp(26px,3vw,34px)' }}
              >
                Alignée sur l&apos;AI Act et le droit français.
              </h2>
              <p className="lede" style={{ marginTop: '16px' }}>
                AuditIQ n&apos;a pas vocation à remplacer votre responsable conformité — il
                l&apos;outille. Chaque écart détecté est rattaché aux articles du règlement (UE)
                2024/1689 et aux textes français applicables.
              </p>
              <Link
                className="btn btn-outline"
                href="/ai-act"
                style={{ marginTop: '22px', display: 'inline-flex' }}
              >
                Lire la note AI Act complète
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <div
                className="art"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="art-num">Art. 10</span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>Gouvernance des données</h4>
                  <p className="lede" style={{ fontSize: '13px', marginTop: '3px' }}>
                    Détection des biais dans les jeux d&apos;entraînement, de validation et de test.
                  </p>
                </div>
              </div>
              <div
                className="art"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="art-num">Art. 13</span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>Transparence</h4>
                  <p className="lede" style={{ fontSize: '13px', marginTop: '3px' }}>
                    Notice détaillant les limites du système et les performances par sous-groupe.
                  </p>
                </div>
              </div>
              <div
                className="art"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="art-num">Art. 15</span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>Exactitude &amp; robustesse</h4>
                  <p className="lede" style={{ fontSize: '13px', marginTop: '3px' }}>
                    Performances désagrégées et mesure des biais sur tout le cycle de vie.
                  </p>
                </div>
              </div>
              <div
                className="art"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="art-num">Annexe IV</span>
                <div>
                  <h4 style={{ fontSize: '15px' }}>Documentation technique</h4>
                  <p className="lede" style={{ fontSize: '13px', marginTop: '3px' }}>
                    Pièce auditable, archivée et exportable pour les contrôles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rv"
            style={{
              marginTop: '18px',
              padding: '16px 18px',
              borderRadius: '11px',
              background: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              fontSize: '13.5px',
              color: 'var(--fg-secondary)',
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Avertissement.</strong>{' '}
            AuditIQ produit une analyse documentée des écarts mesurés. La qualification
            réglementaire finale relève de votre responsable conformité. AuditIQ n&apos;est pas un
            certificat délivré par un organisme notifié au sens de l&apos;article 43 du règlement
            (UE) 2024/1689.
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section
        id="tarifs"
        style={{ borderBlock: '1px solid var(--border-subtle)', background: 'var(--surface)' }}
      >
        <div className="wrap">
          <div className="sec-center rv">
            <p className="eyebrow acc">Tarifs</p>
            <h2 className="title" style={{ marginTop: '12px' }}>
              Commencez gratuitement. Passez à l&apos;échelle quand vous voulez.
            </h2>
            <p className="lede" style={{ marginTop: '14px', fontSize: '17px' }}>
              Quatre paliers — Découverte, PME, Entreprise, Souverain. Sans carte bancaire pour
              démarrer.
            </p>
          </div>

          <div className="price-grid" style={{ marginTop: '44px' }}>
            {/* Découverte */}
            <div className="card price rv">
              <div>
                <h3 style={{ fontSize: '20px' }}>Découverte</h3>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px' }}>
                  Pour auditer un premier modèle.
                </p>
              </div>
              <div className="price-amt">
                0 €<small> / pour toujours</small>
              </div>
              <ul>
                <li>
                  <Check size={17} strokeWidth={2} />
                  1 audit supervisé par mois
                </li>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Jusqu&apos;à 5 000 lignes par fichier
                </li>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Rapport PDF
                </li>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Hébergement européen
                </li>
              </ul>
              <Link className="btn btn-outline" href="/inscription" style={{ width: '100%' }}>
                Essayer gratuitement
              </Link>
            </div>

            {/* PME */}
            <div className="card price feat rv">
              <span className="price-tag">Recommandé</span>
              <div>
                <h3 style={{ fontSize: '20px' }}>PME</h3>
                <p className="lede" style={{ fontSize: '13.5px', marginTop: '4px' }}>
                  Pour une routine de conformité.
                </p>
              </div>
              <div className="price-amt">
                490 €<small> / mois HT</small>
              </div>
              <ul>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Audits illimités · 3 modules
                </li>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Jusqu&apos;à 1 million de lignes par fichier
                </li>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Rapports PDF &amp; Excel structurés AI Act
                </li>
                <li>
                  <Check size={17} strokeWidth={2} />
                  Support sous 24 h ouvrées
                </li>
              </ul>
              <Link className="btn btn-primary" href="/contact" style={{ width: '100%' }}>
                Demander un devis
              </Link>
            </div>
          </div>

          <p className="lede rv" style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
            Besoin de plus ? Les paliers <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Entreprise (1 490 €/mois)</strong>{' '}
            et <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Souverain (sur devis)</strong> sont détaillés sur{' '}
            <Link href="/tarifs" style={{ color: 'var(--accent)' }}>la page tarifs</Link>.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section>
        <div className="wrap">
          <div className="card final rv">
            <div>
              <p className="eyebrow acc">Passez à l&apos;action</p>
              <h2 className="title" style={{ marginTop: '12px' }}>
                Lancez votre premier audit fairness aujourd&apos;hui.
              </h2>
              <p className="lede" style={{ marginTop: '14px', maxWidth: '54ch' }}>
                Gratuit, sans carte bancaire. Importez vos données, obtenez un diagnostic et un
                rapport documenté et traçable — premier audit en moins de 10 minutes.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link className="btn btn-primary lg" href="/inscription">
                Essayer gratuitement
                <ArrowRight size={17} strokeWidth={1.7} />
              </Link>
              <Link className="btn btn-outline lg" href="/contact">
                Contactez-nous
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
