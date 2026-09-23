import { registry } from '../../data/types';
import { recordDigest } from '../../registry/catalog';
export function GET() {
  return Response.json({
    format: 'mailschema-registry/1',
    types: registry.types.map((record) => ({
      record,
      digest: recordDigest(record),
      href: `/registry/${record.slug}/`,
    })),
    snapshots: [...registry.snapshots].map(([digest, record]) => ({ digest, record })),
    contributions: registry.contributions.map((item) => ({
      id: item.id,
      kind: item.kind,
      href: `/registry/contributions/${item.id}.json`,
    })),
    implementations: registry.implementations,
  });
}
