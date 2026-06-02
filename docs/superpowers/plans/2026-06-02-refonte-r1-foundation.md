# Refonte R1 — Foundation (tokens + fonts + theme + shell)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Préparer la fondation visuelle de la refonte App AuditIQ : importer les fonts Geist + Geist Mono, étendre les design tokens (dark + light theme via OKLCH), ajouter un toggle de thème, et reconstruire le shell (Sidebar + Topbar + AppShell) pixel-perfect avec le design package livré par Claude Design (`docs/design/auditiq-refonte/`).

**Architecture:** Le design package fournit `index.html` (CSS tokens + body styles) et `components.css` (.shell, .sidebar, .topbar, .btn, etc.) qu'on porte mot-pour-mot dans `apps/web/app/globals.css`. Les composants React `Sidebar.tsx` et `Topbar.tsx` sont **réécrits** pour suivre la structure de `docs/design/auditiq-refonte/components.jsx`. Theme toggle = client component qui lit `localStorage` et écrit `data-theme` sur `<html>` ; bootstrap script externe (`/theme-bootstrap.js`) pour éviter le FOUC, sans inline `dangerouslySetInnerHTML`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4, `next/font/google`, vitest + @testing-library/react.

**Design source:** `docs/design/auditiq-refonte/` — fichiers `index.html`, `components.css`, `components.jsx`, `app.jsx`. Pixel-perfect requis.

**Pré-requis exécution :** main propre. Aucune dépendance bloquante.

---

## File Structure

```
apps/web/
├── app/
│   ├── layout.tsx                        [MOD]   +Geist fonts + ThemeProvider wrap + external bootstrap script
│   └── globals.css                       [MOD]   tokens étendus (dark+light) + classes .shell/.sidebar/.topbar/.btn
├── public/
│   └── theme-bootstrap.js                [NEW]   external pre-hydration script (no inline)
├── components/
│   ├── app/
│   │   ├── AppShell.tsx                  [MOD]   compose Sidebar + Topbar slot + main
│   │   ├── Sidebar.tsx                   [REW]   nouveau design (brand, nav sections, theme toggle, user footer)
│   │   ├── Topbar.tsx                    [REW]   search box + icon buttons
│   │   └── ThemeProvider.tsx             [NEW]   client component, localStorage + data-theme on <html>
│   └── ui/
│       └── icons.tsx                     [NEW]   lucide-react wraps with design stroke-width 1.75
└── __tests__/
    ├── theme-provider.test.tsx            [NEW]   theme toggle + localStorage persistence
    ├── sidebar-refonte.test.tsx           [NEW]   renders brand + nav + theme toggle + active state
    └── topbar-refonte.test.tsx            [NEW]   search box + icon buttons
```

**Note d'isolation** : R1 ne touche AUCUNE page. Les pages existantes utilisent déjà `var(--accent)`, etc. → elles héritent automatiquement de la nouvelle palette sans changement. R2-R3-R4 traiteront chaque page individuellement.

---

## Conventions répétées

- **Worktree** : `worktree-refonte-r1-foundation`, créé via `git worktree add .claude/worktrees/refonte-r1-foundation -b worktree-refonte-r1-foundation origin/main`.
- **Identité git** : `Franck F <franck-dilane1.fambou@epitech.digital>`, **aucun trailer Claude**.
- **Commit** : Conventional Commits. Plain `git commit`.
- **Subagent gate** (Step 0 obligatoire) : `git rev-parse --show-toplevel` doit se terminer par `refonte-r1-foundation`. Repeat IMMEDIATELY before each `git commit`.
- **Scope restriction** : chaque tâche modifie strictement ses fichiers listés. `git status --short` doit montrer EXACTEMENT ces fichiers avant commit. ABORT BLOCKED si scope creep.
- **Controller verification** : après chaque DONE, controller vérifie HEAD du worktree + sweep main checkout.
- **Pixel-perfect fidelity** : valeurs CSS (couleurs, tailles, espacements, transitions, durées) doivent matcher exactement `docs/design/auditiq-refonte/index.html` et `components.css`. Pas d'arrondi.
- **No inline scripts** : pas de `dangerouslySetInnerHTML`. Si du JS doit s'exécuter avant hydration, le mettre dans `public/*.js` et le référencer via `<script src="/...">`.
- **Aucune modif côté `apps/api/` ni `apps/pdf/`**.

---

## Task 1: Geist + Geist Mono via next/font/google

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Worktree gate**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r1-foundation
git rev-parse --show-toplevel
```

- [ ] **Step 2: Add font imports + CSS variables**

Edit `apps/web/app/layout.tsx`. Add at top of the file:

```typescript
import { Geist, Geist_Mono } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});
```

Apply the variables on `<html>`:

```tsx
return (
  <html
    lang="fr"
    data-theme="dark"
    suppressHydrationWarning
    className={`${geist.variable} ${geistMono.variable}`}
  >
    <body>{children}</body>
  </html>
);
```

NOTE: If `next/font/google` lacks `Geist` (unlikely in Next 16, but check), fall back to `Inter` (closest substitute — keep var name `--font-geist` so the CSS stays unchanged).

- [ ] **Step 3: Verify build**

```
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r1-foundation
git rev-parse --show-toplevel
git add apps/web/app/layout.tsx
git commit -m "feat(web): Geist + Geist Mono fonts via next/font/google"
```

---

## Task 2: Design tokens — dark + light theme

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Replace existing :root block + add [data-theme="light"]**

Open `apps/web/app/globals.css`. Replace the entire existing `:root` token block AND add a new `[data-theme="light"]` block. The exact values come from `docs/design/auditiq-refonte/index.html` lines 14-145 — copy verbatim.

Critical tokens to include (these are the ones referenced by the shell CSS in Task 5):

Dark theme (`:root, [data-theme="dark"]`):
- Surfaces : `--bg: #0f0f0f; --surface: #161616; --surface-2: #1c1c1c; --surface-3: #232323; --surface-inset: #121212; --surface-glass: rgba(22, 22, 22, 0.82);`
- Text : `--fg: #fafafa; --fg-secondary: #b2b2b2; --fg-muted: #8a8a8a; --fg-disabled: #565656;`
- Borders : `--border-subtle: #242424; --border: #2d2d2d; --border-strong: #393939;`
- Accent : `--accent: oklch(72% 0.135 162); --accent-hover: oklch(78% 0.14 162); --accent-strong: oklch(56% 0.11 162); --accent-soft: oklch(72% 0.135 162 / 0.13); --accent-softer: oklch(72% 0.135 162 / 0.07); --accent-border: oklch(72% 0.135 162 / 0.30); --accent-fg: #07140d;`
- Status : `--pass`, `--warn`, `--fail`, `--info`, `--neutral` + `-bg` + `-border` variants (see index.html lines 51-67)
- `--focus-ring: oklch(72% 0.135 162 / 0.55); --track: #2a2a2a;`
- Shadows : `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-pop` (index.html lines 71-74)

Light theme (`[data-theme="light"]`):
- Use index.html lines 78-118 verbatim. Warm-stone palette.

Global `:root` extension (font + sidebar width):

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --font-sans: var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SF Mono", Menlo, monospace;
  --sidebar-w: 256px;
}
```

Body styles (use `--font-sans`):

```css
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "cv01", "cv03", "ss03";
  transition: color 0.3s ease;
}
```

Keep the `@import "tailwindcss";` at the top.

- [ ] **Step 2: Add typography helpers + base resets**

After body, port from `index.html` lines 175-210:

```css
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }

img, svg, video { display: block; max-width: 100%; }
button { font-family: inherit; background: none; border: 0; cursor: pointer; padding: 0; color: inherit; }
input, textarea, select { font-family: inherit; }
a { color: inherit; text-decoration: none; }
h1, h2, h3, h4, h5, h6 { margin: 0; font-weight: 600; letter-spacing: -0.018em; line-height: 1.15; }
p, ul, ol { margin: 0; }

::selection { background: var(--accent-soft); color: var(--fg); }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; border: 3px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background: var(--fg-disabled); background-clip: padding-box; }
::-webkit-scrollbar-track { background: transparent; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

.mono { font-family: var(--font-mono); font-feature-settings: "tnum"; }
.tnum { font-variant-numeric: tabular-nums; }
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--fg-muted);
}

@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.fade-up { animation: fadeUp 0.4s var(--ease-out) both; }
.fade-in { animation: fadeIn 0.35s var(--ease-out) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 3: Gates**

```
cd apps/web && pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```
git add apps/web/app/globals.css
git commit -m "feat(web): design tokens — dark + light theme (OKLCH) + typography helpers"
```

---

## Task 3: Theme bootstrap script (external)

**Files:**
- Create: `apps/web/public/theme-bootstrap.js`

- [ ] **Step 1: Create the bootstrap file**

Create `apps/web/public/theme-bootstrap.js`:

```javascript
// Pre-hydration: read aiq-theme from localStorage and apply data-theme
// to <html> before React mounts, to prevent dark↔light flash (FOUC).
// External file (not inline) to keep the layout free of dangerouslySetInnerHTML.
try {
  var t = localStorage.getItem('aiq-theme');
  if (t === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch (e) {
  // localStorage unavailable (private mode, etc.) — keep default dark.
}
```

- [ ] **Step 2: Commit**

```
git add apps/web/public/theme-bootstrap.js
git commit -m "feat(web): theme-bootstrap.js — external pre-hydration FOUC prevention"
```

---

## Task 4: ThemeProvider client component

**Files:**
- Create: `apps/web/components/app/ThemeProvider.tsx`
- Create: `apps/web/__tests__/theme-provider.test.tsx`

- [ ] **Step 1: Failing test**

Create `apps/web/__tests__/theme-provider.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider, useTheme } from '@/components/app/ThemeProvider';

function ProbeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} data-testid="probe">
      {theme}
    </button>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to dark when no localStorage value', () => {
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('hydrates from localStorage if present', () => {
    localStorage.setItem('aiq-theme', 'light');
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle switches dark→light→dark and persists', async () => {
    render(<ThemeProvider><ProbeButton /></ThemeProvider>);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('probe'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('aiq-theme')).toBe('light');
    await user.click(screen.getByTestId('probe'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('aiq-theme')).toBe('dark');
  });

  it('useTheme throws outside provider', () => {
    expect(() => render(<ProbeButton />)).toThrow(/ThemeProvider/i);
  });
});
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test theme-provider
```

- [ ] **Step 3: Create component**

Create `apps/web/components/app/ThemeProvider.tsx`:

```typescript
'use client';

import * as React from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'aiq-theme';

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = React.useState<Theme>(() => readInitial());

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => setThemeState(t), []);
  const toggle = React.useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = React.useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: PASS + gates**

```
cd apps/web && pnpm test theme-provider && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r1-foundation
git rev-parse --show-toplevel
git add apps/web/components/app/ThemeProvider.tsx apps/web/__tests__/theme-provider.test.tsx
git commit -m "feat(web): ThemeProvider (localStorage + data-theme on <html>)"
```

---

## Task 5: Wire ThemeProvider + bootstrap script in layout

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Wrap children with ThemeProvider + reference bootstrap script**

Edit `apps/web/app/layout.tsx`. Add the ThemeProvider import + the external bootstrap script (no inline JS):

```typescript
import { ThemeProvider } from '@/components/app/ThemeProvider';
```

Update `RootLayout` body to include the `<Script>` and `<ThemeProvider>`:

```tsx
import Script from 'next/script';

// ... existing font imports ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Pre-hydration FOUC prevention — must run before React mounts */}
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

NOTE: `<Script strategy="beforeInteractive">` is the Next.js-approved way to load a pre-hydration script without inline JS. Place it inside `<head>`.

- [ ] **Step 2: Gates**

```
cd apps/web && pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```
git add apps/web/app/layout.tsx
git commit -m "feat(web): wire ThemeProvider + external theme bootstrap script in root layout"
```

---

## Task 6: Shell CSS classes (.shell .sidebar .topbar .btn .searchbox)

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Append the design package's components.css**

Read `docs/design/auditiq-refonte/components.css` (201 lines). Append its ENTIRE content to `apps/web/app/globals.css` after the typography helpers from Task 2.

Place a delimiter comment :

```css
/* =============================================================================
   Shell components — ported pixel-perfect from docs/design/auditiq-refonte/components.css
   ============================================================================= */

/* ...full content of components.css... */
```

- [ ] **Step 2: Gates**

```
cd apps/web && pnpm typecheck && pnpm lint
```

If Tailwind v4 reports any conflict (rare with custom classes), resolve by giving the shell classes higher specificity. The design package's classes use `.sb-foo` / `.topbar-foo` / `.btn-foo` which shouldn't conflict with any Tailwind utility.

- [ ] **Step 3: Commit**

```
git add apps/web/app/globals.css
git commit -m "feat(web): shell CSS classes (.shell, .sidebar, .topbar, .btn) from design package"
```

---

## Task 7: Icons module (subset for shell)

**Files:**
- Create: `apps/web/components/ui/icons.tsx`

- [ ] **Step 1: Create the Icons module**

Create `apps/web/components/ui/icons.tsx`:

```typescript
import {
  Sparkles,
  Flag,
  Database,
  Users,
  Scale,
  Zap,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  ArrowRight,
  Home,
  Activity,
  FileText,
  Lightbulb,
  Target,
  Shield,
  Settings,
  HelpCircle,
  Plus,
  type LucideProps,
} from 'lucide-react';

import * as React from 'react';

type IconComponent = React.FC<LucideProps>;

interface IconWrapperProps extends LucideProps {
  size?: number;
}

function wrap(Component: IconComponent): React.FC<IconWrapperProps> {
  const Wrapped: React.FC<IconWrapperProps> = ({ size = 16, ...rest }) => (
    <Component size={size} strokeWidth={1.75} {...rest} />
  );
  Wrapped.displayName = Component.displayName ?? Component.name ?? 'Icon';
  return Wrapped;
}

export const Icons = {
  sparkle: wrap(Sparkles),
  flag: wrap(Flag),
  database: wrap(Database),
  users: wrap(Users),
  scale: wrap(Scale),
  zap: wrap(Zap),
  search: wrap(Search),
  bell: wrap(Bell),
  sun: wrap(Sun),
  moon: wrap(Moon),
  chevronDown: wrap(ChevronDown),
  logOut: wrap(LogOut),
  arrowR: wrap(ArrowRight),
  home: wrap(Home),
  activity: wrap(Activity),
  fileText: wrap(FileText),
  lightbulb: wrap(Lightbulb),
  target: wrap(Target),
  shield: wrap(Shield),
  settings: wrap(Settings),
  helpCircle: wrap(HelpCircle),
  plus: wrap(Plus),
} as const;
```

- [ ] **Step 2: Gates + commit**

```
cd apps/web && pnpm typecheck && pnpm lint
git add apps/web/components/ui/icons.tsx
git commit -m "feat(web): Icons module (lucide-react wrapped with design stroke-width 1.75)"
```

---

## Task 8: Rewrite Sidebar.tsx (pixel-perfect)

**Files:**
- Modify: `apps/web/components/app/Sidebar.tsx`
- Create: `apps/web/__tests__/sidebar-refonte.test.tsx`

- [ ] **Step 1: Failing test**

Create `apps/web/__tests__/sidebar-refonte.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Sidebar } from '@/components/app/Sidebar';
import { ThemeProvider } from '@/components/app/ThemeProvider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/app',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'u@x.fr' } }, error: null }),
      signOut: vi.fn(),
    },
  }),
}));

function wrap(children: React.ReactNode) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Sidebar (refonte)', () => {
  it('renders the brand block (logo + name)', () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText(/AuditIQ/i)).toBeInTheDocument();
  });

  it('renders nav sections (Espace de travail, Organisation)', () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText(/Espace de travail/i)).toBeInTheDocument();
    expect(screen.getByText(/Organisation/i)).toBeInTheDocument();
  });

  it('renders nav items (Vue d\'ensemble, Audits, Rapports, Recommandations)', () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText(/Vue d.ensemble/i)).toBeInTheDocument();
    expect(screen.getByText(/Audits/)).toBeInTheDocument();
    expect(screen.getByText(/Rapports/)).toBeInTheDocument();
    expect(screen.getByText(/Recommandations/)).toBeInTheDocument();
  });

  it('renders theme toggle and switches data-theme on click', async () => {
    render(wrap(<Sidebar />));
    const toggle = screen.getByRole('button', { name: /th[èe]me/i });
    expect(toggle).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test sidebar-refonte
```

- [ ] **Step 3: Rewrite Sidebar.tsx**

Open `docs/design/auditiq-refonte/components.jsx`, locate the `Sidebar` function. Port its JSX structure to `apps/web/components/app/Sidebar.tsx`, adapting:

- Replace `Icons.foo` with imports from `@/components/ui/icons`
- Replace `go(route)` navigation with `Link href` from `next/link` + active class via `usePathname()`
- Replace ad-hoc theme handling with `useTheme()` from `@/components/app/ThemeProvider`
- Keep the Supabase user fetch + signout logic from the existing Sidebar (still in the file pre-rewrite)
- Use the CSS classes already in globals.css (Task 6): `.sidebar`, `.sb-brand`, `.sb-logo`, `.sb-nav`, `.sb-group`, `.sb-section`, `.sb-item`, `.sb-active-bar`, `.sb-foot`, `.sb-theme`, `.sb-theme-track`, `.sb-theme-thumb`, `.sb-user`

The component must be a client component (`'use client'`) — it uses hooks.

Nav structure (preserve from existing Sidebar but with new visual):

```typescript
const NAV = [
  { type: 'section' as const, label: 'Espace de travail' },
  { type: 'item' as const, key: 'dashboard', label: "Vue d'ensemble", href: '/app', icon: Icons.home },
  { type: 'item' as const, key: 'audits', label: 'Audits', href: '/app/audits', icon: Icons.activity },
  { type: 'item' as const, key: 'rapports', label: 'Rapports', href: '/app/rapports', icon: Icons.fileText },
  { type: 'item' as const, key: 'recos', label: 'Recommandations', href: '/app/recommandations', icon: Icons.lightbulb },
  { type: 'section' as const, label: 'Organisation' },
  { type: 'item' as const, key: 'equipe', label: 'Équipe & accès', href: '/app/equipe', icon: Icons.users },
  { type: 'item' as const, key: 'parametres', label: 'Paramètres', href: '/app/parametres', icon: Icons.settings },
  { type: 'item' as const, key: 'support', label: 'Aide & support', href: '/app/support', icon: Icons.helpCircle },
];
```

Theme toggle button (sb-theme):

```tsx
<button onClick={toggle} className="sb-theme" aria-label="Basculer le thème">
  <span className="sb-theme-track">
    <span className={`sb-theme-thumb ${theme}`}>
      {theme === 'dark' ? <Icons.moon size={10} /> : <Icons.sun size={10} />}
    </span>
  </span>
  <span>{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</span>
</button>
```

- [ ] **Step 4: PASS + gates**

```
cd apps/web && pnpm test sidebar-refonte && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r1-foundation
git rev-parse --show-toplevel
git add apps/web/components/app/Sidebar.tsx apps/web/__tests__/sidebar-refonte.test.tsx
git commit -m "feat(web): rewrite Sidebar (brand + nav sections + theme toggle + user footer, pixel-perfect)"
```

---

## Task 9: Rewrite Topbar.tsx (pixel-perfect)

**Files:**
- Modify: `apps/web/components/app/Topbar.tsx`
- Create: `apps/web/__tests__/topbar-refonte.test.tsx`

- [ ] **Step 1: Failing test**

Create `apps/web/__tests__/topbar-refonte.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Topbar } from '@/components/app/Topbar';

describe('Topbar (refonte)', () => {
  it('renders the search box', () => {
    render(<Topbar />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders the notification icon button', () => {
    render(<Topbar />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders crumbs when provided', () => {
    render(<Topbar crumbs={[{ label: 'Audits', href: '/app/audits' }, { label: 'Nouvel audit' }]} />);
    expect(screen.getByText(/Nouvel audit/i)).toBeInTheDocument();
    expect(screen.getByText(/Audits/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify FAIL**

```
cd apps/web && pnpm test topbar-refonte
```

- [ ] **Step 3: Rewrite Topbar.tsx**

Port from `docs/design/auditiq-refonte/components.jsx` (find `function Topbar`). The new structure:

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';

import { Icons } from '@/components/ui/icons';

interface Crumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  crumbs?: ReadonlyArray<Crumb>;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
}

export function Topbar({
  crumbs = [],
  searchPlaceholder = 'Rechercher un audit, une page…',
  onSearch,
}: TopbarProps): React.ReactElement {
  return (
    <div className="topbar">
      <nav aria-label="Fil d'Ariane" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={`${c.label}-${idx}`}>
              {idx > 0 && <Icons.chevronDown size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--fg-muted)' }} />}
              {c.href && !isLast ? (
                <Link href={c.href} style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{c.label}</Link>
              ) : (
                <span style={{ color: isLast ? 'var(--fg)' : 'var(--fg-muted)', fontSize: 13, fontWeight: isLast ? 500 : 400 }}>{c.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <div className="searchbox">
          <Icons.search size={15} />
          <input
            type="search"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
            aria-label="Rechercher"
          />
          <span className="searchbox-kbd mono">⌘ K</span>
        </div>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Icons.bell size={16} />
          <span className="icon-btn-dot" aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: PASS + gates + commit**

```
cd apps/web && pnpm test topbar-refonte && pnpm typecheck && pnpm lint
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r1-foundation
git add apps/web/components/app/Topbar.tsx apps/web/__tests__/topbar-refonte.test.tsx
git commit -m "feat(web): rewrite Topbar (search + icon buttons + crumbs, pixel-perfect)"
```

---

## Task 10: AppShell compose Sidebar + main area

**Files:**
- Modify: `apps/web/components/app/AppShell.tsx`

- [ ] **Step 1: Update AppShell**

Replace existing content of `apps/web/components/app/AppShell.tsx`:

```typescript
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">{children}</div>
    </div>
  );
}
```

The `.shell` and `.main` CSS classes are in globals.css (Task 6). They handle the grid layout, sidebar width (via `--sidebar-w`), sticky behavior.

- [ ] **Step 2: Gates + commit**

```
cd apps/web && pnpm typecheck && pnpm lint
git add apps/web/components/app/AppShell.tsx
git commit -m "chore(web): AppShell uses .shell CSS class (port from design)"
```

---

## Task 11: Final gate + push + PR

- [ ] **Step 1: Full vitest**

```
cd apps/web && pnpm test
```

Expected: existing tests still pass + 11 new (theme-provider 4, sidebar-refonte 4, topbar-refonte 3).

- [ ] **Step 2: Typecheck + lint**

```
cd apps/web && pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Verify identities + filter-branch if drift**

```
cd C:/Users/Franck/Documents/projet/auditiq/.claude/worktrees/refonte-r1-foundation
git log --format="%h %an <%ae> %s" origin/main..HEAD
```

If any commit shows `<epitech>` or `<epitech@example.com>`, normalize:

```
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "epitech" ] || [ "$GIT_AUTHOR_EMAIL" = "epitech@example.com" ]; then
  export GIT_AUTHOR_NAME="Franck F"
  export GIT_AUTHOR_EMAIL="franck-dilane1.fambou@epitech.digital"
fi
if [ "$GIT_COMMITTER_EMAIL" = "epitech" ] || [ "$GIT_COMMITTER_EMAIL" = "epitech@example.com" ]; then
  export GIT_COMMITTER_NAME="Franck F"
  export GIT_COMMITTER_EMAIL="franck-dilane1.fambou@epitech.digital"
fi
' -- origin/main..HEAD
```

- [ ] **Step 4: Push + open PR**

```
git push -u origin worktree-refonte-r1-foundation
gh pr create --title "feat(web): refonte R1 — foundation (Geist fonts + OKLCH tokens + theme toggle + shell)" --body "$(cat <<'EOF'
## Summary

R1 du chantier de refonte de l'App AuditIQ (design package `docs/design/auditiq-refonte/`).

Fondation visuelle pixel-perfect du design Claude Design :

- **Fonts** : Geist + Geist Mono via `next/font/google`, exposés via `--font-sans` / `--font-mono` CSS vars.
- **Tokens** : palette OKLCH complète dark + light theme — surfaces, text hierarchy, borders, accent vert réglementaire, status tricolor (pass/warn/fail/info), shadows, focus ring.
- **Theme toggle** : composant client `ThemeProvider` (localStorage `aiq-theme`, applique `data-theme` sur `<html>`). Script bootstrap externe `/theme-bootstrap.js` chargé via `<Script strategy="beforeInteractive">` pour éviter le FOUC (pas de `dangerouslySetInnerHTML`).
- **Shell CSS** : 201 lignes portées depuis `components.css` (.shell, .sidebar, .topbar, .btn, .searchbox, .icon-btn, etc.).
- **Icons** : module wrap autour de lucide-react avec stroke-width 1.75.
- **Sidebar** : refonte complète (brand + nav sections + theme toggle + user footer) pixel-perfect.
- **Topbar** : refonte (crumbs + search box + icon buttons).
- **AppShell** : utilise `.shell` CSS class du design.

## Test plan

- [x] vitest +11 nouveaux tests (theme-provider 4, sidebar-refonte 4, topbar-refonte 3)
- [x] tsc strict + noUncheckedIndexedAccess clean
- [x] eslint 0 errors
- [x] toutes les pages existantes héritent automatiquement de la nouvelle palette via `var(--*)`
- [x] 11 commits Franck F, zéro trailer Claude

## Dépendances

Première PR de la refonte. R2 (wizard unifié), R3 (result/recos/reports), R4 (pages secondaires + auth) suivront.

## Hors scope R1

- Pages individuelles (R2/R3/R4)
- Mobile responsive sidebar (collapse / drawer) — itération post-R4 si besoin
EOF
)"
```

- [ ] **Step 5: Plan-sync commit if needed**

```
git add docs/superpowers/plans/2026-06-02-refonte-r1-foundation.md
git commit -m "chore(plan): sync R1 plan with discoveries during execution"
```

---

## Spec coverage check

| Design package element | Covered by |
|---|---|
| Geist + Geist Mono fonts | Task 1 |
| All OKLCH dark+light tokens (from index.html) | Task 2 |
| Typography helpers (.mono, .eyebrow, .tnum, @keyframes) | Task 2 |
| FOUC prevention via external bootstrap | Task 3 |
| Theme toggle behavior (localStorage + data-theme) | Tasks 4, 5 |
| Shell CSS (.shell, .sidebar, .topbar, .btn, .searchbox, .icon-btn) | Task 6 |
| Icons (lucide-react with design stroke-width) | Task 7 |
| Sidebar (brand + nav + theme + user) | Task 8 |
| Topbar (search + icons + crumbs) | Task 9 |
| AppShell layout | Task 10 |

**Hors scope (R2-R4):**
- Wizard unifié + audit type step (R2)
- Result page data-viz fairness (R3)
- Recommendations page (R3)
- Reports page (R3)
- Dashboard + audits list (R4)
- Team + Settings + Support + Auth (R4)
