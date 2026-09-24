import { readFile, writeFile, mkdir, cp, chmod, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.release/packages');
const read = (path) => readFile(resolve(root, path), 'utf8');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
async function put(path, value) {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, value);
}

const schemaBytes = await read('public/schemas/contribution.schema.json');
const schema = JSON.parse(schemaBytes);
const mapSchemaBytes = await read('public/schemas/map-0.1.schema.json');
const contentReviewSchemaBytes = await read('public/schemas/content-review-0.1.schema.json');
const contentReviewContractBytes = await read('public/contracts/content-review-0.1.json');
const versions = JSON.parse(await read('packages/versions.json'));
for (const registry of ['npm', 'PyPI', 'crates.io', 'Go'])
  if (!/^\d+\.\d+\.\d+$/.test(versions[registry] ?? ''))
    throw new Error(`Invalid ${registry} package version.`);
const recordSchema = json({ $schema: schema.$schema, $defs: schema.$defs, $ref: '#/$defs/record' });
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
    homepage: 'https://mailschema.org/tools/',
    repository: { type: 'git', url: 'git+https://github.com/mailschema/javascript.git' },
    bugs: { url: 'https://github.com/mailschema/javascript/issues' },
    engines: { node: '>=22' },
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './contribution.schema.json': './dist/contribution.schema.json',
      './map-0.1.schema.json': './dist/map-0.1.schema.json',
      './content-review-0.1.schema.json': './dist/content-review-0.1.schema.json',
      './content-review-0.1.contract.json': './dist/content-review-0.1.contract.json',
      './package.json': './package.json',
    },
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
await put('npm/src/contribution.schema.json', schemaBytes);
await put('npm/src/map-0.1.schema.json', mapSchemaBytes);
await put('npm/src/content-review-0.1.schema.json', contentReviewSchemaBytes);
await put('npm/src/content-review-0.1.contract.json', contentReviewContractBytes);
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
// Preserve the canonical schema bytes, rather than the compiler's JSON formatting.
await put('npm/dist/contribution.schema.json', schemaBytes);
await put('npm/dist/map-0.1.schema.json', mapSchemaBytes);
await put('npm/dist/content-review-0.1.schema.json', contentReviewSchemaBytes);
await put('npm/dist/content-review-0.1.contract.json', contentReviewContractBytes);

for (const language of ['python', 'rust']) {
  await mkdir(resolve(output, language), { recursive: true });
  await cp(resolve(root, `packages/${language}`), resolve(output, language), {
    recursive: true,
    filter: (path) => !path.includes('__pycache__'),
  });
  await put(`${language}/LICENSE`, license);
}
await put('python/src/mailschema/contribution.schema.json', schemaBytes);
await put('python/src/mailschema/map-0.1.schema.json', mapSchemaBytes);
await put('python/src/mailschema/content-review-0.1.schema.json', contentReviewSchemaBytes);
await put('python/src/mailschema/content-review-0.1.contract.json', contentReviewContractBytes);
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
await put('rust/schemas/contribution.schema.json', schemaBytes);
await put('rust/schemas/record.schema.json', recordSchema);
await put('rust/schemas/map-0.1.schema.json', mapSchemaBytes);
await put('rust/schemas/content-review-0.1.schema.json', contentReviewSchemaBytes);
await put('rust/contracts/content-review-0.1.json', contentReviewContractBytes);

// Check each source distribution against its own declared release version.
const python = await read('packages/python/pyproject.toml');
const pythonModule = await read('packages/python/src/mailschema/__init__.py');
const rust = await read('packages/rust/Cargo.toml');
if (
  !python.includes(`version = "${versions.PyPI}"`) ||
  !pythonModule.includes(`__version__ = "${versions.PyPI}"`) ||
  !rust.includes(`version = "${versions['crates.io']}"`)
)
  throw new Error('A source distribution disagrees with packages/versions.json.');

await put(
  'prepared.json',
  json({
    format: 'mailschema-package-build/2',
    versions,
    schemaSha256: createHash('sha256').update(schemaBytes).digest('hex'),
    contracts: [
      ['contribution', schemaBytes],
      ['map-0.1', mapSchemaBytes],
      ['content-review-0.1', contentReviewSchemaBytes],
      ['content-review-0.1-contract', contentReviewContractBytes],
      ['record', recordSchema],
    ].map(([name, bytes]) => ({
      name,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })),
    channels: [
      {
        registry: 'npm',
        version: versions.npm,
        contracts: ['contribution', 'map-0.1', 'content-review-0.1', 'content-review-0.1-contract'],
      },
      {
        registry: 'PyPI',
        version: versions.PyPI,
        contracts: ['contribution', 'map-0.1', 'content-review-0.1', 'content-review-0.1-contract'],
      },
      {
        registry: 'crates.io',
        version: versions['crates.io'],
        contracts: [
          'contribution',
          'map-0.1',
          'content-review-0.1',
          'content-review-0.1-contract',
          'record',
        ],
      },
      {
        registry: 'Go',
        version: versions.Go,
        contracts: ['contribution', 'map-0.1', 'content-review-0.1', 'content-review-0.1-contract'],
      },
    ],
    sources: {
      contribution: 'public/schemas/contribution.schema.json',
      'map-0.1': 'public/schemas/map-0.1.schema.json',
      'content-review-0.1': 'public/schemas/content-review-0.1.schema.json',
      'content-review-0.1-contract': 'public/contracts/content-review-0.1.json',
      record: 'derived from contribution.schema.json#/$defs/record',
    },
    status: 'prepared',
  }),
);
console.log(
  `Prepared MailSchema packages from the canonical contracts: npm ${versions.npm}, PyPI ${versions.PyPI}, crates.io ${versions['crates.io']}, Go ${versions.Go}.`,
);
