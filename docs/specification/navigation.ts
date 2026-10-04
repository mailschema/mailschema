import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const specNavigation = [
  {
    slug: 'overview',
    label: 'Overview',
    section: 'Start here',
    file: '../../specifications/map-0.3/overview.md',
  },
  {
    slug: 'interfaces',
    label: 'Service interfaces',
    section: 'Start here',
    file: '../../specifications/map-0.3/interfaces.md',
  },
  {
    slug: 'core',
    label: 'Core',
    section: 'Specification',
    file: '../../specifications/map-0.3/core.md',
  },
  {
    slug: 'http',
    label: 'HTTP binding',
    section: 'Specification',
    file: '../../specifications/map-0.3/http.md',
  },
  {
    slug: 'capability',
    label: 'Capability binding',
    section: 'Specification',
    file: '../../specifications/map-0.3/capability.md',
  },
  {
    slug: 'contracts',
    label: 'Type contracts',
    section: 'Types',
    file: '../../specifications/map-0.3/contracts.md',
  },
  {
    slug: 'bindings',
    label: 'Service bindings',
    section: 'Implementation',
    file: '../../specifications/map-0.3/bindings.md',
  },
  {
    slug: 'registry',
    label: 'Registry and discovery',
    section: 'Implementation',
    file: '../../specifications/map-0.3/registry.md',
  },
  {
    slug: 'conformance',
    label: 'Conformance',
    section: 'Implementation',
    file: '../../conformance/map-0.3/README.md',
  },
  {
    slug: 'sources',
    label: 'Standards references',
    section: 'Implementation',
    file: '../../specifications/map-0.3/SOURCES.md',
  },
].map((page) => {
  const markdown = readFileSync(resolve('docs/specification', page.file), 'utf8');
  const match = /^---\n[\s\S]*?^description: (".*")$/m.exec(markdown);
  if (!match) throw new Error(`${page.file}: missing page description`);
  return { ...page, description: JSON.parse(match[1]) as string };
});
export const specHref = (slug: string) => `/specification/${slug || 'overview'}`;
