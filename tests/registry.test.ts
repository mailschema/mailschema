import { expect, test } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { digest } from '../src/map/core/index.ts';
import { compileRegistry, loadRegistry, recordDigest } from '../src/registry/catalog';
import { assertContractCoverage, loadTypeContractCatalog } from '../src/registry/contracts';
import { assertContribution } from '../src/registry/validation';
import { contributionExamples } from '../src/registry/examples';
import type { Contribution } from '../src/registry/model';

const baseline = loadRegistry();
function example<K extends Contribution['kind']>(kind: K): Extract<Contribution, { kind: K }> {
  return structuredClone(
    contributionExamples(baseline).find(({ input }) => input.kind === kind)!.input,
  ) as Extract<Contribution, { kind: K }>;
}

test('executable contracts are discovered from canonical files and fail closed on drift', () => {
  const catalog = loadTypeContractCatalog();
  expect(catalog.map((entry) => `${entry.type}@${entry.version}`)).toEqual(
    expect.arrayContaining(baseline.types.map((type) => `${type.slug}@${type.version}`)),
  );
  expect(() => assertContractCoverage(baseline.types, catalog)).not.toThrow();

  const root = mkdtempSync(resolve(tmpdir(), 'mailschema-contracts-'));
  try {
    cpSync(resolve('public'), resolve(root, 'public'), { recursive: true });
    const schemaPath = resolve(root, 'public/schemas/content-review-0.3.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    schema.title = 'Drifted title';
    writeFileSync(schemaPath, JSON.stringify(schema));
    expect(() => loadTypeContractCatalog(root)).toThrow(/request schema digest differs/);
    cpSync(resolve('public/schemas/content-review-0.3.schema.json'), schemaPath);

    // A new type's contract is found by its file alone: Action Approval under another name.
    const renamed = (path: string) =>
      JSON.parse(
        readFileSync(resolve(path), 'utf8').replaceAll('action-approval', 'delivery-receipt'),
      );
    const secondSchema = renamed('public/schemas/action-approval-0.1.schema.json');
    const secondContract = renamed('public/contracts/action-approval-0.1.json');
    secondContract.requestSchema.canonicalDigest = digest(secondSchema);
    const secondSchemaPath = resolve(root, 'public/schemas/delivery-receipt-0.1.schema.json');
    const secondContractPath = resolve(root, 'public/contracts/delivery-receipt-0.1.json');
    writeFileSync(secondSchemaPath, `${JSON.stringify(secondSchema, null, 2)}\n`);
    writeFileSync(secondContractPath, `${JSON.stringify(secondContract, null, 2)}\n`);
    const extendedCatalog = loadTypeContractCatalog(root);
    expect(extendedCatalog.map((entry) => `${entry.type}@${entry.version}`)).toContain(
      'delivery-receipt@0.1',
    );
    const secondRecord = {
      ...structuredClone(baseline.types.find((record) => record.slug === 'action-approval')!),
      slug: 'delivery-receipt',
      name: 'Delivery Receipt',
    };
    expect(() =>
      assertContractCoverage([...baseline.types, secondRecord], extendedCatalog),
    ).not.toThrow();
    rmSync(secondSchemaPath);
    rmSync(secondContractPath);
    rmSync(resolve(root, 'public/contracts/content-review-0.3.json'));
    expect(() => assertContractCoverage(baseline.types, loadTypeContractCatalog(root))).toThrow(
      /expected one current executable contract/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('vendor type contributions retain authorship and maintainers without changing other records', () => {
  const submission = example('new-type');
  const result = compileRegistry(baseline.types, [submission]);
  expect(result.types).toHaveLength(baseline.types.length + 1);
  const added = result.types.find((record) => record.slug === submission.record.slug)!;
  expect(added.contributors).toEqual([submission.contributor]);
  expect(added.maintainers).toEqual(submission.record.maintainers);
  expect(added.history[0].contributionId).toBe(submission.id);
  expect(baseline.types.find((record) => record.slug === added.slug)).toBeUndefined();
  expect(() =>
    compileRegistry(baseline.types, [submission, { ...submission, id: 'second-proposal' }]),
  ).toThrow(/already exists/);
});

test('amendments follow their exact bases, retain history and reject stale or competing changes', () => {
  const first = example('amendment');
  first.id = 'z-first-amendment';
  const afterFirst = compileRegistry(baseline.types, [first]);
  const next = structuredClone(first);
  next.id = 'a-later-amendment';
  next.baseDigest = recordDigest(
    afterFirst.types.find((record) => record.slug === first.record.slug),
  );
  next.record.openQuestions.push('An additional question after the first amendment.');
  const result = compileRegistry(baseline.types, [next, first]);
  const updated = result.types.find((record) => record.slug === first.record.slug)!;
  expect(updated.history.slice(0, 2).map((item) => item.contributionId)).toEqual([
    next.id,
    first.id,
  ]);
  expect(updated.contributors.map((party) => party.name)).toContain(first.contributor.name);
  expect(result.snapshots.has(first.baseDigest)).toBe(true);
  expect(() => compileRegistry(baseline.types, [{ ...first, baseDigest: '0'.repeat(64) }])).toThrow(
    /Stale/,
  );
  expect(() =>
    compileRegistry(baseline.types, [first, { ...first, id: 'competing-change' }]),
  ).toThrow(/Conflicting/);
});

test('implementation evidence stays bound to its version, profile, operations and historical record', () => {
  const declaration = example('implementation');
  const amendment = example('amendment');
  const result = compileRegistry(baseline.types, [amendment, declaration]);
  expect(result.implementations[0].typeDigest).toBe(declaration.typeDigest);
  expect(result.snapshots.get(declaration.typeDigest)?.version).toBe(declaration.typeVersion);
  expect(recordDigest(result.types.find((record) => record.slug === declaration.type))).not.toBe(
    declaration.typeDigest,
  );
  for (const patch of [
    { typeVersion: '99.0' },
    { profile: 'Another profile' },
    { typeDigest: '0'.repeat(64) },
    { operations: ['Send campaign'] },
    { operations: ['Approve', 'Approve'] },
  ])
    expect(() => compileRegistry(baseline.types, [{ ...declaration, ...patch }])).toThrow();
  expect(() => assertContribution({ ...declaration, evidence: { kind: 'verified' } })).toThrow();
  expect(() => assertContribution({ ...declaration, evidence: { kind: 'test-report' } })).toThrow(
    /reproduction/,
  );
});

// Every record digest the Registry has published. A published record changes only through an
// amendment, which adds a digest; none is ever withdrawn.
const PUBLISHED_RECORD_DIGESTS = [
  '00e1b5e365c5e6a51305b22aa90d7cbcc4bdf6161403cca05f86eee6ec352bb9',
  '20a053716853e360b8e19b6cc59aa7202760550b52a6bef457a9be7253eb713a',
  '25d690630ded48e4fc3140e73612f00104206a21e2fd65b1014b10f336a7157f',
  '2e9b7dc2ed1e6b2afe9e73e60299780d03d1041c990f7f6444dcdd2c8dc5b90d',
  '4188f9a18fc436ac6f55d34a0bcfccc0a1a4c87cd9a5f9c1848d4ce6b1137de0',
  '49eab77ec6ca8ce858859a32eb03497aaed45d13a86cb3687230d93bc7fdbc3d',
  '51dc3ccf17eb0a9061c7e6c6faaa4154d033448c263b2b0d63fe9d4551a35180',
  '6dc4b3bdf16894fe7295e4b355fe317e65dd89986a2c43de8d2504abdd4e01d7',
  '721dce32be5320cc893a9be0b1b1649e0d950d310d986f507d543be97a97eec6',
  '7d617d536f9f71a90c4e013e064e16c3560a043eb6260b272833497b0e01ea63',
  '9b0af5f399b381f0b1672a659ea51b7481c4e9ad6aa33220ac9da18060b60e03',
  'bc6c9edaf8cdf6a183a01b321c4fea2690eb916b6c803c23c66397ed57d48c67',
  'ec03b129b099fee9bd558714a29148c67902a374afe0cd96a78dc5d140d1fccc',
  'faeaf9c3d744f6ce6acb0b639429b59430b797c83c91ce93cf1a47896969e800',
];

test('every record digest ever published stays served, exactly as published', () => {
  for (const digest of PUBLISHED_RECORD_DIGESTS)
    expect(recordDigest(baseline.snapshots.get(digest)), digest).toBe(digest);
});

test('ingestion refuses unsafe links, traversal identifiers, missing fields and unversioned drafts', () => {
  const value = example('new-type');
  for (const bad of [
    { ...value, id: '../outside' },
    { ...value, contributor: { name: 'Vendor', url: 'javascript:alert(1)' } },
    { ...value, record: { ...value.record, maintainers: [] } },
    { ...value, record: { ...value.record, status: 'Draft' } },
    { ...value, verified: true },
  ])
    expect(() => assertContribution(bad)).toThrow(/Invalid contribution/);
});

test('CLI previews without writing, imports once and refuses conflicting identifier reuse', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'mailschema-ingestion-'));
  try {
    mkdirSync(resolve(root, 'types'));
    for (const record of baseline.types)
      writeFileSync(resolve(root, 'types', `${record.slug}.json`), JSON.stringify(record));
    const submission = example('new-type');
    const file = resolve(root, 'input.json');
    writeFileSync(file, JSON.stringify(submission));
    const run = (...flags: string[]) =>
      spawnSync(
        process.execPath,
        ['scripts/registry.ts', 'ingest', file, '--registry-dir', root, ...flags],
        { encoding: 'utf8' },
      );
    expect(run().status).toBe(0);
    const destination = resolve(root, 'contributions', `${submission.id}.json`);
    expect(existsSync(destination)).toBe(false);
    expect(run('--write').status).toBe(0);
    const imported = readFileSync(destination, 'utf8');
    expect(loadRegistry(root).types).toHaveLength(baseline.types.length + 1);
    expect(run('--write').stdout).toContain('Unchanged');
    submission.summary = 'A different contribution using the same identifier.';
    writeFileSync(file, JSON.stringify(submission));
    const conflict = run('--write');
    expect(conflict.status).toBe(1);
    expect(conflict.stderr).toContain('not overwritten');
    expect(readFileSync(destination, 'utf8')).toBe(imported);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
