import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const generator = join(root, 'api/scripts/generate.mjs');

async function handwritten(directory) {
  const result = {};
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (['generated', '__pycache__'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    result[entry.name] = entry.isDirectory() ? await handwritten(path)
      : createHash('sha256').update(await readFile(path)).digest('hex');
  }
  return result;
}

const before = await Promise.all(['typescript/src', 'python/src', 'web-client/src'].map(path => handwritten(join(root, path))));
execFileSync(process.execPath, [generator, 'all'], { stdio: 'inherit' });
execFileSync(process.execPath, [generator, 'all', '--check'], { stdio: 'inherit' });

for (const target of ['typescript', 'python', 'client']) {
  const config = JSON.parse(await readFile(join(root, `api/generators/${target}.json`), 'utf8'));
  const artifact = join(root, config.output, ...(target === 'typescript' ? [] :
    target === 'python' ? ['models', 'health_response.py'] : ['runtime.ts']));
  const original = await readFile(artifact);
  const stale = Buffer.concat([original, Buffer.from(target === 'python' ? '\n# stale verification artifact\n' : '\n// stale verification artifact\n')]);
  try {
    await writeFile(artifact, stale);
    const result = spawnSync(process.execPath, [generator, target, '--check'], { encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.notEqual(result.status, 0, `Check must reject stale ${target} output`);
    assert.match(result.stderr, /Stale generated output/);
    assert.deepEqual(await readFile(artifact), stale, 'Check mode must not overwrite generated output');
    console.log(`Stale ${target} output rejected without overwriting it`);
  } finally {
    await writeFile(artifact, original);
  }
}
const after = await Promise.all(['typescript/src', 'python/src', 'web-client/src'].map(path => handwritten(join(root, path))));
assert.deepEqual(after, before, 'Regeneration must preserve every handwritten source file');
console.log('All handwritten sources preserved; deliberately stale artifacts restored');
