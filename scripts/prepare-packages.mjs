import { readFile, writeFile, mkdir, cp, chmod } from 'node:fs/promises';
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
const versions = JSON.parse(await read('packages/versions.json'));
for (const registry of ['npm', 'PyPI', 'crates.io'])
  if (!/^\d+\.\d+\.\d+$/.test(versions[registry] ?? ''))
    throw new Error(`Invalid ${registry} package version.`);
const recordSchema = json({ $schema: schema.$schema, $defs: schema.$defs, $ref: '#/$defs/record' });
const license = await read('packages/LICENSE');
const validation = (await read('src/registry/validation.ts'))
  .replace('../../public/schemas/contribution.schema.json', './contribution.schema.json')
  .replace("'./model.ts'", "'./model.js'");

await put(
  'npm/package.json',
  json({
    name: 'mailschema',
    version: versions.npm,
    description:
      'JSON Schemas, TypeScript definitions and validation tools for MailSchema Registry contributions',
    type: 'module',
    license: 'MIT',
    author: 'MailSchema contributors',
    engines: { node: '>=22' },
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './contribution.schema.json': './dist/contribution.schema.json',
      './package.json': './package.json',
    },
    types: './dist/index.d.ts',
    bin: { mailschema: './cli.mjs' },
    files: ['dist', 'cli.mjs', 'README.md', 'LICENSE'],
    dependencies: { ajv: '8.20.0', 'ajv-formats': '3.0.1' },
    keywords: ['email', 'schema', 'json-schema', 'agents', 'registry'],
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' },
  }),
);
await put('npm/src/model.ts', await read('src/registry/model.ts'));
await put('npm/src/validation.ts', validation);
await put('npm/src/index.ts', await read('packages/javascript/index.ts'));
await put('npm/src/contribution.schema.json', schemaBytes);
await put('npm/cli.mjs', await read('packages/javascript/cli.mjs'));
await put('npm/README.md', await read('packages/javascript/README.md'));
await put('npm/LICENSE', license);
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
await chmod(resolve(output, 'npm/cli.mjs'), 0o755);
// Preserve the canonical schema bytes, rather than the compiler's JSON formatting.
await put('npm/dist/contribution.schema.json', schemaBytes);

for (const language of ['python', 'rust']) {
  await mkdir(resolve(output, language), { recursive: true });
  await cp(resolve(root, `packages/${language}`), resolve(output, language), {
    recursive: true,
    filter: (path) => !path.includes('__pycache__'),
  });
  await put(`${language}/LICENSE`, license);
}
await put('python/src/mailschema/contribution.schema.json', schemaBytes);
await put('python/tests/new-type.json', await read('registry/examples/new-type.json'));
await put('python/tests/content-review.json', await read('registry/types/content-review.json'));
await put('rust/schemas/contribution.schema.json', schemaBytes);
await put('rust/schemas/record.schema.json', recordSchema);

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
    versions,
    schemaSha256: createHash('sha256').update(schemaBytes).digest('hex'),
    channels: [
      { registry: 'npm', version: versions.npm },
      { registry: 'PyPI', version: versions.PyPI },
      { registry: 'crates.io', version: versions['crates.io'] },
    ],
    source: 'public/schemas/contribution.schema.json',
    status: 'prepared',
  }),
);
console.log(
  `Prepared MailSchema packages from one canonical schema: npm ${versions.npm}, PyPI ${versions.PyPI}, crates.io ${versions['crates.io']}.`,
);
