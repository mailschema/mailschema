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

test('checks files from the command line and prints their digests', async () => {
  const cli = fileURLToPath(new URL('../bin/mailschema.js', import.meta.url));
  const run = (...args) =>
    execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', stdio: 'pipe' });
  const path = (name) => fileURLToPath(fixture(name));
  const descriptionDigests = {
    'campaign-send-approval':
      'sha-256:850cebcbd01af512c9a360adfdc5f672d08f5bc54ae68539508b5eb98cc44be1',
    'publication-approval':
      'sha-256:270b6c781f876aa56ecdc7b9ab45ed5dc0e8465bc8df56f1805e05a8f3a6db44',
  };
  for (const [slug, descriptionDigest] of Object.entries(descriptionDigests)) {
    const { id, version, digest: contractDigest } = contracts.get(slug);
    const contract = path(`contracts/${slug}-${version}.json`);
    const description = path(`examples/${slug}.json`);
    assert.equal(
      run('contract', contract),
      `Valid type contract ${id} ${version}\n${contractDigest}\n`,
    );
    const { '@id': descriptionId } = await load(`examples/${slug}.json`);
    const output = `Valid MAP 0.3 description ${descriptionId}\n${descriptionDigest}\n`;
    assert.equal(run('description', description), output, slug);
    assert.equal(run('description', description, '--contract', contract), output, slug);
  }
  const campaign = path('examples/campaign-send-approval.json');
  assert.throws(() => run('contract', campaign));
  assert.throws(() =>
    run('description', campaign, '--contract', path('contracts/publication-approval-0.1.json')),
  );
});
