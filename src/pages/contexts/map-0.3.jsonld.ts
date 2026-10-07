import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The context at its identifier, served from its one source. The 0.3 profile record binds these
// bytes, so the specification check refuses any change to them.
export function GET() {
  return new Response(
    readFileSync(resolve(process.cwd(), 'specifications/map-0.3/context.jsonld'), 'utf8'),
    { headers: { 'Content-Type': 'application/ld+json' } },
  );
}
