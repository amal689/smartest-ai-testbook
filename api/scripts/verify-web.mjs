import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright';
import { verifyContract } from './contract-check.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const children = new Set();
let browser;
const configurationFile = join(root, 'web-client/dist/configuration.js');
let originalConfiguration;

async function freePort() {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function start(command, args, directory, environment) {
  const child = spawn(command, args, { cwd: join(root, directory),
    env: { ...process.env, ...environment }, windowsHide: true });
  children.add(child);
  child.output = '';
  child.stdout.on('data', data => { child.output += data; });
  child.stderr.on('data', data => { child.output += data; });
  child.on('error', error => { child.startError = error; });
  return child;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) { children.delete(child); return; }
  const exited = once(child, 'exit');
  child.kill();
  await exited;
  children.delete(child);
}

async function ready(url, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.startError) throw child.startError;
    if (child.exitCode !== null) throw new Error(child.output);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { /* Wait for the listening socket. */ }
    await setTimeout(100);
  }
  throw new Error(`Server did not become ready: ${url}\n${child.output}`);
}

async function builtFiles(directory = join(root, 'web-client/dist')) {
  const result = {};
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === 'configuration.js') continue;
    const path = join(directory, entry.name);
    result[entry.name] = entry.isDirectory() ? await builtFiles(path)
      : createHash('sha256').update(await readFile(path)).digest('hex');
  }
  return result;
}

try {
  const webPort = await freePort();
  const origin = `http://127.0.0.1:${webPort}`;
  const tsPort = await freePort();
  const pyPort = await freePort();
  const tsUrl = `http://127.0.0.1:${tsPort}`;
  const pyUrl = `http://127.0.0.1:${pyPort}`;
  const ts = start(process.execPath, ['--import', 'tsx', 'src/index.ts'], 'typescript', { PORT: String(tsPort), WEB_ORIGIN: origin });
  const python = join(root, 'python/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const py = start(python, ['-m', 'web_server'], 'python', {
    PORT: String(pyPort), WEB_ORIGIN: origin, PYTHONPATH: join(root, 'python/src'),
  });
  await ready(`${tsUrl}/health`, ts);
  await ready(`${pyUrl}/health`, py);
  await verifyContract(tsUrl, origin);
  await verifyContract(pyUrl, origin);
  if (!process.argv.includes('--http-only')) {
    const before = await builtFiles();
    originalConfiguration = await readFile(configurationFile);
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });

    async function scenario(name, apiBaseUrl, expected, options = {}) {
      const port = options.deniedOrigin ? await freePort() : webPort;
      const url = `http://127.0.0.1:${port}`;
      await writeFile(configurationFile, `export const apiBaseUrl = ${JSON.stringify(apiBaseUrl) ?? 'undefined'};\n`);
      const web = start(process.execPath, [join(root, 'web-client/node_modules/vite/bin/vite.js'),
        'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], 'web-client', {});
      let context;
      try {
        await ready(url, web);
        context = await browser.newContext();
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        if (options.configStatus) await page.route('**/configuration.js', route => route.fulfill({ status: options.configStatus }));
        if (options.configBody) await page.route('**/configuration.js', route => route.fulfill({ contentType: 'text/javascript', body: options.configBody }));
        const requests = [];
        page.on('request', request => { if (request.url().endsWith('/health')) requests.push(request.url()); });
        await page.goto(url);
        await page.getByText(expected, { exact: true }).waitFor();
        if (expected === 'Backend connected.') {
          assert.deepEqual(requests, [`${apiBaseUrl}/health`]);
          await page.getByRole('button', { name: 'Check connection' }).click();
          await page.getByText(expected, { exact: true }).waitFor();
          assert.equal(requests.length, 2);
        }
        assert.deepEqual(pageErrors, []);
        console.log(`Browser check passes: ${name}`);
      } finally {
        await context?.close();
        await stop(web);
      }
    }

    await scenario('TypeScript backend and retry', tsUrl, 'Backend connected.');
    await scenario('Python backend and retry', pyUrl, 'Backend connected.');
    await scenario('unreachable backend', `http://127.0.0.1:${await freePort()}`, 'Could not connect to the backend. Try again.');
    const configError = 'Could not load a valid backend configuration.';
    await scenario('missing backend address', undefined, configError);
    await scenario('invalid backend address', 'not-a-url', configError);
    await scenario('missing configuration module', tsUrl, configError, { configStatus: 404 });
    await scenario('malformed configuration module', tsUrl, configError, { configBody: 'export const apiBaseUrl = ;' });
    await scenario('browser blocks denied origin', tsUrl, 'Could not connect to the backend. Try again.', { deniedOrigin: true });
    assert.deepEqual(await builtFiles(), before, 'The same built assets must serve every runtime configuration');
    console.log('Identical built client verified across all runtime configurations');
  }
} finally {
  if (originalConfiguration) await writeFile(configurationFile, originalConfiguration);
  await browser?.close();
  await Promise.all([...children].map(stop));
}
