import { defineConfig } from 'sourcey';
import { specNavigation } from './navigation';
import { mainNavigation } from '../../src/data/navigation';

const sections = [...new Set(specNavigation.map((page) => page.section))];

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
        version: '0.2',
        status: 'Working draft',
        badge: 'Draft',
        updated: '25 September 2026',
      },
      searchHref: '/search',
      sidebar: {
        links: [
          { label: 'Try the example', href: '/examples', icon: 'code' },
          { label: 'Type registry', href: '/registry', icon: 'layers' },
          { label: 'Registry tools', href: '/tools', icon: 'code' },
          { label: 'Contribute a type', href: '/contribute', icon: 'layers' },
        ],
        note: 'For agents and services\nworking through email.',
      },
      aside: {
        links: [
          {
            label: 'Try Content Review',
            description: 'Review a draft\nfrom the inbox.',
            href: '/examples',
            icon: 'code',
          },
        ],
      },
      pagination: {
        before: {
          label: 'Try Content Review',
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
        text: 'MailSchema · MAP 0.2',
        links: [{ label: 'Improve this specification', href: '/contribute' }],
      },
    },
  },
  navigation: {
    tabs: [
      {
        tab: 'Specification',
        slug: '',
        groups: sections.map((group) => ({
          group,
          pages: specNavigation
            .filter((page) => page.section === group)
            .map((page) => page.slug || 'index'),
        })),
      },
    ],
  },
  navbar: {
    links: mainNavigation.map((link) => ({ type: 'link' as const, ...link })),
    primary: { type: 'button', label: 'Read MAP', href: '/specification' },
  },
});
