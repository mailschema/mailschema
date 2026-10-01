import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  Contract,
  InvalidContract,
  InvalidDocument,
  MAP_PROFILE,
  assertContribution,
  canonicalize,
  digest,
  getContractFormatSchema,
  getContributionSchema,
  getFormsSchema,
  getMapContext,
  getMapSchema,
  isJsonRequest,
  mapErrors,
  parse,
  problem,
  problemErrors,
  result,
  resultStatus,
  resultUrl,
  settle,
  transition,
} from '../dist/index.js';
// Internal: the core definitions the shared lexical vectors name.
import { definition } from '../dist/core/artifacts.js';

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

// The MAP core, against the vectors and fixtures every MailSchema implementation shares.
const fixture = (path) => load(`fixtures/${path}`);
const fixtureNames = async (directory) =>
  (await readdir(new URL(`fixtures/${directory}`, import.meta.url))).filter((name) =>
    name.endsWith('.json'),
  );

test('reproduces the shared RFC 8785, I-JSON, lexical and media type vectors', async () => {
  for (const vector of await fixture('map-0.2/jcs-vectors.json')) {
    assert.equal(canonicalize(JSON.parse(vector.json)), vector.canonical, vector.name);
    assert.equal(digest(JSON.parse(vector.json)), vector.digest, vector.name);
  }
  for (const vector of await fixture('map-0.2/ijson-vectors.json')) {
    const bytes = vector.base64
      ? Buffer.from(vector.base64, 'base64')
      : Buffer.from(vector.json, 'utf8');
    if (vector.valid) assert.equal(canonicalize(parse(bytes)), vector.canonical, vector.name);
    else assert.throws(() => parse(bytes), InvalidDocument, vector.name);
  }
  for (const vector of await fixture('map-0.2/lexical-vectors.json'))
    assert.equal(
      definition(vector.schema, vector.definition)(vector.value),
      vector.valid,
      `${vector.definition} ${JSON.stringify(vector.value)}`,
    );
  for (const vector of await fixture('map-0.2/media-type-vectors.json'))
    assert.equal(isJsonRequest(vector.contentType), vector.accepted, vector.contentType);
});

test('verifies every contract by its pinned digest and accepts its published documents', async () => {
  for (const file of await fixtureNames('contracts')) {
    const contract = await fixture(`contracts/${file}`);
    const slug = file.replace(/-[0-9.]+\.json$/, '');
    const description = await fixture(`map-0.2/${slug}/description.json`);
    const schema = await fixture(`schemas/${contract.requestSchema.url.split('/').at(-1)}`);
    const pinned = description.type.contractDigest;
    assert.throws(() => new Contract(contract, schema, { digest: `${pinned}0` }), InvalidContract);
    const loaded = new Contract(contract, schema, { digest: pinned });
    assert.deepEqual(loaded.descriptionErrors(description), [], slug);
    for (const name of await fixtureNames(`map-0.2/${slug}`)) {
      const document = await fixture(`map-0.2/${slug}/${name}`);
      assert.deepEqual(mapErrors(document), [], name);
      if (document.kind === 'MapRequest')
        assert.deepEqual(loaded.requestErrors(document), [], name);
      if (document.kind === 'MapResult') assert.deepEqual(loaded.resultErrors(document), [], name);
    }
  }
});

test('builds only results and problems the core accepts', async () => {
  const description = await fixture('map-0.2/content-review/description.json');
  const request = await fixture('map-0.2/content-review/approve.request.json');
  const at = new Date('2026-09-25T09:00:00Z');
  const members = {
    target: description.target,
    resultUrl: resultUrl(description, request.requestId),
    recordedAt: at,
  };
  const proposed = result(request, {
    ...members,
    state: 'approval-required',
    approvalUrl: 'https://reviews.example/approvals/1',
    actor: 'agent-1',
  });
  assert.equal(resultStatus(proposed), 202);
  assert.throws(() => result(request, { ...members, state: 'failed' }), TypeError);
  const superseded = transition(proposed, {
    state: 'failed',
    reason: 'superseded',
    recordedAt: at,
  });
  assert.deepEqual(
    [superseded.reason, superseded.actor, superseded.approvalUrl],
    ['superseded', 'agent-1', undefined],
  );
  const expired = settle(proposed, description, new Date(Date.parse(description.expiresAt) + 1));
  assert.deepEqual([expired.state, expired.reason], ['failed', 'expired']);
  const stale = problem('stale-target', {
    title: 'The target revision is stale',
    detail: 'No effect was applied.',
    requestId: request.requestId,
    interactionId: request.interactionId,
    resultUrl: members.resultUrl,
    target: description.target,
  });
  assert.deepEqual([stale.status, stale.code, problemErrors(stale)], [409, 'stale-target', []]);
  assert.throws(
    () =>
      problem('stale-target', {
        title: 'Stale',
        detail: 'Stale.',
        requestId: request.requestId,
        interactionId: request.interactionId,
        resultUrl: members.resultUrl,
      }),
    TypeError,
  );
});
