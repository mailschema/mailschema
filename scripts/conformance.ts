import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordDigest } from '../src/registry/catalog.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path));
const manifest = JSON.parse(read('conformance/map-0.1/manifest.json').toString('utf8'));

assert.equal(manifest.format, 'mailschema-conformance/1');
assert.equal(manifest.profile, 'https://mailschema.org/profiles/map/0.1');
const paths = new Set<string>();
for (const artifact of manifest.artifacts) {
  assert(!paths.has(artifact.path), `Duplicate conformance artifact: ${artifact.path}`);
  paths.add(artifact.path);
  const digest = createHash('sha256').update(read(artifact.path)).digest('hex');
  assert.equal(digest, artifact.sha256, `Stale conformance digest: ${artifact.path}`);
}

const record = JSON.parse(read('registry/types/content-review.json').toString('utf8'));
assert.equal(manifest.type.id, 'https://mailschema.org/types/content-review');
assert.equal(manifest.type.version, record.version);
assert.equal(manifest.type.recordDigest, `sha-256:${recordDigest(record)}`);
assert(manifest.cases.length >= 12, 'The core MAP conformance cases are incomplete.');

console.log(
  `Conformance manifest valid: ${manifest.artifacts.length} bound artifacts and ${manifest.cases.length} cases.`,
);
