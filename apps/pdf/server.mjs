import { createServer as httpCreateServer } from 'node:http';

import { renderPdf } from './render.mjs';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 5_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// `opts.render` defaults to the real Puppeteer renderer; tests inject a stub.
export function createServer(opts = {}) {
  const secret = opts.secret ?? process.env.PDF_SERVICE_SECRET ?? '';
  const render = opts.render ?? renderPdf;
  return httpCreateServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/render') {
      res.writeHead(404).end('not found');
      return;
    }
    if (!secret || req.headers['x-pdf-secret'] !== secret) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const { html } = await readJson(req);
      if (typeof html !== 'string' || html.length === 0) {
        res.writeHead(400).end('html required');
        return;
      }
      const pdf = await render(html);
      res.writeHead(200, { 'content-type': 'application/pdf' }).end(pdf);
    } catch {
      res.writeHead(500).end('render failed');
    }
  });
}

// Entry point (ignored by tests, which import createServer directly).
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const port = Number(process.env.PORT) || 8080;
  createServer().listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`auditiq-pdf listening on :${port}`);
  });
}
