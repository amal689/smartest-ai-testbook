import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = JSON.parse(await readFile(join(root, 'api/generators/openapi-generator.json'), 'utf8'));
const destination = join(root, `.api-tools/openapi-generator-cli-${config.version}.jar`);
const hash = data => createHash('sha256').update(data).digest('hex');
let current;
try { current = await readFile(destination); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!current || hash(current) !== config.sha256) {
  const response = await fetch(`https://repo.maven.apache.org/maven2/org/openapitools/openapi-generator-cli/${config.version}/openapi-generator-cli-${config.version}.jar`);
  if (!response.ok) throw new Error(`Generator download failed: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (hash(data) !== config.sha256) throw new Error('Generator SHA-256 mismatch');
  await mkdir(join(root, '.api-tools'), { recursive: true });
  await writeFile(destination, data);
}
console.log(`OpenAPI Generator ${config.version} is ready`);
