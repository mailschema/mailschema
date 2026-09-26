import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import current from '../docs/releases/current.json' with { type: 'json' };
import {
  assertPackageRelease,
  assertPackageSet,
  type PackageContracts,
  type PackageRelease,
  type PackageSetSelection,
} from '../src/lib/package-release';
import { packageArtifactNames, packageContractBytes } from '../src/lib/package-artifacts';
import { tooling, localCheckCommands, recordCheckCommands, rubyTool } from '../src/data/tooling';
import { typeRecords } from '../src/data/types';
import { assertTypeRecord } from '../src/registry/validation';

const contracts = packageContractBytes() as PackageContracts;
const releases = new Map<string, PackageRelease>(
  current.channels.map(({ evidence }) => [
    evidence,
    JSON.parse(readFileSync(`docs/releases/${evidence}.json`, 'utf8')) as PackageRelease,
  ]),
);
const selected = assertPackageSet(current as PackageSetSelection, releases, contracts);
const npmRelease = selected.get('npm')!;

test('the Tools page offers exactly the selected releases, with Ruby once RubyGems is selected', () => {
  expect(tooling.map((tool) => tool.registry).sort()).toEqual(
    current.channels.map((channel) => channel.registry).sort(),
  );
  // Each tab's MAP version is the core schema its release evidence binds: the gem
  // ships MAP 0.2, and the other selected releases still ship MAP 0.1.
  for (const tool of tooling)
    expect([tool.registry, tool.map]).toEqual([
      tool.registry,
      tool.registry === 'RubyGems' ? '0.2' : '0.1',
    ]);
  const ruby = rubyTool(
    {
      registry: 'RubyGems',
      name: 'mailschema',
      version: '0.2.0',
      url: 'https://rubygems.org/gems/mailschema/versions/0.2.0',
      status: 'verified',
    },
    '0.2',
  );
  expect([ruby.id, ruby.map, ruby.install]).toEqual([
    'ruby',
    '0.2',
    'gem install mailschema -v 0.2.0',
  ]);
});

test('advertised tooling refuses schema drift and unverified or mixed releases', () => {
  for (const release of releases.values())
    expect(() => assertPackageRelease(release, contracts)).not.toThrow();
  expect([...assertPackageSet(current as PackageSetSelection, releases, contracts).keys()]).toEqual(
    current.channels.map((channel) => channel.registry),
  );
  expect(() =>
    assertPackageRelease(releases.get(current.channels[0].evidence)!, {
      ...contracts,
      contribution: contracts.contribution + '\n',
    }),
  ).toThrow(/differs from the advertised/);
  for (const alteration of [
    { status: 'submitted' },
    { version: '9.9.9' },
    { url: 'https://example.com/package' },
  ]) {
    const changed = structuredClone(releases.get(current.channels[0].evidence)!);
    Object.assign(changed.channels[0], alteration);
    expect(() => assertPackageRelease(changed, contracts)).toThrow();
  }
  const wrongSelection = structuredClone(current);
  wrongSelection.channels[0].version = '9.9.9';
  expect(() =>
    assertPackageSet(wrongSelection as PackageSetSelection, releases, contracts),
  ).toThrow(/not verified/);
});

test('full-contract release evidence binds every distributed protocol schema', () => {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const release: PackageRelease = {
    format: 'mailschema-package-release/2',
    version: '1.0.0',
    schemaSha256: hash(contracts.contribution),
    contracts: packageArtifactNames('npm').map((name) => ({
      name,
      sha256: hash(contracts[name as keyof PackageContracts]),
    })),
    channels: [
      {
        registry: 'npm',
        name: 'mailschema',
        version: '1.0.0',
        url: 'https://www.npmjs.com/package/mailschema/v/1.0.0',
        status: 'verified',
      },
    ],
  };

  expect(() => assertPackageRelease(release, contracts)).not.toThrow();
  expect(() =>
    assertPackageRelease(release, { ...contracts, 'map-0.1': `${contracts['map-0.1']}\n` }),
  ).toThrow(/map-0.1 contract differs/);
  const missing = structuredClone(release);
  missing.contracts!.pop();
  expect(() => assertPackageRelease(missing, contracts)).toThrow(/Invalid release contract set/);
});
