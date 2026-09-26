import { typeRecords } from '../../src/data/types';

// Every type with a maintained definition has a chapter; the Registry record supplies its title.
const typeChapters = typeRecords
  .filter((type) => type.definition)
  .map((type) => ({
    slug: type.slug,
    label: type.name,
    section: 'Types',
    description: type.summary,
  }));

export const specNavigation = [
  {
    slug: '',
    label: 'Overview',
    section: 'Getting started',
    description: 'The purpose, scope and status of Mail Action Protocol.',
  },
  {
    slug: 'interaction-model',
    label: 'Interaction model',
    section: 'The protocol',
    description:
      'How an email describes an action, a client requests it and a service returns the result.',
  },
  {
    slug: 'profile',
    label: 'MAP 0.2 profile',
    section: 'The protocol',
    description: 'The core: descriptions, requests, results, authority modes and type contracts.',
  },
  {
    slug: 'authorization',
    label: 'Authorization',
    section: 'The protocol',
    description:
      'Credential and possession authority, consequences, human approvals and trust boundaries.',
  },
  {
    slug: 'outcomes',
    label: 'Results and retries',
    section: 'The protocol',
    description:
      'Distinguish accepted, completed, failed, refused, stale and decided outcomes. Retry without duplicate effects.',
  },
  ...typeChapters,
  {
    slug: 'interoperability',
    label: 'Interoperability',
    section: 'Implementation',
    description: 'Reusing existing standards and testing an interaction across services.',
  },
];
export const specHref = (slug: string) => (slug ? `/specification/${slug}` : '/specification');
