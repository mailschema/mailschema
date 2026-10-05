import { readFileSync } from 'node:fs';
import { specification } from './specification';

// Core defines the vocabulary. The site projects its definitions without
// maintaining a second copy of their meaning.
const core = readFileSync(`${specification.source}/core.md`, 'utf8');
const section = core.split('### Initial effect vocabulary\n')[1]?.split('\n## ')[0];
if (!section) throw new Error('MAP Core has no effect vocabulary section.');

export const effects = [...section.matchAll(/^- `([a-z][a-z-]*)`: (.+)$/gm)].map(
  ([, id, definition]) => ({ id, definition, href: `/effects/${id}` }),
);
if (effects.length === 0) throw new Error('MAP Core has no effect definitions.');
