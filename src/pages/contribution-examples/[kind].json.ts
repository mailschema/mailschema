import { registry } from '../../data/types';
import { contributionExamples } from '../../registry/examples';
import type { APIContext } from 'astro';
export function getStaticPaths() {
  return contributionExamples(registry).map(({ kind, input }) => ({
    params: { kind },
    props: { input },
  }));
}
export function GET({ props }: APIContext) {
  return Response.json(props.input);
}
