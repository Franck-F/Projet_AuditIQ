/* =============================================================================
   AuditIQ — Nouvel audit (wizard). Page vitrine.
   Rail d'étapes · panneau central · aide contextuelle.
   ============================================================================= */

const WZ_STEPS = [
  { id: "context", n: "01", label: "Contexte", desc: "Cadre & objectif", icon: Icons.flag },
  { id: "data", n: "02", label: "Données", desc: "Jeu de test", icon: Icons.database },
  { id: "attrs", n: "03", label: "Attributs protégés", desc: "Genre, âge…", icon: Icons.users },
  { id: "metrics", n: "04", label: "Métriques", desc: "Réglementaire", icon: Icons.scale },
  { id: "review", n: "05", label: "Revue & lancement", desc: "Vérification", icon: Icons.zap },
];

const WZ_HELP = {
  context: { title: "Pourquoi définir un contexte ?", body: "Le cadre d'usage détermine les seuils réglementaires appliqués. Un modèle de scoring crédit relève du RGPD et de la directive sur le crédit ; un outil RH relève du droit du travail. AuditIQ adapte automatiquement les métriques et les seuils légaux.", tips: ["Choisissez le domaine le plus proche de l'usage réel", "Le secteur ajuste les obligations de transparence"] },
  data: { title: "Quel jeu de données fournir ?", body: "Importez un échantillon représentatif des décisions du modèle : les features d'entrée, la prédiction, et idéalement la vérité terrain. AuditIQ ne stocke jamais les données brutes — seules les métriques agrégées sont conservées.", tips: ["CSV ou Parquet, jusqu'à 2 Go", "Min. 1 000 lignes pour des intervalles de confiance fiables", "Les attributs protégés peuvent être chiffrés"] },
  attrs: { title: "Les attributs protégés", body: "Ce sont les caractéristiques sur lesquelles la loi interdit la discrimination : genre, âge, origine, handicap… AuditIQ mesure l'écart de traitement entre les groupes pour chacun.", tips: ["Sélectionnez au moins un attribut", "Le groupe de référence sert de base de comparaison"] },
  metrics: { title: "Les métriques de fairness", body: "Chaque métrique capture une notion d'équité différente. La règle des 4/5 (80 %) est le standard juridique le plus établi ; la parité démographique et l'égalité des chances complètent l'analyse.", tips: ["La règle des 4/5 est recommandée par défaut", "Plusieurs métriques peuvent être en tension — c'est normal"] },
  review: { title: "Avant de lancer", body: "Vérifiez la configuration. L'exécution prend en moyenne 6 minutes. Vous recevrez une notification et un rapport PDF signé, opposable en cas de contrôle.", tips: ["Le rapport est horodaté et versionné", "Vous pourrez relancer l'audit à tout moment"] },
};

const DOMAINS = [
  { v: "credit", t: "Crédit & scoring financier", d: "Octroi de prêt, notation, éligibilité — RGPD, directive crédit", icon: Icons.scale },
  { v: "hr", t: "Ressources humaines", d: "Recrutement, tri de CV, promotion — droit du travail", icon: Icons.users },
  { v: "insurance", t: "Assurance", d: "Tarification, gestion des sinistres — Code des assurances", icon: Icons.shield },
  { v: "other", t: "Autre usage à fort enjeu", d: "Santé, justice, accès aux services publics", icon: Icons.target },
];
const ATTRS = [
  { v: "gender", t: "Genre", groups: "Femme · Homme · Non-binaire" },
  { v: "age", t: "Âge", groups: "< 25 · 25–45 · 45–60 · 60+" },
  { v: "origin", t: "Origine perçue", groups: "Estimée par proxy géographique" },
  { v: "disability", t: "Situation de handicap", groups: "RQTH déclarée" },
];
const METRICS_DEF = [
  { v: "four_fifths", t: "Règle des 4/5 (80 %)", d: "Le taux de sélection d'un groupe doit atteindre ≥ 80 % de celui du groupe favorisé.", reco: true },
  { v: "demographic", t: "Parité démographique", d: "Les taux de décision favorable doivent être proches entre groupes.", reco: true },
  { v: "equal_opp", t: "Égalité des chances", d: "À mérite égal, même taux de vrais positifs entre groupes.", reco: false },
  { v: "calibration", t: "Calibration", d: "Un score donné doit signifier la même probabilité pour tous les groupes.", reco: false },
];

function WizardHelp({ step }) {
  const h = WZ_HELP[step];
  return (
    <aside style={{ width: 300, flexShrink: 0 }}>
      <div style={{ position: "sticky", top: 100 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}><Icons.help size={15} style={{ color: "var(--accent)" }} /></div>
            <span className="eyebrow">Aide contextuelle</span>
          </div>
          <h4 style={{ fontSize: 14.5, marginBottom: 8 }}>{h.title}</h4>
          <p style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6 }}>{h.body}</p>
          <hr className="divider" style={{ margin: "14px 0" }} />
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {h.tips.map((t, i) => (
              <li key={i} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
                <Icons.check size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />{t}
              </li>
            ))}
          </ul>
        </Card>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)" }}>
          <Icons.book size={15} style={{ color: "var(--fg-muted)" }} />Guide méthodologique complet<Icons.ext size={13} style={{ color: "var(--fg-disabled)", marginLeft: "auto" }} />
        </a>
      </div>
    </aside>
  );
}

function Wizard({ go }) {
  const [step, setStep] = useState(0);
  const cur = WZ_STEPS[step].id;
  const [domain, setDomain] = useState("credit");
  const [attrs, setAttrs] = useState(["gender", "age"]);
  const [metrics, setMetrics] = useState(["four_fifths", "demographic"]);
  const [dropped, setDropped] = useState(true);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const next = () => setStep((s) => Math.min(WZ_STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Page>
      <Topbar title="Nouvel audit" crumbs={["AuditIQ", "Audits", "Nouvel audit"]}
        actions={<Button variant="ghost" icon={Icons.x} onClick={() => go("audits")}>Annuler</Button>} />

      <div className="page wide" style={{ padding: 0, display: "grid", gridTemplateColumns: "236px 1fr 300px", gap: 24, alignItems: "start" }}>
        {/* RAIL */}
        <aside style={{ position: "sticky", top: 100 }}>
          <div className="eyebrow" style={{ marginBottom: 14, paddingLeft: 4 }}>Configuration · {step + 1}/5</div>
          <div className="wz-rail">
            {WZ_STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button className={`wz-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} onClick={() => setStep(i)}>
                  <span className="wz-marker">{i < step ? <Icons.check size={13} /> : s.n}</span>
                  <span style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, color: i <= step ? "var(--fg)" : "var(--fg-muted)" }}>{s.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--fg-muted)", marginTop: 1 }}>{s.desc}</span>
                  </span>
                </button>
                {i < WZ_STEPS.length - 1 && <div className={`wz-line ${i < step ? "done" : ""}`} />}
              </React.Fragment>
            ))}
          </div>
          <Card style={{ marginTop: 18, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--fg-muted)" }}>
              <Icons.clock size={14} />Durée estimée · ~6 min
            </div>
          </Card>
        </aside>

        {/* PANEL */}
        <main className="stack" style={{ gap: 0, minWidth: 0 }}>
          <div key={cur} className="fade-up">
            {cur === "context" && (
              <div className="stack" style={{ gap: 22 }}>
                <SectionHead eyebrow="Étape 01 · Contexte" title="Quel système souhaitez-vous auditer ?" sub="Le cadre d'usage détermine les obligations légales et les seuils appliqués automatiquement." />
                <Field label="Nom de l'audit" req hint="Visible par votre équipe dans l'historique.">
                  <Input defaultValue="Scoring crédit — Particuliers Q2" placeholder="Ex. Tri de CV — Recrutement tech" />
                </Field>
                <div className="grid-2">
                  <Field label="Modèle évalué" req><Input icon={Icons.layers} defaultValue="credit-scoring-v4" /></Field>
                  <Field label="Version / environnement"><Select defaultValue="prod"><option value="prod">Production</option><option>Pré-production</option><option>Bac à sable</option></Select></Field>
                </div>
                <Field label="Domaine d'application" req hint="Détermine le référentiel réglementaire.">
                  <div className="choice-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {DOMAINS.map((d) => <Choice key={d.v} icon={d.icon} title={d.t} desc={d.d} selected={domain === d.v} onClick={() => setDomain(d.v)} />)}
                  </div>
                </Field>
              </div>
            )}

            {cur === "data" && (
              <div className="stack" style={{ gap: 22 }}>
                <SectionHead eyebrow="Étape 02 · Données" title="Importez votre jeu de test" sub="Un échantillon représentatif des décisions du modèle. Les données brutes ne sont jamais conservées." />
                <div onClick={() => setDropped(true)} style={{ border: `1.5px dashed ${dropped ? "var(--accent-border)" : "var(--border-strong)"}`, borderRadius: 14, padding: "36px 24px", textAlign: "center", background: dropped ? "var(--accent-softer)" : "var(--surface-2)", cursor: "pointer", transition: "all .2s" }}>
                  {!dropped ? (<>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-3)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icons.upload size={22} style={{ color: "var(--fg-muted)" }} /></div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>Déposez votre fichier ici</div>
                    <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4 }}>CSV ou Parquet · jusqu'à 2 Go · min. 1 000 lignes</p>
                  </>) : (<>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icons.checkCircle size={24} style={{ color: "var(--accent)" }} /></div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>credit_decisions_q2.parquet</div>
                    <p className="mono" style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 4 }}>148 320 lignes · 24 colonnes · 86 Mo</p>
                  </>)}
                </div>
                {dropped && (
                  <Card pad={false}>
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="eyebrow">Colonnes détectées</span><Badge status="pass" dot soft size="sm">Schéma valide</Badge>
                    </div>
                    <div style={{ padding: "6px 8px" }}>
                      {[["application_id", "Identifiant", "neutral"], ["income, debt_ratio, …", "Features (18)", "neutral"], ["decision", "Prédiction du modèle", "info"], ["repaid", "Vérité terrain", "pass"], ["gender, age_band", "Attributs protégés", "warn"]].map(([col, role, st], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 8 }}>
                          <span className="mono" style={{ fontSize: 13 }}>{col}</span>
                          <Badge status={st} size="sm" soft>{role}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                <InlineNote icon={Icons.lock}>Conformité par conception : AuditIQ calcule les métriques en mémoire et ne conserve que les résultats agrégés. Aucune donnée personnelle n'est stockée.</InlineNote>
              </div>
            )}

            {cur === "attrs" && (
              <div className="stack" style={{ gap: 22 }}>
                <SectionHead eyebrow="Étape 03 · Attributs protégés" title="Sur quels critères mesurer l'équité ?" sub="Les caractéristiques sur lesquelles la loi interdit la discrimination. AuditIQ compare le traitement entre groupes." />
                <div className="choice-grid">
                  {ATTRS.map((a) => (
                    <button key={a.v} type="button" className={`choice ${attrs.includes(a.v) ? "sel" : ""}`} onClick={() => toggle(attrs, setAttrs, a.v)} style={{ alignItems: "center" }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${attrs.includes(a.v) ? "var(--accent)" : "var(--border-strong)"}`, background: attrs.includes(a.v) ? "var(--accent)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>{attrs.includes(a.v) && <Icons.check size={12} style={{ color: "var(--accent-fg)" }} />}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{a.t}</span>
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }} className="mono">{a.groups}</span>
                      </span>
                      {attrs.includes(a.v) && <Badge status="info" size="sm" soft>Réf. : groupe majoritaire</Badge>}
                    </button>
                  ))}
                </div>
                <InlineNote>{attrs.length} attribut{attrs.length > 1 ? "s" : ""} sélectionné{attrs.length > 1 ? "s" : ""}. AuditIQ produira une analyse croisée pour détecter les biais d'intersectionnalité (ex. femmes de plus de 60 ans).</InlineNote>
              </div>
            )}

            {cur === "metrics" && (
              <div className="stack" style={{ gap: 22 }}>
                <SectionHead eyebrow="Étape 04 · Métriques" title="Quelles définitions de l'équité appliquer ?" sub="Chaque métrique capture une notion différente. Nous recommandons celles marquées « Conseillé »." />
                <div className="choice-grid">
                  {METRICS_DEF.map((m) => (
                    <button key={m.v} type="button" className={`choice ${metrics.includes(m.v) ? "sel" : ""}`} onClick={() => toggle(metrics, setMetrics, m.v)}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${metrics.includes(m.v) ? "var(--accent)" : "var(--border-strong)"}`, background: metrics.includes(m.v) ? "var(--accent)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>{metrics.includes(m.v) && <Icons.check size={12} style={{ color: "var(--accent-fg)" }} />}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{m.t}</span>
                          {m.reco && <Badge status="pass" size="sm" soft>Conseillé</Badge>}
                        </span>
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--fg-muted)", marginTop: 3, lineHeight: 1.45 }}>{m.d}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cur === "review" && (
              <div className="stack" style={{ gap: 22 }}>
                <SectionHead eyebrow="Étape 05 · Revue" title="Tout est prêt pour le lancement" sub="Vérifiez la configuration ci-dessous. L'exécution génère un rapport horodaté, opposable en cas de contrôle." />
                <Card pad={false}>
                  {[
                    ["Audit", "Scoring crédit — Particuliers Q2", Icons.flag],
                    ["Modèle", "credit-scoring-v4 · Production", Icons.layers],
                    ["Domaine", "Crédit & scoring financier", Icons.scale],
                    ["Jeu de données", "148 320 lignes · validé", Icons.database],
                    ["Attributs protégés", attrs.map((a) => ATTRS.find((x) => x.v === a)?.t).join(", "), Icons.users],
                    ["Métriques", `${metrics.length} sélectionnées`, Icons.target],
                  ].map(([k, v, I], i, arr) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 18px", borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : 0 }}>
                      <I size={17} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                      <span style={{ width: 150, fontSize: 12.5, color: "var(--fg-muted)" }}>{k}</span>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 450, color: "var(--fg)" }}>{v}</span>
                      <Icons.check size={16} style={{ color: "var(--accent)" }} />
                    </div>
                  ))}
                </Card>
                <Card style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--accent-softer)", borderColor: "var(--accent-border)" }}>
                  <Icons.zap size={22} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>Prêt à exécuter l'audit</div>
                    <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 2 }}>Durée estimée ~6 min. Vous serez notifié dès la fin.</p>
                  </div>
                  <Button variant="primary" size="lg" icon={Icons.shield} onClick={() => go("result")}>Lancer l'audit</Button>
                </Card>
              </div>
            )}
          </div>

          {/* footer nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
            <Button variant="ghost" icon={Icons.chevL} onClick={prev} disabled={step === 0}>Précédent</Button>
            <StepDots steps={WZ_STEPS} current={step} />
            {step < WZ_STEPS.length - 1
              ? <Button variant="primary" iconR={Icons.arrowR} onClick={next}>Continuer</Button>
              : <Button variant="primary" icon={Icons.shield} onClick={() => go("result")}>Lancer l'audit</Button>}
          </div>
        </main>

        {/* HELP */}
        <WizardHelp step={cur} />
      </div>
    </Page>
  );
}

Object.assign(window, { Wizard });
