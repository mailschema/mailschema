import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  canonicalize,
  Contract,
  coreSchema,
  DESCRIPTION_MAX_BYTES,
  descriptionErrors,
  digest,
  parse,
  parseDescription,
  PROFILE,
} from '../dist/index.js';

const fixture = (name) => new URL(`fixtures/${name}`, import.meta.url);
const load = async (name) => JSON.parse(await readFile(fixture(name), 'utf8'));
const contracts = new Map();
for (const name of await readdir(fixture('contracts')))
  contracts.set(
    name.replace(/-[0-9.]+\.json$/, ''),
    Contract.parse(await readFile(fixture(`contracts/${name}`))),
  );

test('carries the MAP 0.3 artifacts byte for byte', async () => {
  assert.equal(PROFILE, 'https://mailschema.org/profiles/map/0.3');
  assert.equal(coreSchema.$id, 'https://mailschema.org/artifacts/map-0.3/schemas/core.schema.json');
  for (const name of JSON.parse(await readFile(new URL('../artifacts.json', import.meta.url))))
    assert.deepEqual(
      await readFile(new URL(`../dist/${name}`, import.meta.url)),
      await readFile(new URL(`../src/${name}`, import.meta.url)),
    );
});

test('parses and canonicalizes every JSON vector as MAP requires', async () => {
  for (const vector of await load('json-vectors.json')) {
    if (!vector.valid) assert.throws(() => parse(vector.json, DESCRIPTION_MAX_BYTES), vector.name);
    else
      assert.equal(canonicalize(parse(vector.json, DESCRIPTION_MAX_BYTES)), vector.canonical, vector.name);
  }
  for (const vector of await load('jcs-vectors.json')) {
    assert.equal(canonicalize(JSON.parse(vector.json)), vector.canonical, vector.name);
    assert.equal(digest(JSON.parse(vector.json)), vector.digest, vector.name);
  }
});

test('agrees with every shape vector', async () => {
  for (const vector of await load('shape-vectors.json')) {
    const value = await load(`examples/${vector.example}.json`);
    for (const edit of vector.edits) {
      const segments = edit.path
        .split('/')
        .slice(1)
        .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
      const key = segments.pop();
      const target = segments.reduce((node, segment) => node[segment], value);
      if (edit.op === 'remove') delete target[key];
      else target[key] = edit.value;
    }
    const contract = contracts.get(vector.example);
    const valid = !descriptionErrors(value).length && !contract.detailsErrors(value.details).length;
    assert.equal(valid, vector.valid, vector.id);
  }
});

test('identifies each contract by the digest its example names', async () => {
  for (const [slug, contract] of contracts) {
    const description = parseDescription(await readFile(fixture(`examples/${slug}.json`)));
    assert.equal(description.type.contractDigest, contract.digest);
    assert.deepEqual(contract.descriptionErrors(description), []);
  }
});

test('checks files from the command line', () => {
  const cli = fileURLToPath(new URL('../bin/mailschema.js', import.meta.url));
  const contract = fileURLToPath(fixture('contracts/publication-approval-0.1.json'));
  const description = fileURLToPath(fixture('examples/publication-approval.json'));
  assert.match(
    execFileSync(process.execPath, [cli, 'contract', contract], { encoding: 'utf8' }),
    /^Valid type contract .*\nsha-256:[0-9a-f]{64}\n$/,
  );
  assert.match(
    execFileSync(process.execPath, [cli, 'description', description, '--contract', contract], {
      encoding: 'utf8',
    }),
    /^Valid MAP 0\.3 description /,
  );
  assert.throws(() =>
    execFileSync(process.execPath, [cli, 'contract', description], { stdio: 'pipe' }),
  );
});
