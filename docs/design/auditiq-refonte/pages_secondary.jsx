/* =============================================================================
   AuditIQ — Rapports · Recommandations · Équipe · Paramètres · Support · Auth
   ============================================================================= */

/* ---------- RAPPORTS ------------------------------------------------------- */
const REPORTS = [
  { name: "Audit fairness — Scoring crédit Q2", id: "AUD-2418", status: "fail", date: "12 juin 2025", pages: 14, signed: true },
  { name: "Synthèse trimestrielle conformité", id: "RPT-Q2", status: "warn", date: "30 juin 2025", pages: 28, signed: true },
  { name: "Audit fairness — Détection fraude", id: "AUD-2412", status: "pass", date: "9 juin 2025", pages: 11, signed: true },
  { name: "Audit fairness — Recrutement tech", id: "AUD-2417", status: "warn", date: "11 juin 2025", pages: 13, signed: false },
];
function Reports({ go }) {
  return (
    <Page>
      <Topbar title="Rapports" crumbs={["AuditIQ", "Rapports"]}
        actions={<Button variant="primary" icon={Icons.plus} onClick={() => go("wizard")}>Générer un rapport</Button>} />
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <Metric label="Rapports générés" value="42" hint="depuis janvier" icon={Icons.file} />
        <Metric label="Signés & opposables" value="38" status="pass" hint="horodatés" icon={Icons.shield} />
        <Metric label="En attente de revue" value="4" status="warn" hint="à valider" icon={Icons.clock} />
      </div>
      <SectionHead eyebrow="Bibliothèque" title="Tous les rapports" sub="Documents horodatés, versionnés et opposables en cas de contrôle réglementaire." />
      <Card pad={false}>
        <table className="tbl">
          <thead><tr><th>Rapport</th><th>Verdict</th><th>Pages</th><th>Signature</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {REPORTS.map((r) => (
              <tr key={r.id} onClick={() => go("result")}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icons.file size={16} style={{ color: "var(--fg-muted)" }} /></div><div><div style={{ fontWeight: 500 }}>{r.name}</div><div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 1 }}>{r.id}</div></div></div></td>
                <td><Badge status={r.status} dot size="sm" /></td>
                <td className="mono tnum" style={{ color: "var(--fg-secondary)" }}>{r.pages} p.</td>
                <td>{r.signed ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--pass)" }}><Icons.shield size={14} />Signé</span> : <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>Brouillon</span>}</td>
                <td className="mono" style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{r.date}</td>
                <td style={{ textAlign: "right" }}><Button variant="outline" size="sm" icon={Icons.download} onClick={(e) => e.stopPropagation()}>PDF</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

/* ---------- RECOMMANDATIONS ------------------------------------------------ */
const RECOS = [
  { prio: "fail", title: "Recalibrer le seuil de décision par groupe", impact: "+18 pts de score", effort: "Faible", body: "Appliquer un seuil ajusté pour rétablir la parité des taux d'acceptation sans dégrader la performance globale du modèle.", tag: "Correctif prioritaire" },
  { prio: "warn", title: "Réentraîner sans la variable « code postal »", impact: "+9 pts", effort: "Moyen", body: "Cette variable agit comme proxy de l'origine. La retirer réduit le biais indirect, au prix d'une légère baisse de précision (-1,2 %).", tag: "Atténuation" },
  { prio: "info", title: "Documenter la justification métier du seuil", impact: "Conformité", effort: "Faible", body: "Si l'écart est partiellement justifié par le risque réel, le documenter formellement protège juridiquement et satisfait l'obligation de transparence.", tag: "Gouvernance" },
];
function Reco({ go }) {
  return (
    <Page>
      <Topbar title="Recommandations" crumbs={["AuditIQ", "AUD-2418", "Recommandations"]}
        actions={<Button variant="outline" icon={Icons.chevL} onClick={() => go("result")}>Retour au résultat</Button>} />
      <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, background: "linear-gradient(100deg, var(--accent-softer), transparent 60%)" }}>
        <Icons.sparkle size={22} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15.5 }}>Plan de remédiation — Scoring crédit Q2</h3>
          <p style={{ fontSize: 13.5, color: "var(--fg-muted)", marginTop: 3 }}>En appliquant les deux premières actions, l'audit repasserait <strong style={{ color: "var(--pass)", fontWeight: 500 }}>conforme</strong> (score estimé 79/100).</p>
        </div>
        <div style={{ textAlign: "right" }}><div className="eyebrow">Projection</div><div className="tnum" style={{ fontSize: 26, fontWeight: 600 }}><span style={{ color: "var(--fail)" }}>52</span> <Icons.arrowR size={16} style={{ display: "inline" }} /> <span style={{ color: "var(--pass)" }}>79</span></div></div>
      </Card>
      <div className="stack" style={{ gap: 14 }}>
        {RECOS.map((r, i) => (
          <Card key={i} className="card-hover">
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: STATUS[r.prio].bg, border: `1px solid ${STATUS[r.prio].bd}`, fontFamily: "var(--font-mono)", fontWeight: 600, color: STATUS[r.prio].c }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 15.5 }}>{r.title}</h3>
                  <Badge status={r.prio} size="sm" soft>{r.tag}</Badge>
                </div>
                <p style={{ fontSize: 13.5, color: "var(--fg-secondary)", lineHeight: 1.55, maxWidth: 640 }}>{r.body}</p>
                <div className="kicker-row" style={{ marginTop: 12 }}>
                  <span className="chip"><Icons.trend size={13} style={{ color: "var(--pass)" }} />Impact · {r.impact}</span>
                  <span className="chip"><Icons.sliders size={13} />Effort · {r.effort}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" iconR={Icons.arrowR}>Appliquer</Button>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

/* ---------- ÉQUIPE --------------------------------------------------------- */
const TEAM = [
  { name: "Léa Moreau", role: "Responsable conformité", email: "lea.moreau@exemple.fr", access: "Administrateur", status: "pass" },
  { name: "Karim Belaïd", role: "Data scientist", email: "karim.belaid@exemple.fr", access: "Éditeur", status: "pass" },
  { name: "Sofia Renard", role: "Juriste IA", email: "sofia.renard@exemple.fr", access: "Éditeur", status: "pass" },
  { name: "Tom Vasseur", role: "Auditeur externe", email: "tom.vasseur@cabinet.fr", access: "Lecture seule", status: "warn" },
];
function Team() {
  return (
    <Page>
      <Topbar title="Équipe & accès" crumbs={["AuditIQ", "Organisation", "Équipe"]}
        actions={<Button variant="primary" icon={Icons.plus}>Inviter un membre</Button>} />
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <Metric label="Membres actifs" value="4" hint="2 sièges disponibles" icon={Icons.users} />
        <Metric label="Administrateurs" value="1" icon={Icons.key} />
        <Metric label="Accès externes" value="1" status="warn" hint="auditeur · expire 30 j" icon={Icons.ext} />
      </div>
      <SectionHead eyebrow="Membres" title="Qui a accès à l'espace" sub="Gérez les rôles et permissions. Les accès externes sont limités dans le temps." />
      <Card pad={false}>
        <table className="tbl">
          <thead><tr><th>Membre</th><th>Rôle</th><th>Niveau d'accès</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {TEAM.map((m) => (
              <tr key={m.email}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><Avatar name={m.name} size={34} /><div><div style={{ fontWeight: 500 }}>{m.name}</div><div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 1 }}>{m.email}</div></div></div></td>
                <td style={{ color: "var(--fg-secondary)" }}>{m.role}</td>
                <td><span className="chip">{m.access === "Administrateur" && <Icons.key size={12} style={{ color: "var(--accent)" }} />}{m.access}</span></td>
                <td><Badge status={m.status} dot size="sm">{m.status === "warn" ? "Temporaire" : "Actif"}</Badge></td>
                <td style={{ textAlign: "right" }}><button className="icon-btn" style={{ width: 30, height: 30, border: 0, background: "none" }}><Icons.more size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

/* ---------- PARAMÈTRES ----------------------------------------------------- */
function Toggle({ on }) {
  const [v, setV] = useState(on);
  return <button onClick={() => setV(!v)} style={{ width: 38, height: 22, borderRadius: 99, background: v ? "var(--accent)" : "var(--surface-3)", border: `1px solid ${v ? "var(--accent)" : "var(--border)"}`, position: "relative", flexShrink: 0, transition: "all .2s" }}><span style={{ position: "absolute", top: 2, left: v ? 17 : 2, width: 16, height: 16, borderRadius: 99, background: v ? "var(--accent-fg)" : "var(--fg-muted)", transition: "left .2s" }} /></button>;
}
function Settings() {
  const [tab, setTab] = useState("org");
  return (
    <Page>
      <Topbar title="Paramètres" crumbs={["AuditIQ", "Paramètres"]} />
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "start" }}>
        <aside style={{ position: "sticky", top: 100 }}>
          <div className="stack" style={{ gap: 2 }}>
            {[["org", "Entreprise", Icons.building], ["profile", "Profil", Icons.users], ["notif", "Notifications", Icons.bell], ["thresholds", "Seuils & règles", Icons.sliders], ["api", "API & intégrations", Icons.link], ["security", "Sécurité", Icons.lock]].map(([id, l, I]) => (
              <button key={id} className={`sb-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)} style={{ borderRadius: 9 }}><I size={16} /><span>{l}</span></button>
            ))}
          </div>
        </aside>
        <div className="stack" style={{ gap: 16, maxWidth: 680 }}>
          {tab === "org" && <>
            <SectionHead eyebrow="Entreprise" title="Informations de l'organisation" />
            <Card><div className="stack" style={{ gap: 16 }}>
              <Field label="Raison sociale"><Input defaultValue="Banque Mériterre SA" /></Field>
              <div className="grid-2"><Field label="Secteur"><Select defaultValue="bank"><option value="bank">Banque & finance</option><option>Assurance</option><option>RH & recrutement</option></Select></Field><Field label="SIREN"><Input className="mono" defaultValue="552 100 554" /></Field></div>
              <Field label="Référent conformité" hint="Recevra les alertes réglementaires."><Input icon={Icons.users} defaultValue="Léa Moreau" /></Field>
            </div></Card>
          </>}
          {tab === "thresholds" && <>
            <SectionHead eyebrow="Seuils & règles" title="Critères de conformité" sub="Ajustez les seuils déclenchant un verdict « non conforme ». Valeurs par défaut alignées sur la réglementation." />
            <Card><div className="stack" style={{ gap: 0 }}>
              {[["Règle des 4/5", "Seuil minimal du ratio de sélection", "80 %"], ["Parité démographique", "Écart maximal toléré", "0,10"], ["Égalité des chances", "Seuil minimal", "80 %"]].map(([t, d, v], i, a) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 0", borderBottom: i < a.length - 1 ? "1px solid var(--border-subtle)" : 0 }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>{d}</div></div>
                  <Input className="mono" defaultValue={v} style={{ width: 90, textAlign: "center" }} />
                </div>
              ))}
            </div></Card>
            <InlineNote>Modifier ces seuils n'altère pas les audits déjà signés — seuls les prochains audits utiliseront les nouvelles valeurs.</InlineNote>
          </>}
          {tab === "notif" && <>
            <SectionHead eyebrow="Notifications" title="Préférences d'alerte" />
            <Card><div className="stack" style={{ gap: 0 }}>
              {[["Audit non conforme", "Alerte immédiate par e-mail", true], ["Fin d'exécution d'un audit", "Notification dans l'app", true], ["Synthèse hebdomadaire", "Récapitulatif chaque lundi", true], ["Expiration d'un accès externe", "7 jours avant échéance", false]].map(([t, d, on], i, a) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: i < a.length - 1 ? "1px solid var(--border-subtle)" : 0 }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>{d}</div></div>
                  <Toggle on={on} />
                </div>
              ))}
            </div></Card>
          </>}
          {tab === "api" && <>
            <SectionHead eyebrow="API & intégrations" title="Connexion à votre pipeline" sub="Déclenchez des audits automatiquement depuis votre CI/CD ou votre plateforme MLOps." />
            <Card><Field label="Clé API de production" hint="Ne la partagez jamais publiquement."><Input className="mono" icon={Icons.key} defaultValue="aiq_live_••••••••••••••••••3f9a" trail={<Icons.eye size={15} />} /></Field></Card>
            <div className="grid-2">
              {[["MLflow", Icons.layers, true], ["GitHub Actions", Icons.ext, true], ["Datadog", Icons.trend, false], ["Slack", Icons.msg, true]].map(([n, I, c]) => (
                <Card key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center" }}><I size={17} style={{ color: "var(--fg-secondary)" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 500 }}>{n}</div><div style={{ fontSize: 12, color: c ? "var(--pass)" : "var(--fg-muted)" }}>{c ? "Connecté" : "Non connecté"}</div></div><Toggle on={c} /></Card>
              ))}
            </div>
          </>}
          {(tab === "profile" || tab === "security") && <>
            <SectionHead eyebrow={tab === "profile" ? "Profil" : "Sécurité"} title={tab === "profile" ? "Votre compte" : "Sécurité du compte"} />
            <Card><div className="stack" style={{ gap: 16 }}>
              {tab === "profile" ? <>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}><Avatar name="Léa Moreau" size={56} /><Button variant="outline" size="sm" icon={Icons.upload}>Changer la photo</Button></div>
                <div className="grid-2"><Field label="Nom complet"><Input defaultValue="Léa Moreau" /></Field><Field label="Fonction"><Input defaultValue="Responsable conformité" /></Field></div>
                <Field label="E-mail"><Input icon={Icons.mail} defaultValue="lea.moreau@exemple.fr" /></Field>
              </> : <>
                <Field label="Mot de passe"><Input type="password" icon={Icons.lock} defaultValue="motdepasse" /></Field>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderTop: "1px solid var(--border-subtle)" }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Double authentification (2FA)</div><div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>Recommandé pour les comptes administrateur</div></div><Toggle on={true} /></div>
              </>}
            </div></Card>
          </>}
        </div>
      </div>
    </Page>
  );
}

/* ---------- SUPPORT -------------------------------------------------------- */
function Support() {
  return (
    <Page>
      <Topbar title="Aide & support" crumbs={["AuditIQ", "Support"]} />
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "12px 0 28px" }}>
          <h2 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>Comment pouvons-nous vous aider ?</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: 14.5, marginTop: 8 }}>Documentation, guides méthodologiques et accompagnement par nos experts fairness.</p>
          <div className="searchbox" style={{ width: 440, height: 44, margin: "20px auto 0" }}><Icons.search size={17} /><input placeholder="Rechercher dans l'aide…" /></div>
        </div>
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {[["Démarrage rapide", Icons.zap, "Lancez votre premier audit en 7 minutes"], ["Guide méthodologique", Icons.book, "Comprendre les métriques de fairness"], ["Cadre réglementaire", Icons.scale, "AI Act, RGPD, et obligations légales"]].map(([t, I, d]) => (
            <Card key={t} className="card-hover" style={{ cursor: "pointer" }}><div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", display: "grid", placeItems: "center", marginBottom: 14 }}><I size={19} style={{ color: "var(--accent)" }} /></div><h3 style={{ fontSize: 14.5, marginBottom: 5 }}>{t}</h3><p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>{d}</p></Card>
          ))}
        </div>
        <Card style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icons.msg size={20} style={{ color: "var(--accent)" }} /></div>
          <div style={{ flex: 1 }}><h3 style={{ fontSize: 15 }}>Besoin d'un accompagnement personnalisé ?</h3><p style={{ fontSize: 13.5, color: "var(--fg-muted)", marginTop: 3 }}>Nos experts conformité répondent sous 4 h ouvrées.</p></div>
          <Button variant="primary" icon={Icons.msg}>Contacter le support</Button>
        </Card>
      </div>
    </Page>
  );
}

/* ---------- AUTH ----------------------------------------------------------- */
function Auth({ go }) {
  const [mode, setMode] = useState("login");
  const { theme, toggle } = useTheme();
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* left brand panel */}
      <div style={{ position: "relative", background: "var(--surface)", borderRight: "1px solid var(--border-subtle)", padding: "44px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 0% 0%, var(--accent-softer), transparent 50%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 11 }}>
          <div className="sb-logo"><Icons.shield size={17} /></div>
          <div><div style={{ fontWeight: 600, fontSize: 16 }}>AuditIQ</div><div className="eyebrow" style={{ fontSize: 9.5 }}>FAIRNESS PLATFORM</div></div>
        </div>
        <div style={{ position: "relative", maxWidth: 420 }}>
          <Badge status="pass" dot soft>Conforme AI Act · RGPD</Badge>
          <h2 style={{ fontSize: 30, letterSpacing: "-0.035em", lineHeight: 1.15, margin: "18px 0 14px" }}>Prouvez l'équité de vos modèles d'IA, en quelques minutes.</h2>
          <p style={{ fontSize: 15, color: "var(--fg-secondary)", lineHeight: 1.6 }}>AuditIQ détecte les biais discriminatoires, calcule les métriques réglementaires et génère des rapports opposables. Sans déplacer vos données.</p>
          <div className="stack" style={{ gap: 12, marginTop: 26 }}>
            {["Métriques alignées sur la règle des 4/5 et l'AI Act", "Rapports signés et horodatés, prêts pour l'audit", "Vos données restent chez vous — calcul en mémoire"].map((t) => (
              <div key={t} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--fg-secondary)" }}><Icons.checkCircle size={17} style={{ color: "var(--accent)", flexShrink: 0 }} />{t}</div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 22, fontSize: 12.5, color: "var(--fg-muted)" }} className="mono">
          <span>SOC 2 Type II</span><span>ISO 27001</span><span>Hébergé en UE</span>
        </div>
      </div>

      {/* right form */}
      <div style={{ position: "relative", display: "grid", placeItems: "center", padding: 40, background: "var(--bg)" }}>
        <button className="icon-btn" style={{ position: "absolute", top: 24, right: 24 }} onClick={toggle} title="Thème">{theme === "dark" ? <Icons.sun size={17} /> : <Icons.moon size={17} />}</button>
        <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
          <div className="tabs" style={{ marginBottom: 24, gap: 0 }}>
            <button className={`tab ${mode === "login" ? "active" : ""}`} style={{ flex: 1, textAlign: "center" }} onClick={() => setMode("login")}>Connexion</button>
            <button className={`tab ${mode === "signup" ? "active" : ""}`} style={{ flex: 1, textAlign: "center" }} onClick={() => setMode("signup")}>Créer un compte</button>
          </div>
          <h1 style={{ fontSize: 22, letterSpacing: "-0.025em", marginBottom: 6 }}>{mode === "login" ? "Content de vous revoir" : "Commencez gratuitement"}</h1>
          <p style={{ fontSize: 13.5, color: "var(--fg-muted)", marginBottom: 24 }}>{mode === "login" ? "Accédez à votre espace de conformité." : "14 jours d'essai, sans carte bancaire."}</p>

          <Button variant="outline" full size="lg" icon={Icons.google} style={{ marginBottom: 12 }}>Continuer avec Google</Button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "var(--fg-muted)", fontSize: 12 }}><hr className="divider" style={{ flex: 1 }} />OU<hr className="divider" style={{ flex: 1 }} /></div>

          <div className="stack" style={{ gap: 14 }}>
            {mode === "signup" && <Field label="Nom complet"><Input icon={Icons.users} placeholder="Léa Moreau" /></Field>}
            <Field label="E-mail professionnel"><Input icon={Icons.mail} type="email" placeholder="vous@entreprise.fr" defaultValue="lea.moreau@exemple.fr" /></Field>
            <Field label="Mot de passe">
              <Input icon={Icons.lock} type="password" placeholder="••••••••" defaultValue="motdepasse" trail={<Icons.eye size={15} />} />
            </Field>
            {mode === "login" && <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5, color: "var(--accent)", textAlign: "right", marginTop: -4 }}>Mot de passe oublié ?</a>}
            <Button variant="primary" full size="lg" iconR={Icons.arrowR} onClick={() => go("dashboard")}>{mode === "login" ? "Se connecter" : "Créer mon compte"}</Button>
          </div>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", textAlign: "center", marginTop: 20, lineHeight: 1.5 }}>En continuant, vous acceptez nos <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--fg-secondary)", textDecoration: "underline" }}>conditions</a> et notre <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--fg-secondary)", textDecoration: "underline" }}>politique de confidentialité</a>.</p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Reports, Reco, Team, Settings, Support, Auth });
