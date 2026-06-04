/* =============================================================================
   AuditIQ — Résultat d'audit. Data-viz fairness, lecture pédagogique.
   ============================================================================= */

const GROUPS = [
  { name: "Hommes", n: "62 140", rate: 0.71, ref: true },
  { name: "Femmes", n: "58 920", rate: 0.49, ref: false },
  { name: "Non-binaire", n: "1 260", rate: 0.44, ref: false },
];
const RESULT_METRICS = [
  { name: "Règle des 4/5 (80 %)", value: 0.69, threshold: 0.80, max: 1, status: "fail", fmt: (v) => `${(v * 100).toFixed(0)} %`, plain: "Les femmes sont retenues 69 % aussi souvent que les hommes — en dessous du seuil légal de 80 %." },
  { name: "Parité démographique", value: 0.22, threshold: 0.10, max: 0.4, status: "fail", fmt: (v) => v.toFixed(2), plain: "Écart de 22 points entre les taux d'acceptation — au-delà de la tolérance de 10 points." },
  { name: "Égalité des chances", value: 0.91, threshold: 0.80, max: 1, status: "pass", fmt: (v) => `${(v * 100).toFixed(0)} %`, plain: "À profil de remboursement égal, les groupes sont traités de façon similaire." },
  { name: "Calibration", value: 0.86, threshold: 0.80, max: 1, status: "warn", fmt: (v) => `${(v * 100).toFixed(0)} %`, plain: "Un même score reflète un risque légèrement différent selon le groupe." },
];

function TrafficLight({ status }) {
  const lights = ["fail", "warn", "pass"];
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 7, padding: 9, borderRadius: 12, background: "var(--surface-inset)", border: "1px solid var(--border-subtle)" }}>
      {lights.map((l) => {
        const on = l === status;
        return <span key={l} style={{ width: 16, height: 16, borderRadius: 99, background: on ? STATUS[l].c : "var(--track)", boxShadow: on ? `0 0 12px ${STATUS[l].c}` : "none", transition: "all .4s", opacity: on ? 1 : 0.5 }} />;
      })}
    </div>
  );
}

function Result({ go }) {
  const [tab, setTab] = useState("synthese");
  const verdict = "fail";
  return (
    <Page>
      <Topbar title="Scoring crédit — Particuliers Q2" crumbs={["AuditIQ", "Audits", "AUD-2418"]}
        sub={<Badge status={verdict} dot>Non conforme</Badge>}
        actions={<><Button variant="outline" icon={Icons.download}>Rapport PDF</Button><Button variant="primary" icon={Icons.bulb} onClick={() => go("reco")}>Voir les actions</Button></>} />

      <div className="page wide" style={{ padding: 0 }}>
        {/* VERDICT HERO */}
        <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 28, alignItems: "center", padding: "26px 28px", background: "linear-gradient(100deg, var(--fail-bg), transparent 55%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <TrafficLight status={verdict} />
              <Gauge value={52} size={150} label="Score fairness" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Verdict de l'audit</div>
              <h2 style={{ fontSize: 24, letterSpacing: "-0.03em", marginBottom: 8 }}>Biais significatif détecté sur le <span style={{ color: "var(--fail)" }}>genre</span></h2>
              <p style={{ fontSize: 14.5, color: "var(--fg-secondary)", lineHeight: 1.6, maxWidth: 540 }}>
                Le modèle accorde le crédit aux femmes <strong style={{ color: "var(--fg)", fontWeight: 600 }}>1,4 fois moins souvent</strong> qu'aux hommes à situation comparable. Cet écart dépasse le seuil légal des 4/5 et expose à un risque de discrimination indirecte.
              </p>
              <div className="kicker-row" style={{ marginTop: 14 }}>
                <span className="chip"><Icons.clock size={13} />Exécuté il y a 2 h</span>
                <span className="chip"><Icons.database size={13} />148 320 décisions</span>
                <span className="chip"><Icons.layers size={13} />credit-scoring-v4</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <div className="eyebrow">Niveau de risque</div>
              <Badge status="fail" soft>Élevé · action requise</Badge>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 4, textAlign: "right" }}>Rapport signé<br/>AUD-2418 · v1</div>
            </div>
          </div>
        </Card>

        {/* tabs */}
        <div className="tabs" style={{ marginBottom: 18 }}>
          {[["synthese", "Synthèse"], ["metriques", "Métriques détaillées"], ["groupes", "Comparaison par groupe"], ["methodo", "Méthodologie"]].map(([id, l]) => (
            <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>

        {tab === "synthese" && (
          <div className="stack fade-in" style={{ gap: 16 }}>
            {/* plain reading */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
              <Card>
                <div className="eyebrow" style={{ marginBottom: 14 }}>En clair</div>
                <div className="stack" style={{ gap: 16 }}>
                  {[
                    ["fail", "Ce qui ne va pas", "Sur 100 hommes éligibles, 71 obtiennent le crédit ; sur 100 femmes au profil équivalent, seulement 49. L'écart n'est pas justifié par la solvabilité."],
                    ["info", "Pourquoi c'est un risque", "La loi interdit la discrimination indirecte, même non intentionnelle. Un tel écart est sanctionnable et doit être corrigé ou documenté."],
                    ["pass", "Ce qui fonctionne", "Une fois la décision prise, le modèle est aussi fiable pour tous les groupes (égalité des chances à 91 %). Le biais vient du seuil de décision, pas de la précision."],
                  ].map(([st, t, body]) => (
                    <div key={t} style={{ display: "flex", gap: 13 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: STATUS[st].bg, border: `1px solid ${STATUS[st].bd}` }}>
                        {st === "fail" ? <Icons.xCircle size={16} style={{ color: STATUS[st].c }} /> : st === "pass" ? <Icons.checkCircle size={16} style={{ color: STATUS[st].c }} /> : <Icons.help size={16} style={{ color: STATUS[st].c }} />}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{t}</div>
                        <p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="stack" style={{ gap: 16 }}>
                <Card>
                  <div className="eyebrow" style={{ marginBottom: 14 }}>Indicateur clé · Règle des 4/5</div>
                  <div className="tnum" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--fail)" }}>69<span style={{ fontSize: 18 }}> %</span></div>
                  <p style={{ fontSize: 12.5, color: "var(--fg-muted)", margin: "4px 0 14px" }}>du taux de référence — il en faut 80 % minimum.</p>
                  <Meter value={0.69} threshold={0.80} max={1} status="fail" format={(v) => `${(v * 100).toFixed(0)}%`} />
                </Card>
                <Card style={{ background: "var(--accent-softer)", borderColor: "var(--accent-border)" }}>
                  <div style={{ display: "flex", gap: 11 }}>
                    <Icons.bulb size={18} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>3 actions recommandées</div>
                      <p style={{ fontSize: 12.5, color: "var(--fg-muted)", margin: "3px 0 11px", lineHeight: 1.5 }}>Le ré-équilibrage du seuil pourrait ramener l'audit en conformité.</p>
                      <Button variant="primary" size="sm" iconR={Icons.arrowR} onClick={() => go("reco")}>Voir le plan</Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* metric cards row */}
            <div className="grid-4">
              {RESULT_METRICS.map((m) => (
                <Card key={m.name} className="metric">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span className="eyebrow" style={{ lineHeight: 1.3 }}>{m.name}</span>
                    <Badge status={m.status} size="sm" dot />
                  </div>
                  <div className="tnum" style={{ fontSize: 24, fontWeight: 600, color: STATUS[m.status].c, marginBottom: 10 }}>{m.fmt(m.value)}</div>
                  <Meter value={m.value} threshold={m.threshold} max={m.max} status={m.status} format={m.fmt} />
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === "metriques" && (
          <div className="stack fade-in" style={{ gap: 14 }}>
            {RESULT_METRICS.map((m) => (
              <Card key={m.name}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                      <h3 style={{ fontSize: 15.5 }}>{m.name}</h3>
                      <Badge status={m.status} size="sm" dot />
                    </div>
                    <p style={{ fontSize: 13.5, color: "var(--fg-secondary)", lineHeight: 1.55, maxWidth: 620 }}>{m.plain}</p>
                  </div>
                  <div style={{ width: 220 }}>
                    <div className="tnum" style={{ fontSize: 28, fontWeight: 600, color: STATUS[m.status].c, textAlign: "right", marginBottom: 8 }}>{m.fmt(m.value)}</div>
                    <Meter value={m.value} threshold={m.threshold} max={m.max} status={m.status} format={m.fmt} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "groupes" && (
          <Card className="fade-in" pad={false}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 16 }}>Taux d'acceptation par groupe</h3>
              <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 3 }}>Proportion de décisions favorables. Le groupe de référence est le plus favorisé.</p>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {GROUPS.map((g) => (
                <div key={g.name} style={{ display: "grid", gridTemplateColumns: "150px 1fr 70px", gap: 18, alignItems: "center", padding: "13px 0" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>{g.name}{g.ref && <Badge status="info" size="sm" soft>Référence</Badge>}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>{g.n} décisions</div>
                  </div>
                  <div style={{ height: 30, borderRadius: 8, background: "var(--track)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, width: `${g.rate * 100}%`, background: g.ref ? "var(--info)" : g.rate / GROUPS[0].rate >= 0.8 ? "var(--pass)" : "var(--fail)", borderRadius: 8, transition: "width 1s var(--ease-out)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10 }}>
                      <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{(g.rate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mono tnum" style={{ fontSize: 13, textAlign: "right", color: g.ref ? "var(--fg-muted)" : g.rate / GROUPS[0].rate >= 0.8 ? "var(--pass)" : "var(--fail)" }}>{g.ref ? "—" : `${(g.rate / GROUPS[0].rate * 100).toFixed(0)}%`}</div>
                </div>
              ))}
              <hr className="divider" style={{ margin: "8px 0 16px" }} />
              <InlineNote icon={Icons.scale}>Ratio de la dernière colonne = taux du groupe ÷ taux de référence. En dessous de 80 %, la règle des 4/5 est enfreinte. Les femmes (69 %) et les personnes non-binaires (62 %) sont sous le seuil.</InlineNote>
            </div>
          </Card>
        )}

        {tab === "methodo" && (
          <div className="grid-2 fade-in">
            <Card>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Périmètre</div>
              <div className="stack" style={{ gap: 12 }}>
                {[["Modèle", "credit-scoring-v4"], ["Décisions analysées", "148 320"], ["Période", "1er avril – 30 juin 2025"], ["Attribut audité", "Genre (3 groupes)"], ["Vérité terrain", "Disponible (remboursement à 12 mois)"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "var(--fg-muted)" }}>{k}</span><span className="mono" style={{ fontWeight: 450 }}>{v}</span></div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Cadre réglementaire appliqué</div>
              <div className="stack" style={{ gap: 10 }}>
                {["Règlement IA européen (AI Act) — systèmes à haut risque", "RGPD — article 22, décision automatisée", "Directive 2004/113/CE — égalité de traitement", "Recommandation EEOC — règle des 4/5 (1978)"].map((t) => (
                  <div key={t} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.5 }}><Icons.shield size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />{t}</div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Page>
  );
}

Object.assign(window, { Result });
