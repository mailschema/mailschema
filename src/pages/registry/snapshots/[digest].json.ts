import { registry } from '../../../data/types';
import type { APIContext } from 'astro';
// Every record digest the Registry has published: compiled snapshots and the archive.
export function getStaticPaths() {
  return [...registry.snapshots, ...registry.archive].map(([digest, record]) => ({
    params: { digest },
    props: { digest, record },
  }));
}
export function GET({ props }: APIContext) {
  return Response.json({ digest: props.digest, record: props.record });
}
