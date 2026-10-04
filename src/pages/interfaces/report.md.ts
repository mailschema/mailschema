import { readFileSync } from 'node:fs';
export const GET = () =>
  new Response(readFileSync('docs/research/MAP-INTERFACES.md', 'utf8'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
