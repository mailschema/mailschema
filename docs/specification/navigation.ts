import { typeRecords } from '../../src/data/types';

const contentReview = typeRecords.find((type) => type.slug === 'content-review')!;

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
    slug: 'content-review',
    label: contentReview.name,
    section: 'The protocol',
    description: contentReview.summary,
  },
  {
    slug: 'authorization',
    label: 'Authorization',
    section: 'The protocol',
    description: 'Existing service identity, permissions, human approvals and trust boundaries.',
  },
  {
    slug: 'outcomes',
    label: 'Results and retries',
    section: 'The protocol',
    description:
      'Distinguish accepted, completed, refused, stale and uncertain outcomes. Retry without duplicate effects.',
  },
  {
    slug: 'interoperability',
    label: 'Interoperability',
    section: 'Implementation',
    description: 'Reusing existing standards and testing an interaction across services.',
  },
];
export const specHref = (slug: string) => `/specification/${slug ? slug + '/' : ''}`;
