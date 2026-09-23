import { createHash } from 'node:crypto';

export interface PackageRelease {
  version: string;
  schemaSha256: string;
  channels: PackageReleaseChannel[];
}

export interface PackageReleaseChannel {
  registry: string;
  name: string;
  version: string;
  url: string;
  status: string;
}

export interface PackageSetSelection {
  schema: string;
  schemaSha256: string;
  channels: { registry: string; evidence: string; version: string }[];
}

const registryRequirements: Record<string, { host: string; name: string }> = {
  npm: { host: 'www.npmjs.com', name: 'mailschema' },
  PyPI: { host: 'pypi.org', name: 'mailschema' },
  'crates.io': { host: 'crates.io', name: 'mailschema' },
  Go: { host: 'pkg.go.dev', name: 'github.com/mailschema/go' },
};

function schemaDigest(schema: string): string {
  return createHash('sha256').update(schema).digest('hex');
}

/** Refuse to advertise release evidence against a different contribution schema. */
export function assertPackageRelease(release: PackageRelease, schema: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(release.version)) throw new Error('Invalid package release version.');
  if (schemaDigest(schema) !== release.schemaSha256)
    throw new Error(
      'The contribution schema differs from the advertised package release. Publish matching packages and update the selected release evidence before building the site.',
    );
  if (!release.channels.length) throw new Error('Package release evidence has no channels.');
  const seen = new Set<string>();
  for (const entry of release.channels) {
    const requirement = registryRequirements[entry.registry];
    if (!requirement) throw new Error(`Unknown package registry ${entry.registry}.`);
    if (seen.has(entry.registry)) throw new Error(`Duplicate ${entry.registry} release evidence.`);
    seen.add(entry.registry);
    const url = new URL(entry.url);
    if (
      entry.status !== 'verified' ||
      entry.name !== requirement.name ||
      entry.version !== release.version ||
      url.protocol !== 'https:' ||
      url.hostname !== requirement.host
    )
      throw new Error(`Invalid ${entry.registry} package release evidence.`);
  }
}

/** Resolve the exact independently verified channel versions promoted to the website. */
export function assertPackageSet(
  selection: PackageSetSelection,
  evidence: Map<string, PackageRelease>,
  schema: string,
): Map<string, PackageReleaseChannel> {
  if (selection.schema !== 'mailschema-package-set/1')
    throw new Error('Invalid package-set selection format.');
  if (schemaDigest(schema) !== selection.schemaSha256)
    throw new Error('The selected package set targets a different contribution schema.');
  if (!selection.channels.length) throw new Error('The selected package set has no channels.');

  const selected = new Map<string, PackageReleaseChannel>();
  for (const channel of selection.channels) {
    if (!/^[a-zA-Z0-9._-]+$/.test(channel.evidence))
      throw new Error(`Invalid release evidence reference ${channel.evidence}.`);
    if (selected.has(channel.registry))
      throw new Error(`Duplicate selected ${channel.registry} package.`);
    const release = evidence.get(channel.evidence);
    if (!release) throw new Error(`Missing release evidence ${channel.evidence}.`);
    assertPackageRelease(release, schema);
    if (release.schemaSha256 !== selection.schemaSha256)
      throw new Error(`Release evidence ${channel.evidence} targets a different schema.`);
    const matches = release.channels.filter(
      (entry) => entry.registry === channel.registry && entry.version === channel.version,
    );
    if (matches.length !== 1)
      throw new Error(`Selected ${channel.registry} ${channel.version} is not verified.`);
    selected.set(channel.registry, matches[0]);
  }
  return selected;
}
