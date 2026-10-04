import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { specNavigation, specHref } from './spec';
import { typeRecords, typeHref, typeStatusLabel } from './types';
import { research, interfaceHref } from './interfaces';

export const searchEntries = [
  {
    title: 'Service interface research',
    description: 'APIs, agent protocols, messaging, discovery, identity and existing workflows.',
    href: '/interfaces',
    group: 'Research',
  },
  ...research.entries.map((entry) => ({
    title: entry.name,
    description: `${entry.status}. ${entry.disposition}.`,
    text: `${entry.provides} ${entry.mapping} ${entry.gap}`,
    href: interfaceHref(entry.id),
    group: 'Research',
  })),
  {
    title: 'Schemas and tools',
    description: 'Core schema, type contracts, examples and conformance material for MAP 0.3.',
    href: '/tools',
    group: 'Tools',
  },
  ...typeRecords.map((type) => ({
    title: type.name,
    description: `${type.summary} ${typeStatusLabel(type)}.`,
    text: [...type.requirements, ...type.operations.map((operation) => operation.semantics)].join(
      ' ',
    ),
    href: typeHref(type.slug),
    group: 'Registry',
  })),
  ...specNavigation.map((item) => ({
    title: item.slug ? item.label : 'Mail Action Protocol',
    description: item.description,
    text: readFileSync(resolve('docs/specification', item.file), 'utf8'),
    href: specHref(item.slug),
    group: 'Specification',
  })),
  {
    title: 'Type registry',
    description: 'Browse type definitions, versions, examples and implementation evidence.',
    href: '/registry',
    group: 'Registry',
  },
  {
    title: 'From email to service',
    description: 'Explore interface families and follow a publication decision through worked exchanges.',
    href: '/examples',
    group: 'Example',
  },
  {
    title: 'Contribute a type',
    description: 'Prepare a proposal or amendment with a complete example.',
    href: '/contribute',
    group: 'Contribute',
  },
  {
    title: 'About MailSchema',
    description: 'The project behind the Mail Action Protocol working draft.',
    href: '/about',
    group: 'About',
  },
];
