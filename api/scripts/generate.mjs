import { readFile, writeFile, mkdir, mkdtemp, rm, readdir, cp, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import openapiTS, { astToString } from 'openapi-typescript';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = process.argv[2] ?? 'typescript';
const check = process.argv.includes('--check');
if (target === 'all') {
  for (const name of ['typescript', 'python', 'client']) {
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), name, ...(check ? ['--check'] : [])], { stdio: 'inherit' });
  }
  process.exit(0);
}
if (!['typescript', 'python', 'client'].includes(target)) throw new Error(`Unknown generation target: ${target}`);
const config = JSON.parse(await readFile(join(root, `api/generators/${target}.json`), 'utf8'));
const expectedOutputs = {
  typescript: 'typescript/src/web-server/generated/schema.ts',
  python: 'python/src/web_server/generated',
  client: 'web-client/src/generated',
};
const destination = resolve(root, config.output);
const relativeDestination = relative(root, destination);
if (config.output !== expectedOutputs[target] || relativeDestination.startsWith('..') || isAbsolute(relativeDestination)) {
  throw new Error(`Unsafe generation destination: ${destination}`);
}
const temporary = await mkdtemp(join(tmpdir(), 'testbook-api-'));
try {
  let artifact;
  if (target === 'typescript') {
    const installed = JSON.parse(await readFile(join(root, 'node_modules/openapi-typescript/package.json'), 'utf8'));
    if (installed.version !== config.version) throw new Error(`Expected openapi-typescript ${config.version}`);
    artifact = join(temporary, 'schema.ts');
    await writeFile(artifact, astToString(await openapiTS(new URL('../openapi.yaml', import.meta.url))));
  } else {
    const jar = join(root, `.api-tools/openapi-generator-cli-${config.version}.jar`);
    const tool = JSON.parse(await readFile(join(root, 'api/generators/openapi-generator.json'), 'utf8'));
    if (tool.version !== config.version || createHash('sha256').update(await readFile(jar)).digest('hex') !== tool.sha256) {
      throw new Error('Generator missing or incorrect; run node api/scripts/setup-generator.mjs');
    }
    const options = join(temporary, 'options.json');
    await writeFile(options, JSON.stringify({ additionalProperties: config.additionalProperties }));
    execFileSync('java', ['-jar', jar, 'generate', '-g', config.generator,
      '-i', join(root, 'api/openapi.yaml'), '-o', temporary, '-c', options,
      ...(config.templates ? ['-t', join(root, config.templates)] : []),
      '--global-property', config.globalProperties ?? 'apiTests=false,modelTests=false,apiDocs=false,modelDocs=false'],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    if (target === 'python') {
      artifact = join(temporary, 'src/web_server/generated');
    } else {
      artifact = join(temporary, 'client-source');
      await mkdir(artifact);
      for (const name of ['apis', 'models', 'index.ts', 'runtime.ts']) {
        await cp(join(temporary, name), join(artifact, name), { recursive: true });
      }
    }
  }
  if (check) {
    if (JSON.stringify(await snapshot(destination)) !== JSON.stringify(await snapshot(artifact))) {
      throw new Error(`Stale generated output: ${config.output}`);
    }
    console.log(`Current generated output: ${config.output}`);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await rm(destination, { recursive: true, force: true });
    await cp(artifact, destination, { recursive: true });
    console.log(`Generated ${config.output}`);
  }
} finally {
  if (dirname(temporary) !== resolve(tmpdir())) throw new Error('Unsafe temporary directory');
  await rm(temporary, { recursive: true, force: true });
}

async function snapshot(path) {
  if (!(await stat(path)).isDirectory()) return createHash('sha256').update(await readFile(path)).digest('hex');
  const result = {};
  for (const entry of (await readdir(path)).sort()) {
    if (entry === '__pycache__') continue;
    result[entry] = await snapshot(join(path, entry));
  }
  return result;
}
