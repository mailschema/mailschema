import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MAP_PROFILE,
  assertContribution,
  getContractFormatSchema,
  getContributionSchema,
  getFormsSchema,
  getMapContext,
  getMapSchema,
} from '../dist/index.js';

const load = async (name) => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));

test('exposes the MAP 0.2 core artifacts', () => {
  assert.equal(MAP_PROFILE, 'https://mailschema.org/profiles/map/0.2');
  assert.equal(getMapSchema().$id, 'https://mailschema.org/schemas/map-0.2.schema.json');
  assert.equal(getMapContext()['@context'].MailAction, 'map:MailAction');
  assert.equal(
    getContractFormatSchema().$id,
    'https://mailschema.org/schemas/type-contract-0.2.schema.json',
  );
  assert.equal(getFormsSchema().$id, 'https://mailschema.org/schemas/forms-0.1.schema.json');
  assert.equal(getContributionSchema().$schema, 'https://json-schema.org/draft/2020-12/schema');
});

test('validates a Registry contribution', async () => {
  assertContribution(await load('new-type.json'));
});

test('preserves canonical artifact bytes during the build', async () => {
  const artifacts = JSON.parse(
    await readFile(new URL('../artifacts.json', import.meta.url), 'utf8'),
  );
  for (const name of artifacts) {
    const source = await readFile(new URL(`../src/${name}`, import.meta.url));
    const built = await readFile(new URL(`../dist/${name}`, import.meta.url));
    assert.deepEqual(built, source);
  }
});
