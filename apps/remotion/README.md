# @auditiq/remotion

Source of the **"Comment ça marche"** demo video shown on the AuditIQ landing page.

Built with [Remotion](https://www.remotion.dev/) — videos are written as React components and rendered to MP4 / WebM via headless Chromium.

## Composition

- `id`: `comment-ca-marche`
- `1920×1080` · `30 fps` · `900 frames` (30 s)
- Scenes (sequenced):
  1. **Import** — drop zone, file card, automatic column mapping
  2. **Configure** — module + decision + sensitive attributes + threshold slider
  3. **Diagnostic** — ledger card with 3 animated fairness gauges + verdict badge
  4. **Export** — PDF mock + AI Act compliance checklist + download CTA

Layout primitives in [`src/ui/`](src/ui/), the AuditIQ design tokens (dark mode) in [`src/theme.ts`](src/theme.ts).

## Iterate

```bash
# preview at http://localhost:3000 (Remotion Studio — interactive timeline)
pnpm --filter @auditiq/remotion studio
```

## Render (re-publish to the web app)

```bash
pnpm --filter @auditiq/remotion render:all
```

Outputs land directly in [`apps/web/public/video/`](../web/public/video/):

- `comment-ca-marche.mp4` (H.264, CRF 20 — for Safari + crawlers)
- `comment-ca-marche.webm` (VP9, CRF 32 — better compression for Chromium/Firefox)
- `comment-ca-marche-poster.jpg` (single still, frame 15 — used as `<video poster>` and reduced-motion fallback)

Individual targets are available too: `render:mp4`, `render:webm`, `render:poster`.

## Integration

The web app embeds the rendered files in the `#etapes` section of the marketing landing — see [`apps/web/app/(marketing)/page.tsx`](../web/app/(marketing)/page.tsx). The wrapper class is `.demo-video` (defined in [`apps/web/app/(marketing)/vitrine.css`](../web/app/(marketing)/vitrine.css)) and the player autoplays muted on loop, with a poster fallback for users who prefer reduced motion.
