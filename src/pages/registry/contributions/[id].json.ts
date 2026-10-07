import { registry } from '../../../data/legacy-types';
import type { APIContext } from 'astro';
export function getStaticPaths() {
  return registry.contributions.map((contribution) => ({
    params: { id: contribution.id },
    props: { contribution },
  }));
}
export function GET({ props }: APIContext) {
  return Response.json(props.contribution);
}
