/* =============================================================================
   AuditIQ — Helpers de formulaire + Dashboard + Liste audits + Auth
   ============================================================================= */

/* ---------- Form primitives ------------------------------------------------ */
function Field({ label, hint, req, children, error }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}{req && <span className="req">*</span>}</label>}
      {children}
      {error ? <span className="field-hint" style={{ color: "var(--fail)" }}>{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
function Input({ icon: I, trail, ...p }) {
  if (I || trail) return (
    <div className="input-icon">{I && <I size={16} />}<input className="input" {...p} />{trail && <span className="input-trail">{trail}</span>}</div>
  );
  return <input className="input" {...p} />;
}
function Textarea(p) { return <textarea className="textarea" {...p} />; }
function Select({ children, ...p }) {
  return (
    <div className="input-icon" style={{ position: "relative" }}>
      <select className="select" {...p}>{children}</select>
      <span className="input-trail"><Icons.chevD size={15} /></span>
    </div>
  );
}
function Choice({ selected, onClick, title, desc, icon: I }) {
  return (
    <button type="button" className={`choice ${selected ? "sel" : ""}`} onClick={onClick}>
      <span className="choice-radio" />
      <span style={{ flex: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
          {I && <I size={16} style={{ color: selected ? "var(--accent)" : "var(--fg-muted)" }} />}{title}
        </span>
        {desc && <span style={{ display: "block", fontSize: 12.5, color: "var(--fg-muted)", marginTop: 3, lineHeight: 1.45 }}>{desc}</span>}
      </span>
    </button>
  );
}

/* ============================================================================
   DASHBOARD
   ============================================================================ */
const SPARK = [62, 64, 61, 66, 70, 68, 73, 71, 76, 78, 81, 84];
function Sparkline({ data = SPARK, w = 120, h = 36, color = "var(--accent)" }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / (max - min || 1)) * (h - 4) - 2]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs><linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#spk)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

const RECENT_AUDITS = [
  { id: "AUD-2418", name: "Scoring crédit — Particuliers", model: "credit-scoring-v4", status: "fail", score: 52, attr: "Genre", date: "Il y a 2 h", owner: "Léa Moreau" },
  { id: "AUD-2417", name: "Tri CV — Recrutement tech", model: "hr-screening-v2", status: "warn", score: 71, attr: "Âge", date: "Hier", owner: "Karim Belaïd" },
  { id: "AUD-2412", name: "Détection de fraude paiement", model: "fraud-detect-v7", status: "pass", score: 88, attr: "Origine", date: "Il y a 3 j", owner: "Léa Moreau" },
  { id: "AUD-2406", name: "Éligibilité assurance auto", model: "insurance-elig-v1", status: "warn", score: 66, attr: "Code postal", date: "Il y a 5 j", owner: "Sofia Renard" },
];

function Dashboard({ go }) {
  return (
    <Page>
      <Topbar title="Vue d'ensemble" crumbs={["AuditIQ", "Vue d'ensemble"]}
        sub={<Badge status="pass" dot soft>Plateforme opérationnelle</Badge>}
        actions={<Button variant="primary" icon={Icons.plus} onClick={() => go("wizard")}>Nouvel audit</Button>} />
      <div className="page wide" style={{ padding: 0 }}>
        {/* hero band */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ color: "var(--fg-muted)", fontSize: 14.5, maxWidth: 620 }}>
            Bonjour Léa. Voici l'état de conformité <em style={{ color: "var(--fg-secondary)", fontStyle: "normal" }}>fairness</em> de vos modèles en production. <strong style={{ color: "var(--warn)", fontWeight: 500 }}>2 audits</strong> requièrent votre attention.
          </p>
        </div>

        <div className="grid-4" style={{ marginBottom: 16 }}>
          <Metric label="Score de conformité" value="74" unit="/100" delta="+6 pts" deltaDir="up" hint="ce trimestre" status="warn" icon={Icons.shield} />
          <Metric label="Audits actifs" value="18" delta="+3" deltaDir="up" hint="ce mois" icon={Icons.layers} />
          <Metric label="Modèles non conformes" value="2" delta="-1" deltaDir="up" hint="vs. mois dernier" status="fail" icon={Icons.alert} />
          <Metric label="Délai moyen d'audit" value="6,4" unit="min" delta="-1,2 min" deltaDir="up" hint="pipeline auto" icon={Icons.clock} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* recent audits */}
          <Card pad={false}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 14px" }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 5 }}>Activité récente</div>
                <h3 style={{ fontSize: 16 }}>Derniers audits exécutés</h3>
              </div>
              <Button variant="ghost" size="sm" iconR={Icons.arrowR} onClick={() => go("audits")}>Tout voir</Button>
            </div>
            <table className="tbl">
              <thead><tr><th>Audit</th><th>Attribut</th><th>Score</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {RECENT_AUDITS.map((a) => (
                  <tr key={a.id} onClick={() => go("result")}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--fg)" }}>{a.name}</div>
                      <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>{a.id} · {a.model}</div>
                    </td>
                    <td><span className="chip">{a.attr}</span></td>
                    <td className="tbl-num" style={{ fontWeight: 600, color: STATUS[a.status].c }}>{a.score}</td>
                    <td><Badge status={a.status} dot size="sm" /></td>
                    <td style={{ textAlign: "right" }}><Icons.chevR size={16} style={{ color: "var(--fg-disabled)" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* trend + distribution */}
          <div className="stack" style={{ gap: 16 }}>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 5 }}>Tendance</div>
              <h3 style={{ fontSize: 16, marginBottom: 2 }}>Conformité globale</h3>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 10 }}>
                <div>
                  <div className="tnum" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em" }}>74<span style={{ fontSize: 16, color: "var(--fg-muted)" }}>%</span></div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--pass)", marginTop: 2 }}>↑ 6 pts / 90 j</div>
                </div>
                <Sparkline w={130} h={44} />
              </div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Répartition des statuts</div>
              {[["pass", "Conformes", 13, 72], ["warn", "Sous vigilance", 3, 17], ["fail", "Non conformes", 2, 11]].map(([st, lbl, n, pct]) => (
                <div key={st} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: STATUS[st].c }} />{lbl}</span>
                    <span className="mono tnum" style={{ color: "var(--fg-muted)" }}>{n} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--track)", borderRadius: 99 }}><div style={{ width: `${pct}%`, height: "100%", background: STATUS[st].c, borderRadius: 99 }} /></div>
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* action band */}
        <Card className="card-hover" style={{ display: "flex", alignItems: "center", gap: 18, background: "linear-gradient(100deg, var(--accent-softer), transparent 60%)" }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--accent-soft)", border: "1px solid var(--accent-border)", flexShrink: 0 }}>
            <Icons.zap size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15 }}>Lancez un audit en moins de 7 minutes</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: 13.5, marginTop: 3 }}>Importez votre jeu de données, sélectionnez les attributs protégés, AuditIQ calcule l'ensemble des métriques réglementaires.</p>
          </div>
          <Button variant="primary" icon={Icons.plus} onClick={() => go("wizard")}>Commencer</Button>
        </Card>
      </div>
    </Page>
  );
}

/* ============================================================================
   LISTE DES AUDITS
   ============================================================================ */
const ALL_AUDITS = [
  ...RECENT_AUDITS,
  { id: "AUD-2399", name: "Octroi de prêt immobilier", model: "mortgage-v3", status: "pass", score: 91, attr: "Genre", date: "Il y a 8 j", owner: "Karim Belaïd" },
  { id: "AUD-2388", name: "Priorisation support client", model: "support-rank-v2", status: "pass", score: 85, attr: "Langue", date: "Il y a 12 j", owner: "Sofia Renard" },
  { id: "AUD-2375", name: "Ciblage publicitaire emploi", model: "ad-target-v5", status: "fail", score: 48, attr: "Genre", date: "Il y a 15 j", owner: "Léa Moreau" },
  { id: "AUD-2361", name: "Évaluation des sinistres", model: "claims-eval-v1", status: "warn", score: 69, attr: "Âge", date: "Il y a 18 j", owner: "Karim Belaïd" },
];
const FILTERS = ["Tous", "Non conformes", "Sous vigilance", "Conformes"];

function AuditsList({ go }) {
  const [filter, setFilter] = useState("Tous");
  const rows = ALL_AUDITS.filter((a) =>
    filter === "Tous" ? true : filter === "Non conformes" ? a.status === "fail" : filter === "Sous vigilance" ? a.status === "warn" : a.status === "pass");
  return (
    <Page>
      <Topbar title="Mes audits" crumbs={["AuditIQ", "Audits"]}
        actions={<Button variant="primary" icon={Icons.plus} onClick={() => go("wizard")}>Nouvel audit</Button>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Metric label="Total audits" value="42" hint="depuis janvier" icon={Icons.layers} />
        <Metric label="Conformes" value="31" status="pass" hint="74 %" icon={Icons.checkCircle} />
        <Metric label="Sous vigilance" value="8" status="warn" hint="19 %" icon={Icons.alert} />
        <Metric label="Non conformes" value="3" status="fail" hint="7 %" icon={Icons.xCircle} />
      </div>

      <Card pad={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          <div className="tabs" style={{ border: 0 }}>
            {FILTERS.map((f) => (
              <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" size="sm" icon={Icons.filter}>Filtres</Button>
            <Button variant="outline" size="sm" icon={Icons.download}>Exporter</Button>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Audit</th><th>Attribut protégé</th><th>Score fairness</th><th>Statut</th><th>Responsable</th><th>Exécuté</th><th></th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} onClick={() => go("result")}>
                <td>
                  <div style={{ fontWeight: 500, color: "var(--fg)" }}>{a.name}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>{a.id} · {a.model}</div>
                </td>
                <td><span className="chip">{a.attr}</span></td>
                <td style={{ width: 150 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span className="tbl-num" style={{ fontWeight: 600, color: STATUS[a.status].c, width: 22 }}>{a.score}</span>
                    <div style={{ flex: 1, height: 5, background: "var(--track)", borderRadius: 99 }}><div style={{ width: `${a.score}%`, height: "100%", background: STATUS[a.status].c, borderRadius: 99 }} /></div>
                  </div>
                </td>
                <td><Badge status={a.status} dot size="sm" /></td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={a.owner} size={24} /><span style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{a.owner.split(" ")[0]}</span></div></td>
                <td className="mono" style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{a.date}</td>
                <td style={{ textAlign: "right" }}><button className="icon-btn" style={{ width: 30, height: 30, border: 0, background: "none" }} onClick={(e) => e.stopPropagation()}><Icons.more size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

Object.assign(window, { Field, Input, Textarea, Select, Choice, Sparkline, Dashboard, AuditsList, RECENT_AUDITS, ALL_AUDITS });
