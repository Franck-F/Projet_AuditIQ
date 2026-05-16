import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from '../server.mjs';

const SECRET = 'shh';

function listen(app) {
  return new Promise((res) => {
    const s = app.listen(0, () => res(s));
  });
}

test('403 when secret header missing or wrong', async () => {
  const app = createServer({ secret: SECRET, render: async () => Buffer.from('%PDF') });
  const s = await listen(app);
  const port = s.address().port;
  try {
    const r1 = await fetch(`http://127.0.0.1:${port}/render`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ html: '<p>x</p>' }),
    });
    assert.equal(r1.status, 403);
    const r2 = await fetch(`http://127.0.0.1:${port}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-pdf-secret': 'nope' },
      body: JSON.stringify({ html: '<p>x</p>' }),
    });
    assert.equal(r2.status, 403);
  } finally {
    s.close();
  }
});

test('200 application/pdf with valid secret (injected renderer)', async () => {
  const app = createServer({
    secret: SECRET,
    render: async (html) => Buffer.from('%PDF-1.7 ' + html),
  });
  const s = await listen(app);
  const port = s.address().port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-pdf-secret': SECRET },
      body: JSON.stringify({ html: '<p>hi</p>' }),
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/pdf');
    const buf = Buffer.from(await r.arrayBuffer());
    assert.ok(buf.toString().startsWith('%PDF'));
  } finally {
    s.close();
  }
});
