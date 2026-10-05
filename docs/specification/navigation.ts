import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { specification } from '../../src/data/specification';

const currentSource = `../../${specification.source}`;

export const specNavigation = [
  {
    slug: 'overview',
    label: 'Overview',
    section: 'Start here',
    file: `${currentSource}/overview.md`,
  },
  {
    slug: 'interfaces',
    label: 'Service interfaces',
    section: 'Start here',
    file: `${currentSource}/interfaces.md`,
  },
  {
    slug: 'core',
    label: 'Core',
    section: 'Specification',
    file: `${currentSource}/core.md`,
  },
  {
    slug: 'http',
    label: 'HTTP binding',
    section: 'Specification',
    file: `${currentSource}/http.md`,
  },
  {
    slug: 'capability',
    label: 'Capability binding',
    section: 'Specification',
    file: `${currentSource}/capability.md`,
  },
  {
    slug: 'contracts',
    label: 'Type contracts',
    section: 'Types',
    file: `${currentSource}/contracts.md`,
  },
  {
    slug: 'bindings',
    label: 'Service bindings',
    section: 'Implementation',
    file: `${currentSource}/bindings.md`,
  },
  {
    slug: 'registry',
    label: 'Registry and discovery',
    section: 'Implementation',
    file: `${currentSource}/registry.md`,
  },
  {
    slug: 'conformance',
    label: 'Conformance',
    section: 'Implementation',
    file: `../../conformance/map-${specification.version}/README.md`,
  },
  {
    slug: 'sources',
    label: 'Standards references',
    section: 'Implementation',
    file: `${currentSource}/SOURCES.md`,
  },
].map((page) => {
  const markdown = readFileSync(resolve('docs/specification', page.file), 'utf8');
  const match = /^---\n[\s\S]*?^description: (".*")$/m.exec(markdown);
  if (!match) throw new Error(`${page.file}: missing page description`);
  return { ...page, description: JSON.parse(match[1]) as string };
});
export const specHref = (slug: string) => `/specification/${slug || 'overview'}`;
