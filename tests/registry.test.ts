import { expect, test } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  cpSync,
  symlinkSync,
  realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
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
    expect.arrayContaining([
      'content-review@0.1',
      'content-review@0.2',
      ...baseline.types.map((type) => `${type.slug}@${type.version}`),
    ]),
  );
  expect(() => assertContractCoverage(baseline.types, catalog)).not.toThrow();

  const root = mkdtempSync(resolve(tmpdir(), 'mailschema-contracts-'));
  try {
    cpSync(resolve('public'), resolve(root, 'public'), { recursive: true });
    const schemaPath = resolve(root, 'public/schemas/content-review-0.2.schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    schema.title = 'Drifted title';
    writeFileSync(schemaPath, JSON.stringify(schema));
    expect(() => loadTypeContractCatalog(root)).toThrow(/canonical digest does not match/);

    cpSync(resolve('public/schemas/content-review-0.2.schema.json'), schemaPath);
    const secondSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://mailschema.org/schemas/delivery-receipt-0.1.schema.json',
      type: 'object',
      properties: {
        type: {
          type: 'object',
          properties: {
            id: { const: 'https://mailschema.org/types/delivery-receipt' },
            version: { const: '0.1' },
          },
        },
        operation: { const: 'acknowledge' },
      },
    };
    const secondSchemaPath = resolve(root, 'public/schemas/delivery-receipt-0.1.schema.json');
    writeFileSync(secondSchemaPath, `${JSON.stringify(secondSchema, null, 2)}\n`);
    const secondContractPath = resolve(root, 'public/contracts/delivery-receipt-0.1.json');
    writeFileSync(
      secondContractPath,
      `${JSON.stringify(
        {
          kind: 'MapTypeContract',
          id: 'https://mailschema.org/types/delivery-receipt',
          version: '0.1',
          profile: 'https://mailschema.org/profiles/map/0.1',
          target: 'A delivery event identified by the service.',
          requestSchema: {
            url: secondSchema.$id,
            canonicalDigest: `sha-256:${createHash('sha256').update(canonicalize(secondSchema)!).digest('hex')}`,
          },
          operations: [
            {
              id: 'acknowledge',
              effect: 'Record acknowledgement of the delivery event.',
              results: [{ state: 'completed', outputSchema: { type: 'object' } }],
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const extendedCatalog = loadTypeContractCatalog(root);
    expect(extendedCatalog.map((entry) => `${entry.type}@${entry.version}`)).toContain(
      'delivery-receipt@0.1',
    );
    const secondRecord = {
      ...structuredClone(baseline.types.find((record) => record.slug === 'content-review')!),
      slug: 'delivery-receipt',
      name: 'Delivery Receipt',
      version: '0.1',
      profile: 'https://mailschema.org/profiles/map/0.1',
      operations: [
        {
          id: 'acknowledge',
          name: 'Acknowledge',
          description: 'Record acknowledgement of the delivery event.',
        },
      ],
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

// Every record digest a deployed build of main has served, from the launch onwards.
const PUBLISHED_RECORD_DIGESTS = [
  '0386907ea6240c57d635de1d78eeb5b0c14336c1ba54932510ab399f12ad0eb9',
  '0e6365df1bf904f2475f972ec66a5561edc0bfaae69fd7a1b41f53b40bf8ac1c',
  '502d0af939a17d7127707ed8ee56a10bd3779447ee5d47d5963f29c52e8c9948',
  '51b2530801aae0005bf79af410be87f59b7d780930a11d4fc41dc60c1e8ee78a',
  '6966ef25e4870decb534cb773caa11f3d2134dbcc628232146269d24e7d015a8',
  '9b0af5f399b381f0b1672a659ea51b7481c4e9ad6aa33220ac9da18060b60e03',
  'a48411f3372e87f3a5fc74725a9ad85f86dee0cea0b747a96338084c4f1fdd04',
  'a5ba7255b7fd8caac6e803639891e9025a26f6a95c32477a8e0d4bb27ebb9bbb',
  'bc6c9edaf8cdf6a183a01b321c4fea2690eb916b6c803c23c66397ed57d48c67',
  'bfb8a22e8637dc719fc0666c8e77d492d14d64f4a6675f1ba58f2d11f1772b01',
  'ec03b129b099fee9bd558714a29148c67902a374afe0cd96a78dc5d140d1fccc',
  'faeaf9c3d744f6ce6acb0b639429b59430b797c83c91ce93cf1a47896969e800',
];

test('every record digest ever published stays served, exactly as published', () => {
  for (const digest of PUBLISHED_RECORD_DIGESTS) {
    const record = baseline.snapshots.get(digest) ?? baseline.archive.get(digest);
    expect(recordDigest(record), digest).toBe(digest);
  }
  const root = mkdtempSync(resolve(tmpdir(), 'mailschema-snapshots-'));
  try {
    cpSync(resolve('registry'), root, { recursive: true });
    const misnamed = resolve(root, 'snapshots', `${'0'.repeat(64)}.json`);
    writeFileSync(misnamed, JSON.stringify(baseline.types[0]));
    expect(() => loadRegistry(root)).toThrow(/record digest/);
    rmSync(misnamed);
    const orphan = { ...baseline.types[0], slug: 'retired-type', name: 'Retired type' };
    writeFileSync(
      resolve(root, 'snapshots', `${recordDigest(orphan)}.json`),
      JSON.stringify(orphan),
    );
    expect(() => loadRegistry(root)).toThrow(/current type/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
