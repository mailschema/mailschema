import { defineConfig, type SourceAdapter } from 'sourcey';
import reader from './sourcey.config';

// Read the canonical drafting bundle directly; no preview copy of the prose.
const draft: SourceAdapter = {
  name: 'map-draft',
  async resolve(context) {
    const page = (slug: string, label: string, path: string) => ({
      slug,
      label,
      file: context.resolvePath(path),
      preprocess: [
        (body: string) =>
          body.replace(
            '](#experimental-capability-binding)',
            '](/specification/capability#experimental-capability-binding)',
          ),
      ],
    });
    return {
      kind: 'markdown',
      groups: [
        {
          label: 'MAP 0.3',
          pages: [
            page('core', 'Core', '../../specifications/map-0.3/core.md'),
            page('http', 'HTTP binding', '../../specifications/map-0.3/http.md'),
            page('capability', 'Capability binding', '../../specifications/map-0.3/capability.md'),
            page('contracts', 'Initial contracts', '../../specifications/map-0.3/contracts.md'),
          ],
        },
        {
          label: 'Implementation',
          pages: [
            page('conformance', 'Conformance', '../../conformance/map-0.3/README.md'),
            page('sources', 'Standards references', '../../specifications/map-0.3/SOURCES.md'),
          ],
        },
      ],
    };
  },
};

const source = 'https://github.com/mailschema/mailschema/tree/docs/map-0-3-specification';

export default defineConfig({
  ...reader,
  theme: {
    ...reader.theme,
    reader: {
      ...reader.theme?.reader,
      document: {
        ...reader.theme?.reader?.document,
        label: reader.theme?.reader?.document?.label ?? 'MAP',
        version: '0.3',
        status: 'Specification draft',
        updated: '2 October 2026',
      },
      searchHref: undefined,
      sidebar: {
        note: 'For agents and services\nworking through email.',
        links: [
          { label: 'Specification source', href: `${source}/specifications/map-0.3`, icon: 'code' },
        ],
      },
      aside: {
        links: [
          {
            label: 'Implementation handoff',
            description: 'From the specification\nto existing service operations.',
            href: `${source}/specifications/map-0.3/README.md#implementation-handoff`,
            icon: 'code',
          },
        ],
      },
      pagination: undefined,
      footer: {
        text: 'MailSchema · MAP 0.3',
        links: [
          {
            label: 'Review the specification',
            href: 'https://github.com/mailschema/mailschema/pull/31',
          },
        ],
      },
    },
  },
  navigation: { tabs: [{ tab: 'Specification', slug: '', source: draft }] },
});
