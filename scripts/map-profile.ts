// Validates the MAP 0.2 profile record, every contract against its Registry
// record, and every published fixture document against the core and its contract.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAP_PROFILE, MapArtifacts, sha256 } from '../src/map/artifacts.ts';
import { ReferenceMapClient } from '../src/map/reference.ts';
import { loadRegistry } from '../src/registry/catalog.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path));
const profile = JSON.parse(read('public/profiles/map/0.2.json').toString('utf8'));
assert.equal(profile.id, MAP_PROFILE);
for (const [name, path] of [
  ['context', 'public/contexts/map-0.2.jsonld'],
  ['schema', 'public/schemas/map-0.2.schema.json'],
  ['contractFormat', 'public/schemas/type-contract-0.2.schema.json'],
] as const)
  assert.equal(
    profile.artifacts[name].sha256,
    sha256(read(path)),
    `The profile record binds stale ${name} bytes.`,
  );

// The Internet-Draft names every artifact the profile record binds, with its digest.
const draft = read('ietf/draft-mailschema-mail-action-protocol-00.xml').toString('utf8');
for (const [name, bound] of Object.entries(profile.artifacts) as [
  string,
  { url: string; sha256?: string },
][])
  if (bound.sha256)
    assert(
      draft.includes(bound.url) && draft.includes(bound.sha256),
      `The Internet-Draft does not bind the current ${name}.`,
    );

const artifacts = new MapArtifacts(root);
const current = artifacts.contracts.filter((entry) => entry.contract.profile === MAP_PROFILE);
const registry = loadRegistry();
for (const entry of current) {
  const record = registry.types.find((type) => type.slug === entry.slug);
  assert(record, `${entry.slug}: no Registry record`);
  if (record.version !== entry.contract.version) continue;
  assert.equal(record.profile, MAP_PROFILE, `${entry.slug}: the record names another profile`);
  assert.deepEqual(
    entry.contract.operations.map((operation) => operation.id),
    record.operations.map((operation) => operation.id),
    `${entry.slug}: the contract and record must name the same operations in the same order`,
  );
  // The chapter's authority table restates the contract; it must never drift from it.
  const chapter = read(`docs/specification/${entry.slug}.md`).toString('utf8');
  const table = chapter.split('## Authority and consequences')[1]?.split('\n\n')[1] ?? '';
  const rows = new Map(
    table
      .split('\n')
      .slice(2)
      .map((line) =>
        line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim()),
      )
      .map((cells): [string, { authority: string; consequences: string; kind: string }] => [
        cells[0],
        { authority: cells[1], consequences: cells[2], kind: cells[3] },
      ]),
  );
  const list = (cell = '') => cell.toLowerCase().split(', ');
  for (const operation of entry.contract.operations) {
    const name: string = record.operations.find((candidate) => candidate.id === operation.id)!.name;
    const row = rows.get(name);
    assert(row, `${entry.slug}: the chapter has no authority row for ${name}`);
    assert.deepEqual(
      list(row.authority),
      operation.authority,
      `${entry.slug} ${name}: authority differs from the contract`,
    );
    assert.deepEqual(
      list(row.consequences),
      operation.consequences,
      `${entry.slug} ${name}: consequences differ from the contract`,
    );
    assert.equal(
      row.kind,
      operation.repeatable ? 'Repeatable' : 'Decision',
      `${entry.slug} ${name}: kind differs from the contract`,
    );
  }
}

const documents = (directory: string): string[] =>
  readdirSync(resolve(root, directory)).flatMap((name) => {
    const path = `${directory}/${name}`;
    if (statSync(resolve(root, path)).isDirectory())
      return name === 'emails' ? [] : documents(path);
    return path.endsWith('.json') &&
      ![
        'dns.json',
        'jcs-vectors.json',
        'ijson-vectors.json',
        'lexical-vectors.json',
        'media-type-vectors.json',
      ].includes(name)
      ? [path]
      : [];
  });
const client = new ReferenceMapClient(
  () => 'urn:uuid:00000000-0000-7000-8000-000000000000',
  artifacts,
);
let count = 0;
for (const path of documents('public/fixtures/map-0.2')) {
  const value = JSON.parse(read(path).toString('utf8'));
  assert.deepEqual(artifacts.documentErrors(value), [], path);
  if (path.endsWith('/description.json')) client.verify(value, new Date(value.describedAt));
  count += 1;
}

console.log(
  `MAP 0.2 valid: ${current.length} type contracts, ${count} fixture documents and a profile record bound to its schema, context and contract format.`,
);
