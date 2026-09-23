import { registry } from '../../../data/types';
import type { APIContext } from 'astro';
export function getStaticPaths() {
  return [...registry.snapshots].map(([digest, record]) => ({
    params: { digest },
    props: { digest, record },
  }));
}
export function GET({ props }: APIContext) {
  return Response.json({ digest: props.digest, record: props.record });
}
