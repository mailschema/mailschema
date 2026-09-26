import { CONTRACT_FORMATS, MapArtifacts, sha256 } from '../map/artifacts.ts';
import type { TypeRecord } from './model';

const publicOrigin = 'https://mailschema.org';

export interface TypeContractCatalogEntry {
  type: string;
  id: string;
  version: string;
  profile: string;
  /** The format this contract follows, which its profile fixes. */
  contractFormat: string;
  contract: { url: string; canonicalDigest: string; sha256: string };
  requestSchema: { url: string; canonicalDigest: string; sha256: string };
  operations: string[];
}

/**
 * Every executable contract version with its exact digests. Loading validates each
 * contract against its format and, for MAP 0.2, the rules a schema cannot express.
 */
export function loadTypeContractCatalog(root = process.cwd()): TypeContractCatalogEntry[] {
  return new MapArtifacts(root).contracts
    .map((entry) => ({
      type: entry.slug,
      id: entry.contract.id,
      version: entry.contract.version,
      profile: entry.contract.profile,
      contractFormat: CONTRACT_FORMATS[entry.contract.profile],
      contract: {
        url: `${publicOrigin}/contracts/${entry.file}`,
        canonicalDigest: entry.contractDigest,
        sha256: sha256(entry.bytes),
      },
      requestSchema: {
        url: entry.requestSchema.url,
        canonicalDigest: entry.requestSchema.canonicalDigest,
        sha256: sha256(entry.requestSchema.bytes),
      },
      operations: entry.contract.operations.map((operation) => operation.id),
    }))
    .sort((a, b) =>
      `${a.id}@${a.version}`.localeCompare(`${b.id}@${b.version}`, 'en', { numeric: true }),
    );
}

export function assertContractCoverage(records: TypeRecord[], entries: TypeContractCatalogEntry[]) {
  const recordsByType = new Map(records.map((record) => [record.slug, record]));
  for (const entry of entries)
    if (!recordsByType.has(entry.type))
      throw new Error(`${entry.id}@${entry.version}: executable contract has no Registry record`);

  for (const record of records.filter((item) => item.status === 'Draft')) {
    const matches = entries.filter(
      (entry) => entry.type === record.slug && entry.version === record.version,
    );
    if (matches.length !== 1)
      throw new Error(`${record.slug}@${record.version}: expected one current executable contract`);
    const [entry] = matches;
    if (entry.profile !== record.profile)
      throw new Error(
        `${record.slug}@${record.version}: contract profile differs from Registry record`,
      );
    const recordOperations = record.operations.map((operation) => operation.id).sort();
    if (entry.operations.toSorted().join('\n') !== recordOperations.join('\n'))
      throw new Error(
        `${record.slug}@${record.version}: contract operations differ from Registry record`,
      );
  }
}
