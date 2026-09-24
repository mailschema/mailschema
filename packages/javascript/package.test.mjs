import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertContentReviewRequest,
  assertMapDocument,
  getContributionSchema,
  getContentReviewContract,
  getContentReview01Contract,
  getMapSchema,
} from '../dist/index.js';

const load = async (name) => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));

test('exposes the canonical schema identifiers', () => {
  assert.equal(getMapSchema().$id, 'https://mailschema.org/schemas/map-0.1.schema.json');
  assert.equal(getContentReviewContract().id, 'https://mailschema.org/types/content-review');
  assert.equal(getContentReviewContract().version, '0.2');
  assert.equal(getContentReview01Contract().version, '0.1');
  assert.equal(getContributionSchema().$schema, 'https://json-schema.org/draft/2020-12/schema');
});

test('validates MAP and Content Review fixtures', async () => {
  assertMapDocument(await load('map-description.json'));
  assertContentReviewRequest(await load('map-request.json'));
  const result = await load('map-result.json');
  assertMapDocument(result);
  assert.equal(result.type.id, 'https://mailschema.org/types/content-review');
});

test('preserves canonical schema bytes during the build', async () => {
  for (const name of [
    'contribution.schema.json',
    'map-0.1.schema.json',
    'content-review-0.1.schema.json',
    'content-review-0.1.contract.json',
    'content-review-0.2.schema.json',
    'content-review-0.2.contract.json',
  ]) {
    const source = await readFile(new URL(`../src/${name}`, import.meta.url));
    const built = await readFile(new URL(`../dist/${name}`, import.meta.url));
    assert.deepEqual(built, source);
  }
});
