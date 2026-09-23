import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = process.cwd();
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const mapSchema = readJson('public/schemas/map-0.1.schema.json');
const contentReviewSchema = readJson('public/schemas/content-review-0.1.schema.json');
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validateMap = ajv.compile(mapSchema);
const validateContentReview = ajv.compile(contentReviewSchema);

const validMapFixtures = [
  'public/fixtures/map-0.1/content-review-description.json',
  'public/fixtures/map-0.1/request-changes.json',
  'public/fixtures/map-0.1/approve.json',
  'public/fixtures/map-0.1/result-completed.json',
  'public/fixtures/map-0.1/result-approval-required.json',
  'public/fixtures/map-0.1/problem-stale-target.json',
];
for (const path of validMapFixtures) {
  const value = readJson(path);
  assert(validateMap(value), `${path}: ${ajv.errorsText(validateMap.errors)}`);
}
for (const path of [
  'public/fixtures/map-0.1/request-changes.json',
  'public/fixtures/map-0.1/approve.json',
]) {
  const value = readJson(path);
  assert(validateContentReview(value), `${path}: ${ajv.errorsText(validateContentReview.errors)}`);
}

const description = readJson('public/fixtures/map-0.1/content-review-description.json');
assert(new Date(description.expiresAt) > new Date(description.describedAt));
assert.equal(
  new Set(description.operations.map((operation: { id: string }) => operation.id)).size,
  description.operations.length,
);

assert(
  !validateContentReview(readJson('public/fixtures/map-0.1/invalid/unknown-operation.json')),
  'Unknown Content Review operations must be rejected.',
);
assert(
  !validateMap(readJson('public/fixtures/map-0.1/invalid/inline-credential.json')),
  'Credentials in a MAP description must be rejected.',
);

const email = readFileSync(resolve(root, 'public/fixtures/map-0.1/content-review.eml'), 'utf8');
const structuredPart = email.match(
  /Content-Type: application\/ld\+json[^\n]*\nContent-Transfer-Encoding: 8bit\n\n([\s\S]*?)\n--map-example-boundary--/,
);
assert(structuredPart, 'The email fixture must contain an application/ld+json MIME part.');
assert.deepEqual(JSON.parse(structuredPart[1]), description);

console.log(
  `MAP 0.1 valid: ${validMapFixtures.length} documents, 2 rejected fixtures and 1 complete email.`,
);
