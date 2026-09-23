import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertContentReviewRequest,
  assertMapDocument,
  getContributionSchema,
  getMapSchema,
} from '../dist/index.js';

const load = async (name) => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));

test('exposes the canonical schema identifiers', () => {
  assert.equal(getMapSchema().$id, 'https://mailschema.org/schemas/map-0.1.schema.json');
  assert.equal(getContributionSchema().$schema, 'https://json-schema.org/draft/2020-12/schema');
});

test('validates MAP and Content Review fixtures', async () => {
  assertMapDocument(await load('map-description.json'));
  assertContentReviewRequest(await load('map-request.json'));
});

test('preserves canonical schema bytes during the build', async () => {
  for (const name of [
    'contribution.schema.json',
    'map-0.1.schema.json',
    'content-review-0.1.schema.json',
  ]) {
    const source = await readFile(new URL(`../src/${name}`, import.meta.url));
    const built = await readFile(new URL(`../dist/${name}`, import.meta.url));
    assert.deepEqual(built, source);
  }
});
