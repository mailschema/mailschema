import { test, expect } from '@playwright/test';
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
  expect(catalog.map((entry) => `${entry.type}@${entry.version}`)).toEqual([
    'content-review@0.1',
    'content-review@0.2',
  ]);
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
    rmSync(resolve(root, 'public/contracts/content-review-0.2.json'));
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
  expect(updated.history.slice(-2).map((item) => item.contributionId)).toEqual([first.id, next.id]);
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

test('website checks all contribution kinds, previews attribution and invalidates edited downloads', async ({
  page,
}) => {
  await page.goto('/contribute');
  const editor = page.getByLabel('Contribution JSON', { exact: true });
  const check = page.getByRole('button', { name: 'Check and preview' });
  const download = page.locator('[data-download]');
  const submit = page.locator('[data-submit]');
  for (const kind of ['new-type', 'amendment', 'implementation']) {
    await page.locator(`[data-example="${kind}"]`).click();
    await expect(editor).toHaveValue(new RegExp(`"kind"\\s*:\\s*"${kind}"`));
    await check.click();
    await expect(page.locator('[data-check-status]')).toHaveText('File checks passed.');
    await expect(page.locator('[data-preview]')).toContainText('Example Document Service');
    await expect(download).toBeEnabled();
    const submissionUrl = new URL((await submit.getAttribute('href'))!);
    expect(submissionUrl.origin).toBe('https://github.com');
    expect(submissionUrl.pathname).toBe('/mailschema/mailschema/new/main/registry/contributions');
    expect(submissionUrl.searchParams.get('filename')).toMatch(/\.json$/);
    expect(JSON.parse(submissionUrl.searchParams.get('value')!)).toMatchObject({ kind });
  }
  const downloadEvent = page.waitForEvent('download');
  await download.click();
  expect((await downloadEvent).suggestedFilename()).toBe('example-review-service.json');
  await editor.fill('{ broken json');
  await expect(download).toBeDisabled();
  await expect(submit).not.toHaveAttribute('href');
  await expect(page.locator('[data-preview]')).toBeHidden();
  await check.click();
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
  const stale = example('amendment');
  stale.baseDigest = '0'.repeat(64);
  await editor.fill(JSON.stringify(stale));
  await check.click();
  await expect(page.getByRole('alert')).toContainText('Stale or unknown');
  await expect(download).toBeDisabled();

  const large = example('new-type');
  large.record.overview = 'A'.repeat(8_000);
  await editor.fill(JSON.stringify(large));
  await check.click();
  const upload = page.getByRole('link', { name: 'Upload in GitHub' });
  await expect(upload).toHaveAttribute(
    'href',
    'https://github.com/mailschema/mailschema/upload/main/registry/contributions',
  );
  await expect(page.locator('[data-submit-note]')).toContainText('too large to prefill');
});

test('vendor contributions produce real Registry pages, history and version-bound implementation sections', async () => {
  test.setTimeout(60000);
  const directory = mkdtempSync(resolve(tmpdir(), 'mailschema-vendor-site-'));
  try {
    for (const path of [
      'src',
      'public',
      'packages',
      'registry',
      'docs/specification',
      'docs/releases',
      'astro.config.mjs',
      'tsconfig.json',
      'package.json',
    ]) {
      cpSync(resolve(path), resolve(directory, path), { recursive: true });
    }
    symlinkSync(resolve('node_modules'), resolve(directory, 'node_modules'), 'dir');
    for (const kind of ['new-type', 'amendment', 'implementation'] as const) {
      const submission = example(kind);
      writeFileSync(
        resolve(directory, 'registry/contributions', `${submission.id}.json`),
        JSON.stringify(submission),
      );
    }
    const result = spawnSync(process.execPath, [realpathSync('node_modules/.bin/astro'), 'build'], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 45000,
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const page = readFileSync(
      resolve(directory, 'dist/registry/document-receipt.html'),
      'utf8',
    );
    expect(page).toContain('Document Receipt');
    expect(page).toContain('Example Document Service');
    expect(page).toContain('/registry/contributions/example-document-receipt.json');
    const review = readFileSync(
      resolve(directory, 'dist/registry/content-review.html'),
      'utf8',
    );
    expect(review).toContain('Amendment by Example Document Service');
    expect(review).toContain('Example Reviewer');
    expect(review).toContain('Support declaration');
    expect(review).toContain('This declaration targets an earlier record');
    expect(review).not.toContain('No implementation evidence has been published');
    const catalog = JSON.parse(
      readFileSync(resolve(directory, 'dist/registry/catalog.json'), 'utf8'),
    );
    expect(catalog.types).toHaveLength(baseline.types.length + 1);
    expect(catalog.contributions).toHaveLength(baseline.contributions.length + 3);
    const implementation = example('implementation');
    expect(
      catalog.implementations.find((entry: { id: string }) => entry.id === implementation.id)
        .typeDigest,
    ).toBe(implementation.typeDigest);
    // A standalone production build must reject packages advertised against a different schema.
    const schemaFile = resolve(directory, 'public/schemas/contribution.schema.json');
    writeFileSync(schemaFile, readFileSync(schemaFile, 'utf8') + '\n');
    const stale = spawnSync(process.execPath, [realpathSync('node_modules/.bin/astro'), 'build'], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 45000,
    });
    expect(stale.status).not.toBe(0);
    expect(stale.stdout + stale.stderr).toMatch(
      /differs from the advertised package release|selected package set targets a different contribution schema/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('website preview renders contributor text safely and fails when reference data is unavailable', async ({
  page,
}) => {
  await page.goto('/contribute');
  const payload = example('new-type');
  payload.contributor.name = '<img src=x onerror="window.injected=true">';
  await page.getByLabel('Contribution JSON', { exact: true }).fill(JSON.stringify(payload));
  await page.getByRole('button', { name: 'Check and preview' }).click();
  await expect(page.locator('[data-preview]')).toContainText(payload.contributor.name);
  await expect(page.locator('[data-preview] img')).toHaveCount(0);
  await page.route('**/registry/catalog.json', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.getByRole('button', { name: 'Check and preview' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not load the Registry');
  await expect(page.locator('[data-download]')).toBeDisabled();
});
