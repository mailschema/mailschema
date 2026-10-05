import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import canonicalize from 'canonicalize';
import { parseContractText } from '../specification/contracts';
import {
  parseImplementationText,
  type ImplementationRecord,
} from '../specification/implementations';
import metadata from '../../specifications/map-0.3/registry.json';
import { specification } from './specification';

export { specification };
export const typeHref = (slug: string) => `/registry/${slug}`;
const source = resolve(specification.source);
const read = (path: string) => readFileSync(resolve(source, path), 'utf8');
const digest = (value: unknown) =>
  `sha-256:${createHash('sha256').update(canonicalize(value)!).digest('hex')}`;
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
type Status = 'Draft' | 'Experimental' | 'Stable' | 'Deprecated' | 'Superseded';
interface RegistryMetadata {
  category: string;
  maintainers: { name: string; href: string }[];
  current: string;
  versions: Record<string, { status: string; successor?: string }>;
}
const statuses: Status[] = ['Draft', 'Experimental', 'Stable', 'Deprecated', 'Superseded'];
const records: Record<string, RegistryMetadata> = metadata;
const contractFiles = readdirSync(resolve(source, 'contracts'))
  .filter((name) => name.endsWith('.json'))
  .sort();
const contractVersions = contractFiles.map((filename) => {
  const contract = parseContractText(read(`contracts/${filename}`));
  const suffix = `-${contract.version}.json`;
  if (!filename.endsWith(suffix))
    throw new Error(`${filename}: contract filename must end with its version.`);
  const slug = filename.slice(0, -suffix.length);
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error(`${filename}: invalid page slug.`);
  const record = records[slug];
  const version = record?.versions[contract.version];
  if (!record || !version)
    throw new Error(`${filename}: missing Registry metadata for this contract version.`);
  if (!statuses.includes(version.status as Status))
    throw new Error(`${filename}: unknown Registry lifecycle status.`);
  if (
    !record.category.trim() ||
    !record.maintainers.length ||
    record.maintainers.some((party) => !party.name.trim() || !/^https:\/\//.test(party.href))
  )
    throw new Error(`${slug}: category and named maintainers with HTTPS references are required.`);
  return {
    ...contract,
    slug,
    digest: digest(contract),
    category: record.category,
    maintainers: record.maintainers,
    status: version.status as Status,
    successor: version.successor,
    current: record.current === contract.version,
    contractHref: `${specification.artifacts}/contracts/${filename}`,
  };
});
if (
  new Set(contractVersions.map((item) => `${item.id}\n${item.version}`)).size !==
  contractVersions.length
)
  throw new Error('Duplicate contract identifier and version.');
for (const [slug, record] of Object.entries(records)) {
  const actual = contractVersions
    .filter((item) => item.slug === slug)
    .map((item) => item.version)
    .sort();
  if (
    actual.join('\n') !== Object.keys(record.versions).sort().join('\n') ||
    !actual.includes(record.current)
  )
    throw new Error(`${slug}: every version needs metadata and one current selection.`);
}

const implementationsDirectory = resolve(source, 'implementations');
export const implementations: ImplementationRecord[] = readdirSync(implementationsDirectory)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => parseImplementationText(read(`implementations/${name}`)));
const seenServices = new Set<string>();
for (const implementation of implementations) {
  const target = contractVersions.find(
    (item) =>
      item.id === implementation.type.id &&
      item.version === implementation.type.version &&
      item.digest === implementation.type.contractDigest,
  );
  if (!target)
    throw new Error(`${implementation.service}: unknown exact contract version or digest.`);
  const offered = new Set(target.operations.map((operation) => operation.id));
  if (implementation.operations.some((operation) => !offered.has(operation)))
    throw new Error(`${implementation.service}: unknown operation for ${target.slug}.`);
  const key = `${implementation.service}\n${target.id}\n${target.version}\n${implementation.binding}`;
  if (seenServices.has(key)) throw new Error(`Duplicate service support record: ${key}`);
  seenServices.add(key);
}
const supportFor = (id: string, version: string, contractDigest: string) =>
  implementations.filter(
    (item) =>
      item.type.id === id &&
      item.type.version === version &&
      item.type.contractDigest === contractDigest,
  );
export const typeVersions = contractVersions.map((item) => ({
  ...item,
  implementations: supportFor(item.id, item.version, item.digest),
}));
export const typeRecords = typeVersions
  .filter((item) => item.current)
  .map((item) => {
    const example = JSON.parse(read(`examples/${item.slug}.json`)) as Example;
    if (
      example.type.id !== item.id ||
      example.type.version !== item.version ||
      example.type.contractDigest !== item.digest
    )
      throw new Error(`${item.slug}: stale example; run npm run spec:generate.`);
    return {
      ...item,
      example,
      exampleHref: `${specification.artifacts}/examples/${item.slug}.json`,
      history: typeVersions.filter((version) => version.slug === item.slug && !version.current),
    };
  });
export type TypeRecord = (typeof typeRecords)[number];
export const typeStatusLabel = (record: TypeRecord) => `${record.status} · ${record.version}`;
export const typeGroups = [...new Set(typeRecords.map((item) => item.status))].map((status) => ({
  status,
  records: typeRecords.filter((item) => item.status === status),
}));
export const typeCollectionSummary = `${typeRecords.length} type contracts`;
export const currentCatalog = {
  format: 'mailschema-registry/3',
  profile: specification.profile,
  status: 'draft',
  types: typeVersions.map((record) => ({
    ...record,
    href: record.current ? typeHref(record.slug) : record.contractHref,
  })),
};
