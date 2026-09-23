import { loadRegistry } from '../registry/catalog';
import { typeStages, type TypeRecord } from '../registry/model';
export type { TypeRecord } from '../registry/model';

export const registry = loadRegistry();
export const typeRecords = registry.types;

export const typeHref = (slug: string) => `/registry/${slug}/`;

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
