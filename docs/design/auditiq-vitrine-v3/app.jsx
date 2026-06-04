/* =============================================================================
   AuditIQ — Routeur, thème, et bascule Prototype / Vue d'ensemble.
   ============================================================================= */

const ROUTES = {
  dashboard: { c: Dashboard, shell: true },
  audits: { c: AuditsList, shell: true },
  wizard: { c: Wizard, shell: true },
  result: { c: Result, shell: true },
  reports: { c: Reports, shell: true },
  reco: { c: Reco, shell: true },
  team: { c: Team, shell: true },
  settings: { c: Settings, shell: true },
  support: { c: Support, shell: true },
  auth: { c: Auth, shell: false },
};

const BOARD = [
  { id: "auth", label: "Authentification", tag: "Entrée", w: 1280, h: 820 },
  { id: "dashboard", label: "Vue d'ensemble", tag: "Pilotage", w: 1320, h: 900 },
  { id: "audits", label: "Mes audits", tag: "Pilotage", w: 1320, h: 820 },
  { id: "wizard", label: "Nouvel audit — wizard", tag: "Vitrine", w: 1320, h: 940, star: true },
  { id: "result", label: "Résultat d'audit", tag: "Cœur produit", w: 1320, h: 1080, star: true },
  { id: "reco", label: "Recommandations", tag: "Cœur produit", w: 1320, h: 860 },
  { id: "reports", label: "Rapports", tag: "Pilotage", w: 1320, h: 760 },
  { id: "team", label: "Équipe & accès", tag: "Organisation", w: 1320, h: 760 },
  { id: "settings", label: "Paramètres", tag: "Organisation", w: 1320, h: 760 },
  { id: "support", label: "Aide & support", tag: "Organisation", w: 1320, h: 720 },
];

/* ---------- Theme provider ------------------------------------------------- */
function useThemeState() {
  const [theme, setTheme] = useState(() => localStorage.getItem("aiq-theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("aiq-theme", theme);
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}

/* ---------- Prototype (shell + page) --------------------------------------- */
function Prototype({ route, go }) {
  const R = ROUTES[route] || ROUTES.dashboard;
  if (!R.shell) return <R.c go={go} />;
  return (
    <div className="shell">
      <Sidebar route={route} go={go} />
      <div className="main"><R.c go={go} /></div>
    </div>
  );
}

/* ---------- Board frame (scaled live render) ------------------------------- */
function BoardFrame({ item, go }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.34);
  useEffect(() => {
    const measure = () => { if (ref.current) setScale(ref.current.offsetWidth / item.w); };
    measure();
    const ro = new ResizeObserver(measure); if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [item.w]);
  const R = ROUTES[item.id];
  return (
    <div className="board-card" style={{ gridColumn: item.star ? "span 2" : "span 1" }}>
      <div className="board-head">
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {item.star && <Icons.sparkle size={14} style={{ color: "var(--accent)" }} />}
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{item.label}</span>
          <span className="board-tag">{item.tag}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => go(item.id)} style={{ height: 28 }}>Ouvrir<Icons.arrowR size={14} /></button>
      </div>
      <div ref={ref} className="board-view" onClick={() => go(item.id)} style={{ height: item.h * scale }}>
        <div style={{ width: item.w, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
          {R.shell
            ? <div className="shell" style={{ height: item.h }}><Sidebar route={item.id} go={() => {}} /><div className="main"><R.c go={() => {}} /></div></div>
            : <div style={{ height: item.h }}><R.c go={() => {}} /></div>}
        </div>
        <div className="board-overlay"><span className="btn btn-primary btn-sm">Ouvrir l'écran<Icons.arrowR size={14} /></span></div>
      </div>
    </div>
  );
}

function Board({ go }) {
  return (
    <div className="board-wrap">
      <div className="board-top">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Refonte · Vue d'ensemble</div>
          <h1 style={{ fontSize: 26, letterSpacing: "-0.03em" }}>10 écrans de l'app AuditIQ, refondus</h1>
          <p style={{ color: "var(--fg-muted)", fontSize: 14.5, marginTop: 8, maxWidth: 620 }}>Même direction artistique Supabase — surfaces sombres, accent vert réglementaire, feu tricolore fairness. Typo Geist, composants unifiés, copy professionnelle. Cliquez un écran pour le parcourir en grand.</p>
        </div>
      </div>
      <div className="board-grid">
        {BOARD.map((it) => <BoardFrame key={it.id} item={it} go={go} />)}
      </div>
    </div>
  );
}

/* ---------- Root ----------------------------------------------------------- */
function App() {
  const themeState = useThemeState();
  const [mode, setMode] = useState(() => localStorage.getItem("aiq-mode") || "board");
  const [route, setRoute] = useState(() => localStorage.getItem("aiq-route") || "dashboard");
  useEffect(() => { localStorage.setItem("aiq-mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("aiq-route", route); }, [route]);

  const go = useCallback((r) => { setRoute(r); setMode("proto"); window.scrollTo(0, 0); }, []);

  return (
    <ThemeCtx.Provider value={themeState}>
      {/* mode switch */}
      <div className="modebar">
        <button className={`modebar-btn ${mode === "board" ? "on" : ""}`} onClick={() => setMode("board")}><Icons.grid size={15} />Vue d'ensemble</button>
        <button className={`modebar-btn ${mode === "proto" ? "on" : ""}`} onClick={() => setMode("proto")}><Icons.layers size={15} />Prototype</button>
        <span className="modebar-sep" />
        <button className="modebar-icon" onClick={themeState.toggle} title="Thème">{themeState.theme === "dark" ? <Icons.sun size={15} /> : <Icons.moon size={15} />}</button>
      </div>

      {mode === "board" ? <Board go={go} /> : <Prototype route={route} go={go} />}
    </ThemeCtx.Provider>
  );
}

/* board + modebar styles injected here to keep CSS file lean */
const appStyle = document.createElement("style");
appStyle.textContent = `
.modebar { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 200;
  display: flex; align-items: center; gap: 4px; padding: 5px; border-radius: 13px;
  background: var(--surface-glass); backdrop-filter: blur(16px) saturate(1.5);
  border: 1px solid var(--border); box-shadow: var(--shadow-lg); }
.modebar-btn { display: flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 9px;
  font-size: 13px; font-weight: 500; color: var(--fg-muted); transition: all .15s; }
.modebar-btn:hover { color: var(--fg); background: var(--surface-2); }
.modebar-btn.on { color: var(--accent-fg); background: var(--accent); }
.modebar-btn.on svg { color: var(--accent-fg); }
.modebar-sep { width: 1px; height: 22px; background: var(--border); margin: 0 3px; }
.modebar-icon { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; color: var(--fg-secondary); transition: all .15s; }
.modebar-icon:hover { background: var(--surface-2); color: var(--fg); }

.board-wrap { max-width: 1500px; margin: 0 auto; padding: 40px 32px 110px; }
.board-top { margin-bottom: 30px; }
.board-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
@media (max-width: 1000px) { .board-grid { grid-template-columns: 1fr; } }
.board-card { background: var(--surface); border: 1px solid var(--border-subtle); border-radius: 15px; overflow: hidden; transition: border-color .15s, box-shadow .15s; }
.board-card:hover { border-color: var(--border); box-shadow: var(--shadow-md); }
.board-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid var(--border-subtle); }
.board-tag { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-muted); padding: 2px 8px; border: 1px solid var(--border); border-radius: 6px; }
.board-view { position: relative; overflow: hidden; cursor: pointer; background: var(--bg); }
.board-overlay { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0; background: oklch(0% 0 0 / 0.25); transition: opacity .18s; }
.board-view:hover .board-overlay { opacity: 1; }
`;
document.head.appendChild(appStyle);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
