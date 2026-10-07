// Prepare every language package from this commit: its sources, the MAP 0.3 artifacts at the
// package's path, and the shared conformance fixtures its tests run.
import { chmod, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sha256 } from '../src/map/core/index.ts';
import {
  materializePackageArtifacts,
  packageArtifactPath,
  packageRegistries,
} from '../src/lib/package-artifacts.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.release/packages');
const specification = 'specifications/map-0.3';
const read = (path) => readFile(resolve(root, path), 'utf8');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
async function put(path, value) {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, value);
}

const artifacts = materializePackageArtifacts(root);
const versions = JSON.parse(await read('packages/versions.json'));
for (const registry of packageRegistries)
  if (!/^\d+\.\d+\.\d+$/.test(versions[registry] ?? ''))
    throw new Error(`Invalid ${registry} package version.`);
const license = await read('packages/LICENSE');

/** The artifacts at the registry's path, under the package directory. */
async function putArtifacts(directory, registry) {
  for (const artifact of artifacts)
    await put(`${directory}/${packageArtifactPath(registry, artifact)}`, artifact.bytes);
}

/** The published contracts, their examples and the shared vectors, for a package's tests. */
async function putFixtures(directory) {
  for (const name of (await readdir(resolve(root, `${specification}/contracts`))).sort()) {
    await put(`${directory}/contracts/${name}`, await read(`${specification}/contracts/${name}`));
    const slug = name.replace(/-[0-9.]+\.json$/, '');
    await put(`${directory}/examples/${slug}.json`, await read(`${specification}/examples/${slug}.json`));
  }
  for (const name of ['json-vectors.json', 'jcs-vectors.json', 'shape-vectors.json'])
    await put(`${directory}/${name}`, await read(`conformance/map-0.3/${name}`));
}

/** A package's own sources, without local build output. */
async function copySources(language, skip = () => false) {
  const source = resolve(root, `packages/${language}`);
  await cp(source, resolve(output, language), {
    recursive: true,
    filter: (path) => !skip(relative(source, path)),
  });
  await put(`${language}/LICENSE`, license);
}

// A package build contains only files produced for this release, so no earlier wheel, crate
// or compiled file can enter a later upload.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// npm: the repository's MAP core, unchanged except that its three schema imports point at the
// package's own copies.
await put(
  'npm/package.json',
  json({
    name: 'mailschema',
    version: versions.npm,
    description:
      'Mail Action Protocol 0.3: parse and check descriptions, type contracts and implementation records',
    type: 'module',
    license: 'MIT',
    author: 'MailSchema contributors',
    homepage: 'https://mailschema.org/tools',
    repository: { type: 'git', url: 'git+https://github.com/mailschema/javascript.git' },
    bugs: { url: 'https://github.com/mailschema/javascript/issues' },
    engines: { node: '>=22' },
    exports: Object.fromEntries([
      ['.', { types: './dist/index.d.ts', import: './dist/index.js' }],
      ...artifacts.map((artifact) => [`./${artifact.file}`, `./dist/${artifact.file}`]),
      ['./package.json', './package.json'],
    ]),
    types: './dist/index.d.ts',
    bin: { mailschema: './bin/mailschema.js' },
    files: ['dist', 'bin', 'README.md', 'LICENSE'],
    scripts: { build: 'node build.mjs', test: 'npm run build && node --test test/*.test.mjs' },
    dependencies: { ajv: '8.20.0', 'ajv-formats': '3.0.1' },
    devDependencies: { '@types/node': '24.13.6', typescript: '5.9.3' },
    keywords: ['email', 'mail-action-protocol', 'json-schema', 'agents'],
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' },
  }),
);
await put('npm/src/index.ts', await read('packages/javascript/index.ts'));
for (const file of (await readdir(resolve(root, 'src/map/core'))).sort()) {
  let source = await read(`src/map/core/${file}`);
  if (file === 'bundled.ts') {
    source = source.replaceAll(`'../../../${specification}/schemas/`, "'../");
    if (source.split("'../").length - 1 !== 3)
      throw new Error('The core must import exactly three bundled schemas.');
  }
  await put(`npm/src/core/${file}`, source);
}
for (const artifact of artifacts) await put(`npm/src/${artifact.file}`, artifact.bytes);
await put('npm/artifacts.json', json(artifacts.map((artifact) => artifact.file)));
await put('npm/bin/mailschema.js', await read('packages/javascript/cli.mjs'));
await put('npm/build.mjs', await read('packages/javascript/build.mjs'));
await put('npm/README.md', await read('packages/javascript/README.md'));
await put('npm/LICENSE', license);
await put('npm/test/package.test.mjs', await read('packages/javascript/package.test.mjs'));
await putFixtures('npm/test/fixtures');
await put(
  'npm/tsconfig.json',
  json({
    compilerOptions: {
      target: 'ES2023',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      resolveJsonModule: true,
      rewriteRelativeImportExtensions: true,
      stripInternal: true,
      esModuleInterop: true,
      declaration: true,
      rootDir: 'src',
      outDir: 'dist',
      skipLibCheck: true,
    },
    include: ['src/**/*.ts', 'src/**/*.json'],
  }),
);
execFileSync(
  process.execPath,
  [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(output, 'npm/tsconfig.json')],
  { cwd: root, stdio: 'inherit' },
);
await chmod(resolve(output, 'npm/bin/mailschema.js'), 0o755);
// The canonical artifact bytes, not the compiler's JSON formatting.
await putArtifacts('npm', 'npm');

await copySources('python', (path) => path.includes('__pycache__'));
await putArtifacts('python/src', 'PyPI');
await copySources('rust', (path) => /^target(?:\/|$)/.test(path));
await putArtifacts('rust', 'crates.io');
await copySources('go');
await putArtifacts('go', 'Go');
await copySources('ruby', (path) => /^(?:\.bundle|pkg)(?:\/|$)|\.gem$/.test(path));
await putArtifacts('ruby', 'RubyGems');
await putFixtures('ruby/test/fixtures');

// Each source distribution declares the version packages/versions.json selects.
const declared = [
  ['PyPI', 'packages/python/pyproject.toml', `version = "${versions.PyPI}"`],
  ['PyPI', 'packages/python/src/mailschema/__init__.py', `__version__ = "${versions.PyPI}"`],
  ['crates.io', 'packages/rust/Cargo.toml', `version = "${versions['crates.io']}"`],
  ['RubyGems', 'packages/ruby/lib/mailschema/version.rb', `VERSION = "${versions.RubyGems}"`],
];
for (const [registry, path, line] of declared)
  if (!(await read(path)).includes(line))
    throw new Error(`${path} disagrees with the ${registry} version in packages/versions.json.`);

await put(
  'prepared.json',
  json({
    format: 'mailschema-package-build/3',
    versions,
    profileSha256: sha256(artifacts.find((artifact) => artifact.name === 'profile').bytes),
    artifacts: artifacts.map((artifact) => ({ name: artifact.name, sha256: sha256(artifact.bytes) })),
  }),
);
console.log(
  `Prepared the MAP 0.3 packages: ${packageRegistries.map((registry) => `${registry} ${versions[registry]}`).join(', ')}.`,
);
