# MailSchema for JavaScript

[![npm](https://img.shields.io/npm/v/mailschema)](https://www.npmjs.com/package/mailschema)
[![CI](https://github.com/mailschema/javascript/actions/workflows/test.yml/badge.svg)](https://github.com/mailschema/javascript/actions/workflows/test.yml)

Mail Action Protocol 0.2 for JavaScript and TypeScript. The package parses, canonicalizes, digests and validates MAP documents, verifies the type contracts an implementation vendors, and builds results and problems. It also carries the MAP 0.2 core artifacts and validates MailSchema Registry contributions locally.

It does not establish endpoint trust, verify email authentication, grant authority or send email. Possession mode needs DKIM and DMARC checks on the raw message, which this package leaves to the client.

[Specification](https://mailschema.org/specification) · [Registry](https://mailschema.org/registry) · [Tools](https://mailschema.org/tools) · [Source](https://github.com/mailschema/javascript)

## Install

```sh
npm install mailschema
```

Node.js 22 or newer is required. The package is ESM and includes TypeScript declarations.

## A service

Vendor the exact contract and request schema your service implements, and pin the contract by the digest you reviewed. The package refuses any other contract.

```ts
import { readFileSync } from 'node:fs';
import { Contract, digest } from 'mailschema';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const contract = new Contract(
  read('mailschema/content-review-0.3.json'),
  read('mailschema/content-review-0.3.schema.json'),
  { digest: 'sha-256:…' },
);
```

Before sending a description, check it against every rule of the core and the contract, and store its digest or keep it rebuildable from the interaction:

```ts
contract.descriptionErrors(description); // []
digest(description); // 'sha-256:…'
```

When a request arrives, check it in this order. No step applies an effect for a problem, and a refusal before the description is resolved and its digest matched leaves the request identifier unclaimed:

```ts
import { isJsonRequest, parse, problem, requestErrors, result, resultUrl } from 'mailschema';
import type { MapRequest } from 'mailschema';

// Answer 415 unless isJsonRequest(contentType). Under possession authority, answer an
// unknown capability with a plain 404 and a lapsed one with a plain 410 before reading
// the body; under credential authority, authenticate the principal.
const request = parse(body) as MapRequest; // throws InvalidDocument
requestErrors(request); // any errors: invalid-request

// Resolve the description you issued for request.interactionId. Refuse an unknown
// interaction, or a request whose descriptionDigest is not digest(description).

// Request identifiers are claimed within your tenant: the account, or the capability.
// If request.requestId is already claimed there, refuse another principal, and a principal
// whose permission has been revoked, with an uncorrelated refused problem (problem()
// without requestId). Answer any change to the request, compared by digest, with
// idempotency-conflict. Otherwise settle the recorded result with settle() and return it,
// or expired-interaction once retainUntil() has passed. Nothing is applied again.

const refused = contract.requestProblem(description, request, { now: new Date() });
// refused.code is unsupported-type, unsupported-operation or expired-interaction, with the
// title and detail problem() takes. Then your own state: already-decided, or stale-target.

contract.inputErrors(description, request);
// [{ detail: '…', pointer: '/feedback' }], a claimed invalid-request
```

Then apply the approval lifecycle or the effect, and record the result:

```ts
result(request, {
  state: 'accepted',
  target: description.target,
  resultUrl: resultUrl(description, request.requestId),
  recordedAt: new Date(),
  output: { feedbackRecorded: true, feedbackId: 'fb-1' },
});
```

## API

| Call                                                                          | Does                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parse(text \| bytes)`                                                        | Parses a MAP document as I-JSON within the core limits, or throws `InvalidDocument`                                                                                                                                                                                                              |
| `canonicalize(value)`, `digest(value)`                                        | RFC 8785 canonical JSON, and `sha-256:` over it                                                                                                                                                                                                                                                  |
| `mapErrors(document)`                                                         | Checks a description, request, result or problem against the core schema                                                                                                                                                                                                                         |
| `descriptionErrors`, `requestErrors`, `resultErrors`, `problemErrors`         | Check one document against its core definition only                                                                                                                                                                                                                                              |
| `new Contract(contract, requestSchema, { digest, dependencies })`             | Checks the contract's format and profile, refuses any contract but the one pinned by `digest`, checks its pinned dependencies and request schema, and compiles every validator once, or throws `InvalidContract`; `dependencies` supplies, by URL, any pinned schema the package does not bundle |
| `contract.descriptionErrors(description)`                                     | Checks a description against every rule of the core and the contract                                                                                                                                                                                                                             |
| `contract.requestProblem(description, request, { now })`                      | The exact type, an offered operation the authority permits, and expiry, as a problem code, title and detail, or undefined                                                                                                                                                                        |
| `contract.inputErrors(description, request)`                                  | Checks an operation's input and field bindings, with JSON Pointers into `input`                                                                                                                                                                                                                  |
| `contract.requestErrors(request)`, `contract.resultErrors(result)`            | Check a request against the core and the request schema, and a result against the core, the declared output schema and the declared reason                                                                                                                                                       |
| `contract.typeReference`, `contract.operation(id)`, `contract.isDecision(id)` | The type reference descriptions and requests name, one of its operations, and whether completing it decides the interaction                                                                                                                                                                      |
| `result`, `transition`, `problem`                                             | Build results, state transitions and problems with their correlation members, or throw rather than return a document the core refuses. A problem stays within the core limits                                                                                                                    |
| `resultUrl`, `resultStatus`, `isRequestId`                                    | The result resource of a request, a result's HTTP status, and whether a value is a request identifier, the only thing a result URL names                                                                                                                                                         |
| `isJsonRequest(contentType)`                                                  | Whether a `Content-Type` admits a request rather than a 415                                                                                                                                                                                                                                      |
| `DESCRIPTION_MEDIA_TYPE`, `isDescriptionPart(mediaType, profileParameter)`    | The `Content-Type` of the part that carries a description, and whether a designated part is labelled with this profile                                                                                                                                                                           |
| `retainUntil`, `settle`, `reached`                                            | Result retention, the expiry of an undecided approval, and whether a deadline has passed                                                                                                                                                                                                         |
| `capability(description)`, `writtenPath(url)`                                 | The possession capability: the last segment of the execution URL's path as written                                                                                                                                                                                                               |

Type rules a contract cannot express, such as a meeting slot being one of the slots offered, belong to each type's implementation. Validation uses Ajv with JSON Schema 2020-12. Lexical forms are core schema patterns, so `format` is never asserted, and references resolve only against pinned schemas, never over the network.

## MAP 0.2 core artifacts

```js
import { getContractFormatSchema, getFormsSchema, getMapContext, getMapSchema } from 'mailschema';
```

Each is byte-identical to the file the [profile record](https://mailschema.org/profiles/map/0.2.json) binds by SHA-256, and is also exported raw as `mailschema/map-0.2.schema.json`, `mailschema/map-0.2.jsonld`, `mailschema/type-contract-0.2.schema.json` and `mailschema/forms-0.1.schema.json`. Type contracts are not bundled: an implementation vendors the contracts it supports, and `Contract` verifies them by digest.

## Registry data

```js
import { assertContribution, contributionErrors, referenceErrors } from 'mailschema';

const errors = contributionErrors(candidate);
if (errors.length) console.error(errors);
else assertContribution(candidate);

const referenceProblems = referenceErrors(candidate, catalog);
```

`assertTypeRecord` and `getRecordSchema` handle expanded Registry records. Reference checks use a catalogue supplied by the caller; the package never fetches one.

```sh
npx mailschema check contribution.json
npx mailschema check record.json --record
npx mailschema schema --map
```

## Trust boundary

A valid document is structured input. Validation does not authenticate a service, grant authority or establish product conformance. The CLI reads one local file of at most 256 KiB and does not upload or modify it. Package versions and MAP profile versions advance independently. MIT licensed.
