import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import jsonld from 'jsonld';
import { simpleParser } from 'mailparser';
import { ReferenceMapService, assertTrustedExecution } from '../../src/map/reference.ts';

const fixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`../../public/fixtures/map-0.1/${name}`, import.meta.url), 'utf8'),
  );
const clock = () => new Date('2026-09-23T01:06:01Z');
const context = { principal: 'reviewer-7', tenant: 'reviews-example' };
const allow = () => true;
const implementation = (description, options = {}) =>
  new ReferenceMapService(description, { now: clock, authorize: allow, ...options });
const caseOf = (id, title, expected, run) => ({ id, title, expected, run });

export const conformanceCases = [
  caseOf(
    'approve-completed',
    'approval records one completed effect',
    '200 completed',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description);
      const result = service.submit(await fixture('approve.json'), context);
      assert.equal(result.status, 200);
      assert.equal(result.body.state, 'completed');
      assert.equal(result.body.output.decision, 'approved');
      assert.deepEqual(result.body.type, description.type);
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'feedback-accepted',
    'feedback is recorded against the described revision',
    '200 accepted',
    async () => {
      const description = await fixture('content-review-description.json');
      const result = implementation(description).submit(
        await fixture('request-changes.json'),
        context,
      );
      assert.equal(result.status, 200);
      assert.equal(result.body.state, 'accepted');
      assert.equal(result.body.output.feedbackRecorded, true);
    },
  ),
  caseOf(
    'exact-retry',
    'an exact retry returns the saved result without another effect',
    'saved response and one effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      const service = implementation(description);
      const first = service.submit(request, context);
      assert.deepEqual(service.submit(structuredClone(request), context), first);
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'lost-response-recovery',
    'an authorized caller retrieves a saved result',
    'saved response from result resource',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      const service = implementation(description);
      const first = service.submit(request, context);
      assert.deepEqual(service.recover(request.requestId, context), first);
    },
  ),
  caseOf(
    'retry-current-authorization',
    'a retry rechecks current access',
    '403 after revocation and one effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      let permitted = true;
      const accesses = [];
      const service = implementation(description, {
        authorize: (_request, _context, access) => {
          accesses.push(access);
          return permitted;
        },
      });
      service.submit(request, context);
      permitted = false;
      assert.equal(service.submit(request, context).status, 403);
      assert.deepEqual(accesses, ['execute', 'execute']);
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'recovery-current-authorization',
    'result recovery rechecks current access',
    '403 after revocation',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      let permitted = true;
      const service = implementation(description, { authorize: () => permitted });
      service.submit(request, context);
      permitted = false;
      assert.equal(service.recover(request.requestId, context)?.status, 403);
    },
  ),
  caseOf(
    'principal-isolation',
    'request identifiers do not cross principals',
    '403 and no duplicate effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      const service = implementation(description);
      service.submit(request, context);
      const other = { principal: 'reviewer-8', tenant: context.tenant };
      assert.equal(service.submit(request, other).status, 403);
      assert.equal(service.recover(request.requestId, other)?.status, 403);
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'changed-request',
    'changed reuse of a request ID conflicts',
    '409 idempotency-conflict',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      const service = implementation(description);
      service.submit(request, context);
      request.input = { unexpected: true };
      assert.equal(service.submit(request, context).body.code, 'idempotency-conflict');
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'unknown-interaction',
    'a request cannot select another interaction',
    '400 invalid-request',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      request.interactionId = 'urn:uuid:018f47a2-5d7c-7b11-9a3d-4d2160b85b99';
      const service = implementation(description);
      assert.equal(service.submit(request, context).body.code, 'invalid-request');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'invalid-type-input',
    'a type-invalid operation input has no effect',
    '400 invalid-request',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      request.input = { unexpected: true };
      const service = implementation(description);
      assert.equal(service.submit(request, context).body.code, 'invalid-request');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf('permission-refusal', 'an unauthorized caller has no effect', '403 refused', async () => {
    const description = await fixture('content-review-description.json');
    const service = implementation(description, { authorize: () => false });
    assert.equal(service.submit(await fixture('approve.json'), context).body.code, 'refused');
    assert.equal(service.effectCount, 0);
  }),
  caseOf(
    'authentication-context',
    'execution requires server-established principal and tenant',
    'request rejected before processing',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description);
      const request = await fixture('approve.json');
      assert.throws(
        () => service.submit(request, { principal: '', tenant: context.tenant }),
        /Authenticated principal and tenant context are required/,
      );
    },
  ),
  caseOf(
    'stale-revision',
    'a request is compared with current service state',
    '409 stale-target',
    async () => {
      const description = await fixture('content-review-description.json');
      const current = { ...description.target, revision: '5' };
      const service = implementation(description, { currentTarget: () => current });
      assert.equal(
        service.submit(await fixture('approve.json'), context).body.code,
        'stale-target',
      );
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'expired-interaction',
    'expiry is exclusive at the stated instant',
    '410 expired-interaction',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = new ReferenceMapService(description, {
        now: () => new Date(description.expiresAt),
        authorize: allow,
      });
      assert.equal(
        service.submit(await fixture('approve.json'), context).body.code,
        'expired-interaction',
      );
    },
  ),
  caseOf(
    'unsupported-type',
    'the exact type reference is enforced',
    '422 unsupported-type',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      request.type.version = '9.0';
      assert.equal(
        implementation(description).submit(request, context).body.code,
        'unsupported-type',
      );
    },
  ),
  caseOf(
    'unsupported-operation',
    'only an operation offered by the interaction can run',
    '422 unsupported-operation',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      request.operation = 'publish';
      assert.equal(
        implementation(description).submit(request, context).body.code,
        'unsupported-operation',
      );
    },
  ),
  caseOf(
    'approval-gate',
    'additional service approval is a non-terminal result',
    '202 approval-required',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description, { requireApproval: () => true });
      const request = await fixture('approve.json');
      const result = service.submit(request, context);
      assert.equal(result.status, 202);
      assert.equal(result.body.state, 'approval-required');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'pending-work',
    'outstanding work is recoverable without a recorded effect',
    '202 pending',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description, { leavePending: () => true });
      const request = await fixture('request-changes.json');
      const result = service.submit(request, context);
      assert.equal(result.body.state, 'pending');
      assert.deepEqual(service.recover(request.requestId, context), result);
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'pending-completion',
    'a non-terminal result advances once',
    'latest completed result and one effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description, { leavePending: () => true });
      const request = await fixture('approve.json');
      service.submit(request, context);
      const completed = service.advance(request.requestId, context, 'completed', {
        decision: 'approved',
      });
      assert.equal(completed?.body.state, 'completed');
      assert.deepEqual(service.submit(request, context), completed);
      assert.equal(service.effectCount, 1);
      assert.throws(() => service.advance(request.requestId, context, 'completed', {}));
    },
  ),
  caseOf(
    'pending-failure',
    'accepted asynchronous work can terminate without an effect',
    'latest failed result and no effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description, { leavePending: () => true });
      const request = await fixture('approve.json');
      service.submit(request, context);
      const failed = service.advance(request.requestId, context, 'failed', {
        code: 'upstream-failure',
      });
      assert.equal(failed?.body.state, 'failed');
      assert.deepEqual(service.submit(request, context), failed);
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'retention-expiry',
    'expired retained results never cause another effect',
    '410 retry, missing recovery, one effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      let time = new Date('2026-09-23T01:06:01Z');
      const service = new ReferenceMapService(description, { now: () => time, authorize: allow });
      service.submit(request, context);
      time = new Date('2026-10-01T01:06:02Z');
      assert.equal(service.recover(request.requestId, context), undefined);
      assert.equal(service.submit(request, context).body.code, 'expired-interaction');
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'untrusted-endpoints',
    'all credential-bearing endpoints and audiences are configured',
    'client refusal before credential use',
    async () => {
      const description = await fixture('content-review-description.json');
      const trusted = {
        serviceId: description.service.id,
        executionUrls: [description.service.execution.url],
        resultUrlTemplates: [description.service.execution.resultUrlTemplate],
        audiences: [description.service.authorization.audience],
      };
      assert.doesNotThrow(() => assertTrustedExecution(description, trusted));
      for (const mutate of [
        (candidate) => (candidate.service.execution.url = 'https://attacker.example/collect'),
        (candidate) =>
          (candidate.service.execution.resultUrlTemplate = 'https://attacker.example/{requestId}'),
        (candidate) => (candidate.service.execution.url = 'http://reviews.example/map/actions'),
        (candidate) => (candidate.service.authorization.audience = 'https://attacker.example/'),
      ]) {
        const candidate = structuredClone(description);
        mutate(candidate);
        assert.throws(() => assertTrustedExecution(candidate, trusted));
      }
    },
  ),
  caseOf(
    'jsonld-identity',
    'JSON-LD identity is stable without remote resolution',
    'base-independent MAP IRIs',
    async () => {
      const description = await fixture('content-review-description.json');
      const contextDocument = await fixture('../../contexts/map-0.1.jsonld');
      const documentLoader = async (url) => {
        assert.equal(url, description['@context']);
        return { contextUrl: null, documentUrl: url, document: contextDocument };
      };
      const expanded = await Promise.all(
        ['https://one.example/email', 'https://two.example/email'].map((base) =>
          jsonld.expand(description, { base, documentLoader }),
        ),
      );
      assert.deepEqual(expanded[0], expanded[1]);
      assert.deepEqual(expanded[0][0]['@type'], ['https://mailschema.org/ns/map#MailAction']);
      await Promise.resolve(jsonld.toRDF(description, { documentLoader, safe: true }));
    },
  ),
  caseOf(
    'structured-email-designation',
    'a real MIME parser finds the designated structured part',
    'one designated JSON-LD part',
    async () => {
      const raw = await readFile(
        new URL('../../public/fixtures/map-0.1/content-review.eml', import.meta.url),
      );
      const email = await simpleParser(raw);
      const parts = email.attachments.filter((part) => part.contentType === 'application/ld+json');
      assert.equal(parts.length, 1);
      assert.equal(parts[0].headers.get('content-purpose'), 'Machine-readable');
      assert.deepEqual(
        JSON.parse(parts[0].content.toString('utf8')),
        await fixture('content-review-description.json'),
      );
    },
  ),
  caseOf(
    'problem-correlation',
    'problem type, status and code agree',
    'contradictory problem rejected',
    async () => {
      const ajv = new Ajv2020({ strict: true, strictRequired: false });
      addFormats(ajv);
      const schema = await fixture('../../schemas/map-0.1.schema.json');
      const validate = ajv.compile(schema);
      const problem = await fixture('problem-stale-target.json');
      problem.status = 500;
      problem.code = 'refused';
      assert.equal(validate(problem), false);
    },
  ),
];

const ids = conformanceCases.map((entry) => entry.id);
assert.equal(new Set(ids).size, ids.length, 'Conformance case IDs must be unique.');
