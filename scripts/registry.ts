import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { assertContribution } from '../src/registry/validation.ts';
import { loadRegistry, readJson, recordDigest, registryRoot } from '../src/registry/catalog.ts';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { write: { type: 'boolean', default: false }, 'registry-dir': { type: 'string' } },
  });
  const [command, file, ...extra] = positionals;
  if (extra.length || (command === 'validate' && (file || values.write)))
    throw new Error('Unexpected registry arguments');
  const root = values['registry-dir'] ? resolve(values['registry-dir']) : registryRoot;
  const write = values.write;
  if (command === 'validate') {
    const result = loadRegistry(root);
    console.log(
      `Registry valid: ${result.types.length} types, ${result.contributions.length} contributions, ${result.implementations.length} implementation declarations.`,
    );
  } else if (command === 'ingest') {
    if (!file) throw new Error('Usage: npm run registry:ingest -- contribution.json [--write]');
    const value = readJson(resolve(file));
    assertContribution(value);
    const directory = resolve(root, 'contributions');
    const destination = resolve(directory, `${value.id}.json`);
    if (existsSync(destination)) {
      if (recordDigest(readJson(destination)) !== recordDigest(value))
        throw new Error(
          `Contribution ${value.id} already exists with different content; it was not overwritten`,
        );
      console.log(`Unchanged: ${value.id}`);
    } else {
      const preview = loadRegistry(root, [value]);
      if (write) {
        mkdirSync(directory, { recursive: true });
        const lock = resolve(directory, '.import.lock');
        writeFileSync(lock, String(process.pid), { flag: 'wx' });
        try {
          loadRegistry(root, [value]);
          writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
        } finally {
          unlinkSync(lock);
        }
      }
      console.log(
        JSON.stringify(
          {
            id: value.id,
            kind: value.kind,
            contributor: value.contributor.name,
            type: value.kind === 'implementation' ? value.type : value.record.slug,
            destination,
            typesAfterImport: preview.types.length,
            implementationDeclarationsAfterImport: preview.implementations.length,
            written: write,
          },
          null,
          2,
        ),
      );
      console.log(
        write
          ? `Imported ${value.id}. Run npm run verify, inspect the preview and submit the change for review. No publication occurred.`
          : 'Validation only. Add --write to create the contribution file.',
      );
    }
  } else throw new Error('Expected registry command: validate or ingest');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
