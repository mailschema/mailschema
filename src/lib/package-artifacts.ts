// The MAP 0.3 artifacts every language package carries, byte for byte, and where each
// published package keeps them.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import manifest from '../../packages/artifacts.json' with { type: 'json' };

export const packageRegistries = ['npm', 'PyPI', 'crates.io', 'Go', 'RubyGems'] as const;
export type PackageRegistry = (typeof packageRegistries)[number];

export interface PackageArtifact {
  name: string;
  source: string;
  file: string;
}

function validate(value: typeof manifest) {
  if (value.format !== 'mailschema-package-artifacts/2')
    throw new Error('Invalid package artifact manifest.');
  const names = new Set<string>();
  const files = new Set<string>();
  for (const artifact of value.artifacts) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(artifact.name) || names.has(artifact.name))
      throw new Error(`Invalid or repeated package artifact ${artifact.name}.`);
    if (!/^(?:public\/profiles\/map\/0\.3\.json|specifications\/map-0\.3\/[a-z0-9./-]+)$/.test(artifact.source) || artifact.source.includes('..'))
      throw new Error(`Unsafe package artifact source ${artifact.source}.`);
    if (!/^[a-z.-]+\.json(?:ld)?$/.test(artifact.file) || files.has(artifact.file))
      throw new Error(`Invalid or repeated package artifact file ${artifact.file}.`);
    names.add(artifact.name);
    files.add(artifact.file);
  }
  if (!names.has('profile')) throw new Error('Package artifacts must include the profile record.');
  for (const registry of packageRegistries)
    if (!/^[a-z]+$/.test(value.directories[registry] ?? ''))
      throw new Error(`Invalid ${registry} package artifact directory.`);
  return value;
}

const checked = validate(manifest);
export const packageArtifacts: readonly PackageArtifact[] = checked.artifacts;

/** The artifact's path inside the registry's published package. */
export const packageArtifactPath = (registry: PackageRegistry, artifact: PackageArtifact) =>
  `${checked.directories[registry]}/${artifact.file}`;

/** Each artifact with its exact canonical bytes. */
export function materializePackageArtifacts(root = process.cwd()) {
  return packageArtifacts.map((artifact) => ({
    ...artifact,
    bytes: readFileSync(resolve(root, artifact.source), 'utf8'),
  }));
}
