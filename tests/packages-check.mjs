import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { materializePackageArtifacts, packageArtifactNames } from '../src/lib/package-artifacts.ts';
import {
  getContributionSchema,
  getRecordSchema,
  contributionErrors,
  assertContribution,
  assertTypeRecord,
  referenceErrors,
  MAP_PROFILE,
  getMapSchema,
  getMapContext,
  getContractFormatSchema,
  getFormsSchema,
} from '../.release/packages/npm/dist/index.js';

const fixture = JSON.parse(
  readFileSync(new URL('../registry/examples/new-type.json', import.meta.url)),
);
const record = JSON.parse(
  readFileSync(new URL('../registry/types/content-review.json', import.meta.url)),
);
const versions = JSON.parse(readFileSync('packages/versions.json', 'utf8'));
const prepared = JSON.parse(readFileSync('.release/packages/prepared.json', 'utf8'));
const canonicalArtifacts = materializePackageArtifacts();

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
  assert.match(
    readFileSync('.release/packages/ruby/lib/mailschema/version.rb', 'utf8'),
    new RegExp(`VERSION = "${versions.RubyGems.replaceAll('.', '\\.')}"$`, 'm'),
  );
});

test('the preparation manifest binds each distributed contract', () => {
  const expected = new Map(
    canonicalArtifacts.map(({ name, bytes }) => [
      name,
      createHash('sha256').update(bytes).digest('hex'),
    ]),
  );
  assert.deepEqual(new Map(prepared.contracts.map(({ name, sha256 }) => [name, sha256])), expected);
  for (const channel of prepared.channels)
    assert.deepEqual(channel.contracts, packageArtifactNames(channel.registry));
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

  const gemspec = readFileSync('.release/packages/ruby/mailschema.gemspec', 'utf8');
  for (const [key, value] of [
    ['allowed_push_host', 'https://rubygems.org'],
    ['source_code_uri', 'https://github.com/mailschema/ruby'],
    ['changelog_uri', 'https://github.com/mailschema/ruby/blob/main/CHANGELOG.md'],
    ['bug_tracker_uri', 'https://github.com/mailschema/ruby/issues'],
    ['rubygems_mfa_required', 'true'],
  ])
    assert.ok(gemspec.includes(`spec.metadata["${key}"] = "${value}"`), key);
  const rubyReadme = readFileSync('.release/packages/ruby/README.md', 'utf8');
  assert.match(rubyReadme, /Mail Action Protocol 0\.2/);
  assert.match(rubyReadme, /https:\/\/github\.com\/mailschema\/ruby/);
});

test('package preparation removes artifacts from earlier builds', () => {
  for (const path of [
    '.release/packages/python/dist',
    '.release/packages/python/tests/__pycache__',
    '.release/packages/rust/target',
    '.release/packages/ruby/.bundle',
    '.release/packages/ruby/pkg',
  ])
    assert.equal(existsSync(path), false, `${path} must not survive package preparation`);
  assert.equal(
    readFileSync('.release/packages/ruby/Gemfile.lock', 'utf8'),
    readFileSync('packages/ruby/Gemfile.lock', 'utf8'),
  );
});

test('prepared distributions contain exactly the artifacts selected by the manifest', () => {
  const roots = {
    npm: 'npm',
    PyPI: 'python/src/mailschema',
    'crates.io': 'rust',
    RubyGems: 'ruby',
  };
  for (const artifact of canonicalArtifacts)
    for (const [registry, root] of Object.entries(roots)) {
      const path = artifact.paths[registry];
      if (!path) continue;
      assert.equal(readFileSync(`.release/packages/${root}/${path}`, 'utf8'), artifact.bytes);
    }
  const canonical = canonicalArtifacts.find(({ name }) => name === 'contribution').bytes;
  assert.deepEqual(getContributionSchema(), JSON.parse(canonical));
  assert.equal(getRecordSchema().$ref, '#/$defs/record');
  const edited = getContributionSchema();
  edited.title = 'mutated';
  assert.notEqual(getContributionSchema().title, 'mutated');
  // The MAP 0.2 core artifacts, exactly as published; no type contract is bundled.
  assert.equal(MAP_PROFILE, 'https://mailschema.org/profiles/map/0.2');
  for (const [document, path] of [
    [getMapSchema(), 'public/schemas/map-0.2.schema.json'],
    [getMapContext(), 'public/contexts/map-0.2.jsonld'],
    [getContractFormatSchema(), 'public/schemas/type-contract-0.2.schema.json'],
    [getFormsSchema(), 'public/schemas/forms-0.1.schema.json'],
  ])
    assert.deepEqual(document, JSON.parse(readFileSync(path, 'utf8')));
  for (const root of ['npm/dist', 'python/src/mailschema', 'rust/contracts', 'rust/schemas'])
    if (existsSync(`.release/packages/${root}`))
      for (const file of readdirSync(`.release/packages/${root}`))
        assert.doesNotMatch(file, /content-review|map-0\.1/, `${root}/${file}`);
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
  const context = JSON.parse(
    execFileSync(process.execPath, [cli, 'schema', '--context'], { encoding: 'utf8' }),
  );
  assert.equal(context['@context'].MailAction, 'map:MailAction');
  const bad = spawnSync(process.execPath, [cli, 'check', 'package.json'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  const missing = spawnSync(process.execPath, [cli, 'check', '/nonexistent-metadata-file.json'], {
    encoding: 'utf8',
  });
  assert.equal(missing.status, 1);
});
