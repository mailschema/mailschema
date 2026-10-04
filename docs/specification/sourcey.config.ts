import { defineConfig, type SourceAdapter } from 'sourcey';
import { specNavigation } from './navigation';
import { mainNavigation } from '../../src/data/navigation';

const sections = [...new Set(specNavigation.map((page) => page.section))];
const source: SourceAdapter = {
  name: 'map-specification',
  async resolve(context) {
    return {
      kind: 'markdown',
      groups: sections.map((label) => ({
        label,
        pages: specNavigation
          .filter((page) => page.section === label)
          .map((page) => ({
            slug: page.slug,
            label: page.label,
            file: context.resolvePath(page.file),
            preprocess: [
              (body: string) =>
                body.replace(
                  '](#experimental-capability-binding)',
                  '](/specification/capability#experimental-capability-binding)',
                ),
            ],
          })),
      })),
    };
  },
};

export default defineConfig({
  name: 'MailSchema',
  titleSeparator: ' · ',
  prettyUrls: 'strip',
  baseUrl: '/specification/',
  logo: { light: '../../public/mailschema-mark.svg', href: '/' },
  favicon: '../../public/favicon.svg',
  ogImage: '../../public/og/map-v1.png',
  theme: {
    name: 'reader',
    colors: { primary: '#7961fc', dark: '#5835cb' },
    fonts: { sans: 'Plus Jakarta Sans Variable', google: false },
    css: ['../../src/styles/fonts.css', './brand.css'],
    reader: {
      logoMark: true,
      document: {
        label: 'MAP',
        title: 'Mail Action\nProtocol',
        version: '0.3',
        status: 'Working draft',
        badge: 'Draft',
      },
      searchHref: '/search',
      sidebar: {
        links: [
          { label: 'Try the example', href: '/examples', icon: 'code' },
          { label: 'Interface research', href: '/interfaces', icon: 'code' },
          { label: 'Type registry', href: '/registry', icon: 'layers' },
          { label: 'Schemas and tools', href: '/tools', icon: 'code' },
          { label: 'Contribute a type', href: '/contribute', icon: 'layers' },
        ],
        note: 'For agents and services\nworking through email.',
      },
      aside: {
        links: [
          {
            label: 'From email to service',
            description: 'APIs, agents\nand messaging.',
            href: '/examples',
            icon: 'code',
          },
        ],
      },
      pagination: {
        before: {
          label: 'From email to service',
          description: 'Explore the workflow',
          href: '/examples',
        },
        after: {
          label: 'Contribute a type',
          description: 'Prepare a proposal →',
          href: '/contribute',
        },
      },
      footer: {
        text: 'MailSchema · MAP 0.3',
        links: [{ label: 'Improve this specification', href: '/contribute' }],
      },
    },
  },
  navigation: {
    tabs: [
      {
        tab: 'Specification',
        slug: '',
        source,
      },
    ],
  },
  navbar: {
    links: mainNavigation.map((link) => ({ type: 'link' as const, ...link })),
    primary: { type: 'button', label: 'Read MAP', href: '/specification' },
  },
});
