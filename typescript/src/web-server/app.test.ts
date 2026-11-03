import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { app } from './app.js';

test('health response and browser origin policy', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    assert.equal(health.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
    const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://other.example' } });
    assert.equal(denied.status, 200);
    assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
    const preflight = await fetch(`${base}/health`, { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET',
    } });
    assert(preflight.ok);
    assert(preflight.headers.get('Access-Control-Allow-Methods')?.includes('GET'));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
