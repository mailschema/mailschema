import { registry } from '../../../data/types';
import type { APIContext } from 'astro';
export function getStaticPaths() {
  return registry.types.map((record) => ({ params: { type: record.slug }, props: { record } }));
}
export function GET({ props }: APIContext) {
  return Response.json(props.record);
}
