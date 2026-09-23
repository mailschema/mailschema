import newType from '../../registry/examples/new-type.json' with { type: 'json' };
import { recordDigest, type Registry } from './catalog.ts';
import { assertContribution } from './validation.ts';

export function contributionExamples(registry: Registry) {
  const record = registry.types.find((type) => type.slug === 'content-review')!;
  const { origin, contributors, history, ...body } = record;
  const contributor = { name: 'Example Document Service', url: 'https://example.com' };
  const examples: Record<string, unknown> = {
    'new-type': newType,
    amendment: {
      format: 'mailschema-contribution/1',
      id: 'example-review-question',
      kind: 'amendment',
      contributor,
      baseDigest: recordDigest(record),
      summary: 'Ask how withdrawn drafts affect pending reviews.',
      record: {
        ...body,
        openQuestions: [
          ...body.openQuestions,
          'How does withdrawing a draft affect a pending review?',
        ],
      },
    },
    implementation: {
      format: 'mailschema-contribution/1',
      id: 'example-review-service',
      kind: 'implementation',
      contributor,
      summary:
        'Illustrative support declaration; this example does not establish a real implementation.',
      type: record.slug,
      typeVersion: record.version,
      typeDigest: recordDigest(record),
      profile: record.profile,
      product: { name: 'Example Reviewer', url: 'https://example.com/reviewer' },
      operations: record.operations.map((operation) => operation.id),
      evidence: { kind: 'declaration' },
    },
  };
  return Object.entries(examples).map(([kind, input]) => {
    assertContribution(input);
    return { kind, input };
  });
}
