// The language packages the website presents: only releases whose artifacts public registry
// readback has verified.
import { readFileSync } from 'node:fs';
import current from '../../docs/releases/current.json' with { type: 'json' };
import { materializePackageArtifacts, packageRegistries } from '../lib/package-artifacts';
import {
  assertPackageSet,
  type PackageRelease,
  type PackageSetSelection,
} from '../lib/package-release';

const artifacts = Object.fromEntries(
  materializePackageArtifacts().map((artifact) => [artifact.name, artifact.bytes]),
);
const selection = current as PackageSetSelection;
const evidence = new Map<string, PackageRelease>(
  selection.channels.map((channel) => [
    channel.evidence,
    JSON.parse(readFileSync(`docs/releases/${channel.evidence}.json`, 'utf8')),
  ]),
);
const selected = assertPackageSet(selection, evidence, artifacts);

const languages = {
  npm: {
    source: 'npm',
    language: 'JavaScript',
    summary: 'MAP 0.3 processing, TypeScript definitions, the artifacts and a local CLI.',
    install: (version: string) => `npm install mailschema@${version}`,
  },
  RubyGems: {
    source: 'RubyGems',
    language: 'Ruby',
    summary:
      'MAP 0.3 processing, the artifacts, and helpers for the description part and qualifying signatures.',
    install: (version: string) => `gem install mailschema -v ${version}`,
  },
  PyPI: {
    source: 'PyPI',
    language: 'Python',
    summary: 'The profile record, context and schemas.',
    install: (version: string) => `pip install mailschema==${version}`,
  },
  'crates.io': {
    source: 'crates.io',
    language: 'Rust',
    summary: 'The profile record, context and schemas, embedded.',
    install: (version: string) => `cargo add mailschema@${version}`,
  },
  Go: {
    source: 'Go modules',
    language: 'Go',
    summary: 'The profile record, context and schemas, embedded.',
    install: (version: string) => `go get github.com/mailschema/go@v${version}`,
  },
};

export const packages = packageRegistries.flatMap((registry) => {
  const release = selected.get(registry);
  if (!release) return [];
  const { language, source, summary, install } = languages[registry];
  return [
    {
      registry,
      language,
      source,
      summary,
      version: release.version,
      url: release.url,
      install: install(release.version),
    },
  ];
});
