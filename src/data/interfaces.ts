import catalogue from '../../docs/research/map-interfaces.json';

export const research = catalogue;
export const sources: Record<string, (typeof catalogue.sources)['http']> = catalogue.sources;
export const groupId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export const groups = [...new Set(catalogue.entries.map((entry) => entry.group))].map((name) => ({
  name,
  id: groupId(name),
  entries: catalogue.entries.filter((entry) => entry.group === name),
}));
export const interfaceHref = (id: string) => `/interfaces#${id}`;
