import { loadRegistry } from '../registry/catalog';
import { assertContractCoverage, loadTypeContractCatalog } from '../registry/contracts';
import { typeStages, type TypeRecord } from '../registry/model';
export type { TypeRecord } from '../registry/model';

export const registry = loadRegistry();
export const typeContracts = loadTypeContractCatalog();
assertContractCoverage(registry.types, typeContracts);
export const typeRecords = registry.types;

export const typeHref = (slug: string) => `/registry/${slug}`;

// The contribution format names a specification chapter by its slash path;
// the site serves every page without the trailing slash.
export const definitionHref = (definition: { href: string }) =>
  definition.href.replace(/(?<=.)\/$/, '');

export const typeStatusLabel = (type: TypeRecord) =>
  `${type.status}${type.version ? ` · ${type.version}` : ''}`;

export const typeGroups = typeStages
  .map((group) => ({
    ...group,
    records: typeRecords.filter((type) => type.status === group.status),
  }))
  .filter((group) => group.records.length > 0);

export const typeCollectionSummary = new Intl.ListFormat('en', { type: 'conjunction' }).format(
  typeGroups.map(
    ({ records, singular, plural }) =>
      `${records.length} ${records.length === 1 ? singular : plural}`,
  ),
);
