import { registry, typeContracts, typeHref } from '../../data/types';
import { recordDigest } from '../../registry/catalog';
export function GET() {
  return Response.json({
    format: 'mailschema-registry/1',
    contractSchema: '/schemas/type-contract-0.1.schema.json',
    types: registry.types.map((record) => ({
      record,
      digest: recordDigest(record),
      href: typeHref(record.slug),
    })),
    contracts: typeContracts,
    snapshots: [...registry.snapshots].map(([digest, record]) => ({ digest, record })),
    contributions: registry.contributions.map((item) => ({
      id: item.id,
      kind: item.kind,
      href: `/registry/contributions/${item.id}.json`,
    })),
    implementations: registry.implementations,
  });
}
