import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import jsonld from 'jsonld';
import { simpleParser } from 'mailparser';
import {
  ReferenceMapClient,
  ReferenceMapService,
  assertTrustedExecution,
} from '../../src/map/reference.ts';

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
    'stable-redelivery',
    'redelivery reuses the client request and applies one effect',
    'same requestId and one effect',
    async () => {
      const description = await fixture('content-review-description.json');
      let next = 10;
      const client = new ReferenceMapClient(
        () => `urn:uuid:018f47a2-5d7c-7b11-9a3d-4d2160b85b${next++}`,
      );
      const service = implementation(description);
      const first = client.prepare(description, 'approve', {});
      const redelivered = client.prepare(structuredClone(description), 'approve', {});
      assert.deepEqual(redelivered, first);
      assert.deepEqual(service.submit(redelivered, context), service.submit(first, context));
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
      const response = service.submit(request, context);
      assert.equal(response.status, 400);
      assert.equal(response.body.type, 'https://mailschema.org/problems/invalid-request');
      assert.equal(response.body.requestId, undefined);
      assert.equal(service.recover(request.requestId, context).body.code, 'result-not-found');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'malformed-unclaimed',
    'a malformed request does not claim its request identifier',
    '400 problem and later 404 result-not-found',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      request.kind = 'UnknownRequest';
      const service = implementation(description);
      const response = service.submit(request, context);
      assert.equal(response.status, 400);
      assert.equal(response.body.requestId, undefined);
      assert.equal(response.location, undefined);
      assert.equal(service.recover(request.requestId, context).body.code, 'result-not-found');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'invalid-type-input',
    'a type-invalid claimed request is recoverable and cannot be replaced',
    'saved 400 then 409 idempotency-conflict',
    async () => {
      const description = await fixture('content-review-description.json');
      const request = await fixture('approve.json');
      request.input = { unexpected: true };
      const service = implementation(description);
      const invalid = service.submit(request, context);
      assert.equal(invalid.body.code, 'invalid-request');
      assert.deepEqual(service.recover(request.requestId, context), invalid);
      request.input = {};
      assert.equal(service.submit(request, context).body.code, 'idempotency-conflict');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'permission-refusal',
    'a recognized unauthorized request records one terminal refusal',
    'stable 403 refused and no effect',
    async () => {
      const description = await fixture('content-review-description.json');
      let permitted = false;
      const service = implementation(description, { authorize: () => permitted });
      const request = await fixture('approve.json');
      const refused = service.submit(request, context);
      permitted = true;
      assert.equal(refused.body.code, 'refused');
      assert.deepEqual(service.submit(request, context), refused);
      assert.deepEqual(service.recover(request.requestId, context), refused);
      assert.equal(service.effectCount, 0);
    },
  ),
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
    'approval-team-decision',
    'an authorized teammate can decide a proposed approval',
    '200 completed and one effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const teammate = { principal: 'reviewer-8', tenant: context.tenant };
      const service = implementation(description, {
        requireApproval: () => true,
        authorizeDecision: (_request, proposer, decider) =>
          proposer.tenant === decider.tenant && decider.principal === teammate.principal,
      });
      const request = await fixture('approve.json');
      service.submit(request, context);
      const completed = service.decideApproval(request.requestId, teammate, 'approve');
      assert.equal(completed?.body.state, 'completed');
      assert.equal(completed?.body.output.decision, 'approved');
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'approval-unauthorized-decision',
    'an unauthorized human cannot decide or terminate a proposed approval',
    '403 and original approval-required result',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description, {
        requireApproval: () => true,
        authorizeDecision: () => false,
      });
      const request = await fixture('approve.json');
      const proposed = service.submit(request, context);
      const refused = service.decideApproval(
        request.requestId,
        { principal: 'reviewer-8', tenant: context.tenant },
        'approve',
      );
      assert.equal(refused?.status, 403);
      assert.equal(refused?.body.code, 'refused');
      assert.deepEqual(service.recover(request.requestId, context), proposed);
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'approval-declined',
    'an authorized human can decline a proposed approval',
    '200 failed declined and no effect',
    async () => {
      const description = await fixture('content-review-description.json');
      const service = implementation(description, { requireApproval: () => true });
      const request = await fixture('approve.json');
      service.submit(request, context);
      const failed = service.decideApproval(request.requestId, context, 'decline');
      assert.equal(failed?.body.state, 'failed');
      assert.equal(failed?.body.output.reason, 'declined');
      assert.deepEqual(service.submit(request, context), failed);
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'approval-stale-target',
    'approval fails terminally if the target changes before confirmation',
    '200 failed stale-target and no effect',
    async () => {
      const description = await fixture('content-review-description.json');
      let current = description.target;
      const service = implementation(description, {
        requireApproval: () => true,
        currentTarget: () => current,
      });
      const request = await fixture('approve.json');
      service.submit(request, context);
      current = { ...description.target, revision: '5' };
      const failed = service.decideApproval(request.requestId, context, 'approve');
      assert.equal(failed?.body.state, 'failed');
      assert.equal(failed?.body.output.reason, 'stale-target');
      assert.equal(service.effectCount, 0);
    },
  ),
  caseOf(
    'approval-expired',
    'approval fails terminally if the interaction expires before confirmation',
    '200 failed expired and no effect',
    async () => {
      const description = await fixture('content-review-description.json');
      let time = clock();
      const service = new ReferenceMapService(description, {
        now: () => time,
        authorize: allow,
        requireApproval: () => true,
      });
      const request = await fixture('approve.json');
      service.submit(request, context);
      time = new Date(description.expiresAt);
      const failed = service.decideApproval(request.requestId, context, 'approve');
      assert.equal(failed?.body.state, 'failed');
      assert.equal(failed?.body.output.reason, 'expired');
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
      assert.equal(service.recover(request.requestId, context).body.code, 'result-not-found');
      assert.equal(service.submit(request, context).body.code, 'expired-interaction');
      assert.equal(service.effectCount, 1);
    },
  ),
  caseOf(
    'unknown-result',
    'an unknown result does not invent an interaction identifier',
    '404 result-not-found correlated only to requestId',
    async () => {
      const description = await fixture('content-review-description.json');
      const response = implementation(description).recover(
        'urn:uuid:018f47a2-b4d3-7c02-b491-7bdf2eaac699',
        context,
      );
      assert.equal(response.status, 404);
      assert.equal(response.body.code, 'result-not-found');
      assert.equal(response.body.interactionId, undefined);
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
      const outerContentType = email.headers.get('content-type');
      const outerMediaType =
        typeof outerContentType === 'string'
          ? outerContentType.split(';', 1)[0]
          : outerContentType &&
              typeof outerContentType === 'object' &&
              'value' in outerContentType &&
              typeof outerContentType.value === 'string'
            ? outerContentType.value
            : undefined;
      assert.equal(outerMediaType, 'multipart/related');
      const parts = email.attachments.filter((part) => part.contentType === 'application/ld+json');
      assert.equal(parts.length, 1);
      assert.equal(parts[0].headers.get('content-purpose'), 'Machine-readable');
      assert.match(
        String(parts[0].headers.get('content-transfer-encoding')),
        /^(?:base64|quoted-printable)$/i,
      );
      assert.deepEqual(
        JSON.parse(parts[0].content.toString('utf8')),
        await fixture('content-review-description.json'),
      );
    },
  ),
  caseOf(
    'contract-identity',
    'wire compatibility is bound to the canonical type contract',
    'Registry editorial changes do not change contractDigest',
    async () => {
      const description = await fixture('content-review-description.json');
      const contract = await fixture('../../contracts/content-review-0.2.json');
      const registry = await fixture('../../../registry/types/content-review.json');
      const digest = (value) =>
        `sha-256:${createHash('sha256').update(canonicalize(value)).digest('hex')}`;
      const editedRecord = { ...registry, summary: `${registry.summary} Editorial clarification.` };
      assert.equal(description.type.contractDigest, digest(contract));
      assert.notEqual(digest(registry), digest(editedRecord));
      assert.equal(description.type.contractDigest, digest(contract));
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
