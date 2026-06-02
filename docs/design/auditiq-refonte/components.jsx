/* =============================================================================
   AuditIQ — Composants partagés : icônes, primitives UI, shell.
   ============================================================================= */
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

/* ---------- Icônes (stroke, 1.6, hérite currentColor) ---------------------- */
const Ic = ({ d, size = 18, fill, vb = 24, stroke = 1.6, children, ...p }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill || "none"}
    stroke={fill ? "none" : "currentColor"} strokeWidth={stroke} strokeLinecap="round"
    strokeLinejoin="round" {...p}>
    {children || (Array.isArray(d) ? d.map((x, i) => <path key={i} d={x} />) : <path d={d} />)}
  </svg>
);

const Icons = {
  grid: (p) => <Ic {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Ic>,
  layers: (p) => <Ic {...p}><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/></Ic>,
  plus: (p) => <Ic {...p} d="M12 5v14M5 12h14"/>,
  list: (p) => <Ic {...p}><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></Ic>,
  file: (p) => <Ic {...p}><path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M9 13h6M9 17h4"/></Ic>,
  bulb: (p) => <Ic {...p}><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z"/></Ic>,
  users: (p) => <Ic {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.4M20.5 19a5 5 0 0 0-3.5-4.6"/></Ic>,
  gear: (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 8.1 1.1V1a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 13.2 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" transform="translate(2 2) scale(0.83)"/></Ic>,
  help: (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5"/><path d="M12 17h.01"/></Ic>,
  bell: (p) => <Ic {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></Ic>,
  search: (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></Ic>,
  sun: (p) => <Ic {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Ic>,
  moon: (p) => <Ic {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></Ic>,
  chevR: (p) => <Ic {...p} d="m9 6 6 6-6 6"/>,
  chevL: (p) => <Ic {...p} d="m15 6-6 6 6 6"/>,
  chevD: (p) => <Ic {...p} d="m6 9 6 6 6-6"/>,
  arrowR: (p) => <Ic {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Ic>,
  check: (p) => <Ic {...p} d="M20 6 9 17l-5-5"/>,
  checkCircle: (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></Ic>,
  alert: (p) => <Ic {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></Ic>,
  x: (p) => <Ic {...p} d="M18 6 6 18M6 6l12 12"/>,
  xCircle: (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></Ic>,
  upload: (p) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5M12 4v12"/></Ic>,
  download: (p) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 11l5 5 5-5M12 16V4"/></Ic>,
  shield: (p) => <Ic {...p}><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></Ic>,
  scale: (p) => <Ic {...p}><path d="M12 3v18M7 7l-4 7h8l-4-7ZM17 7l-4 7h8l-4-7ZM5 21h14M7 7l5-2 5 2"/></Ic>,
  trend: (p) => <Ic {...p}><path d="M3 17l6-6 4 4 8-8M21 7v6M21 7h-6"/></Ic>,
  trendDown: (p) => <Ic {...p}><path d="M3 7l6 6 4-4 8 8M21 17v-6M21 17h-6"/></Ic>,
  dot: (p) => <Ic {...p} fill="currentColor"><circle cx="12" cy="12" r="5"/></Ic>,
  clock: (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ic>,
  database: (p) => <Ic {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></Ic>,
  sliders: (p) => <Ic {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></Ic>,
  target: (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></Ic>,
  flag: (p) => <Ic {...p}><path d="M4 21V4M4 4l5-1 6 2 5-1v10l-5 1-6-2-5 1"/></Ic>,
  logout: (p) => <Ic {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Ic>,
  mail: (p) => <Ic {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Ic>,
  lock: (p) => <Ic {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Ic>,
  eye: (p) => <Ic {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></Ic>,
  google: (p) => <Ic {...p} stroke="none"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2 3.2v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.5 10c.8-2.3 2.9-4 5.5-4Z"/></Ic>,
  sparkle: (p) => <Ic {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></Ic>,
  filter: (p) => <Ic {...p} d="M3 5h18l-7 8v5l-4 2v-7L3 5Z"/>,
  more: (p) => <Ic {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></Ic>,
  ext: (p) => <Ic {...p}><path d="M15 3h6v6M21 3l-9 9M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></Ic>,
  book: (p) => <Ic {...p}><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></Ic>,
  msg: (p) => <Ic {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z"/></Ic>,
  zap: (p) => <Ic {...p} d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>,
  building: (p) => <Ic {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h.01M11 8h.01M8 12h.01M11 12h.01M8 16h.01M11 16h.01"/></Ic>,
  key: (p) => <Ic {...p}><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M16 5l2 2M14 7l2 2"/></Ic>,
  link: (p) => <Ic {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></Ic>,
};

/* ---------- Theme ---------------------------------------------------------- */
const ThemeCtx = createContext({ theme: "dark", toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

/* ---------- Button --------------------------------------------------------- */
function Button({ variant = "default", size = "md", icon: I, iconR: IR, children, full, onClick, style, type = "button", title, disabled }) {
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} style={style}
      className={`btn btn-${variant} btn-${size} ${full ? "btn-full" : ""}`}>
      {I && <I size={size === "lg" ? 18 : 16} />}
      {children && <span>{children}</span>}
      {IR && <IR size={size === "lg" ? 18 : 16} />}
    </button>
  );
}

/* ---------- Card ----------------------------------------------------------- */
function Card({ children, className = "", pad = true, hover, as: Tag = "div", style, onClick }) {
  return <Tag className={`card ${pad ? "card-pad" : ""} ${hover ? "card-hover" : ""} ${className}`} style={style} onClick={onClick}>{children}</Tag>;
}

/* ---------- Section header ------------------------------------------------- */
function SectionHead({ eyebrow, title, sub, action }) {
  return (
    <div className="sec-head">
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ fontSize: 19, letterSpacing: "-0.02em" }}>{title}</h2>
        {sub && <p style={{ color: "var(--fg-muted)", fontSize: 14, marginTop: 5, maxWidth: 560 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge / status ------------------------------------------------- */
const STATUS = {
  pass: { c: "var(--pass)", bg: "var(--pass-bg)", bd: "var(--pass-border)", label: "Conforme" },
  warn: { c: "var(--warn)", bg: "var(--warn-bg)", bd: "var(--warn-border)", label: "Vigilance" },
  fail: { c: "var(--fail)", bg: "var(--fail-bg)", bd: "var(--fail-border)", label: "Non conforme" },
  info: { c: "var(--info)", bg: "var(--info-bg)", bd: "var(--info-border)", label: "Info" },
  neutral: { c: "var(--fg-muted)", bg: "var(--surface-3)", bd: "var(--border)", label: "—" },
};
function Badge({ status = "neutral", children, dot, soft = true, size = "md" }) {
  const s = STATUS[status] || STATUS.neutral;
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  return (
    <span className="mono" style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: pad,
      fontSize: size === "sm" ? 11 : 12, fontWeight: 500, letterSpacing: "0.02em",
      borderRadius: 6, color: s.c,
      background: soft ? s.bg : "transparent",
      border: `1px solid ${soft ? s.bd : "transparent"}`,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: s.c, flexShrink: 0 }} />}
      {children || s.label}
    </span>
  );
}

/* ---------- Metric card ---------------------------------------------------- */
function Metric({ label, value, unit, delta, deltaDir, hint, status, icon: I }) {
  const dColor = deltaDir === "up" ? "var(--pass)" : deltaDir === "down" ? "var(--fail)" : "var(--fg-muted)";
  const DI = deltaDir === "up" ? Icons.trend : deltaDir === "down" ? Icons.trendDown : null;
  return (
    <Card className="metric">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span className="eyebrow">{label}</span>
        {I && <I size={16} style={{ color: status ? STATUS[status].c : "var(--fg-disabled)" }} />}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="tnum" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", color: status ? STATUS[status].c : "var(--fg)" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 14, color: "var(--fg-muted)" }}>{unit}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        {delta != null && (
          <span className="mono tnum" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: dColor }}>
            {DI && <DI size={13} />}{delta}
          </span>
        )}
        {hint && <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{hint}</span>}
      </div>
    </Card>
  );
}

/* ---------- Gauge (demi-cercle) -------------------------------------------- */
function Gauge({ value = 0, size = 180, label, sublabel }) {
  const status = value >= 80 ? "pass" : value >= 60 ? "warn" : "fail";
  const s = STATUS[status];
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circ = Math.PI * r;
  const off = circ * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 30 }}>
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--track)" strokeWidth="11" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={s.c} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1s var(--ease-out)" }} />
      </svg>
      <div style={{ position: "absolute", top: size / 2 - 30, left: 0, right: 0, textAlign: "center" }}>
        <div className="tnum" style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.03em", color: s.c, lineHeight: 1 }}>{value}</div>
        {label && <div className="eyebrow" style={{ marginTop: 6 }}>{label}</div>}
      </div>
      {sublabel && <div style={{ textAlign: "center", marginTop: 4, fontSize: 12.5, color: "var(--fg-muted)" }}>{sublabel}</div>}
    </div>
  );
}

/* ---------- Horizontal meter (4/5 rule etc) -------------------------------- */
function Meter({ value, threshold, max = 1, status, format }) {
  const pct = Math.min(100, (value / max) * 100);
  const tpct = threshold != null ? Math.min(100, (threshold / max) * 100) : null;
  const s = STATUS[status] || STATUS.neutral;
  const fmt = format || ((v) => v.toFixed(2));
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height: 8, background: "var(--track)", borderRadius: 99 }}>
        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: s.c, borderRadius: 99, transition: "width .8s var(--ease-out)" }} />
        {tpct != null && <div style={{ position: "absolute", top: -3, bottom: -3, left: `${tpct}%`, width: 2, background: "var(--fg-secondary)", borderRadius: 2 }} title="Seuil" />}
      </div>
      <div className="mono tnum" style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: "var(--fg-muted)" }}>
        <span style={{ color: s.c, fontWeight: 500 }}>{fmt(value)}</span>
        {threshold != null && <span>seuil {fmt(threshold)}</span>}
      </div>
    </div>
  );
}

/* ---------- Avatar --------------------------------------------------------- */
function Avatar({ name, size = 32, accent }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const hue = [162, 245, 78, 25, 290][name.charCodeAt(0) % 5];
  return (
    <div className="mono" style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      display: "grid", placeItems: "center", fontSize: size * 0.36, fontWeight: 500,
      color: accent ? "var(--accent-fg)" : `oklch(85% 0.08 ${hue})`,
      background: accent ? "var(--accent)" : `oklch(50% 0.09 ${hue} / 0.22)`,
      border: `1px solid ${accent ? "transparent" : `oklch(60% 0.1 ${hue} / 0.3)`}`,
    }}>{initials}</div>
  );
}

/* ---------- Sidebar -------------------------------------------------------- */
const NAV = [
  { section: null, items: [
    { id: "dashboard", label: "Vue d'ensemble", icon: Icons.grid },
  ]},
  { section: "Audits", items: [
    { id: "audits", label: "Mes audits", icon: Icons.layers },
    { id: "wizard", label: "Nouvel audit", icon: Icons.plus, accent: true },
    { id: "result", label: "Résultat", icon: Icons.shield, sub: true },
  ]},
  { section: "Pilotage", items: [
    { id: "reports", label: "Rapports", icon: Icons.file },
    { id: "reco", label: "Recommandations", icon: Icons.bulb },
  ]},
  { section: "Organisation", items: [
    { id: "team", label: "Équipe & accès", icon: Icons.users },
    { id: "settings", label: "Paramètres", icon: Icons.gear },
    { id: "support", label: "Aide & support", icon: Icons.help },
  ]},
];

function Sidebar({ route, go }) {
  const { theme, toggle } = useTheme();
  return (
    <aside className="sidebar">
      <div className="sb-brand" onClick={() => go("dashboard")}>
        <div className="sb-logo"><Icons.shield size={17} /></div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>AuditIQ</div>
          <div className="eyebrow" style={{ fontSize: 9.5, letterSpacing: "0.14em" }}>FAIRNESS PLATFORM</div>
        </div>
      </div>

      <nav className="sb-nav">
        {NAV.map((grp, gi) => (
          <div key={gi} className="sb-group">
            {grp.section && <div className="sb-section">{grp.section}</div>}
            {grp.items.map((it) => {
              const active = route === it.id;
              return (
                <button key={it.id} className={`sb-item ${active ? "active" : ""} ${it.sub ? "sub" : ""}`} onClick={() => go(it.id)}>
                  <it.icon size={17} />
                  <span>{it.label}</span>
                  {it.accent && !active && <span className="sb-kbd">⌘N</span>}
                  {active && <span className="sb-active-bar" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <button className="sb-theme" onClick={toggle}>
          <span className="sb-theme-track"><span className={`sb-theme-thumb ${theme}`}>{theme === "dark" ? <Icons.moon size={12} /> : <Icons.sun size={12} />}</span></span>
          <span>{theme === "dark" ? "Sombre" : "Clair"}</span>
        </button>
        <button className="sb-user" onClick={() => go("settings")}>
          <Avatar name="Léa Moreau" size={32} />
          <div style={{ minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Léa Moreau</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Responsable conformité</div>
          </div>
          <Icons.chevR size={15} style={{ color: "var(--fg-disabled)", flexShrink: 0 }} />
        </button>
      </div>
    </aside>
  );
}

/* ---------- Topbar --------------------------------------------------------- */
function Topbar({ title, crumbs, actions, sub }) {
  return (
    <header className="topbar">
      <div style={{ minWidth: 0 }}>
        {crumbs && (
          <div className="mono" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--fg-muted)", marginBottom: 5 }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icons.chevR size={12} style={{ color: "var(--fg-disabled)" }} />}
                <span style={{ color: i === crumbs.length - 1 ? "var(--fg-secondary)" : "var(--fg-muted)" }}>{c}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 21, letterSpacing: "-0.025em" }}>{title}</h1>
          {sub}
        </div>
      </div>
      <div className="topbar-actions">
        <div className="searchbox">
          <Icons.search size={15} />
          <input placeholder="Rechercher un audit, un modèle…" />
          <span className="mono searchbox-kbd">⌘K</span>
        </div>
        <button className="icon-btn" title="Notifications"><Icons.bell size={18} /><span className="icon-btn-dot" /></button>
        {actions}
      </div>
    </header>
  );
}

/* ---------- Page wrapper --------------------------------------------------- */
function Page({ children }) {
  return <div className="page fade-in">{children}</div>;
}

/* ---------- Empty / coming soon block -------------------------------------- */
function InlineNote({ icon: I = Icons.sparkle, children }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: "var(--accent-softer)", border: "1px solid var(--accent-border)", borderRadius: 10, color: "var(--fg-secondary)", fontSize: 13.5, lineHeight: 1.5 }}>
      <I size={17} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

/* ---------- Tooltip-free progress steps ------------------------------------ */
function StepDots({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {steps.map((_, i) => (
        <span key={i} style={{
          height: 4, borderRadius: 99, transition: "all .3s var(--ease-out)",
          width: i === current ? 22 : 7,
          background: i < current ? "var(--accent)" : i === current ? "var(--accent)" : "var(--border-strong)",
        }} />
      ))}
    </div>
  );
}

Object.assign(window, {
  Icons, Ic, useTheme, ThemeCtx, Button, Card, SectionHead, Badge, STATUS,
  Metric, Gauge, Meter, Avatar, Sidebar, Topbar, Page, InlineNote, StepDots, NAV,
});
