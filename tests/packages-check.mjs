import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  getContributionSchema,
  getRecordSchema,
  contributionErrors,
  assertContribution,
  assertTypeRecord,
  referenceErrors,
  getMapSchema,
  getContentReviewSchema,
  getContentReviewContract,
  getContentReview01Schema,
  getContentReview01Contract,
  assertMapDocument,
  assertContentReviewRequest,
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
  assert.equal(prepared.format, 'mailschema-package-build/2');
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

test('the preparation manifest binds each distributed contract', () => {
  const expected = new Map(
    [
      ['contribution', 'public/schemas/contribution.schema.json'],
      ['map-0.1', 'public/schemas/map-0.1.schema.json'],
      ['content-review-0.1', 'public/schemas/content-review-0.1.schema.json'],
      ['content-review-0.1-contract', 'public/contracts/content-review-0.1.json'],
      ['content-review-0.2', 'public/schemas/content-review-0.2.schema.json'],
      ['content-review-0.2-contract', 'public/contracts/content-review-0.2.json'],
    ].map(([name, path]) => [name, createHash('sha256').update(readFileSync(path)).digest('hex')]),
  );
  const contribution = JSON.parse(readFileSync('public/schemas/contribution.schema.json'));
  const record = `${JSON.stringify(
    { $schema: contribution.$schema, $defs: contribution.$defs, $ref: '#/$defs/record' },
    null,
    2,
  )}\n`;
  expected.set('record', createHash('sha256').update(record).digest('hex'));
  assert.deepEqual(new Map(prepared.contracts.map(({ name, sha256 }) => [name, sha256])), expected);
  assert.deepEqual(prepared.channels.find(({ registry }) => registry === 'crates.io').contracts, [
    'contribution',
    'map-0.1',
    'content-review-0.1',
    'content-review-0.1-contract',
    'content-review-0.2',
    'content-review-0.2-contract',
    'record',
  ]);
});

test('distribution metadata and READMEs point to maintained language repositories', () => {
  const npmPackage = JSON.parse(readFileSync('.release/packages/npm/package.json'));
  assert.equal(npmPackage.repository.url, 'git+https://github.com/mailschema/javascript.git');
  assert.equal(npmPackage.bugs.url, 'https://github.com/mailschema/javascript/issues');
  assert.equal(npmPackage.scripts.build, 'node build.mjs');
  assert.equal(npmPackage.scripts.test, 'npm run build && node --test test/*.test.mjs');

  const pythonProject = readFileSync('.release/packages/python/pyproject.toml', 'utf8');
  assert.match(pythonProject, /Repository = "https:\/\/github\.com\/mailschema\/python"/);
  assert.match(pythonProject, /Issues = "https:\/\/github\.com\/mailschema\/python\/issues"/);

  const rustProject = readFileSync('.release/packages/rust/Cargo.toml', 'utf8');
  assert.match(rustProject, /repository = "https:\/\/github\.com\/mailschema\/rust"/);

  for (const [language, repository] of [
    ['npm', 'javascript'],
    ['python', 'python'],
    ['rust', 'rust'],
  ]) {
    const readme = readFileSync(`.release/packages/${language}/README.md`, 'utf8');
    assert.match(readme, /Mail Action Protocol/);
    assert.match(readme, new RegExp(`https://github\\.com/mailschema/${repository}`));
    assert.doesNotMatch(readme, /(?:version|mailschema\s*=\s*)[ `"]*0\.2(?:\.0)?\b/i);
  }
});

test('package preparation removes artifacts from earlier builds', () => {
  for (const path of [
    '.release/packages/python/dist',
    '.release/packages/python/tests/__pycache__',
    '.release/packages/rust/target',
  ])
    assert.equal(existsSync(path), false, `${path} must not survive package preparation`);
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

test('all distributions include the MAP schema, Content Review schema and type contract', () => {
  for (const [name, canonical] of [
    ['map-0.1.schema.json', 'public/schemas/map-0.1.schema.json'],
    ['content-review-0.1.schema.json', 'public/schemas/content-review-0.1.schema.json'],
    ['content-review-0.2.schema.json', 'public/schemas/content-review-0.2.schema.json'],
  ]) {
    const expected = readFileSync(canonical, 'utf8');
    for (const path of [
      `npm/dist/${name}`,
      `python/src/mailschema/${name}`,
      `rust/schemas/${name}`,
    ])
      assert.equal(readFileSync(`.release/packages/${path}`, 'utf8'), expected);
  }
  assert.equal(getMapSchema().$id, 'https://mailschema.org/schemas/map-0.1.schema.json');
  assert.equal(
    getContentReviewSchema().$id,
    'https://mailschema.org/schemas/content-review-0.2.schema.json',
  );
  assert.equal(
    getContentReview01Schema().$id,
    'https://mailschema.org/schemas/content-review-0.1.schema.json',
  );
  for (const version of ['0.1', '0.2']) {
    const contract = readFileSync(`public/contracts/content-review-${version}.json`, 'utf8');
    for (const path of [
      `npm/dist/content-review-${version}.contract.json`,
      `python/src/mailschema/content-review-${version}.contract.json`,
      `rust/contracts/content-review-${version}.json`,
    ])
      assert.equal(readFileSync(`.release/packages/${path}`, 'utf8'), contract);
  }
  assert.equal(getContentReviewContract().id, 'https://mailschema.org/types/content-review');
  assert.equal(getContentReviewContract().version, '0.2');
  assert.equal(getContentReview01Contract().version, '0.1');
  const description = JSON.parse(
    readFileSync('public/fixtures/map-0.1/content-review-description.json'),
  );
  const request = JSON.parse(readFileSync('public/fixtures/map-0.1/approve.json'));
  assertMapDocument(description);
  assertContentReviewRequest(request);
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
    operations: [record.operations[0].id],
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
  const cli = resolve('.release/packages/npm/bin/mailschema.js');
  const check = execFileSync(process.execPath, [cli, 'check', 'registry/examples/new-type.json'], {
    encoding: 'utf8',
  });
  assert.match(check, /Valid MailSchema contribution/);
  const schema = JSON.parse(
    execFileSync(process.execPath, [cli, 'schema', '--record'], { encoding: 'utf8' }),
  );
  assert.equal(schema.$ref, '#/$defs/record');
  const mapCheck = execFileSync(
    process.execPath,
    [cli, 'check', 'public/fixtures/map-0.1/content-review-description.json', '--map'],
    { encoding: 'utf8' },
  );
  assert.match(mapCheck, /Valid MailSchema MAP document/);
  const contentCheck = execFileSync(
    process.execPath,
    [cli, 'check', 'public/fixtures/map-0.1/approve.json', '--content-review'],
    { encoding: 'utf8' },
  );
  assert.match(contentCheck, /Valid MailSchema Content Review request/);
  const bad = spawnSync(process.execPath, [cli, 'check', 'package.json'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  const missing = spawnSync(process.execPath, [cli, 'check', '/nonexistent-metadata-file.json'], {
    encoding: 'utf8',
  });
  assert.equal(missing.status, 1);
});
