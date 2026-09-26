import { readFile, readdir, writeFile, mkdir, cp, chmod, rm } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  materializePackageArtifacts,
  packageArtifactNames,
  packageRegistries,
} from '../src/lib/package-artifacts.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.release/packages');
const read = (path) => readFile(resolve(root, path), 'utf8');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
async function put(path, value) {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, value);
}

const artifacts = materializePackageArtifacts(root);
const artifact = (name) => {
  const found = artifacts.find((item) => item.name === name);
  if (!found) throw new Error(`Missing package artifact ${name}.`);
  return found;
};
const schemaBytes = artifact('contribution').bytes;
const versions = JSON.parse(await read('packages/versions.json'));
for (const registry of packageRegistries)
  if (!/^\d+\.\d+\.\d+$/.test(versions[registry] ?? ''))
    throw new Error(`Invalid ${registry} package version.`);
const license = await read('packages/LICENSE');
const validation = (await read('src/registry/validation.ts'))
  .replace('../../public/schemas/contribution.schema.json', './contribution.schema.json')
  .replace("'./model.ts'", "'./model.js'");

// A package build must contain only files produced for this release. This also
// prevents an older wheel, crate or compiled file from entering a later upload.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await put(
  'npm/package.json',
  json({
    name: 'mailschema',
    version: versions.npm,
    description:
      'Schemas and validation tools for Mail Action Protocol and the MailSchema Registry',
    type: 'module',
    license: 'MIT',
    author: 'MailSchema contributors',
    homepage: 'https://mailschema.org/tools',
    repository: { type: 'git', url: 'git+https://github.com/mailschema/javascript.git' },
    bugs: { url: 'https://github.com/mailschema/javascript/issues' },
    engines: { node: '>=22' },
    exports: Object.fromEntries([
      ['.', { types: './dist/index.d.ts', import: './dist/index.js' }],
      ...artifacts
        .filter((item) => item.paths.npm)
        .map((item) => [`./${item.paths.npm.split('/').at(-1)}`, `./${item.paths.npm}`]),
      ['./package.json', './package.json'],
    ]),
    types: './dist/index.d.ts',
    bin: { mailschema: './bin/mailschema.js' },
    files: ['dist', 'bin', 'README.md', 'LICENSE'],
    scripts: {
      build: 'node build.mjs',
      test: 'npm run build && node --test test/*.test.mjs',
    },
    dependencies: { ajv: '8.20.0', 'ajv-formats': '3.0.1' },
    devDependencies: { typescript: '5.9.3' },
    keywords: ['email', 'schema', 'json-schema', 'agents', 'registry'],
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' },
  }),
);
await put('npm/src/model.ts', await read('src/registry/model.ts'));
await put('npm/src/validation.ts', validation);
await put('npm/src/index.ts', await read('packages/javascript/index.ts'));
await put('npm/src/map.ts', await read('packages/javascript/map.ts'));
for (const item of artifacts.filter((entry) => entry.paths.npm))
  await put(`npm/src/${item.paths.npm.split('/').at(-1)}`, item.bytes);
await put(
  'npm/artifacts.json',
  json(artifacts.filter((item) => item.paths.npm).map((item) => item.paths.npm.split('/').at(-1))),
);
await put('npm/bin/mailschema.js', await read('packages/javascript/cli.mjs'));
await put('npm/build.mjs', await read('packages/javascript/build.mjs'));
await put('npm/README.md', await read('packages/javascript/README.md'));
await put('npm/LICENSE', license);
await put('npm/test/package.test.mjs', await read('packages/javascript/package.test.mjs'));
await put(
  'npm/test/map-description.json',
  await read('public/fixtures/map-0.1/content-review-description.json'),
);
await put('npm/test/map-request.json', await read('public/fixtures/map-0.1/approve.json'));
await put('npm/test/map-result.json', await read('public/fixtures/map-0.1/result-completed.json'));
await put(
  'npm/tsconfig.json',
  json({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      resolveJsonModule: true,
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
// Preserve canonical artifact bytes, rather than the compiler's JSON formatting.
for (const item of artifacts.filter((entry) => entry.paths.npm))
  await put(`npm/${item.paths.npm}`, item.bytes);

for (const language of ['python', 'rust']) {
  await mkdir(resolve(output, language), { recursive: true });
  await cp(resolve(root, `packages/${language}`), resolve(output, language), {
    recursive: true,
    filter: (path) => !path.includes('__pycache__'),
  });
  await put(`${language}/LICENSE`, license);
}
for (const item of artifacts.filter((entry) => entry.paths.PyPI))
  await put(`python/src/mailschema/${item.paths.PyPI}`, item.bytes);
await put('python/tests/new-type.json', await read('registry/examples/new-type.json'));
await put('python/tests/content-review.json', await read('registry/types/content-review.json'));
await put(
  'python/tests/map-description.json',
  await read('public/fixtures/map-0.1/content-review-description.json'),
);
await put('python/tests/map-request.json', await read('public/fixtures/map-0.1/approve.json'));
await put(
  'python/tests/map-result.json',
  await read('public/fixtures/map-0.1/result-completed.json'),
);
for (const item of artifacts.filter((entry) => entry.paths['crates.io']))
  await put(`rust/${item.paths['crates.io']}`, item.bytes);

// Ruby: the gem source, its artifacts at their gem paths, and test fixtures taken
// from the documents the specification publishes.
const rubySource = resolve(root, 'packages/ruby');
await cp(rubySource, resolve(output, 'ruby'), {
  recursive: true,
  // Leave local Bundler settings and built gems behind.
  filter: (path) => !/^(?:\.bundle|pkg)(?:\/|$)|\.gem$/.test(relative(rubySource, path)),
});
await put('ruby/LICENSE', license);
for (const item of artifacts.filter((entry) => entry.paths.RubyGems))
  await put(`ruby/${item.paths.RubyGems}`, item.bytes);
await cp(resolve(root, 'public/fixtures/map-0.2'), resolve(output, 'ruby/test/fixtures/map-0.2'), {
  recursive: true,
  filter: (path) => !/\/(?:emails|dns\.json)(?:\/|$)/.test(path),
});
for (const file of (await readdir(resolve(root, 'public/contracts'))).sort()) {
  const contract = JSON.parse(await read(`public/contracts/${file}`));
  if (contract.profile !== 'https://mailschema.org/profiles/map/0.2') continue;
  const schema = contract.requestSchema.url.split('/').at(-1);
  await put(`ruby/test/fixtures/contracts/${file}`, await read(`public/contracts/${file}`));
  await put(`ruby/test/fixtures/schemas/${schema}`, await read(`public/schemas/${schema}`));
}
await put('ruby/test/fixtures/profile.json', await read('public/profiles/map/0.2.json'));
await put('ruby/test/fixtures/numbers.json', json(ecmaScriptNumbers()));

// ECMAScript's own formatting of doubles across the whole range, each carried as its
// IEEE 754 bits so no parser stands between the value and the expected text.
function ecmaScriptNumbers() {
  let state = 0x2545f4914f6cdd1dn;
  const next = () => {
    state ^= (state << 13n) & 0xffffffffffffffffn;
    state ^= state >> 7n;
    state ^= (state << 17n) & 0xffffffffffffffffn;
    return state;
  };
  const view = new DataView(new ArrayBuffer(8));
  const bitsOf = (value) => {
    view.setFloat64(0, value);
    return view.getBigUint64(0).toString(16).padStart(16, '0');
  };
  const values = [
    0,
    -0,
    0.1,
    0.2,
    0.1 + 0.2,
    1e21,
    1e21 - 65536,
    1e-6,
    1e-7,
    9.999999999999999e-7,
    5e-324,
    Number.MAX_VALUE,
    2.2250738585072014e-308,
    2 ** 53,
    -(2 ** 53),
    123456789012345680000,
  ];
  for (let index = 0; index < 8000; index += 1) {
    view.setBigUint64(0, next());
    const value = view.getFloat64(0);
    if (Number.isFinite(value)) values.push(value);
  }
  for (let index = 0; index < 3000; index += 1)
    values.push(Number(next() % 1000000000n) / 10 ** Number(next() % 13n));
  for (let index = 0; index < 1000; index += 1) values.push(Number(BigInt.asIntN(54, next())));
  return values.map((value) => [bitsOf(value), JSON.stringify(value)]);
}

// Check each source distribution against its own declared release version.
const python = await read('packages/python/pyproject.toml');
const pythonModule = await read('packages/python/src/mailschema/__init__.py');
const rust = await read('packages/rust/Cargo.toml');
const ruby = await read('packages/ruby/lib/mailschema/version.rb');
if (
  !python.includes(`version = "${versions.PyPI}"`) ||
  !pythonModule.includes(`__version__ = "${versions.PyPI}"`) ||
  !rust.includes(`version = "${versions['crates.io']}"`) ||
  !ruby.includes(`VERSION = "${versions.RubyGems}"`)
)
  throw new Error('A source distribution disagrees with packages/versions.json.');

await put(
  'prepared.json',
  json({
    format: 'mailschema-package-build/2',
    versions,
    schemaSha256: createHash('sha256').update(schemaBytes).digest('hex'),
    contracts: artifacts.map((item) => ({
      name: item.name,
      sha256: createHash('sha256').update(item.bytes).digest('hex'),
    })),
    channels: packageRegistries.map((registry) => ({
      registry,
      version: versions[registry],
      contracts: packageArtifactNames(registry),
    })),
    sources: Object.fromEntries(artifacts.map((item) => [item.name, item.source])),
    status: 'prepared',
  }),
);
console.log(
  `Prepared MailSchema packages from the canonical contracts: npm ${versions.npm}, PyPI ${versions.PyPI}, crates.io ${versions['crates.io']}, Go ${versions.Go}, RubyGems ${versions.RubyGems}.`,
);
