import { readFileSync } from 'node:fs';
export const GET = () =>
  new Response(readFileSync('docs/research/map-interfaces.json', 'utf8'), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
