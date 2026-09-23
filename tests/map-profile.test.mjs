import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ReferenceMapService, assertTrustedExecution } from '../src/map/reference.ts';

const fixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`../public/fixtures/map-0.1/${name}`, import.meta.url), 'utf8'),
  );
const clock = () => new Date('2026-09-23T01:06:01Z');

test('completes approval and accepts feedback against the described revision', async () => {
  const description = await fixture('content-review-description.json');
  const service = new ReferenceMapService(description, { now: clock });
  const approval = service.submit(await fixture('approve.json'));
  assert.equal(approval.status, 200);
  assert.equal(approval.body.state, 'completed');
  assert.equal(approval.body.output.decision, 'approved');
  const feedback = service.submit(await fixture('request-changes.json'));
  assert.equal(feedback.body.state, 'accepted');
});

test('returns the original result for an exact retry and supports lost-response recovery', async () => {
  const description = await fixture('content-review-description.json');
  const request = await fixture('approve.json');
  const service = new ReferenceMapService(description, { now: clock });
  const first = service.submit(request);
  assert.deepEqual(service.submit(structuredClone(request)), first);
  assert.deepEqual(service.recover(request.requestId), first);
});

test('rejects reuse of a request identifier with a changed payload', async () => {
  const description = await fixture('content-review-description.json');
  const request = await fixture('approve.json');
  const service = new ReferenceMapService(description, { now: clock });
  service.submit(request);
  request.input = { unexpected: true };
  const conflict = service.submit(request);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'idempotency-conflict');
});

test('reports refusal, stale revisions, expiry and unsupported contracts without applying an effect', async () => {
  const description = await fixture('content-review-description.json');
  const base = await fixture('approve.json');
  const denied = new ReferenceMapService(description, { now: clock, authorize: () => false });
  assert.equal(denied.submit(base).body.code, 'refused');

  const staleRequest = structuredClone(base);
  staleRequest.requestId = 'urn:uuid:018f47a2-ed4c-71b6-8437-43980a649aa4';
  staleRequest.target.revision = '3';
  assert.equal(
    new ReferenceMapService(description, { now: clock }).submit(staleRequest).body.code,
    'stale-target',
  );

  const expired = new ReferenceMapService(description, {
    now: () => new Date('2026-10-01T00:00:00Z'),
  });
  assert.equal(expired.submit(base).body.code, 'expired-interaction');

  const unsupported = structuredClone(base);
  unsupported.requestId = 'urn:uuid:018f47a3-0d05-7fe1-98e8-78b5ab65e193';
  unsupported.type.version = '9.0';
  assert.equal(
    new ReferenceMapService(description, { now: clock }).submit(unsupported).body.code,
    'unsupported-type',
  );
});

test('returns pending and approval-required as recoverable results', async () => {
  const description = await fixture('content-review-description.json');
  const approval = await fixture('approve.json');
  const gated = new ReferenceMapService(description, { now: clock, requireApproval: () => true });
  const approvalRequired = gated.submit(approval);
  assert.equal(approvalRequired.status, 202);
  assert.equal(approvalRequired.body.state, 'approval-required');

  const pendingRequest = await fixture('request-changes.json');
  const pending = new ReferenceMapService(description, { now: clock, leavePending: () => true });
  assert.equal(pending.submit(pendingRequest).body.state, 'pending');
});

test('requires an independently configured service identity and execution origin', async () => {
  const description = await fixture('content-review-description.json');
  assert.doesNotThrow(() =>
    assertTrustedExecution(description, {
      serviceId: 'https://reviews.example/service',
      executionOrigins: ['https://reviews.example'],
    }),
  );
  const malicious = structuredClone(description);
  malicious.service.execution.url = 'https://attacker.example/collect';
  assert.throws(
    () =>
      assertTrustedExecution(malicious, {
        serviceId: 'https://reviews.example/service',
        executionOrigins: ['https://reviews.example'],
      }),
    /outside the configured service origins/,
  );
});
