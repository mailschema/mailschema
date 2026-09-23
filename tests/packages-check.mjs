import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  getContributionSchema,
  getRecordSchema,
  contributionErrors,
  assertContribution,
  assertTypeRecord,
  referenceErrors,
} from '../.release/packages/npm/dist/index.js';

const fixture = JSON.parse(
  readFileSync(new URL('../registry/examples/new-type.json', import.meta.url)),
);
const record = JSON.parse(
  readFileSync(new URL('../registry/types/content-review.json', import.meta.url)),
);
const versions = JSON.parse(readFileSync('packages/versions.json', 'utf8'));
const prepared = JSON.parse(readFileSync('.release/packages/prepared.json', 'utf8'));

test('each distribution uses its independently declared package version', () => {
  assert.deepEqual(prepared.versions, versions);
  assert.equal(
    JSON.parse(readFileSync('.release/packages/npm/package.json')).version,
    versions.npm,
  );
  assert.match(
    readFileSync('.release/packages/python/pyproject.toml', 'utf8'),
    new RegExp(`^version = "${versions.PyPI.replaceAll('.', '\\.')}"$`, 'm'),
  );
  assert.match(
    readFileSync('.release/packages/rust/Cargo.toml', 'utf8'),
    new RegExp(`^version = "${versions['crates.io'].replaceAll('.', '\\.')}"$`, 'm'),
  );
});

test('published schema bytes agree across all three distributions', () => {
  const canonical = readFileSync('public/schemas/contribution.schema.json', 'utf8');
  for (const file of [
    'npm/dist/contribution.schema.json',
    'python/src/mailschema/contribution.schema.json',
    'rust/schemas/contribution.schema.json',
  ])
    assert.equal(readFileSync(`.release/packages/${file}`, 'utf8'), canonical);
  assert.deepEqual(getContributionSchema(), JSON.parse(canonical));
  assert.equal(getRecordSchema().$ref, '#/$defs/record');
  const edited = getContributionSchema();
  edited.title = 'mutated';
  assert.notEqual(getContributionSchema().title, 'mutated');
});

test('compiled API validates contributions and records and rejects unsupported claims', () => {
  assertContribution(fixture);
  assertTypeRecord(record);
  const badUrl = structuredClone(fixture);
  badUrl.contributor.url = 'javascript:alert(1)';
  assert.ok(contributionErrors(badUrl).length);
  assert.throws(() => assertContribution({ ...fixture, verified: true }));
  assert.throws(() => assertTypeRecord({ ...record, version: null }));
  for (const invalid of [null, [], 1, { kind: [] }, { kind: 'unknown' }])
    assert.ok(contributionErrors(invalid).length);
});

test('compiled reference validator rejects stale amendments and unrelated operations', () => {
  const digest = 'a'.repeat(64);
  const catalog = { types: [{ record, digest }], snapshots: [{ record, digest }] };
  const implementation = {
    format: 'mailschema-contribution/1',
    id: 'example-reviewer',
    kind: 'implementation',
    contributor: { name: 'Example Service' },
    summary: 'Test support declaration.',
    type: record.slug,
    typeVersion: record.version,
    typeDigest: digest,
    profile: record.profile,
    product: { name: 'Example Reviewer', url: 'https://example.com' },
    operations: [record.operations[0].name],
    evidence: { kind: 'declaration' },
  };
  assertContribution(implementation);
  assert.deepEqual(referenceErrors(implementation, catalog), []);
  assert.ok(
    referenceErrors({ ...implementation, operations: ['Delete everything'] }, catalog).length,
  );
  assert.ok(referenceErrors({ ...implementation, typeDigest: 'b'.repeat(64) }, catalog).length);
});

test('packaged CLI validates files, emits standalone schema and fails invalid input', () => {
  const cli = resolve('.release/packages/npm/cli.mjs');
  const check = execFileSync(process.execPath, [cli, 'check', 'registry/examples/new-type.json'], {
    encoding: 'utf8',
  });
  assert.match(check, /Valid MailSchema contribution/);
  const schema = JSON.parse(
    execFileSync(process.execPath, [cli, 'schema', '--record'], { encoding: 'utf8' }),
  );
  assert.equal(schema.$ref, '#/$defs/record');
  const bad = spawnSync(process.execPath, [cli, 'check', 'package.json'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  const missing = spawnSync(process.execPath, [cli, 'check', '/nonexistent-metadata-file.json'], {
    encoding: 'utf8',
  });
  assert.equal(missing.status, 1);
});
