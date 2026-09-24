import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import canonicalize from 'canonicalize';
import { assertContribution, assertTypeRecord, referenceErrors } from './validation.ts';
import type { Contribution, Implementation, Party, TypeRecord } from './model.ts';

export const registryRoot = resolve(process.cwd(), 'registry');
export const MAX_CONTRIBUTION_BYTES = 256 * 1024;

// Digests identify the complete Registry record. RFC 8785 makes the value
// reproducible across implementations; it is not a digest of a MAP wire message.
export function recordDigest(value: unknown) {
  const canonical = canonicalize(value);
  if (canonical === undefined) throw new Error('Registry record is not canonical JSON.');
  return createHash('sha256').update(canonical).digest('hex');
}
export function readJson(path: string): unknown {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Expected a regular JSON file: ${path}`);
  if (stat.size > MAX_CONTRIBUTION_BYTES) throw new Error(`File exceeds 256 KiB: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`Could not parse JSON: ${path}`);
  }
}
function readDirectory(path: string) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({
      file,
      value: readJson(resolve(path, file)),
    }));
}
function uniqueParties(parties: Party[]) {
  return parties.filter(
    (party, index) =>
      parties.findIndex((other) => other.name === party.name && other.url === party.url) === index,
  );
}
function checkType(type: TypeRecord) {
  assertTypeRecord(type);
  const operationIds = type.operations.map((operation) => operation.id);
  if (new Set(operationIds).size !== operationIds.length)
    throw new Error(`${type.slug}: duplicate operation identifiers`);
  const operationNames = type.operations.map((operation) => operation.name.toLocaleLowerCase());
  if (new Set(operationNames).size !== operationNames.length)
    throw new Error(`${type.slug}: duplicate operation names`);
}

export interface Registry {
  types: TypeRecord[];
  contributions: Contribution[];
  implementations: Implementation[];
  snapshots: Map<string, TypeRecord>;
}

export function compileRegistry(seeds: TypeRecord[], submissions: Contribution[]): Registry {
  const records = new Map<string, TypeRecord>();
  const snapshots = new Map<string, TypeRecord>();
  const checkReferences = (submission: Contribution) => {
    const errors = referenceErrors(submission, {
      types: [...records.values()].map((record) => ({ record, digest: recordDigest(record) })),
      snapshots: [...snapshots].map(([digest, record]) => ({ digest, record })),
    });
    if (errors.length) throw new Error(`${submission.id}: ${errors.join(' ')}`);
  };
  const remember = (record: TypeRecord) => {
    checkType(record);
    records.set(record.slug, record);
    snapshots.set(recordDigest(record), record);
  };
  for (const seed of seeds) {
    if (records.has(seed.slug)) throw new Error(`Duplicate type identifier: ${seed.slug}`);
    remember(seed);
  }
  const ids = new Set<string>();
  for (const input of submissions) {
    assertContribution(input);
    if (ids.has(input.id)) throw new Error(`Duplicate contribution identifier: ${input.id}`);
    ids.add(input.id);
  }
  const contributions = [...submissions].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  for (const submission of contributions) {
    if (submission.kind !== 'new-type') continue;
    checkReferences(submission);
    remember({
      ...submission.record,
      origin: `${submission.contributor.name} contribution`,
      contributors: [submission.contributor],
      history: [
        {
          label: 'Initial contribution',
          description: submission.summary,
          contributionId: submission.id,
        },
      ],
    });
  }
  // Apply amendments by their base digest, independent of filename ordering.
  let pending = contributions.filter(
    (item): item is Extract<Contribution, { kind: 'amendment' }> => item.kind === 'amendment',
  );
  while (pending.length) {
    const eligible = pending.filter((submission) => {
      const base = records.get(submission.record.slug);
      return base && recordDigest(base) === submission.baseDigest;
    });
    if (!eligible.length)
      throw new Error(
        `Stale or unknown amendment base: ${pending.map((item) => item.id).join(', ')}`,
      );
    const bases = eligible.map((submission) => submission.baseDigest);
    if (new Set(bases).size !== bases.length)
      throw new Error('Conflicting amendments target the same base record');
    for (const submission of eligible) {
      checkReferences(submission);
      const previous = records.get(submission.record.slug)!;
      remember({
        ...submission.record,
        origin: previous.origin,
        contributors: uniqueParties([...previous.contributors, submission.contributor]),
        history: [
          ...previous.history,
          {
            label: `Amendment by ${submission.contributor.name}`,
            description: submission.summary,
            contributionId: submission.id,
          },
        ],
      });
    }
    pending = pending.filter((submission) => !eligible.includes(submission));
  }
  const names = [...records.values()].map((record) => record.name.toLocaleLowerCase());
  if (new Set(names).size !== names.length)
    throw new Error('Duplicate type name; amend the existing definition');
  const implementations = contributions.filter(
    (item): item is Implementation => item.kind === 'implementation',
  );
  const implementationsSeen = new Set<string>();
  for (const submission of implementations) {
    checkReferences(submission);
    const key = `${submission.product.url || submission.product.name}\n${submission.typeDigest}\n${submission.profile}`;
    if (implementationsSeen.has(key))
      throw new Error(
        `${submission.id}: duplicate implementation declaration for this product and record`,
      );
    implementationsSeen.add(key);
  }
  return {
    types: [...records.values()].sort((a, b) => a.name.localeCompare(b.name, 'en')),
    contributions,
    implementations,
    snapshots,
  };
}

export function loadRegistry(root = registryRoot, extra: Contribution[] = []): Registry {
  const seeds = readDirectory(resolve(root, 'types')).map(({ file, value }) => {
    assertTypeRecord(value);
    if (basename(file, '.json') !== value.slug)
      throw new Error(`${file}: filename must match the type identifier`);
    return value;
  });
  if (!seeds.length) throw new Error(`No base type records found in ${root}`);
  const submissions = readDirectory(resolve(root, 'contributions')).map(({ file, value }) => {
    assertContribution(value);
    if (basename(file, '.json') !== value.id)
      throw new Error(`${file}: filename must match the contribution identifier`);
    return value;
  });
  return compileRegistry(seeds, [...submissions, ...extra]);
}
