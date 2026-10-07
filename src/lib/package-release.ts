// Release evidence: a public registry readback showing a published package carries the exact
// MAP 0.3 artifacts, and the selection of verified releases the website presents.
import { sha256 } from '../map/core';
import { packageArtifacts, packageRegistries, type PackageRegistry } from './package-artifacts';

export interface PackageReleaseChannel {
  registry: PackageRegistry;
  name: string;
  version: string;
  url: string;
  status: 'verified';
}

export interface PackageRelease {
  format: 'mailschema-package-release/3';
  version: string;
  profileSha256: string;
  artifacts: { name: string; sha256: string }[];
  channels: PackageReleaseChannel[];
}

export interface PackageSetSelection {
  schema: 'mailschema-package-set/2';
  profileSha256: string;
  channels: { registry: PackageRegistry; evidence: string; version: string }[];
}

/** The artifacts' canonical bytes by name. */
export type ArtifactBytes = Record<string, string>;

const registryRequirements: Record<PackageRegistry, { host: string; name: string }> = {
  npm: { host: 'www.npmjs.com', name: 'mailschema' },
  PyPI: { host: 'pypi.org', name: 'mailschema' },
  'crates.io': { host: 'crates.io', name: 'mailschema' },
  Go: { host: 'pkg.go.dev', name: 'github.com/mailschema/go' },
  RubyGems: { host: 'rubygems.org', name: 'mailschema' },
};

/** Refuse release evidence unless it binds every artifact to its canonical bytes. */
export function assertPackageRelease(release: PackageRelease, artifacts: ArtifactBytes): void {
  if (release.format !== 'mailschema-package-release/3')
    throw new Error(`Unknown package release evidence format ${String(release.format)}.`);
  if (!/^\d+\.\d+\.\d+$/.test(release.version)) throw new Error('Invalid package release version.');
  if (release.profileSha256 !== sha256(artifacts.profile))
    throw new Error('The release evidence binds a different profile record.');
  const found = new Map(release.artifacts.map((entry) => [entry.name, entry.sha256]));
  if (
    found.size !== packageArtifacts.length ||
    packageArtifacts.some((artifact) => found.get(artifact.name) !== sha256(artifacts[artifact.name]))
  )
    throw new Error('The release evidence does not bind the canonical artifacts.');
  if (release.channels.length !== 1) throw new Error('Release evidence names one channel.');
  const [channel] = release.channels;
  const requirement = registryRequirements[channel.registry];
  const url = new URL(channel.url);
  if (
    !requirement ||
    channel.status !== 'verified' ||
    channel.name !== requirement.name ||
    channel.version !== release.version ||
    url.protocol !== 'https:' ||
    url.hostname !== requirement.host
  )
    throw new Error(`Invalid ${channel.registry} package release evidence.`);
}

/** The verified channel versions the website presents, by registry. */
export function assertPackageSet(
  selection: PackageSetSelection,
  evidence: ReadonlyMap<string, PackageRelease>,
  artifacts: ArtifactBytes,
): Map<PackageRegistry, PackageReleaseChannel> {
  if (selection.schema !== 'mailschema-package-set/2')
    throw new Error('Invalid package-set selection format.');
  if (selection.profileSha256 !== sha256(artifacts.profile))
    throw new Error('The package set targets a different profile record.');
  const selected = new Map<PackageRegistry, PackageReleaseChannel>();
  for (const channel of selection.channels) {
    if (!packageRegistries.includes(channel.registry) || selected.has(channel.registry))
      throw new Error(`Invalid or repeated selected registry ${channel.registry}.`);
    if (!/^[a-z0-9.-]+$/.test(channel.evidence))
      throw new Error(`Invalid release evidence reference ${channel.evidence}.`);
    const release = evidence.get(channel.evidence);
    if (!release) throw new Error(`Missing release evidence ${channel.evidence}.`);
    assertPackageRelease(release, artifacts);
    const [verified] = release.channels;
    if (verified.registry !== channel.registry || verified.version !== channel.version)
      throw new Error(`Selected ${channel.registry} ${channel.version} is not verified.`);
    selected.set(channel.registry, verified);
  }
  return selected;
}
