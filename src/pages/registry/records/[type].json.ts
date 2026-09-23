import { registry } from '../../../data/types';
import { recordDigest } from '../../../registry/catalog';
import type { APIContext } from 'astro';
import type { TypeRecord } from '../../../registry/model';
export function getStaticPaths() {
  return registry.types.map((record) => ({ params: { type: record.slug }, props: { record } }));
}
export function GET({ props }: APIContext) {
  const record = props.record as TypeRecord;
  return Response.json({ digest: recordDigest(record), record });
}
