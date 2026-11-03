import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function verifyContract(baseUrl, origin) {
  const request = (path, options = {}) => fetch(`${baseUrl}${path}`, {
    ...options, signal: AbortSignal.timeout(5000),
  });
  const health = await request('/health');
  assert.equal(health.status, 200);
  assert.match(health.headers.get('Content-Type'), /^application\/json/);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const allowed = await request('/health', { headers: { Origin: origin } });
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { status: 'ok' });
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match(allowed.headers.get('Vary'), /Origin/);

  const denied = await request('/health', { headers: { Origin: 'https://denied.example' } });
  assert.equal(denied.status, 200);
  assert.deepEqual(await denied.json(), { status: 'ok' });
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);

  const preflight = await request('/health', { method: 'OPTIONS', headers: {
    Origin: origin, 'Access-Control-Request-Method': 'GET',
  } });
  assert(preflight.ok);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert(preflight.headers.get('Access-Control-Allow-Methods')?.includes('GET'));
  console.log(`HTTP contract and origin policy pass: ${baseUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node api/scripts/contract-check.mjs <api-url> <web-origin>');
  await verifyContract(process.argv[2], process.argv[3]);
}
