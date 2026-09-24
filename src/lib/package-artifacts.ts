import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import manifestValue from '../../packages/artifacts.json' with { type: 'json' };

export const packageRegistries = ['npm', 'PyPI', 'crates.io', 'Go'] as const;
export type PackageRegistry = (typeof packageRegistries)[number];

export interface PackageArtifact {
  name: string;
  role: 'core' | 'compatibility';
  kind: 'schema' | 'contract';
  source: string;
  paths: Partial<Record<PackageRegistry, string>>;
}

interface PackageArtifactManifest {
  format: 'mailschema-package-artifacts/1';
  artifacts: PackageArtifact[];
}

function validateManifest(value: unknown): PackageArtifactManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid package artifact manifest.');
  const manifest = value as Partial<PackageArtifactManifest>;
  if (manifest.format !== 'mailschema-package-artifacts/1' || !Array.isArray(manifest.artifacts))
    throw new Error('Invalid package artifact manifest.');
  const names = new Set<string>();
  const paths = new Map<PackageRegistry, Set<string>>(
    packageRegistries.map((registry) => [registry, new Set<string>()]),
  );
  for (const artifact of manifest.artifacts) {
    if (
      !artifact ||
      typeof artifact.name !== 'string' ||
      !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(artifact.name) ||
      !['core', 'compatibility'].includes(artifact.role) ||
      !['schema', 'contract'].includes(artifact.kind) ||
      typeof artifact.source !== 'string' ||
      !artifact.paths ||
      typeof artifact.paths !== 'object'
    )
      throw new Error('Invalid package artifact entry.');
    if (names.has(artifact.name)) throw new Error(`Duplicate package artifact ${artifact.name}.`);
    names.add(artifact.name);
    if (
      artifact.source !== 'derived:contribution#/$defs/record' &&
      !/^public\/(?:schemas|contracts)\/[a-z0-9.-]+\.json$/.test(artifact.source)
    )
      throw new Error(`Unsafe package artifact source ${artifact.source}.`);
    for (const [registry, path] of Object.entries(artifact.paths)) {
      if (!packageRegistries.includes(registry as PackageRegistry) || !path)
        throw new Error(`Invalid package artifact registry ${registry}.`);
      if (path.startsWith('/') || path.split('/').includes('..') || !path.endsWith('.json'))
        throw new Error(`Unsafe package artifact path ${path}.`);
      if (paths.get(registry as PackageRegistry)!.has(path))
        throw new Error(`Duplicate ${registry} package artifact path ${path}.`);
      paths.get(registry as PackageRegistry)!.add(path);
    }
  }
  if (!names.has('contribution')) throw new Error('Package artifact manifest needs contribution.');
  for (const registry of packageRegistries)
    if (
      !manifest.artifacts.some(
        (artifact) => artifact.name === 'contribution' && artifact.paths[registry],
      )
    )
      throw new Error(`Package artifact manifest needs ${registry} contribution schema.`);
  return manifest as PackageArtifactManifest;
}

export const packageArtifactManifest = validateManifest(manifestValue);

export function packageArtifacts(registry?: PackageRegistry): PackageArtifact[] {
  return packageArtifactManifest.artifacts.filter(
    (artifact) => registry === undefined || artifact.paths[registry] !== undefined,
  );
}

export function packageArtifactNames(registry: PackageRegistry): string[] {
  return packageArtifacts(registry).map((artifact) => artifact.name);
}

export interface MaterializedPackageArtifact extends PackageArtifact {
  bytes: string;
}

export function materializePackageArtifacts(
  root = process.cwd(),
  registry?: PackageRegistry,
): MaterializedPackageArtifact[] {
  const contribution = JSON.parse(
    readFileSync(resolve(root, 'public/schemas/contribution.schema.json'), 'utf8'),
  );
  return packageArtifacts(registry).map((artifact) => ({
    ...artifact,
    bytes:
      artifact.source === 'derived:contribution#/$defs/record'
        ? `${JSON.stringify(
            {
              $schema: contribution.$schema,
              $defs: contribution.$defs,
              $ref: '#/$defs/record',
            },
            null,
            2,
          )}\n`
        : readFileSync(resolve(root, artifact.source), 'utf8'),
  }));
}

export function packageContractBytes(root = process.cwd()): Record<string, string> {
  return Object.fromEntries(
    materializePackageArtifacts(root).map((artifact) => [artifact.name, artifact.bytes]),
  );
}
