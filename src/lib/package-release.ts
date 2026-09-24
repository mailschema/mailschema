import { createHash } from 'node:crypto';

export interface PackageRelease {
  format?: string;
  version: string;
  schemaSha256: string;
  contracts?: { name: string; sha256: string }[];
  channels: PackageReleaseChannel[];
}

export interface PackageContracts {
  contribution: string;
  'map-0.1': string;
  'content-review-0.1': string;
  'content-review-0.1-contract': string;
  'content-review-0.2': string;
  'content-review-0.2-contract': string;
  record: string;
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

function normalizedContracts(value: PackageContracts | string): PackageContracts | undefined {
  return typeof value === 'string' ? undefined : value;
}

/** Refuse to advertise release evidence against a different contribution schema. */
export function assertPackageRelease(
  release: PackageRelease,
  contractsOrSchema: PackageContracts | string,
): void {
  const contracts = normalizedContracts(contractsOrSchema);
  const schema: string = contracts ? contracts.contribution : (contractsOrSchema as string);
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
  if (release.format === 'mailschema-package-release/2') {
    if (!contracts)
      throw new Error('Full-contract release evidence needs canonical contract bytes.');
    const registry = release.channels[0]?.registry;
    const expectedNames = [
      'contribution',
      'map-0.1',
      'content-review-0.1',
      'content-review-0.1-contract',
      'content-review-0.2',
      'content-review-0.2-contract',
      ...(registry === 'crates.io' ? ['record'] : []),
    ];
    const found = new Map(release.contracts?.map((entry) => [entry.name, entry.sha256]));
    assertExactMembers(found, expectedNames, 'release contract');
    for (const name of expectedNames)
      if (found.get(name) !== schemaDigest(contracts[name as keyof PackageContracts]))
        throw new Error(`The ${name} contract differs from the advertised package release.`);
  } else if (release.format) {
    throw new Error(`Unknown package release evidence format ${release.format}.`);
  }
}

function assertExactMembers(found: Map<string, string>, expected: string[], label: string): void {
  if (found.size !== expected.length || expected.some((name) => !found.has(name)))
    throw new Error(`Invalid ${label} set.`);
}

/** Resolve the exact independently verified channel versions promoted to the website. */
export function assertPackageSet(
  selection: PackageSetSelection,
  evidence: Map<string, PackageRelease>,
  contractsOrSchema: PackageContracts | string,
): Map<string, PackageReleaseChannel> {
  const contracts = normalizedContracts(contractsOrSchema);
  const schema: string = contracts ? contracts.contribution : (contractsOrSchema as string);
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
    assertPackageRelease(release, contractsOrSchema);
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
