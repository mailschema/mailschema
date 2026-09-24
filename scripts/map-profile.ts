import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import jsonld from 'jsonld';
import type { Options as JsonLdOptions } from 'jsonld';
import { simpleParser } from 'mailparser';

const root = process.cwd();
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const mapSchema = readJson('public/schemas/map-0.1.schema.json');
const contentReviewSchema = readJson('public/schemas/content-review-0.1.schema.json');
const contentReviewContract = readJson('public/contracts/content-review-0.1.json');
const contentReviewRecord = readJson('registry/types/content-review.json');
const profile = readJson('public/profiles/map/0.1.json');
const sha256 = (path: string) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex');
const canonicalDigest = (value: unknown) => {
  const bytes = canonicalize(value);
  assert.notEqual(bytes, undefined, 'Canonical artifacts must contain JSON values.');
  return `sha-256:${createHash('sha256').update(bytes!).digest('hex')}`;
};
assert.equal(profile.artifacts.context.sha256, sha256('public/contexts/map-0.1.jsonld'));
assert.equal(profile.artifacts.schema.sha256, sha256('public/schemas/map-0.1.schema.json'));
assert.equal(contentReviewContract.id, `https://mailschema.org/types/${contentReviewRecord.slug}`);
assert.equal(contentReviewContract.version, contentReviewRecord.version);
assert.equal(contentReviewContract.profile, contentReviewRecord.profile);
assert.equal(
  contentReviewContract.requestSchema.canonicalDigest,
  canonicalDigest(contentReviewSchema),
  'The Content Review contract must bind its request schema by canonical digest.',
);
assert.deepEqual(
  contentReviewContract.operations.map((operation: { id: string }) => operation.id),
  contentReviewRecord.operations.map((operation: { id: string }) => operation.id),
  'The contract and Registry record must name the same operations in the same order.',
);
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
assert.equal(description.type.contractDigest, canonicalDigest(contentReviewContract));
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

const email = await simpleParser(
  readFileSync(resolve(root, 'public/fixtures/map-0.1/content-review.eml')),
);
assert(email.text?.includes('September product update'), 'The email needs a readable text route.');
assert(
  typeof email.html === 'string' && email.html.includes('September product update'),
  'The email needs a readable HTML route.',
);
const structuredParts = email.attachments.filter(
  (attachment) => attachment.contentType === 'application/ld+json',
);
assert.equal(
  structuredParts.length,
  1,
  'The email must contain one application/ld+json MIME part.',
);
const structuredPart = structuredParts[0];
const outerContentType = email.headers.get('content-type') as
  string | { value?: string } | undefined;
const outerMediaType =
  typeof outerContentType === 'string'
    ? outerContentType.split(';', 1)[0]
    : outerContentType?.value;
assert.equal(
  structuredPart.headers.get('content-purpose'),
  'Machine-readable',
  'The structured MIME part must carry Content-Purpose: Machine-readable.',
);
assert.equal(
  outerMediaType,
  'multipart/related',
  'A MAP action description is a partial representation and must use multipart/related.',
);
assert.match(
  String(structuredPart.headers.get('content-transfer-encoding')),
  /^(?:base64|quoted-printable)$/i,
  'The structured MIME part must use a transfer encoding safe for arbitrary JSON bytes.',
);
assert.deepEqual(JSON.parse(structuredPart.content.toString('utf8')), description);

for (const path of [
  'public/fixtures/map-0.1/result-completed.json',
  'public/fixtures/map-0.1/result-approval-required.json',
]) {
  const result = readJson(path);
  const operation = contentReviewContract.operations.find(
    (candidate: { id: string }) => candidate.id === result.operation,
  );
  const declared = operation?.results.find(
    (candidate: { state: string }) => candidate.state === result.state,
  );
  assert(declared, `${path}: the operation contract must declare this result state.`);
  const validateOutput = ajv.compile(declared.outputSchema);
  assert(validateOutput(result.output), `${path}: ${ajv.errorsText(validateOutput.errors)}`);
}

const contextUrl = description['@context'];
const context = readJson('public/contexts/map-0.1.jsonld');
const documentLoader = async (url: string, _callback: unknown) => {
  assert.equal(url, contextUrl, `Unexpected remote JSON-LD context: ${url}`);
  return { documentUrl: url, document: context };
};
const expanded = await Promise.all(
  ['https://one.example/email', 'https://two.example/email'].map(async (base) =>
    jsonld.expand(description, { base, documentLoader }),
  ),
);
assert.deepEqual(
  expanded[0],
  expanded[1],
  'JSON-LD expansion must not depend on a message base IRI.',
);
assert.deepEqual(expanded[0][0]['@type'], ['https://mailschema.org/ns/map#MailAction']);
const expandedOperations = expanded[0][0]['https://schema.org/potentialAction'] as Array<
  Record<string, { '@value': string }[]>
>;
assert.deepEqual(
  expandedOperations.map(
    (operation: Record<string, { '@value': string }[]>) =>
      operation['https://mailschema.org/ns/map#operationId'][0]['@value'],
  ),
  ['request-changes', 'approve'],
);
await jsonld.toRDF(description, {
  documentLoader,
  // Supported by jsonld 9; the DefinitelyTyped options currently omit it.
  safe: true,
} as JsonLdOptions.ToRdf);

console.log(
  `MAP 0.1 valid: one canonical type contract, ${validMapFixtures.length} documents, 2 rejected fixtures, 1 parsed email and base-independent JSON-LD.`,
);
