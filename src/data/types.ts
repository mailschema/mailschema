import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import canonicalize from 'canonicalize';
import { assertContract } from '../specification/contracts';
import metadata from '../../specifications/map-0.3/registry.json';

export const specification = {
  version: '0.3',
  profile: 'https://mailschema.org/profiles/map/0.3',
  artifacts: '/artifacts/map-0.3',
  catalog: '/registry/map-0.3.json',
};
export const typeHref = (slug: string) => `/registry/${slug}`;
const source = resolve('specifications/map-0.3');
const read = (path: string) => readFileSync(resolve(source, path), 'utf8');
const json = (path: string) => JSON.parse(read(path));
export interface Example {
  '@context': string;
  '@id': string;
  type: { id: string; version: string; contractDigest: string };
  subject: { id: string; title: string };
  service: { id: string; tenant?: string };
  recipient: string;
  terms: { id: string; version: string };
  details: Record<string, unknown>;
  [key: string]: unknown;
}
interface Evidence {
  name: string;
  href: string;
  kind: 'declaration' | 'test-report';
  summary: string;
  contractDigest: string;
}
interface RegistryMetadata {
  category: string;
  maintainers: { name: string; href: string }[];
  implementationEvidence: Evidence[];
}
const records: Record<string, RegistryMetadata> = metadata;
const slugs = readdirSync(resolve(source, 'contracts'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -5))
  .sort();
if (slugs.join('\n') !== Object.keys(metadata).sort().join('\n'))
  throw new Error('Every current contract must have exactly one Registry entry.');
export const typeRecords = slugs.map((slug) => {
  const contract: unknown = json(`contracts/${slug}.json`);
  assertContract(contract);
  const digest = `sha-256:${createHash('sha256').update(canonicalize(contract)!).digest('hex')}`;
  const example = json(`examples/${slug}.json`) as Example;
  if (
    example.type.id !== contract.id ||
    example.type.version !== contract.version ||
    example.type.contractDigest !== digest
  )
    throw new Error(`${slug}: stale example; run npm run spec:generate.`);
  const record = records[slug];
  if (
    !record.category.trim() ||
    !record.maintainers.length ||
    record.maintainers.some((party) => !party.name.trim() || !/^https:\/\//.test(party.href))
  )
    throw new Error(`${slug}: category and named maintainers with HTTPS references are required.`);
  for (const evidence of record.implementationEvidence) {
    if (
      !evidence.name.trim() ||
      !evidence.summary.trim() ||
      !/^https:\/\//.test(evidence.href) ||
      !['declaration', 'test-report'].includes(evidence.kind) ||
      evidence.contractDigest !== digest
    )
      throw new Error(
        `${slug}: implementation evidence must identify this exact contract and its source.`,
      );
  }
  return {
    ...contract,
    ...record,
    slug,
    digest,
    example,
    status: 'Draft' as const,
    contractHref: `${specification.artifacts}/contracts/${slug}.json`,
    exampleHref: `${specification.artifacts}/examples/${slug}.json`,
  };
});
export type TypeRecord = (typeof typeRecords)[number];
export const typeStatusLabel = (record: TypeRecord) => `${record.status} · ${record.version}`;
export const typeGroups = [{ status: 'Draft', records: typeRecords }];
export const typeCollectionSummary = `${typeRecords.length} draft contracts`;
export const currentCatalog = {
  format: 'mailschema-registry/3',
  profile: specification.profile,
  status: 'draft',
  types: typeRecords.map(({ example, ...record }) => ({
    ...record,
    href: typeHref(record.slug),
  })),
};
