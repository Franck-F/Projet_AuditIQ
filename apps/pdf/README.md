# @auditiq/pdf

Stateless HTML→PDF microservice (Puppeteer) for AuditIQ compliance reports.

`POST /render` — header `X-PDF-Secret: $PDF_SERVICE_SECRET`, body
`{"html": "<!DOCTYPE html>…"}` → `application/pdf`. 403 without the secret.

- `PDF_SERVICE_SECRET` — shared secret (must match the API's setting).
- `PORT` — default 8080.

`pnpm --filter @auditiq/pdf test` runs the server contract tests (secret
guard + render contract via an injected stub; no Chromium needed). The real
Puppeteer path (`render.mjs`) is exercised in deployment, not in CI.
