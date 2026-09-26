import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import canonicalize from 'canonicalize';
import jsonld from 'jsonld';
import { simpleParser } from 'mailparser';
import {
  CORE_SCHEMA,
  MAP_PROFILE,
  MapArtifacts,
  canonicalDigest,
  descriptionDigest,
  parseMapBytes,
  parseMapJson,
  reached,
} from '../../src/map/artifacts.ts';
import {
  ReferenceMapClient,
  ReferenceMapService,
  assertTrustedExecution,
  capabilityOf,
  describeProblems,
  isJsonRequest,
  mapArtifacts,
  serveHttp,
  trustedServicesFromMetadata,
} from '../../src/map/reference.ts';
import {
  mayAcceptPayment,
  mayApproveAutomatically,
  mayConfirmActivity,
  mayConfirmEmail,
  mayReportActivity,
  needsPrincipalDecision,
} from '../../src/map/behaviours.ts';
import {
  assertCalendarBinding,
  assertListIdentity,
  assertTrustedPossession,
  organizationalDomain,
  readDeliveredMessage,
} from '../../src/map/mail.ts';
import { clock, credentialContext as context, digestOf, uuid } from './examples.mjs';
import { contextOf, describe, example, examples, request, requestId } from './build.mjs';

const fixtureUrl = (path) => new URL(`../../public/fixtures/map-0.2/${path}`, import.meta.url);
const text = (path) => readFile(fixtureUrl(path), 'utf8');
const bytes = (path) => readFile(fixtureUrl(path));
const json = async (path) => JSON.parse(await text(path));
const artifacts = mapArtifacts();
const dns = JSON.parse(await text('dns.json'));
const resolveTxt = async (name) => {
  if (dns[name]) return dns[name];
  throw Object.assign(new Error(`ENOTFOUND ${name}`), { code: 'ENOTFOUND' });
};
const review = example('content-review');
const reviewDescription = () => describe(review);
const approve = (overrides = {}) => ({ ...request(review, 'approve'), ...overrides });
const service = (description = reviewDescription(), options = {}) =>
  new ReferenceMapService(description, { now: clock, ...options });
const caseOf = (id, title, expected, run) => ({ id, title, expected, run });
const orgDomainOf = (host) => host.split('.').slice(-2).join('.');

/** Load the published artifacts with some files replaced, from a copy removed afterwards. */
async function withArtifacts(files, use) {
  const root = await mkdtemp(join(tmpdir(), 'map-contract-'));
  try {
    await cp(new URL('../../public', import.meta.url), join(root, 'public'), { recursive: true });
    for (const [path, value] of Object.entries(files))
      await writeFile(join(root, 'public', path), JSON.stringify(value));
    return await use(() => new MapArtifacts(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const core = [
  caseOf('approve-completed', 'approval records one completed effect', '200 completed', () => {
    const reference = service();
    const result = reference.submit(approve(), context);
    assert.equal(result.status, 200);
    assert.equal(result.body.state, 'completed');
    assert.equal(result.body.output.decision, 'approved');
    assert.equal(result.body.descriptionDigest, descriptionDigest(reviewDescription()));
    assert.deepEqual(result.body.target, reviewDescription().target);
    assert.equal(reference.effectCount, 1);
  }),
  caseOf(
    'feedback-accepted',
    'feedback is recorded with a service-issued identifier',
    '200 accepted',
    () => {
      const result = service().submit(request(review, 'request-changes'), context);
      assert.equal(result.body.state, 'accepted');
      assert.equal(result.body.output.feedbackRecorded, true);
      assert.match(result.body.output.feedbackId, /^feedback-/);
    },
  ),
  caseOf(
    'exact-retry',
    'an exact retry returns the saved result without another effect',
    'saved response and one effect',
    () => {
      const reference = service();
      const first = reference.submit(approve(), context);
      assert.deepEqual(reference.submit(approve(), context), first);
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'stable-redelivery',
    'redelivery reuses the request for an instruction, and a new instruction is a new request',
    'same requestId and one effect on redelivery; accept, decline and accept again leave accepted',
    () => {
      let next = 1;
      const client = new ReferenceMapClient(() => uuid(9000 + next++));
      const reference = service();
      const first = client.prepare(reviewDescription(), 'approve', {}, { instruction: 'approve' });
      const redelivered = client.prepare(
        structuredClone(reviewDescription()),
        'approve',
        {},
        {
          instruction: 'approve',
        },
      );
      assert.deepEqual(redelivered, first);
      assert.deepEqual(reference.submit(redelivered, context), reference.submit(first, context));
      assert.equal(reference.effectCount, 1);
      assert.throws(
        () =>
          client.prepare(
            reviewDescription(),
            'request-changes',
            { feedback: 'x' },
            {
              instruction: 'approve',
            },
          ),
        /same request/,
      );
      // A repeatable reply changed twice: each instruction is its own request, and the
      // latest reply stands.
      const entry = example('event-response');
      const description = describe(entry);
      const replies = new ReferenceMapService(description, { now: clock });
      const results = ['accept', 'decline', 'accept'].map((operation, index) =>
        replies.submit(
          client.prepare(description, operation, entry.inputs[operation], {
            instruction: `reply-${index}`,
            now: clock(),
          }),
          contextOf(entry),
        ),
      );
      assert.equal(new Set(results.map((result) => result.body.requestId)).size, 3);
      assert.equal(results.at(-1).body.output.participationStatus, 'accepted');
    },
  ),
  caseOf(
    'lost-response-recovery',
    'an authorized caller retrieves a saved result',
    'saved response from result resource',
    () => {
      const reference = service();
      const first = reference.submit(approve(), context);
      assert.deepEqual(reference.recover(approve().requestId, context), first);
    },
  ),
  caseOf(
    'retry-current-authorization',
    'a retry rechecks current access',
    'an uncorrelated 403 while revoked, the recorded result once restored, and one effect',
    () => {
      let permitted = true;
      const accesses = [];
      const reference = service(reviewDescription(), {
        authorize: (_request, _context, access) => {
          accesses.push(access);
          return permitted;
        },
      });
      const first = reference.submit(approve(), context);
      permitted = false;
      const refused = reference.submit(approve(), context);
      assert.equal(refused.status, 403);
      // The refusal is about access, not the request, so it carries no correlation.
      assert.equal(refused.body.requestId, undefined);
      assert.equal(refused.location, undefined);
      permitted = true;
      assert.deepEqual(reference.submit(approve(), context), first);
      assert.deepEqual(accesses, ['execute', 'execute', 'execute']);
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'recovery-current-authorization',
    'result recovery rechecks current access',
    '403 after revocation',
    () => {
      let permitted = true;
      const reference = service(reviewDescription(), { authorize: () => permitted });
      reference.submit(approve(), context);
      permitted = false;
      assert.equal(reference.recover(approve().requestId, context).status, 403);
    },
  ),
  caseOf(
    'principal-isolation',
    'request identifiers do not cross principals, and each tenant has its own',
    '403 within the tenant, a separate request in another, and no duplicate effect',
    () => {
      const reference = service();
      reference.submit(approve(), context);
      const other = { principal: 'reviewer-8', tenant: context.tenant };
      assert.equal(reference.submit(approve(), other).status, 403);
      assert.equal(reference.recover(approve().requestId, other).status, 403);
      const elsewhere = { principal: 'reviewer-8', tenant: 'tenant-elsewhere' };
      assert.equal(reference.submit(approve(), elsewhere).body.code, 'already-decided');
      assert.equal(reference.recover(approve().requestId, elsewhere).body.code, 'already-decided');
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'actor-attribution',
    'the acting client is recorded apart from the principal and stays on every transition',
    'first actor on the proposal and the decision',
    () => {
      const teammate = { principal: 'reviewer-8', tenant: context.tenant, actor: 'session' };
      const reference = service(reviewDescription(), {
        requireApproval: () => true,
        authorizeDecision: (_request, proposer, decider) => proposer.tenant === decider.tenant,
      });
      const proposed = reference.submit(approve(), context);
      assert.equal(proposed.body.actor, context.actor);
      assert.deepEqual(
        reference.submit(approve(), { ...context, actor: 'agent-client-4' }),
        proposed,
      );
      const decided = reference.decideApproval(approve().requestId, teammate, 'approve');
      assert.equal(decided.body.actor, context.actor);
      assert.deepEqual(reference.attribution(approve().requestId, context), {
        principal: context.principal,
        actor: context.actor,
        decision: { principal: teammate.principal, actor: teammate.actor },
      });
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'changed-request',
    'changed reuse of a request ID conflicts',
    '409 idempotency-conflict',
    () => {
      const reference = service();
      reference.submit(approve(), context);
      assert.equal(
        reference.submit(approve({ input: { unexpected: true } }), context).body.code,
        'idempotency-conflict',
      );
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'unknown-interaction',
    'a request cannot select another interaction',
    '400 invalid-request, unclaimed',
    () => {
      const reference = service();
      const response = reference.submit(approve({ interactionId: uuid(999) }), context);
      assert.equal(response.status, 400);
      assert.equal(response.body.requestId, undefined);
      assert.equal(reference.recover(approve().requestId, context).body.code, 'result-not-found');
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'malformed-unclaimed',
    'a malformed request does not claim its request identifier',
    '400 problem and later 404 result-not-found',
    () => {
      const reference = service();
      const response = reference.submit(approve({ kind: 'UnknownRequest' }), context);
      assert.equal(response.status, 400);
      assert.equal(response.body.requestId, undefined);
      assert.equal(response.location, undefined);
      assert.equal(reference.recover(approve().requestId, context).body.code, 'result-not-found');
    },
  ),
  caseOf(
    'invalid-type-input',
    'a type-invalid claimed request is recoverable, points at its input and cannot be replaced',
    'saved 400 with escaped operation-specific pointers within the problem limits, then 409 idempotency-conflict',
    () => {
      const reference = service();
      const invalid = reference.submit(approve({ input: { unexpected: true } }), context);
      assert.equal(invalid.body.code, 'invalid-request');
      assert.deepEqual(
        invalid.body.errors.map((error) => error.pointer),
        ['/unexpected'],
      );
      assert.deepEqual(reference.recover(approve().requestId, context), invalid);
      assert.equal(reference.submit(approve(), context).body.code, 'idempotency-conflict');
      const missing = service().submit(request(review, 'request-changes', { input: {} }), context);
      assert.deepEqual(
        missing.body.errors.map((error) => error.pointer),
        ['/feedback'],
      );
      // Member names become JSON Pointer tokens, escaped as RFC 6901 requires.
      const escaped = service().submit(approve({ input: { 'a/b': 1, '~': 1 } }), context);
      assert.deepEqual(escaped.body.errors.map((error) => error.pointer).sort(), ['/a~1b', '/~0']);
      assert.deepEqual(artifacts.documentErrors(escaped.body), []);
      // A pointer too long for a problem names the nearest ancestor that fits.
      const long = service().submit(approve({ input: { ['x'.repeat(1500)]: 1 } }), context);
      assert.deepEqual(
        long.body.errors.map((error) => error.pointer),
        [''],
      );
      assert.deepEqual(artifacts.documentErrors(long.body), []);
      // However many and however long its errors, the problem stays within 64 KiB.
      const many = Object.fromEntries(
        Array.from({ length: 100 }, (_, index) => [`${'~'.repeat(490)}${index}`, 1]),
      );
      const crowded = service().submit(approve({ input: many }), context);
      assert.ok(Buffer.byteLength(JSON.stringify(crowded.body)) <= 64 * 1024);
      assert.ok(crowded.body.errors.length >= 1);
      assert.deepEqual(artifacts.documentErrors(crowded.body), []);
      // Lengths count code points, as JSON Schema does: 601 of them fit.
      const astral = '\u{1F600}'.repeat(600);
      const wide = service().submit(approve({ input: { [astral]: 1 } }), context);
      assert.deepEqual(
        wide.body.errors.map((error) => error.pointer),
        [`/${astral}`],
      );
      assert.deepEqual(artifacts.documentErrors(wide.body), []);
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'permission-refusal',
    'a recognized unauthorized request records one terminal refusal',
    'stable 403 refused and no effect',
    () => {
      let permitted = false;
      const reference = service(reviewDescription(), { authorize: () => permitted });
      const refused = reference.submit(approve(), context);
      permitted = true;
      assert.equal(refused.body.code, 'refused');
      assert.deepEqual(reference.submit(approve(), context), refused);
      assert.deepEqual(reference.recover(approve().requestId, context), refused);
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'authentication-context',
    'credential execution requires server-established principal and tenant',
    'rejected before processing',
    () => {
      assert.throws(
        () => service().submit(approve(), { principal: '', tenant: context.tenant }),
        /principal and tenant/,
      );
      assert.throws(
        () => service().submit(approve(), { capability: 'anything' }),
        /principal and tenant/,
      );
    },
  ),
  caseOf(
    'stale-revision',
    'staleness is reported from service state with the current target',
    '409 stale-target',
    () => {
      const current = {
        ...reviewDescription().target,
        revision: '5',
        digest: digestOf('campaign-42/revision-5'),
      };
      const reference = service(reviewDescription(), { currentTarget: () => current });
      const response = reference.submit(approve(), context);
      assert.equal(response.body.code, 'stale-target');
      assert.deepEqual(response.body.target, current);
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'expired-interaction',
    'expiry is exclusive at the stated instant',
    '410 expired-interaction',
    () => {
      const description = reviewDescription();
      const reference = new ReferenceMapService(description, {
        now: () => new Date(description.expiresAt),
      });
      assert.equal(reference.submit(approve(), context).body.code, 'expired-interaction');
    },
  ),
  caseOf(
    'unsupported-type',
    'the type URI, version and contract digest must each match exactly',
    '422 unsupported-type for any difference',
    () => {
      for (const change of [
        { version: '9.0' },
        { id: 'https://mailschema.org/types/other' },
        { contractDigest: `sha-256:${'0'.repeat(64)}` },
      ]) {
        const changed = approve();
        changed.type = { ...changed.type, ...change };
        assert.equal(service().submit(changed, context).body.code, 'unsupported-type');
      }
    },
  ),
  caseOf(
    'unsupported-operation',
    'only an operation offered by the interaction can run',
    '422 unsupported-operation',
    () => {
      assert.equal(
        service().submit(approve({ operation: 'publish' }), context).body.code,
        'unsupported-operation',
      );
    },
  ),
  caseOf(
    'approval-gate',
    'additional service approval is a non-terminal result with a core approval link',
    '202 approval-required',
    () => {
      const reference = service(reviewDescription(), { requireApproval: () => true });
      const result = reference.submit(approve(), context);
      assert.equal(result.status, 202);
      assert.equal(result.retryAfter, 60);
      assert.equal(result.body.state, 'approval-required');
      assert.match(result.body.approvalUrl, /^https:\/\/reviews\.example\/approvals\//);
      assert.deepEqual(result.body.output, {});
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'approval-team-decision',
    'an authorized teammate can decide a proposed approval',
    '200 completed and one effect',
    () => {
      const teammate = { principal: 'reviewer-8', tenant: context.tenant };
      const reference = service(reviewDescription(), {
        requireApproval: () => true,
        authorizeDecision: (_request, proposer, decider) =>
          proposer.tenant === decider.tenant && decider.principal === teammate.principal,
      });
      reference.submit(approve(), context);
      const completed = reference.decideApproval(approve().requestId, teammate, 'approve');
      assert.equal(completed.body.state, 'completed');
      assert.equal(completed.body.output.decision, 'approved');
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'approval-unauthorized-decision',
    'an unauthorized human cannot decide or end a proposed approval',
    '403 and original approval-required result',
    () => {
      const reference = service(reviewDescription(), {
        requireApproval: () => true,
        authorizeDecision: () => false,
      });
      const proposed = reference.submit(approve(), context);
      const refused = reference.decideApproval(
        approve().requestId,
        { principal: 'reviewer-8', tenant: context.tenant },
        'approve',
      );
      // A refused decision attempt says nothing about the request, so it is uncorrelated.
      assert.equal(refused.body.type, 'https://mailschema.org/problems/refused');
      assert.equal(refused.body.requestId, undefined);
      assert.deepEqual(reference.recover(approve().requestId, context), proposed);
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'approval-rule-refusal',
    'service rules can refuse an approval without ending the proposal',
    '403, unchanged proposal, then declined',
    () => {
      const reference = service(reviewDescription(), {
        requireApproval: () => true,
        permitsApproval: () => false,
      });
      const proposed = reference.submit(approve(), context);
      const refused = reference.decideApproval(approve().requestId, context, 'approve');
      assert.equal(refused.body.type, 'https://mailschema.org/problems/refused');
      assert.equal(refused.body.requestId, undefined);
      assert.deepEqual(reference.recover(approve().requestId, context), proposed);
      const declined = reference.decideApproval(approve().requestId, context, 'decline');
      assert.equal(declined.body.state, 'failed');
      assert.equal(declined.body.reason, 'declined');
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'approval-declined',
    'an authorized human can decline a proposed approval',
    '200 failed declined',
    () => {
      const reference = service(reviewDescription(), { requireApproval: () => true });
      reference.submit(approve(), context);
      const failed = reference.decideApproval(approve().requestId, context, 'decline');
      assert.equal(failed.body.reason, 'declined');
      assert.deepEqual(reference.submit(approve(), context), failed);
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'approval-stale-target',
    'an approval fails if the target changes before the decision',
    '200 failed stale-target',
    () => {
      const description = reviewDescription();
      let current = description.target;
      const reference = service(description, {
        requireApproval: () => true,
        currentTarget: () => current,
      });
      reference.submit(approve(), context);
      current = { ...description.target, revision: '5' };
      assert.equal(
        reference.decideApproval(approve().requestId, context, 'approve').body.reason,
        'stale-target',
      );
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'approval-expired',
    'an undecided approval ends as expired at the deadline without a decision attempt',
    'recovery shows failed expired',
    () => {
      const description = reviewDescription();
      let time = clock();
      const reference = new ReferenceMapService(description, {
        now: () => time,
        requireApproval: () => true,
      });
      reference.submit(approve(), context);
      time = new Date(description.expiresAt);
      const recovered = reference.recover(approve().requestId, context);
      assert.equal(recovered.body.state, 'failed');
      assert.equal(recovered.body.reason, 'expired');
      assert.equal(recovered.body.recordedAt, new Date(description.expiresAt).toISOString());
      assert.equal(reference.effectCount, 0);
    },
  ),
  caseOf(
    'approval-withdrawn',
    'a service ends a pending proposal only for a reason its type declares',
    '200 failed withdrawn; undeclared reasons refused',
    () => {
      const entry = example('action-approval');
      const reference = new ReferenceMapService(describe(entry), {
        now: clock,
        requireApproval: () => true,
      });
      const body = request(entry, 'approve');
      reference.submit(body, context);
      assert.equal(
        reference.endProposal(body.requestId, context, 'withdrawn').body.reason,
        'withdrawn',
      );
      const reviewing = service(reviewDescription(), { requireApproval: () => true });
      reviewing.submit(approve(), context);
      assert.throws(
        () => reviewing.endProposal(approve().requestId, context, 'withdrawn'),
        /does not declare/,
      );
      assert.throws(
        () => reviewing.endProposal(approve().requestId, context, 'declined'),
        /does not declare/,
      );
    },
  ),
  caseOf(
    'retention-expiry',
    'expired retained results never cause another effect',
    '410 retry, missing recovery, one effect',
    () => {
      const description = reviewDescription();
      let time = clock();
      const reference = new ReferenceMapService(description, { now: () => time });
      reference.submit(approve(), context);
      const retainedUntil = Math.max(
        Date.parse(description.expiresAt),
        clock().getTime() + description.service.execution.resultRetentionSeconds * 1000,
      );
      time = new Date(retainedUntil);
      assert.equal(reference.recover(approve().requestId, context).body.code, 'result-not-found');
      assert.equal(reference.submit(approve(), context).body.code, 'expired-interaction');
      assert.equal(reference.effectCount, 1);
    },
  ),
  caseOf(
    'unknown-result',
    'an unknown result does not invent an interaction identifier',
    '404 result-not-found',
    () => {
      const response = service().recover(uuid(4242), context);
      assert.equal(response.status, 404);
      assert.equal(response.body.interactionId, undefined);
    },
  ),
];

const binding = [
  caseOf(
    'forged-description',
    'a request built from a changed copy of a genuine description is refused, for every type',
    'unclaimed 400 and no effect for each change',
    () => {
      for (const entry of examples)
        for (const mutate of [
          (d) => (d.target.title = 'Harmless typo fix'),
          (d) => (d.operations[0].description = 'Something else entirely.'),
          (d) => (d.service.humanUrl = `${d.service.humanUrl}.phish`),
          (d) => (d.expiresAt = '2027-01-01T00:00:00Z'),
        ]) {
          const forged = describe(entry);
          mutate(forged);
          const reference = new ReferenceMapService(describe(entry), { now: clock });
          const operation = entry.operations[0].id;
          const response = reference.submit(
            request(entry, operation, { description: forged }),
            contextOf(entry),
          );
          assert.equal(response.status, 400, entry.slug);
          assert.equal(response.body.requestId, undefined, entry.slug);
          assert.equal(reference.effectCount, 0, entry.slug);
        }
    },
  ),
  caseOf(
    'decisions-once',
    'the first decision decides the interaction',
    '409 already-decided for later decisions',
    () => {
      const entry = example('meeting-scheduling');
      const reference = new ReferenceMapService(describe(entry), { now: clock });
      assert.equal(
        reference.submit(request(entry, 'book'), contextOf(entry)).body.state,
        'completed',
      );
      const later = reference.submit(request(entry, 'decline', { n: 2 }), contextOf(entry));
      assert.equal(later.status, 409);
      assert.equal(later.body.code, 'already-decided');
      assert.deepEqual(
        reference.recover(request(entry, 'decline', { n: 2 }).requestId, contextOf(entry)),
        later,
      );
    },
  ),
  caseOf(
    'superseded-proposal',
    'a decision ends other pending proposals as superseded',
    '200 failed superseded',
    () => {
      const entry = example('action-approval');
      let proposals = true;
      const reference = new ReferenceMapService(describe(entry), {
        now: clock,
        requireApproval: () => proposals,
      });
      const proposal = request(entry, 'approve');
      reference.submit(proposal, context);
      proposals = false;
      const direct = reference.submit(request(entry, 'approve', { n: 2 }), {
        ...context,
        principal: 'budget-holder',
      });
      assert.equal(direct.body.state, 'completed');
      const superseded = reference.recover(proposal.requestId, context);
      assert.equal(superseded.body.state, 'failed');
      assert.equal(superseded.body.reason, 'superseded');
    },
  ),
  caseOf(
    'decision-states',
    'a decision decides in either success state, and never ends repeatable work',
    '409 already-decided after an accepted decision; an approval of repeatable work outlives it',
    async () => {
      const entry = example('information-request');
      const reference = new ReferenceMapService(describe(entry), { now: clock });
      assert.equal(
        reference.submit(request(entry, 'submit-response'), contextOf(entry)).body.state,
        'accepted',
      );
      const later = reference.submit(request(entry, 'decline'), contextOf(entry));
      assert.equal(later.status, 409);
      assert.equal(later.body.code, 'already-decided');

      // Content Review with its repeatable feedback behind an approval.
      const contract = JSON.parse(
        await readFile(new URL('../../public/contracts/content-review-0.3.json', import.meta.url)),
      );
      const feedback = contract.operations.find(({ id }) => id === 'request-changes');
      const proposal = contract.operations
        .find(({ id }) => id === 'approve')
        .results.find(({ state }) => state === 'approval-required');
      feedback.results.push(proposal, {
        state: 'failed',
        reasons: ['declined', 'stale-target', 'expired'],
        outputSchema: proposal.outputSchema,
      });
      await withArtifacts({ 'contracts/content-review-0.3.json': contract }, (load) => {
        const loaded = load();
        const description = reviewDescription();
        description.type.contractDigest = loaded.contractFor(
          'content-review',
          '0.3',
        ).contractDigest;
        const gated = new ReferenceMapService(
          description,
          { now: clock, requireApproval: (sent) => sent.operation === 'request-changes' },
          loaded,
        );
        const changes = request(review, 'request-changes', { description });
        assert.equal(gated.submit(changes, context).body.state, 'approval-required');
        assert.equal(
          gated.submit(request(review, 'approve', { description }), context).body.state,
          'completed',
        );
        assert.equal(gated.recover(changes.requestId, context).body.state, 'approval-required');
        assert.equal(
          gated.decideApproval(changes.requestId, context, 'approve').body.state,
          'accepted',
        );
      });
    },
  ),
  caseOf(
    'repeatable-operations',
    'repeatable operations stay available and the latest calendar reply stands',
    'each reply completes',
    () => {
      const entry = example('event-response');
      const reference = new ReferenceMapService(describe(entry), { now: clock });
      assert.equal(
        reference.submit(request(entry, 'accept'), contextOf(entry)).body.output
          .participationStatus,
        'accepted',
      );
      assert.equal(
        reference.submit(request(entry, 'decline', { n: 2 }), contextOf(entry)).body.output
          .participationStatus,
        'declined',
      );
      assert.equal(reference.effectCount, 2);
    },
  ),
];

const perType = examples.flatMap((entry) => [
  caseOf(
    `${entry.slug}-description`,
    `${entry.slug}: the description satisfies the core and its contract`,
    'valid, verified and reproducible',
    async () => {
      const description = describe(entry);
      assert.deepEqual(await json(`${entry.slug}/description.json`), description);
      assert.deepEqual(artifacts.documentErrors(description), []);
      const contract = new ReferenceMapClient(() => uuid(1)).verify(description, clock());
      assert.equal(contract.slug, entry.slug);
      assert.deepEqual(parseMapJson(JSON.stringify(description)), description);
    },
  ),
  caseOf(
    `${entry.slug}-operations`,
    `${entry.slug}: every operation reaches its declared state`,
    'fixture results reproduced',
    async () => {
      for (const { id } of entry.operations) {
        const reference = new ReferenceMapService(describe(entry), { now: clock });
        const response = reference.submit(request(entry, id), contextOf(entry));
        assert.deepEqual(response.body, await json(`${entry.slug}/${id}.result.json`));
        const declared = artifacts
          .contractFor(entry.slug, entry.version)
          .operation(id)
          .results.map((result) => result.state);
        assert.ok(declared.includes(response.body.state));
        assert.deepEqual(reference.submit(request(entry, id), contextOf(entry)), response);
        assert.equal(reference.effectCount, 1);
      }
    },
  ),
  caseOf(
    `${entry.slug}-authority`,
    `${entry.slug}: an interaction offers only operations its authority permits`,
    'refused where the contract forbids the mode, accepted where it permits it',
    () => {
      const contract = artifacts.contractFor(entry.slug, entry.version).contract;
      const other = entry.authority === 'credential' ? 'possession' : 'credential';
      const description = describe(entry);
      description.service.authority = other;
      if (other === 'possession') {
        delete description.service.resource;
        delete description.service.onBehalfOf;
        description.recipient = 'alex@example.org';
        const capability = 'Qm4vT8xL2nK7wR1pB5hZ9sD3fJ6yG0aC';
        description.service.execution.url = `https://${entry.host}/map/c/${capability}`;
        description.service.execution.resultUrlTemplate = `https://${entry.host}/map/c/${capability}/results/{requestId}`;
      } else {
        description.service.resource = `https://${entry.host}/`;
        delete description.recipient;
      }
      const permitted = contract.operations.every((operation) =>
        operation.authority.includes(other),
      );
      if (permitted) {
        assert.doesNotThrow(() => new ReferenceMapService(description, { now: clock }));
        assert.doesNotThrow(() =>
          new ReferenceMapClient(() => uuid(1)).verify(description, clock()),
        );
      } else {
        assert.throws(
          () => new ReferenceMapService(description, { now: clock }),
          /operation of this type/,
        );
        assert.throws(
          () => new ReferenceMapClient(() => uuid(1)).verify(description, clock()),
          /operation of this type/,
        );
      }
    },
  ),
]);

const types = [
  caseOf(
    'field-bindings',
    'form values must match the fields the interaction defined, and are absent where it defines none',
    '400 invalid-request with pointers; values without fields refused',
    async () => {
      assert.deepEqual(
        (await json('information-request/invalid-request.problem.json')).errors.map(
          (error) => error.pointer,
        ),
        ['/values/supportEmail'],
      );
      const entry = example('information-request');
      const extra = new ReferenceMapService(describe(entry), { now: clock }).submit(
        request(entry, 'submit-response', {
          input: {
            values: {
              supportEmail: 'a@acme.example',
              website: 'https://acme.example',
              ceoHomeAddress: 'x',
            },
          },
        }),
        contextOf(entry),
      );
      assert.equal(extra.body.code, 'invalid-request');
      const missing = new ReferenceMapService(describe(entry), { now: clock }).submit(
        request(entry, 'submit-response', {
          input: { values: { website: 'https://acme.example' } },
        }),
        contextOf(entry),
      );
      assert.equal(missing.body.code, 'invalid-request');
      // Where the details define no fields block, the bound input is absent.
      const meeting = example('meeting-scheduling');
      const offer = describe(meeting);
      delete offer.details.attendeeFields;
      const { slot } = meeting.inputs.book;
      const book = (input) =>
        new ReferenceMapService(offer, { now: clock }).submit(
          request(meeting, 'book', { description: offer, input }),
          contextOf(meeting),
        );
      assert.deepEqual(
        book({ slot, values: {} }).body.errors.map((error) => error.pointer),
        ['/values'],
      );
      assert.equal(book({ slot }).body.state, 'completed');
    },
  ),
  caseOf(
    'secret-fields-refused',
    'forms never label a field as a password, code or card detail, and their fields are consistent',
    'details rejected',
    () => {
      const entry = example('information-request');
      for (const label of [
        'current-password',
        'one-time-code',
        'cc-number',
        'billing cc-csc',
        'cc-name',
        'cc-type',
      ]) {
        const description = describe(entry);
        description.details.fields.properties.secret = {
          type: 'string',
          title: 'Secret',
          autocomplete: label,
        };
        assert.throws(() => new ReferenceMapService(description, { now: clock }), undefined, label);
      }
      const undefinedRequired = describe(entry);
      undefinedRequired.details.fields.required.push('ghost');
      assert.throws(() => new ReferenceMapService(undefinedRequired, { now: clock }), /ghost/);
      const settings = example('subscription-preferences');
      const repeated = describe(settings);
      repeated.details.fields.properties.frequency.oneOf.push({
        const: 'weekly',
        title: 'Weekly again',
      });
      assert.throws(() => new ReferenceMapService(repeated, { now: clock }), /repeats a choice/);
      const unoffered = describe(settings);
      unoffered.details.fields.properties.frequency.default = 'hourly';
      assert.throws(() => new ReferenceMapService(unoffered, { now: clock }), /does not offer/);
    },
  ),
  caseOf(
    'slot-rules',
    'offered slots are distinct and in order, a booking names one, and a taken time books nothing',
    'repeated or reversed slots refused by service and client; invalid-request, then failed unavailable',
    async () => {
      const entry = example('meeting-scheduling');
      for (const [mutate, refusal] of [
        [(slots) => slots.push({ ...slots[1], id: slots[0].id }), /slot identifier repeats/],
        [(slots) => (slots[0].end = slots[0].start), /does not end after it starts/],
      ]) {
        const weak = describe(entry);
        mutate(weak.details.slots);
        assert.match(describeProblems(weak).errors.join(' '), refusal);
        assert.throws(() => new ReferenceMapService(weak, { now: clock }), refusal);
        assert.throws(() => new ReferenceMapClient(() => uuid(1)).verify(weak, clock()), refusal);
      }
      const unknown = new ReferenceMapService(describe(entry), { now: clock }).submit(
        request(entry, 'book', { input: { slot: 'fri-0900', values: { name: 'Alex Doe' } } }),
        contextOf(entry),
      );
      assert.deepEqual(
        unknown.body.errors.map((error) => error.pointer),
        ['/slot'],
      );
      const taken = await json('meeting-scheduling/book.unavailable.json');
      assert.equal(taken.state, 'failed');
      assert.equal(taken.reason, 'unavailable');
    },
  ),
  caseOf(
    'payment-date',
    'a payment date after the due date is refused',
    'invalid-request /paymentDate',
    () => {
      const entry = example('payment-request');
      const late = new ReferenceMapService(describe(entry), { now: clock }).submit(
        request(entry, 'accept', { input: { paymentDate: '2026-11-30' } }),
        contextOf(entry),
      );
      assert.deepEqual(
        late.body.errors.map((error) => error.pointer),
        ['/paymentDate'],
      );
    },
  ),
  caseOf(
    'calendar-sequence',
    'calendar types use the iCalendar SEQUENCE as the revision',
    'service refuses another revision form',
    () => {
      for (const slug of ['event-response', 'task-assignment']) {
        const description = describe(example(slug));
        description.target.revision = 'draft-2';
        assert.throws(() => new ReferenceMapService(description, { now: clock }), /SEQUENCE/);
      }
    },
  ),
  caseOf(
    'calendar-binding',
    'the target digest binds one iCalendar REQUEST naming the component, SEQUENCE and attendee',
    'an event and a to-do bound; changed, cancelled, ranged, misaddressed or other-component parts refused',
    async () => {
      const read = async () => readDeliveredMessage(await bytes('emails/event-response.eml'));
      const message = await read();
      const binding = {
        component: 'VEVENT',
        uid: message.description.details.event.uid,
        attendee: message.description.details.attendee,
      };
      assert.doesNotThrow(() => assertCalendarBinding(message, binding));
      const original = message.calendarParts[0].toString('utf8');
      const rebound = (changed) => {
        const part = Buffer.from(changed);
        return {
          ...message,
          calendarParts: [part],
          description: {
            ...message.description,
            target: { ...message.description.target, digest: digestOf(part) },
          },
        };
      };
      assert.throws(
        () =>
          assertCalendarBinding(
            { ...message, calendarParts: [Buffer.from(original.replace('T090000Z', 'T150000Z'))] },
            binding,
          ),
        /target digest/,
      );
      assert.throws(
        () =>
          assertCalendarBinding(
            rebound(original.replace('METHOD:REQUEST', 'METHOD:CANCEL')),
            binding,
          ),
        /REQUEST/,
      );
      assert.throws(
        () => assertCalendarBinding(rebound(original.replace('SEQUENCE:2\r\n', '')), binding),
        /SEQUENCE/,
      );
      assert.throws(
        () =>
          assertCalendarBinding(
            rebound(
              original.replace(
                'RSVP=TRUE:mailto:alex@example.org',
                'RSVP=TRUE:mailto:sam@example.org',
              ),
            ),
            binding,
          ),
        /attendee/,
      );
      assert.throws(
        () =>
          assertCalendarBinding(
            rebound(
              original.replace(
                'SEQUENCE:2',
                'RECURRENCE-ID;RANGE=THISANDFUTURE:20261014T090000Z\r\nSEQUENCE:2',
              ),
            ),
            { ...binding, recurrenceId: '20261014T090000Z' },
          ),
        /range/,
      );
      assert.throws(
        () =>
          assertCalendarBinding(
            { ...message, calendarParts: [...message.calendarParts, ...message.calendarParts] },
            binding,
          ),
        /exactly one iCalendar part/,
      );
      // The part may sit inside multipart/alternative, as iMIP places it, but a message
      // carrying a second calendar part anywhere binds neither.
      const raw = (await bytes('emails/event-response.eml')).toString('latin1');
      const start = raw.indexOf('--map-related\r\nContent-Type: text/calendar');
      const end = raw.indexOf('--map-related', start + 1);
      const calendarPart = raw.slice(start + '--map-related\r\n'.length, end);
      const into = (text) =>
        text.replace('--map-readable--', `--map-readable\r\n${calendarPart}--map-readable--`);
      const nested = await readDeliveredMessage(
        Buffer.from(into(raw.slice(0, start) + raw.slice(end)), 'latin1'),
      );
      assert.equal(nested.calendarParts.length, 1);
      assert.doesNotThrow(() => assertCalendarBinding(nested, binding));
      const twice = await readDeliveredMessage(Buffer.from(into(raw), 'latin1'));
      assert.throws(() => assertCalendarBinding(twice, binding), /exactly one iCalendar part/);
      // Task Assignment binds a to-do the same way.
      const todo = rebound(original.replaceAll('VEVENT', 'VTODO').replace('DTEND:', 'DUE:'));
      assert.doesNotThrow(() => assertCalendarBinding(todo, { ...binding, component: 'VTODO' }));
      assert.throws(() => assertCalendarBinding(todo, binding), /exactly the described component/);
    },
  ),
  caseOf(
    'email-confirmation-rule',
    'confirmation needs exactly one prior matching request and no code in the message',
    'confirm only on an unambiguous recorded match',
    async () => {
      const description = describe(example('email-confirmation'));
      const base = {
        origin: 'https://devtools.example.com',
        address: 'alex+devtools-7f3a@example.org',
        purpose: 'account-creation',
        recordedAt: '2026-09-25T07:58:00Z',
        uniqueAddress: true,
      };
      const options = {
        messageDate: new Date('2026-09-25T08:00:00Z'),
        fromOrganizationalDomain: 'example.com',
        now: clock(),
      };
      assert.equal(mayConfirmEmail(description, [base], options), true);
      assert.equal(mayConfirmEmail(description, [], options), false);
      assert.equal(
        mayConfirmEmail(
          description,
          [base, { ...base, recordedAt: '2026-09-25T07:59:00Z' }],
          options,
        ),
        false,
      );
      assert.equal(
        mayConfirmEmail(description, [{ ...base, recordedAt: '2026-09-25T08:01:00Z' }], options),
        false,
      );
      assert.equal(
        mayConfirmEmail(description, [base], {
          ...options,
          fromOrganizationalDomain: 'examp1e.com',
        }),
        false,
      );
      const signIn = structuredClone(description);
      signIn.details.purpose = 'sign-in';
      assert.equal(
        mayConfirmEmail(signIn, [{ ...base, purpose: 'sign-in', uniqueAddress: false }], options),
        false,
      );
      assert.equal(mayConfirmEmail(signIn, [{ ...base, purpose: 'sign-in' }], options), true);
      const raw = await bytes('emails/negative/otp-and-confirm.eml');
      const coded = await readDeliveredMessage(raw);
      const trust = await assertTrustedPossession(raw, coded, {
        resolveTxt,
        principalAddresses: [base.address],
        now: clock(),
      });
      assert.equal(
        mayConfirmEmail(coded.description, [base], {
          ...options,
          fromOrganizationalDomain: trust.organizationalDomain,
          otpToken: coded.headers.has('otp-token'),
        }),
        false,
      );
    },
  ),
  caseOf(
    'account-activity-rule',
    'confirming needs one recorded match with an event type; reports come only from the principal',
    'confirm a recorded sign-in; never report alone',
    () => {
      const description = describe(example('account-activity'));
      const signIn = {
        eventType: description.details.eventType,
        at: '2026-09-25T07:41:30Z',
        ip: '203.0.113.24',
      };
      assert.equal(mayConfirmActivity(description, [signIn]), true);
      assert.equal(mayConfirmActivity(description, [{ ...signIn, ip: '198.51.100.7' }]), false);
      assert.equal(
        mayConfirmActivity(description, [signIn, { ...signIn, at: '2026-09-25T07:42:00Z' }]),
        false,
      );
      const untyped = structuredClone(description);
      delete untyped.details.eventType;
      assert.equal(mayConfirmActivity(untyped, [signIn]), false);
      assert.equal(mayReportActivity(), false);
    },
  ),
  caseOf(
    'action-approval-rule',
    'an agent never approves terms of a kind it does not understand',
    'unknown terms go to the principal',
    () => {
      const description = describe(example('action-approval'));
      assert.equal(
        mayApproveAutomatically(description, ['https://buy.example/terms/purchase']),
        true,
      );
      assert.equal(mayApproveAutomatically(description, ['payment_initiation']), false);
    },
  ),
  caseOf(
    'payment-account-rule',
    'an agent accepts a payment request only for a payee account already on record',
    'changed accounts go to a person',
    () => {
      const description = describe(example('payment-request'));
      const onRecord = {
        creditorName: 'Northwind Supplies Ltd',
        creditorAccount: { iban: 'GB33BUKB20201555555555' },
      };
      assert.equal(mayAcceptPayment(description, [onRecord]), true);
      assert.equal(
        mayAcceptPayment(description, [
          { ...onRecord, creditorAccount: { iban: 'GB94BARC10201530093459' } },
        ]),
        false,
      );
      assert.equal(mayAcceptPayment(description, []), false);
    },
  ),
  caseOf(
    'description-rules',
    'service and client refuse descriptions that repeat an operation, expire before they begin, or name a party under possession',
    'each refused',
    () => {
      const repeated = reviewDescription();
      repeated.operations.push(repeated.operations[0]);
      const backwards = reviewDescription();
      backwards.expiresAt = backwards.describedAt;
      // Under possession authority the From organizational domain is the party asking.
      const party = describe(example('email-confirmation'));
      party.service.onBehalfOf = { id: 'https://example.com/customers/1', name: 'Example' };
      for (const description of [repeated, backwards, party]) {
        assert.throws(() => new ReferenceMapService(description, { now: clock }));
        assert.throws(() => new ReferenceMapClient(() => uuid(1)).verify(description, clock()));
      }
    },
  ),
  caseOf(
    'client-prepare',
    'a client prepares only offered operations with input its contract accepts',
    'invalid input and unoffered operations refused before sending',
    () => {
      const entry = example('information-request');
      const client = new ReferenceMapClient(() => uuid(7001));
      const description = describe(entry);
      assert.doesNotThrow(() =>
        client.prepare(description, 'submit-response', entry.inputs['submit-response'], {
          instruction: 'respond',
          now: clock(),
        }),
      );
      assert.throws(
        () =>
          client.prepare(
            description,
            'submit-response',
            { values: { ...entry.inputs['submit-response'].values, ceoHomeAddress: 'x' } },
            { instruction: 'respond-with-extra', now: clock() },
          ),
        /ceoHomeAddress/,
      );
      assert.throws(
        () =>
          client.prepare(
            description,
            'decline',
            { extra: true },
            { instruction: 'decline', now: clock() },
          ),
        /extra/,
      );
      assert.throws(
        () =>
          client.prepare(
            reviewDescription(),
            'publish',
            {},
            { instruction: 'publish', now: clock() },
          ),
        /not offered/,
      );
      // The prepared request itself must satisfy the core and the contract's request schema.
      assert.throws(
        () =>
          new ReferenceMapClient(() => 'URN:UUID:NOT-A-REQUEST-ID').prepare(
            description,
            'submit-response',
            entry.inputs['submit-response'],
            { instruction: 'respond', now: clock() },
          ),
        /request schema/,
      );
    },
  ),
  caseOf(
    'http-binding',
    'the HTTP binding fixes methods, media type and where credentials travel',
    '405 with Allow, 415 for every refused shared media type vector, a MAP 401 and the expanded result URL in Location; possession requests carry no credentials and refuse redirects',
    async () => {
      const description = reviewDescription();
      const reference = service(description);
      const execution = description.service.execution.url;
      const authenticate = (value) => (value === 'Bearer agent-token' ? context : undefined);
      const body = JSON.stringify(approve());
      const post = (headers) =>
        serveHttp(reference, { method: 'POST', url: execution, headers, body }, authenticate);
      const refused = serveHttp(reference, { method: 'GET', url: execution, headers: {} });
      assert.equal(refused.status, 405);
      assert.equal(refused.allow, 'POST');
      for (const { contentType, accepted } of await json('media-type-vectors.json')) {
        assert.equal(isJsonRequest(contentType), accepted, JSON.stringify(contentType));
        if (!accepted) assert.equal(post({ 'content-type': contentType }).status, 415, contentType);
      }
      const unauthenticated = post({ 'content-type': 'application/json', cookie: 'session=1' });
      assert.equal(unauthenticated.status, 401);
      assert.equal(
        unauthenticated.body.type,
        'https://mailschema.org/problems/authentication-required',
      );
      assert.deepEqual(artifacts.definitionErrors('problem', unauthenticated.body), []);
      const done = post({
        'content-type': 'application/json',
        authorization: 'Bearer agent-token',
      });
      assert.equal(done.body.state, 'completed');
      // The result URL is the template with each colon of the request identifier as %3A.
      assert.equal(
        done.location,
        description.service.execution.resultUrlTemplate.replace(
          '{requestId}',
          done.body.requestId.replaceAll(':', '%3A'),
        ),
      );
      // The media type is case-insensitive, and a UTF-8 charset parameter is allowed.
      for (const type of [
        'Application/JSON',
        'application/json; charset=utf-8',
        'application/json;charset="UTF-8"',
      ])
        assert.deepEqual(
          post({ 'content-type': type, authorization: 'Bearer agent-token' }).body,
          done.body,
          type,
        );
      assert.deepEqual(
        serveHttp(
          reference,
          { method: 'GET', url: done.location, headers: { authorization: 'Bearer agent-token' } },
          authenticate,
        ).body,
        done.body,
      );
      // A template may continue after the identifier; its own Location is served, and
      // anything that is not a request identifier is a plain 404.
      const suffixed = reviewDescription();
      suffixed.service.execution.resultUrlTemplate =
        suffixed.service.execution.resultUrlTemplate.replace('{requestId}', '{requestId}/status');
      const suffixedService = service(suffixed);
      const posted = serveHttp(
        suffixedService,
        {
          method: 'POST',
          url: execution,
          headers: { 'content-type': 'application/json', authorization: 'Bearer agent-token' },
          body: JSON.stringify(request(review, 'approve', { description: suffixed })),
        },
        authenticate,
      );
      assert.ok(posted.location.endsWith('/status'));
      const read = (url) =>
        serveHttp(
          suffixedService,
          { method: 'GET', url, headers: { authorization: 'Bearer agent-token' } },
          authenticate,
        );
      assert.deepEqual(read(posted.location).body, posted.body);
      for (const other of ['garbage', posted.body.requestId.toUpperCase(), ''])
        assert.deepEqual(
          read(posted.location.replace(/urn%3A[^/]+/, other)).body,
          { type: 'about:blank', title: 'Not Found', status: 404 },
          other,
        );
      // Without a credential too: a URL that names no result is not a result resource.
      assert.equal(
        serveHttp(suffixedService, {
          method: 'GET',
          url: posted.location.replace(/urn%3A[^/]+/, 'garbage'),
          headers: {},
        }).status,
        404,
      );
      // A fragment in the template is never sent, so the URL without it is the resource.
      const fragmented = reviewDescription();
      fragmented.service.execution.resultUrlTemplate += '#status';
      const fragmentedService = service(fragmented);
      const accepted = serveHttp(
        fragmentedService,
        {
          method: 'POST',
          url: execution,
          headers: { 'content-type': 'application/json', authorization: 'Bearer agent-token' },
          body: JSON.stringify(request(review, 'approve', { description: fragmented })),
        },
        authenticate,
      );
      assert.deepEqual(
        serveHttp(
          fragmentedService,
          {
            method: 'GET',
            url: accepted.location.split('#')[0],
            headers: { authorization: 'Bearer agent-token' },
          },
          authenticate,
        ).body,
        accepted.body,
      );
      const malformed = `${done.location.slice(0, -3)}%E0%A4%A`;
      assert.equal(
        serveHttp(
          reference,
          { method: 'GET', url: malformed, headers: { authorization: 'Bearer agent-token' } },
          authenticate,
        ).status,
        404,
      );
      const entry = example('email-confirmation');
      const possession = describe(entry);
      const client = new ReferenceMapClient(() => uuid(7101));
      const prepared = client.prepare(
        possession,
        'confirm',
        {},
        {
          instruction: 'confirm',
          now: clock(),
        },
      );
      const outgoing = client.httpRequest(possession, prepared);
      assert.equal(outgoing.headers.authorization, undefined);
      assert.equal(outgoing.redirect, 'error');
      assert.equal(outgoing.credentials, 'omit');
      assert.equal(
        serveHttp(new ReferenceMapService(possession, { now: clock }), outgoing).body.state,
        'completed',
      );
      // A lapsed capability is answered before its body is read, even a malformed one.
      const lapsed = new ReferenceMapService(possession, {
        now: () =>
          new Date(
            Date.parse(possession.expiresAt) +
              possession.service.execution.resultRetentionSeconds * 1000,
          ),
      });
      assert.deepEqual(serveHttp(lapsed, { ...outgoing, body: '{' }).body, {
        type: 'about:blank',
        title: 'Gone',
        status: 410,
      });
      // The rest of the HTTP binding may answer first, lapsed or not.
      assert.equal(serveHttp(lapsed, { ...outgoing, method: 'GET' }).status, 405);
      assert.equal(
        serveHttp(lapsed, { ...outgoing, headers: { 'content-type': 'text/plain' } }).status,
        415,
      );
      assert.throws(() => client.httpRequest(reviewDescription(), approve()), /credential/);
    },
  ),
  caseOf(
    'utf8-strict',
    'a designated part that is not valid UTF-8, or starts with a byte order mark, is refused',
    'refused before use, never repaired',
    async () => {
      const original = await text('emails/content-review.eml');
      const marker = 'Content-Transfer-Encoding: base64\r\n\r\n';
      const start = original.lastIndexOf(marker) + marker.length;
      const end = original.indexOf('\r\n--map-related--', start);
      const withPart = (bytes) =>
        Buffer.from(
          `${original.slice(0, start)}${bytes.toString('base64')}${original.slice(end)}`,
          'latin1',
        );
      await assert.rejects(
        readDeliveredMessage(withPart(Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d]))),
        TypeError,
      );
      const part = Buffer.from(original.slice(start, end).replace(/\s+/g, ''), 'base64');
      await assert.rejects(
        readDeliveredMessage(withPart(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), part]))),
        /unexpected token/,
      );
      await readDeliveredMessage(withPart(part));
    },
  ),
  caseOf(
    'lexical-forms',
    'every lexical form is the core pattern, whichever validator reads it',
    'every shared lexical vector decided by the core definition; unparseable dates refused',
    async () => {
      for (const vector of await json('lexical-vectors.json')) {
        const validate = artifacts.ajv.getSchema(`${vector.schema}#/$defs/${vector.definition}`);
        assert.equal(
          validate(vector.value),
          vector.valid,
          `${vector.definition} ${JSON.stringify(vector.value)}`,
        );
      }
      for (const expiresAt of [
        '2026-10-25T08:30:00+00',
        '2026-10-24T23:59:60Z',
        '2026-10-25 08:30:00Z',
      ]) {
        const description = reviewDescription();
        description.expiresAt = expiresAt;
        assert.notDeepEqual(describeProblems(description).errors, [], expiresAt);
        assert.throws(
          () => new ReferenceMapService(description, { now: clock }),
          undefined,
          expiresAt,
        );
      }
      // A deadline that is not a core date-time has passed, even where Date.parse or
      // another language's parser would read it.
      for (const deadline of [
        'not a date',
        'Fri, 25 Sep 2099 08:00:00 GMT',
        '2099-09-25t08:00:00z',
        '2099-09-25T08:00:00',
        ' 2099-09-25T08:00:00Z',
      ])
        assert.equal(reached(clock(), deadline), true, deadline);
      assert.equal(reached(clock(), '2099-09-25T08:00:00Z'), false);
      assert.notDeepEqual(describeProblems(approve()).errors, []);
    },
  ),
  caseOf(
    'message-date',
    'a message Date is an RFC 5322 section 3.3 date-time, read strictly',
    'numeric zones and years from 1900 only; names in any case',
    async () => {
      const original = await text('emails/negative/unsigned.eml');
      const dated = (value) =>
        readDeliveredMessage(
          Buffer.from(original.replace(/^Date: .*$/m, `Date: ${value}`), 'latin1'),
        );
      assert.equal(
        (await dated('Fri, 25 Sep 2026 08:00:00 +0000 (UTC)')).date.toISOString(),
        '2026-09-25T08:00:00.000Z',
      );
      assert.equal(
        (await dated('fri, 25 sep 2026 10:00:00 +0200')).date.toISOString(),
        '2026-09-25T08:00:00.000Z',
      );
      for (const value of [
        'Fri, 25 Sep 0099 08:00:00 +0000',
        'Fri, 25 Sep 2026 08:00:00 GMT',
        'Sat, 25 Sep 2026 08:00:00 +0000',
        `Fri,${String.fromCharCode(0xa0)}25 Sep 2026 08:00:00 +0000`,
        '25 Sep 26 08:00:00 +0000',
        'Fri, 31 Sep 2026 08:00:00 +0000',
      ])
        await assert.rejects(dated(value), /no valid Date/, value);
    },
  ),
  caseOf(
    'retention-latest-state',
    'retention runs from the latest recorded state',
    'a result decided late stays retained for the full interval after its decision',
    () => {
      const description = reviewDescription();
      let time = clock();
      const reference = new ReferenceMapService(description, {
        now: () => time,
        requireApproval: () => true,
      });
      reference.submit(approve(), context);
      const retention = description.service.execution.resultRetentionSeconds * 1000;
      time = new Date(Date.parse(description.expiresAt) - 1000);
      assert.equal(
        reference.decideApproval(approve().requestId, context, 'decline').body.reason,
        'declined',
      );
      time = new Date(Date.parse(description.expiresAt) + retention - 2000);
      assert.equal(reference.recover(approve().requestId, context).body.reason, 'declined');
      time = new Date(Date.parse(description.expiresAt) + retention);
      assert.equal(reference.recover(approve().requestId, context).body.code, 'result-not-found');
    },
  ),
  caseOf(
    'consequence-policy',
    'possession operations beyond refusal, protection and record need a relationship or the principal',
    'policy follows consequences',
    () => {
      const operation = (slug, id) =>
        artifacts.contractFor(slug, example(slug).version).operation(id);
      assert.equal(
        needsPrincipalDecision(operation('information-request', 'decline'), 'possession'),
        false,
      );
      assert.equal(
        needsPrincipalDecision(operation('information-request', 'submit-response'), 'possession'),
        true,
      );
      assert.equal(
        needsPrincipalDecision(operation('information-request', 'submit-response'), 'possession', {
          priorRelationship: true,
        }),
        false,
      );
      assert.equal(
        needsPrincipalDecision(operation('email-confirmation', 'confirm'), 'possession', {
          priorRelationship: true,
        }),
        true,
      );
      assert.equal(
        needsPrincipalDecision(operation('email-confirmation', 'confirm'), 'possession', {
          priorRelationship: true,
          typeRule: true,
        }),
        false,
      );
      assert.equal(
        needsPrincipalDecision(
          operation('email-confirmation', 'report-unrecognized'),
          'possession',
        ),
        false,
      );
    },
  ),
];

const possession = [
  caseOf(
    'capability-scope',
    'a possession interaction issues a sound capability and answers only it',
    'weak issuance refused; 404 plain; 410 plain at expiry plus retention, however often refusals are recorded after expiry',
    () => {
      const entry = example('email-confirmation');
      const description = describe(entry);
      let time = clock();
      const reference = new ReferenceMapService(description, { now: () => time });
      const wrong = reference.submit(request(entry, 'confirm'), { capability: 'guessed' });
      assert.equal(wrong.status, 404);
      assert.equal(wrong.body.code, undefined);
      assert.equal(capabilityOf(description), entry.capability);
      const done = reference.submit(request(entry, 'confirm'), { capability: entry.capability });
      assert.equal(done.body.state, 'completed');
      assert.equal(done.body.actor, undefined);
      assert.deepEqual(
        reference.recover(request(entry, 'confirm').requestId, { capability: entry.capability }),
        done,
      );
      time = new Date(
        Date.parse(description.expiresAt) +
          description.service.execution.resultRetentionSeconds * 1000,
      );
      assert.equal(
        reference.recover(request(entry, 'confirm').requestId, { capability: entry.capability })
          .status,
        410,
      );
      assert.throws(() => reference.submit(request(entry, 'confirm'), context), /capability/);
      // A request after expiry is claimed and refused, but a refusal recorded after
      // expiry never extends the capability: it still lapses at expiry plus retention,
      // however often someone holding the message posts again.
      const retention = description.service.execution.resultRetentionSeconds * 1000;
      const late = new ReferenceMapService(description, { now: () => time });
      const after = (ms) => new Date(Date.parse(description.expiresAt) + ms);
      for (const [n, at] of [
        [2, 3_600_000],
        [3, retention - 60_000],
      ]) {
        time = after(at);
        const refused = late.submit(request(entry, 'confirm', { n }), {
          capability: entry.capability,
        });
        assert.equal(refused.body.code, 'expired-interaction');
      }
      time = after(retention);
      const gone = late.recover(requestId(entry, 3), { capability: entry.capability });
      assert.equal(gone.status, 410);
      assert.equal(gone.body.code, undefined);
      for (const [mutate, reason] of [
        [
          (d) => {
            d.service.execution.url = `https://${entry.host}/map/c/short`;
            d.service.execution.resultUrlTemplate = `https://${entry.host}/map/c/short/results/{requestId}`;
          },
          /too short/,
        ],
        [
          (d) =>
            (d.service.execution.resultUrlTemplate = `https://${entry.host}/map/results/{requestId}`),
          /extend the execution URL/,
        ],
        // The capability alone is not enough: results live under the execution URL, where
        // a server finds the capability at the same path position.
        [
          (d) =>
            (d.service.execution.resultUrlTemplate = `https://${entry.host}/map/r/c/${entry.capability}/{requestId}`),
          /extend the execution URL/,
        ],
        [
          (d) =>
            (d.service.execution.resultUrlTemplate = `${d.service.execution.url}/results#{requestId}`),
          /resultUrlTemplate must match pattern/,
        ],
        [
          (d) => (d.service.humanUrl = `https://${entry.host}/confirm/${entry.capability}`),
          /must not carry/,
        ],
        [
          (d) => {
            d.service.execution.url = `${d.service.execution.url}/.`;
          },
          /too short|dot segments/,
        ],
        [
          (d) => {
            d.service.execution.url = d.service.execution.url.replace('/map/c/', '/map/./c/');
            d.service.execution.resultUrlTemplate = d.service.execution.resultUrlTemplate.replace(
              '/map/c/',
              '/map/./c/',
            );
          },
          /dot segments/,
        ],
        [
          (d) => {
            d.service.execution.url = d.service.execution.url.replace('/map/c/', '/map/%2E%2e/c/');
          },
          /dot segments/,
        ],
        [(d) => (d.service.execution.url = `${d.service.execution.url}/`), /too short/],
      ]) {
        const weak = describe(entry);
        mutate(weak);
        assert.throws(() => new ReferenceMapService(weak, { now: clock }), reason);
      }
    },
  ),
  caseOf(
    'possession-trust',
    'genuine possession messages are trusted for their organization, recipient and list',
    'organizational domain returned, with addresses compared as A-labels',
    async () => {
      for (const [file, org] of [
        ['emails/email-confirmation.eml', 'example.com'],
        ['emails/event-response.eml', 'example.net'],
        ['emails/subscription-preferences.eml', 'example.com'],
      ]) {
        const raw = await bytes(file);
        const message = await readDeliveredMessage(raw);
        const trust = await assertTrustedPossession(raw, message, {
          resolveTxt,
          principalAddresses: ['alex@example.org', 'alex+devtools-7f3a@example.org'],
          now: clock(),
        });
        assert.equal(trust.organizationalDomain, org);
        new ReferenceMapClient(() => uuid(1)).verify(message.description, clock());
      }
      // Addresses compare with domains as A-labels, however the message, the description
      // or the principal writes them, and only ASCII letters of a local part fold.
      const international = await bytes('emails/international-recipient.eml');
      const trustFor = async (address) =>
        assertTrustedPossession(international, await readDeliveredMessage(international), {
          resolveTxt,
          principalAddresses: [address],
          now: clock(),
        });
      assert.equal(
        (await trustFor('AL\u00e9X@b\u00fccher.example')).organizationalDomain,
        'example.com',
      );
      await assert.rejects(trustFor('al\u00c9x@b\u00fccher.example'), /principal does not control/);
      const listed = await readDeliveredMessage(await bytes('emails/subscription-preferences.eml'));
      assert.doesNotThrow(() => assertListIdentity(listed));
      listed.headers.set('list-id', ['Other <other.news.example.com>']);
      assert.throws(() => assertListIdentity(listed), /different list/);
    },
  ),
  caseOf(
    'possession-refusals',
    'weak, forged, restructured or misdirected possession messages are refused for the rule they break',
    'every negative message refused with its reason',
    async () => {
      const principalAddresses = ['alex+devtools-7f3a@example.org'];
      for (const [file, reason] of [
        ['unsigned', /not signed/],
        ['spoofed-authentication-results', /not signed/],
        ['spf-only', /not signed/],
        ['body-length-limit', /body length/],
        ['weak-key', /did not verify/],
        ['ed25519-over-rsa', /uses a rsa key/],
        ['duplicate-signed-header', /repeats the signed reply-to/],
        ['other-recipient', /was not sent to/],
        ['rsa-sha1', /rsa-sha1 is not an accepted algorithm/],
        ['future-signature', /future/],
        ['unsigned-recipient', /does not cover to/],
        ['unsigned-content-type', /does not cover content-type/],
        ['unsigned-cc', /does not cover cc/],
        ['unsigned-list-id', /does not cover list-id/],
        ['foreign-endpoint', /action endpoint is outside/],
        ['embedded-message', /no MAP description labelled/],
        ['inline-attached-message', /no MAP description labelled/],
        ['obsolete-from', /repeats the from header/],
        ['repeated-to', /repeats the to header/],
        ['two-mailbox-from', /exactly one mailbox/],
        ['invalid-date', /no valid Date/],
        ['folded-field-name', /malformed header/],
      ]) {
        const raw = await bytes(`emails/negative/${file}.eml`);
        await assert.rejects(
          async () =>
            assertTrustedPossession(raw, await readDeliveredMessage(raw), {
              resolveTxt,
              principalAddresses,
              now: clock(),
            }),
          reason,
          file,
        );
      }
      const genuine = await bytes('emails/email-confirmation.eml');
      await assert.rejects(
        async () =>
          assertTrustedPossession(genuine, await readDeliveredMessage(genuine), {
            resolveTxt,
            principalAddresses: ['someone@example.org'],
            now: clock(),
          }),
        /principal does not control/,
      );
    },
  ),
  caseOf(
    'lookalike-domain',
    'an authentic lookalike domain cannot satisfy the confirmation rule',
    'trusted for examp1e.com, never confirmed',
    async () => {
      const raw = await bytes('emails/negative/lookalike-domain.eml');
      const message = await readDeliveredMessage(raw);
      const trust = await assertTrustedPossession(raw, message, {
        resolveTxt,
        principalAddresses: ['alex+devtools-7f3a@example.org'],
        now: clock(),
      });
      assert.equal(trust.organizationalDomain, 'examp1e.com');
      const recorded = [
        {
          origin: 'https://devtools.example.com',
          address: 'alex+devtools-7f3a@example.org',
          purpose: 'account-creation',
          recordedAt: '2026-09-25T07:58:00Z',
          uniqueAddress: true,
        },
      ];
      assert.equal(
        mayConfirmEmail(message.description, recorded, {
          messageDate: message.date,
          fromOrganizationalDomain: trust.organizationalDomain,
          now: clock(),
        }),
        false,
      );
    },
  ),
  caseOf(
    'organizational-domain',
    'the organizational domain follows the RFC 9989 tree walk and fails closed',
    'published records decide; DNS failures and top-level domains refuse',
    async () => {
      assert.equal(
        (await organizationalDomain('accounts.example.com', resolveTxt)).organizationalDomain,
        'example.com',
      );
      assert.equal(
        (await organizationalDomain('a.b.c.d.e.f.g.h.calendar.example.net', resolveTxt))
          .organizationalDomain,
        'example.net',
      );
      const psd = async (name) =>
        ({ '_dmarc.example': [['v=DMARC1; p=reject; psd=y']] })[name] ?? resolveTxt(name);
      assert.equal(
        (await organizationalDomain('mail.shop.example', psd)).organizationalDomain,
        'shop.example',
      );
      // The version is exactly DMARC1; only the tag name ignores case.
      const cased = (value) => async (name) =>
        ({ '_dmarc.example': [[`${value}; p=reject; psd=y`]] })[name] ?? resolveTxt(name);
      assert.equal(
        (await organizationalDomain('mail.shop.example', cased('V=DMARC1'))).organizationalDomain,
        'shop.example',
      );
      assert.equal(
        (await organizationalDomain('mail.shop.example', cased('v=dmarc1'))).organizationalDomain,
        'mail.shop.example',
      );
      const failing = async () => {
        throw Object.assign(new Error('SERVFAIL'), { code: 'ESERVFAIL' });
      };
      await assert.rejects(organizationalDomain('accounts.example.com', failing), /failed/);
      const raw = await bytes('emails/email-confirmation.eml');
      const message = await readDeliveredMessage(raw);
      const absent = () =>
        Promise.reject(Object.assign(new Error('absent'), { code: 'ENOTFOUND' }));
      const topLevel = async (name) =>
        name === '_dmarc.com'
          ? [['v=DMARC1; p=none']]
          : name === '_dmarc.example.com'
            ? absent()
            : resolveTxt(name);
      await assert.rejects(
        assertTrustedPossession(raw, message, {
          resolveTxt: topLevel,
          principalAddresses: ['alex+devtools-7f3a@example.org'],
          now: clock(),
        }),
        /top-level domain/,
      );
    },
  ),
];

const credential = [
  caseOf(
    'untrusted-endpoints',
    'every credential-bearing endpoint, resource and the human route are configured',
    'client refusal before credential use',
    () => {
      const description = reviewDescription();
      const trusted = {
        serviceId: description.service.id,
        executionUrls: [description.service.execution.url],
        resultUrlTemplates: [description.service.execution.resultUrlTemplate],
        resources: [description.service.resource],
      };
      assert.doesNotThrow(() => assertTrustedExecution(description, trusted, orgDomainOf));
      for (const mutate of [
        (d) => (d.service.execution.url = 'https://attacker.example/collect'),
        (d) => (d.service.execution.resultUrlTemplate = 'https://attacker.example/{requestId}'),
        (d) => (d.service.execution.url = 'http://reviews.example/map/actions'),
        (d) => (d.service.resource = 'https://attacker.example/'),
        (d) => (d.service.humanUrl = 'https://reviews-example.attacker.example/login'),
      ]) {
        const candidate = reviewDescription();
        mutate(candidate);
        assert.throws(() => assertTrustedExecution(candidate, trusted, orgDomainOf));
      }
    },
  ),
  caseOf(
    'metadata-configuration',
    'protected resource metadata configures a service without extending trust',
    'configured resource anchors every endpoint',
    () => {
      const description = reviewDescription();
      const resource = description.service.resource;
      const metadata = {
        resource,
        bearer_methods_supported: ['header'],
        map_services: [
          {
            id: description.service.id,
            profiles: [description.profile],
            execution_url: description.service.execution.url,
            result_url_template: description.service.execution.resultUrlTemplate,
          },
        ],
      };
      const [trusted] = trustedServicesFromMetadata(resource, metadata);
      assert.doesNotThrow(() => assertTrustedExecution(description, trusted, orgDomainOf));
      for (const mutate of [
        (m) => (m.resource = 'https://attacker.example/'),
        (m) => (m.map_services[0].execution_url = 'https://attacker.example/map'),
        (m) => (m.map_services[0].result_url_template = 'http://reviews.example/{requestId}'),
        (m) => (m.map_services[0].profiles = ['https://mailschema.org/profiles/map/0.1']),
      ]) {
        const candidate = structuredClone(metadata);
        mutate(candidate);
        assert.throws(() => trustedServicesFromMetadata(resource, candidate));
      }
    },
  ),
];

const representation = [
  caseOf(
    'jsonld-identity',
    'JSON-LD identity is stable without remote resolution for every type',
    'base-independent IRIs; details a JSON literal',
    async () => {
      const context = JSON.parse(
        await readFile(new URL('../../public/contexts/map-0.2.jsonld', import.meta.url), 'utf8'),
      );
      for (const entry of examples) {
        const description = describe(entry);
        const documentLoader = async (url) => {
          assert.equal(url, description['@context']);
          return { contextUrl: null, documentUrl: url, document: context };
        };
        const expanded = await Promise.all(
          ['https://one.example/email', 'https://two.example/email'].map((base) =>
            jsonld.expand(description, { base, documentLoader }),
          ),
        );
        assert.deepEqual(expanded[0], expanded[1]);
        assert.deepEqual(expanded[0][0]['@type'], ['https://mailschema.org/ns/map#MailAction']);
        if (description.details)
          assert.equal(
            expanded[0][0]['https://mailschema.org/ns/map#details'][0]['@type'],
            '@json',
          );
        await jsonld.toRDF(description, { documentLoader, safe: true });
      }
    },
  ),
  caseOf(
    'structured-email-designation',
    'a real MIME parser finds the one designated structured part',
    'one part labelled with the profile in a partial representation',
    async () => {
      const raw = await bytes('emails/content-review.eml');
      const email = await simpleParser(raw);
      const outer = email.headers.get('content-type');
      assert.equal(typeof outer === 'object' ? outer.value : outer, 'multipart/related');
      const parts = email.attachments.filter((part) => part.contentType === 'application/ld+json');
      assert.equal(parts.length, 1);
      assert.equal(parts[0].headers.get('content-type').params.profile, MAP_PROFILE);
      assert.equal(parts[0].headers.get('content-purpose'), 'Machine-readable');
      assert.match(
        String(parts[0].headers.get('content-transfer-encoding')),
        /^(?:base64|quoted-printable)$/i,
      );
      assert.deepEqual((await readDeliveredMessage(raw)).description, reviewDescription());
    },
  ),
  caseOf(
    'structured-email-selection',
    'a client processes the one part labelled with its profile, wherever the partial representation sits',
    'other structured parts ignored; two labelled parts, none, or one outside a partial representation refused',
    async () => {
      const read = (raw) => readDeliveredMessage(Buffer.from(raw, 'utf8'));
      // The partial representation inside multipart/mixed, beside an attachment and a
      // schema.org part, which is ignored.
      const mixed = await text('emails/content-review-mixed.eml');
      assert.deepEqual((await read(mixed)).description, reviewDescription());
      const other = 'Content-Type: application/ld+json; charset="utf-8"\r\n';
      const labelled = (profile) =>
        mixed.replace(
          other,
          `Content-Type: application/ld+json; charset="utf-8"; profile="${profile}"\r\n`,
        );
      // A description labelled with another profile is another structured part.
      assert.deepEqual(
        (await read(labelled('https://mailschema.org/profiles/map/0.3'))).description,
        reviewDescription(),
      );
      await assert.rejects(read(labelled(MAP_PROFILE)), /more than one MAP description/);
      await assert.rejects(
        read(mixed.replace(`; profile="${MAP_PROFILE}"`, '')),
        /no MAP description labelled/,
      );
      const related = await text('emails/content-review.eml');
      await assert.rejects(
        read(related.replace(/multipart\/related(?=; boundary="map-related")/, 'multipart/mixed')),
        /not in a multipart\/related entity/,
      );
    },
  ),
  caseOf(
    'contract-identity',
    'wire compatibility is bound to the canonical contract, not the Registry record',
    'editorial changes do not change contractDigest',
    async () => {
      const contract = JSON.parse(
        await readFile(
          new URL('../../public/contracts/content-review-0.3.json', import.meta.url),
          'utf8',
        ),
      );
      assert.equal(reviewDescription().type.contractDigest, canonicalDigest(contract));
    },
  ),
  caseOf(
    'problem-correlation',
    'problem type, status and code agree',
    'contradictory problems and misplaced errors rejected',
    async () => {
      const problem = await json('content-review/stale-target.problem.json');
      assert.deepEqual(artifacts.documentErrors(problem), []);
      assert.notDeepEqual(
        artifacts.documentErrors({ type: problem.type, title: 'Stale', status: 500, detail: 'x' }),
        [],
      );
      assert.notDeepEqual(
        artifacts.documentErrors({ ...problem, status: 500, code: 'refused' }),
        [],
      );
      assert.notDeepEqual(
        artifacts.documentErrors({ ...problem, errors: [{ detail: 'x', pointer: '/a' }] }),
        [],
      );
      const decided = await json('meeting-scheduling/already-decided.problem.json');
      assert.deepEqual(artifacts.documentErrors(decided), []);
    },
  ),
  caseOf(
    'result-shape',
    'approval links and reasons appear exactly with their states',
    'schema enforces the core members',
    async () => {
      const pending = await json('content-review/approve.approval-required.json');
      const declined = await json('content-review/approve.declined.json');
      assert.deepEqual(artifacts.documentErrors(pending), []);
      assert.deepEqual(artifacts.documentErrors(declined), []);
      const { approvalUrl, ...withoutLink } = pending;
      assert.ok(approvalUrl);
      assert.notDeepEqual(artifacts.documentErrors(withoutLink), []);
      assert.notDeepEqual(artifacts.documentErrors({ ...declined, reason: undefined }), []);
      assert.notDeepEqual(
        artifacts.documentErrors({
          ...(await json('content-review/approve.result.json')),
          reason: 'declined',
        }),
        [],
      );
    },
  ),
  caseOf(
    'details-integers',
    'details carry integers only, with ASCII keys',
    'fractions and non-ASCII keys rejected',
    () => {
      const fraction = describe(example('action-approval'));
      fraction.details.authorizationDetails[0].seats = 20.5;
      assert.notDeepEqual(artifacts.documentErrors(fraction), []);
      const key = describe(example('action-approval'));
      key.details.authorizationDetails[0]['prix€'] = 'x';
      assert.notDeepEqual(artifacts.documentErrors(key), []);
    },
  ),
  caseOf(
    'description-digest',
    'RFC 8785 vectors reproduce and bind the description',
    'every vector matches',
    async () => {
      for (const vector of await json('jcs-vectors.json')) {
        assert.equal(canonicalize(JSON.parse(vector.json)), vector.canonical, vector.name);
        assert.equal(canonicalDigest(JSON.parse(vector.json)), vector.digest, vector.name);
      }
    },
  ),
  caseOf(
    'i-json',
    'MAP documents are parsed as I-JSON within the core limits',
    'every shared I-JSON vector decided at its boundary, and read to its RFC 8785 form',
    async () => {
      for (const vector of await json('ijson-vectors.json')) {
        const bytes = vector.base64
          ? Buffer.from(vector.base64, 'base64')
          : Buffer.from(vector.json, 'utf8');
        if (vector.valid)
          assert.equal(canonicalize(parseMapBytes(bytes)), vector.canonical, vector.name);
        else assert.throws(() => parseMapBytes(bytes), undefined, vector.name);
      }
      assert.deepEqual(parseMapJson('{"__proto__":{"x":1}}'), JSON.parse('{"__proto__":{"x":1}}'));
    },
  ),
  caseOf(
    'contract-rules',
    'the Registry refuses contracts that break the core rules',
    'the unchanged contract loads, and each mutation is refused by its own rule',
    async () => {
      const contractUrl = new URL(
        '../../public/contracts/meeting-scheduling-0.1.json',
        import.meta.url,
      );
      const schemaUrl = new URL(
        '../../public/schemas/meeting-scheduling-0.1.schema.json',
        import.meta.url,
      );
      const contract = JSON.parse(await readFile(contractUrl, 'utf8'));
      const schema = JSON.parse(await readFile(schemaUrl, 'utf8'));
      const note = (extra) => (c) =>
        (c.detailsSchema.properties.note = { type: 'string', ...extra });
      // Booking behind an approval, with the core reasons it declares beside its own.
      const approval =
        (reasons, extra = {}) =>
        (c) => {
          Object.assign(c.operations[0], { authority: ['credential'], ...extra });
          c.operations[0].results.push({ state: 'approval-required', outputSchema: {} });
          c.operations[0].results[1].reasons = ['unavailable', ...reasons];
        };
      // Each mutation, and the rule that must refuse it. The first loads unchanged.
      const mutations = [
        [null, null, null],
        [
          (c) => c.operations[0].results.push({ state: 'accepted', outputSchema: {} }),
          null,
          /exactly one success state/,
        ],
        [
          (c) => (c.operations[1].results[0].reasons = ['declined']),
          null,
          /belong to failed results/,
        ],
        [
          (c) => (c.operations[0].results[1].reasons = ['expired']),
          null,
          /expired belongs to the core lifecycle/,
        ],
        // Approvals: a repeatable one ends as declined, stale or expired; only a decision
        // that waits can be superseded.
        [approval(['declined', 'stale-target', 'expired'], { repeatable: true }), null, null],
        [
          approval(['declined', 'stale-target', 'expired', 'superseded'], { repeatable: true }),
          null,
          /superseded belongs to the core lifecycle/,
        ],
        [
          approval(['declined', 'stale-target', 'expired', 'superseded'], {
            authority: ['credential', 'possession'],
          }),
          null,
          /cannot be decided by possession/,
        ],
        // Pending work holds the interaction, so it is never superseded.
        [(c) => c.operations[0].results.push({ state: 'pending', outputSchema: {} }), null, null],
        [
          (c) => {
            c.operations[0].results.push({ state: 'pending', outputSchema: {} });
            c.operations[0].results[1].reasons = ['unavailable', 'superseded'];
          },
          null,
          /superseded belongs to the core lifecycle/,
        ],
        [
          (c) => (c.operations[0].consequences = ['refusal', 'commitment']),
          null,
          /refusal and protection stand alone/,
        ],
        [(c) => (c.dependencies = c.dependencies.slice(1)), null, /core schema must be pinned/],
        [
          (c) => (c.detailsSchema.properties.extra = { $ref: `${CORE_SCHEMA}#anchor` }),
          null,
          /names an anchor/,
        ],
        // A reference names a schema, which may sit inside an array, as RFC 6901 allows.
        [
          (c) =>
            (c.detailsSchema.properties.extra = {
              $ref: `${CORE_SCHEMA}#/$defs/description/properties/service/properties/name/maxLength`,
            }),
          null,
          /does not name a schema/,
        ],
        [
          (c) =>
            (c.detailsSchema.properties.extra = {
              $ref: `${CORE_SCHEMA}#/$defs/description/required`,
            }),
          null,
          /does not name a schema/,
        ],
        [
          (c) =>
            (c.detailsSchema.properties.extra = {
              $ref: `${CORE_SCHEMA}#/$defs/description/allOf/0`,
            }),
          null,
          null,
        ],
        [
          (c) => (c.detailsSchema.properties.extra = { $dynamicRef: '#meta' }),
          null,
          /\$dynamicRef is not pinned by any digest/,
        ],
        [
          (c) =>
            (c.detailsSchema.properties.extra = { $ref: `${CORE_SCHEMA}#%2F%24defs%2FnonBlank` }),
          null,
          /names an anchor/,
        ],
        [
          (c) => (c.detailsSchema.properties.extra = { $ref: `${CORE_SCHEMA}#/$defs%2FnonBlank` }),
          null,
          /not a plain JSON Pointer/,
        ],
        [
          (c) => (c.detailsSchema.properties.extra = { $id: CORE_SCHEMA, type: 'string' }),
          null,
          /nested \$id/,
        ],
        [approval([]), null, /declare failed with declined, stale-target, expired, superseded/],
        [
          (c) => (c.operations[0].fieldBindings = [{ input: '/slot', fields: '/attendeeFields' }]),
          null,
          /not a field values input/,
        ],
        [
          (c) => (c.detailsSchema.properties['r\u00e9sum\u00e9'] = { type: 'string' }),
          null,
          /ASCII identifiers/,
        ],
        // Patterns stay in the subset every regular expression engine reads alike.
        [note({ pattern: '\\S' }), null, /the escape \\S/],
        [note({ pattern: '^a.b$' }), null, /unescaped dot/],
        [note({ pattern: '^[^]$' }), null, /empty character class/],
        [note({ pattern: '^[]a]$' }), null, /empty character class/],
        [note({ pattern: '^[a&&b]+$' }), null, /&& inside a class/],
        [note({ pattern: '^[a[b]]$' }), null, /bracket inside a class/],
        [note({ pattern: '^x{2}{3}$' }), null, /quantifier on a quantifier/],
        [note({ pattern: '^a{,2}$' }), null, /malformed \{n,m\} quantifier/],
        [note({ pattern: '^[^\u00a0]+$' }), null, /outside printable ASCII/],
        [
          (c) =>
            (c.detailsSchema.properties.note = {
              type: 'object',
              patternProperties: { '^a.b$': { type: 'string' } },
            }),
          null,
          /unescaped dot/,
        ],
        [
          (c) => (c.detailsSchema.properties.note = { type: 'integer', multipleOf: 0.5 }),
          null,
          /multipleOf 0\.5 is not an integer/,
        ],
        // Strict compilation: only JSON Schema 2020-12 keywords, one type, closed tuples.
        [note({ nullable: true }), null, /unknown keyword: "nullable"/],
        [
          (c) => (c.detailsSchema.properties.note = { type: 'object', dependencies: { a: ['b'] } }),
          null,
          /unknown keyword: "dependencies"/,
        ],
        [
          (c) => (c.detailsSchema.properties.note = { type: 'array', additionalItems: false }),
          null,
          /unknown keyword: "additionalItems"/,
        ],
        [
          (c) => (c.detailsSchema.properties.note = { type: ['string', 'integer'] }),
          null,
          /one type/,
        ],
        [(c) => (c.detailsSchema.properties.note = { type: ['string', 'null'] }), null, /one type/],
        [
          note({ $schema: 'http://json-schema.org/draft-07/schema#', maxLength: 3 }),
          null,
          /nested \$schema/,
        ],
        [null, (r) => delete r.$schema, /declare JSON Schema 2020-12/],
        [note({ autocomplete: 'email' }), null, /autocomplete belongs to the form fields block/],
        // A details member may be named after a keyword; its schema is still a schema.
        [
          (c) =>
            (c.detailsSchema.properties.properties = { type: 'string', autocomplete: 'email' }),
          null,
          /autocomplete belongs to the form fields block/,
        ],
        [
          (c) => (c.detailsSchema.properties.$schema = { type: 'string' }),
          null,
          /ASCII identifiers/,
        ],
        [
          (c) =>
            (c.detailsSchema.properties.note = {
              type: 'array',
              prefixItems: [{ type: 'string' }],
            }),
          null,
          /prefixItems/,
        ],
        [
          (c) => (c.detailsSchema.properties.note = { type: 'object', if: { required: ['a'] } }),
          null,
          /"if" without "then" and "else"/,
        ],
        [
          (c) => (c.detailsSchema.properties.note = { type: 'array', maxContains: 2 }),
          null,
          /"maxContains" without "contains"/,
        ],
        [
          null,
          (r) => (r.allOf[1].properties.type.properties.version = { not: { const: '0.1' } }),
          /bind the type identifier and version/,
        ],
        [null, (r) => (r.allOf[0] = { type: 'object' }), /extend the core request/],
        [
          null,
          (r) =>
            r.allOf[2].oneOf.push({
              type: 'object',
              properties: { operation: { const: 'extra' }, input: { type: 'object' } },
            }),
          /exactly the contract operations/,
        ],
      ];
      for (const [mutateContract, mutateSchema, refusal] of mutations) {
        const nextContract = structuredClone(contract);
        const nextSchema = structuredClone(schema);
        mutateContract?.(nextContract);
        const files = { 'contracts/meeting-scheduling-0.1.json': nextContract };
        if (mutateSchema) {
          mutateSchema(nextSchema);
          nextContract.requestSchema.canonicalDigest = canonicalDigest(nextSchema);
          files['schemas/meeting-scheduling-0.1.schema.json'] = nextSchema;
        }
        await withArtifacts(files, (load) => (refusal ? assert.throws(load, refusal) : load()));
      }
    },
  ),
];

export const conformanceCases = [
  ...core,
  ...binding,
  ...perType,
  ...types,
  ...possession,
  ...credential,
  ...representation,
];

const ids = conformanceCases.map((entry) => entry.id);
assert.equal(new Set(ids).size, ids.length, 'Conformance case IDs must be unique.');
