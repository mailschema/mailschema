import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIContext } from 'astro';

// Explicit source directories: draft downloads are projections, never copied artifacts.
const root = process.cwd();
const mappings = [
  ['bindings', 'specifications/map-0.3/bindings'],
  ['schemas', 'specifications/map-0.3/schemas'],
  ['contracts', 'specifications/map-0.3/contracts'],
  ['examples', 'specifications/map-0.3/examples'],
  ['conformance', 'conformance/map-0.3'],
] as const;
export function getStaticPaths() {
  const files = mappings.flatMap(([prefix, directory]) =>
    readdirSync(resolve(root, directory))
      .filter(
        (name) =>
          /\.(json|eml|md)$/.test(name) &&
          name !== 'source.json' &&
          !name.endsWith('.source.json') &&
          name !== 'README.md',
      )
      .map((name) => ({ path: `${prefix}/${name}`, file: `${directory}/${name}` })),
  );
  files.push(
    { path: 'context.jsonld', file: 'specifications/map-0.3/context.jsonld' },
    {
      path: 'draft-mailschema-mail-action-protocol-00.xml',
      file: 'ietf/draft-mailschema-mail-action-protocol-00.xml',
    },
  );
  return files.map(({ path, file }) => ({ params: { path }, props: { file } }));
}
export function GET({ props }: APIContext) {
  const extension = String(props.file).split('.').pop();
  return new Response(readFileSync(resolve(root, props.file), 'utf8'), {
    headers: {
      'Content-Type':
        extension === 'eml'
          ? 'message/rfc822'
          : extension === 'md'
            ? 'text/plain; charset=utf-8'
            : extension === 'xml'
              ? 'application/xml'
              : extension === 'jsonld'
                ? 'application/ld+json'
                : 'application/json',
    },
  });
}
