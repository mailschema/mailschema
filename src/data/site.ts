import { specNavigation, specHref } from './spec';
import { typeRecords, typeHref, typeStatusLabel } from './types';
import { tooling } from './tooling';

export const searchEntries = [
  ...tooling.map((tool) => ({
    title: `${tool.name} package`,
    description: `MailSchema ${tool.release.version} on ${tool.registry}. ${tool.description}`,
    href: `/tools#${tool.id}`,
    group: 'Tools',
  })),
  ...typeRecords.map((type) => ({
    title: type.name,
    description: `${type.summary} ${typeStatusLabel(type)}.`,
    href: typeHref(type.slug),
    group: 'Registry',
  })),
  ...specNavigation.map((item) => ({
    title: item.slug ? item.label : 'Mail Action Protocol',
    description: item.description,
    href: specHref(item.slug),
    group: 'Specification',
  })),
  {
    title: 'Interaction types',
    description: 'How to use and propose a shared interaction definition.',
    href: '/types',
    group: 'Types',
  },
  {
    title: 'Type registry',
    description: 'Browse type definitions, versions and examples.',
    href: '/registry',
    group: 'Registry',
  },
  {
    title: 'Try Content Review',
    description: 'A browser example of feedback, editing and approval.',
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
    description: 'An open standard for agents to work with services through email.',
    href: '/about',
    group: 'About',
  },
];
