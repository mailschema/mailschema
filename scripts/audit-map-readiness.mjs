// Focused executable checks for readiness findings. This is narrower than the
// normative conformance suite and makes no claim about a deployed service.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import jsonld from 'jsonld';
import { ReferenceMapService, assertTrustedExecution } from '../src/map/reference.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const description = json('public/fixtures/map-0.1/content-review-description.json');
const request = json('public/fixtures/map-0.1/approve.json');
const now = () => new Date('2026-09-23T01:06:01Z');
const context = { principal: 'reviewer-7', tenant: 'reviews-example' };
const allow = () => true;
const ajv = new Ajv2020({ strict: true, strictRequired: false });
addFormats(ajv);
const mapSchema = json('public/schemas/map-0.1.schema.json');
ajv.addSchema(mapSchema);
const validateMap = ajv.getSchema(mapSchema.$id);
const validateReview = ajv.compile(json('public/schemas/content-review-0.1.schema.json'));
const probes = [];
const record = (id, requirement, passed, observed) =>
  probes.push({ id, requirement, status: passed ? 'pass' : 'fail', observed });
const throws = (callback) => {
  try {
    callback();
    return false;
  } catch {
    return true;
  }
};
const reference = (options = {}) =>
  new ReferenceMapService(description, { now, authorize: allow, ...options });

const controlService = reference();
const control = controlService.submit(request, context);
record(
  'control',
  'A valid, authorized approval completes exactly once.',
  control.status === 200 && control.body.state === 'completed' && controlService.effectCount === 1,
  { status: control.status, effects: controlService.effectCount },
);

const unrelated = structuredClone(request);
unrelated.interactionId = 'urn:uuid:018f47a2-5d7c-7b11-9a3d-4d2160b85b99';
const unrelatedResponse = reference().submit(unrelated, context);
record(
  'interaction-binding',
  'A request for an unknown interaction cannot complete.',
  unrelatedResponse.status === 400,
  unrelatedResponse.status,
);

const malformed = structuredClone(request);
malformed.input = { unexpected: true };
const malformedService = reference();
const inputResponse = malformedService.submit(malformed, context);
record(
  'request-validation',
  'The service rejects input rejected by the Content Review schema without an effect.',
  !validateReview(malformed) && inputResponse.status === 400 && malformedService.effectCount === 0,
  { schemaValid: validateReview(malformed), status: inputResponse.status },
);

let permitted = true;
let authorizationCalls = 0;
const guarded = reference({
  authorize: () => {
    authorizationCalls++;
    return permitted;
  },
});
guarded.submit(request, context);
permitted = false;
const retry = guarded.submit(request, context);
const callsBeforeRecovery = authorizationCalls;
const recovered = guarded.recover(request.requestId, context);
record(
  'retry-access',
  'A retry checks current access before disclosing a saved result.',
  authorizationCalls > 1 && retry.status === 403 && guarded.effectCount === 1,
  { status: retry.status, authorizationCalls, effects: guarded.effectCount },
);
record(
  'recovery-access',
  'Recovery checks current access before disclosing a saved result.',
  authorizationCalls > callsBeforeRecovery && recovered?.status === 403,
  { status: recovered?.status ?? null, authorizationCalls },
);

const insecure = structuredClone(description);
insecure.service.execution.url = 'http://reviews.example/map/actions';
const rejectedHttp =
  !validateMap(insecure) &&
  throws(() =>
    assertTrustedExecution(insecure, {
      serviceId: description.service.id,
      executionUrls: [insecure.service.execution.url],
      resultUrlTemplates: [insecure.service.execution.resultUrlTemplate],
      audiences: [description.service.authorization.audience],
    }),
  );
record('https-only', 'Schema and endpoint trust both require HTTPS.', rejectedHttp, {
  schemaValid: validateMap(insecure),
  helperRejected: rejectedHttp,
});

const hostileRecovery = structuredClone(description);
hostileRecovery.service.execution.resultUrlTemplate = 'https://attacker.example/{requestId}';
const rejectedRecovery = throws(() =>
  assertTrustedExecution(hostileRecovery, {
    serviceId: description.service.id,
    executionUrls: [hostileRecovery.service.execution.url],
    resultUrlTemplates: [description.service.execution.resultUrlTemplate],
    audiences: [description.service.authorization.audience],
  }),
);
record(
  'recovery-origin',
  'Credential-bearing result retrieval needs an independently trusted origin.',
  rejectedRecovery,
  { helperRejected: rejectedRecovery },
);

const email = read('public/fixtures/map-0.1/content-review.eml');
const structuredHeaders =
  email.match(/Content-Type: application\/ld\+json[^\r\n]*\r?\n([\s\S]*?)\r?\n\r?\n/i)?.[1] ?? '';
const purpose = /^Content-Purpose:\s*Machine-readable\s*$/im.test(structuredHeaders);
record(
  'sml-designation',
  'The structured MIME part carries SML-06 Content-Purpose: Machine-readable.',
  purpose,
  { present: purpose },
);

const jsonldContext = json('public/contexts/map-0.1.jsonld');
const documentLoader = async (url) => {
  if (url !== description['@context']) throw new Error('Audit blocks remote context loading.');
  return { contextUrl: null, documentUrl: url, document: jsonldContext };
};
const expanded = [];
for (const base of ['https://one.example/email', 'https://two.example/email'])
  expanded.push((await Promise.resolve(jsonld.expand(description, { documentLoader, base })))[0]);
record(
  'jsonld-type',
  'The vocabulary type is the MAP type IRI and is independent of document base.',
  expanded.every(
    (entry) =>
      JSON.stringify(entry['@type']) ===
      JSON.stringify(['https://mailschema.org/ns/map#MailAction']),
  ),
  expanded.map((entry) => entry['@type']),
);
const operationIds = expanded.map((entry) =>
  entry['https://schema.org/potentialAction'].map(
    (operation) => operation['https://mailschema.org/ns/map#operationId'][0]['@value'],
  ),
);
record(
  'jsonld-operation-ids',
  'Shared operation tokens do not change with the document base.',
  JSON.stringify(operationIds[0]) === JSON.stringify(operationIds[1]),
  operationIds,
);

const contradictory = json('public/fixtures/map-0.1/problem-stale-target.json');
contradictory.status = 500;
contradictory.code = 'refused';
record(
  'problem-correlation',
  'A Problem Details code cannot contradict its type or HTTP status.',
  !validateMap(contradictory),
  { schemaValid: validateMap(contradictory) },
);

const paths = [
  'src/map/reference.ts',
  'public/contexts/map-0.1.jsonld',
  'public/schemas/map-0.1.schema.json',
  'public/schemas/content-review-0.1.schema.json',
  'public/fixtures/map-0.1/content-review-description.json',
  'public/fixtures/map-0.1/approve.json',
  'public/fixtures/map-0.1/content-review.eml',
  'scripts/audit-map-readiness.mjs',
];
const artifacts = paths.map((path) => ({
  path,
  sha256: createHash('sha256').update(read(path)).digest('hex'),
}));
const evidence = {
  format: 'mailschema-readiness-audit/1',
  artifactSetSha256: createHash('sha256')
    .update(artifacts.map(({ path, sha256 }) => `${path}\0${sha256}`).join('\n'))
    .digest('hex'),
  artifacts,
  scope:
    'Local reference implementation and fixtures. Not a deployed security test or full conformance certification.',
  probes,
};
console.log(JSON.stringify(evidence, null, 2));
if (probes.some((probe) => probe.status !== 'pass')) process.exitCode = 1;
