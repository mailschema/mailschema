import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '../src/map/core/index.ts';
import {
  materializePackageArtifacts,
  packageArtifactPath,
} from '../src/lib/package-artifacts.ts';

const release = '.release/packages';
const versions = JSON.parse(readFileSync('packages/versions.json', 'utf8'));
const prepared = JSON.parse(readFileSync(`${release}/prepared.json`, 'utf8'));
const artifacts = materializePackageArtifacts();
const roots = { npm: 'npm', PyPI: 'python/src', 'crates.io': 'rust', Go: 'go', RubyGems: 'ruby' };

/** Every file in a prepared package, as paths relative to its root. */
const files = (directory) =>
  readdirSync(join(release, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(release.length + directory.length + 2));

test('each package declares the version packages/versions.json selects', () => {
  assert.equal(prepared.format, 'mailschema-package-build/3');
  assert.deepEqual(prepared.versions, versions);
  assert.equal(JSON.parse(readFileSync(`${release}/npm/package.json`)).version, versions.npm);
  for (const [path, line] of [
    ['python/pyproject.toml', `version = "${versions.PyPI}"`],
    ['rust/Cargo.toml', `version = "${versions['crates.io']}"`],
    ['ruby/lib/mailschema/version.rb', `VERSION = "${versions.RubyGems}"`],
  ])
    assert.ok(readFileSync(`${release}/${path}`, 'utf8').includes(line), path);
});

test('every package carries each artifact byte for byte, bound by the profile record', () => {
  assert.equal(prepared.profileSha256, sha256(artifacts.find((a) => a.name === 'profile').bytes));
  assert.deepEqual(
    prepared.artifacts,
    artifacts.map(({ name, bytes }) => ({ name, sha256: sha256(bytes) })),
  );
  for (const [registry, root] of Object.entries(roots))
    for (const artifact of artifacts)
      assert.equal(
        readFileSync(`${release}/${root}/${packageArtifactPath(registry, artifact)}`, 'utf8'),
        artifact.bytes,
        `${registry} ${artifact.name}`,
      );
});

test('the npm package carries the MAP core exactly as the repository runs it', () => {
  const core = readdirSync('src/map/core').sort();
  assert.deepEqual(readdirSync(`${release}/npm/src/core`).sort(), core);
  for (const file of core) {
    const source = readFileSync(`src/map/core/${file}`, 'utf8');
    assert.equal(
      readFileSync(`${release}/npm/src/core/${file}`, 'utf8'),
      // Only the schema imports point at the package's own copies.
      file === 'bundled.ts'
        ? source.replaceAll("'../../../specifications/map-0.3/schemas/", "'../")
        : source,
      file,
    );
  }
});

test('packages point to their language repositories and carry no earlier profile', () => {
  const npm = JSON.parse(readFileSync(`${release}/npm/package.json`));
  assert.equal(npm.repository.url, 'git+https://github.com/mailschema/javascript.git');
  assert.match(readFileSync(`${release}/python/pyproject.toml`, 'utf8'), /github\.com\/mailschema\/python"/);
  assert.match(readFileSync(`${release}/rust/Cargo.toml`, 'utf8'), /github\.com\/mailschema\/rust"/);
  assert.match(readFileSync(`${release}/go/go.mod`, 'utf8'), /^module github\.com\/mailschema\/go$/m);
  const gemspec = readFileSync(`${release}/ruby/mailschema.gemspec`, 'utf8');
  for (const [key, value] of [
    ['allowed_push_host', 'https://rubygems.org'],
    ['source_code_uri', 'https://github.com/mailschema/ruby'],
    ['rubygems_mfa_required', 'true'],
  ])
    assert.ok(gemspec.includes(`spec.metadata["${key}"] = "${value}"`), key);
  for (const [directory, repository] of [
    ['npm', 'javascript'],
    ['python', 'python'],
    ['rust', 'rust'],
    ['go', 'go'],
    ['ruby', 'ruby'],
  ]) {
    assert.match(
      readFileSync(`${release}/${directory}/README.md`, 'utf8'),
      new RegExp(`Mail Action Protocol[\\s\\S]*github\\.com/mailschema/${repository}`),
    );
    // Test fixtures are verbatim copies of the published 0.3 conformance files, one of which
    // checks that an earlier profile's URI is refused.
    for (const file of files(directory).filter(
      (path) => !/(?:^|\/)(?:node_modules|dist|fixtures|Gemfile\.lock|package-lock\.json)(?:\/|$)/.test(path),
    ))
      assert.doesNotMatch(
        readFileSync(`${release}/${directory}/${file}`, 'utf8'),
        /map\/0\.[12]\b|map-0\.[12]\b|MAP 0\.[12]\b/,
        `${directory}/${file}`,
      );
  }
});

test('package preparation leaves no earlier build output', () => {
  for (const path of ['python/dist', 'rust/target', 'ruby/.bundle', 'ruby/pkg'])
    assert.equal(existsSync(`${release}/${path}`), false, path);
});
