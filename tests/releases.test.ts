import { expect, test } from 'vitest';
import { sha256 } from '../src/map/core';
import { materializePackageArtifacts } from '../src/lib/package-artifacts';
import {
  assertPackageRelease,
  assertPackageSet,
  type PackageRelease,
  type PackageSetSelection,
} from '../src/lib/package-release';

const artifacts = Object.fromEntries(
  materializePackageArtifacts().map((artifact) => [artifact.name, artifact.bytes]),
);
const profileSha256 = sha256(artifacts.profile);
const release = (): PackageRelease => ({
  format: 'mailschema-package-release/3',
  version: '0.3.0',
  profileSha256,
  artifacts: Object.entries(artifacts).map(([name, bytes]) => ({ name, sha256: sha256(bytes) })),
  channels: [
    {
      registry: 'npm',
      name: 'mailschema',
      version: '0.3.0',
      url: 'https://www.npmjs.com/package/mailschema/v/0.3.0',
      status: 'verified',
    },
  ],
});
const selection = (evidence = 'npm-0.3.0'): PackageSetSelection => ({
  schema: 'mailschema-package-set/2',
  profileSha256,
  channels: [{ registry: 'npm', evidence, version: '0.3.0' }],
});

test('accepts release evidence that binds every canonical artifact', () => {
  expect(() => assertPackageRelease(release(), artifacts)).not.toThrow();
  const selected = assertPackageSet(selection(), new Map([['npm-0.3.0', release()]]), artifacts);
  expect(selected.get('npm')?.version).toBe('0.3.0');
});

test('refuses evidence for other bytes, registries or versions', () => {
  const changed = release();
  changed.artifacts[1].sha256 = '0'.repeat(64);
  expect(() => assertPackageRelease(changed, artifacts)).toThrow(/canonical artifacts/);
  const elsewhere = release();
  elsewhere.channels[0].url = 'https://example.com/package/mailschema';
  expect(() => assertPackageRelease(elsewhere, artifacts)).toThrow(/npm package release/);
  const otherProfile = { ...release(), profileSha256: '0'.repeat(64) };
  expect(() => assertPackageRelease(otherProfile, artifacts)).toThrow(/profile record/);
  expect(() =>
    assertPackageSet(
      { ...selection(), channels: [{ registry: 'npm', evidence: 'npm-0.3.0', version: '0.3.1' }] },
      new Map([['npm-0.3.0', release()]]),
      artifacts,
    ),
  ).toThrow(/not verified/);
  expect(() => assertPackageSet(selection('missing'), new Map(), artifacts)).toThrow(/Missing/);
});

test('presents no package before one is verified', () => {
  expect(assertPackageSet({ ...selection(), channels: [] }, new Map(), artifacts).size).toBe(0);
});
