import { execFileSync } from 'node:child_process';
import { copyFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', root], {
  cwd: root,
  stdio: 'inherit',
});

const artifacts = JSON.parse(await readFile(resolve(root, 'artifacts.json'), 'utf8'));
if (!Array.isArray(artifacts) || artifacts.some((name) => typeof name !== 'string'))
  throw new Error('Invalid generated package artifact list.');
for (const name of artifacts) {
  await copyFile(resolve(root, 'src', name), resolve(root, 'dist', name));
}
