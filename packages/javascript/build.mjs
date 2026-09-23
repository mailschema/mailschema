import { execFileSync } from 'node:child_process';
import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', root], {
  cwd: root,
  stdio: 'inherit',
});

for (const name of [
  'contribution.schema.json',
  'map-0.1.schema.json',
  'content-review-0.1.schema.json',
]) {
  await copyFile(resolve(root, 'src', name), resolve(root, 'dist', name));
}
