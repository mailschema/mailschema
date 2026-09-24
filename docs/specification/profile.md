---
title: MAP 0.1 profile
description: The JSON-LD, MIME and authenticated HTTPS contract for Mail Action Protocol 0.1.
navTitle: MAP 0.1 profile
---

MAP 0.1 carries an action description in readable email and executes the action through the service's authenticated HTTPS API. This page defines the fields and processing rules needed for two implementations to exchange that interaction.

The key words **MUST**, **MUST NOT**, **SHOULD** and **MAY** are to be interpreted as described by [BCP 14](https://www.rfc-editor.org/info/bcp14) when they appear in capitals.

## Published artifacts

| Artifact                | Address                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Profile record          | [`/profiles/map/0.1.json`](/profiles/map/0.1.json)                                   |
| JSON-LD context         | [`/contexts/map-0.1.jsonld`](/contexts/map-0.1.jsonld)                               |
| MAP schema              | [`/schemas/map-0.1.schema.json`](/schemas/map-0.1.schema.json)                       |
| Content Review contract | [`/contracts/content-review-0.1.json`](/contracts/content-review-0.1.json)           |
| Content Review schema   | [`/schemas/content-review-0.1.schema.json`](/schemas/content-review-0.1.schema.json) |
| Complete email          | [`content-review.eml`](/fixtures/map-0.1/content-review.eml)                         |

The profile URI is `https://mailschema.org/profiles/map/0.1`. A client MUST match that value exactly. A client that does not implement the profile can still display the readable email.

## Email representation

A MAP action description represents part of a message. The service MUST place it in an `application/ld+json` part within `multipart/related`. Readable text and HTML variants, when both are present, form a nested `multipart/alternative` part. The structured part MUST carry `Content-Purpose: Machine-readable` and use `base64` or `quoted-printable` content-transfer encoding.

The structured value is ordinary JSON and MUST validate against the MAP schema. Its `@context`, `@type`, `@id` and `profile` fields identify the representation and interaction. `type` binds the interaction to an exact type contract. `target` binds it to the service object, revision and SHA-256 digest on which the operations act.

JSON-LD expansion is optional. An implementation that expands the document MUST use a bundled, digest-checked copy of the profile context and MUST NOT retrieve a context named by an untrusted message. `MailAction` expands to `https://mailschema.org/ns/map#MailAction`; operation IDs such as `approve` remain literal tokens. The profile record binds its schema and context bytes, and the conformance manifest binds the tested artifact set.

The description MUST NOT contain access tokens, session credentials or a new authorization grant. The `authorization` object only tells a configured client which existing service authentication schemes may be used.

## Trust before execution

Every description and every value derived from it is untrusted input. Email authentication can provide evidence about message delivery; it does not grant service permission or make an action endpoint safe.

Before submitting a request, a client MUST establish all of the following independently of the email:

- the service identifier is configured for the client;
- the exact HTTPS execution resource and result URL template are configured for that service;
- the client already holds an applicable service credential;
- the configured credential audience agrees with the advertised audience, when present;
- the profile, type URI, type version, contract digest and operation are supported;
- the description has not expired.

A client MUST NOT send service credentials to an endpoint solely because that endpoint appears in an email. Every credential-bearing URL MUST use HTTPS and MUST NOT contain URL credentials. A client MUST apply the same trust and audience checks to every redirect before sending a credential. It MUST NOT automatically fetch or interpret an unknown schema, context, URL or instruction named by the message.

## Description

The [MAP schema](/schemas/map-0.1.schema.json) is the field-level contract. A description contains:

| Field                      | Meaning                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `@id`                      | A UUID URN identifying the interaction.                                                          |
| `profile`                  | The exact MAP profile URI.                                                                       |
| `type`                     | The type URI, version and canonical contract digest.                                             |
| `describedAt`, `expiresAt` | The description's creation and expiry times. Expiry MUST be later than creation.                 |
| `service`                  | The service identity, execution route, result route, human route and authentication metadata.    |
| `target`                   | The service object, exact revision and service-issued SHA-256 state digest presented for action. |
| `operations`               | Stable operation IDs and readable labels offered for this interaction.                           |

A service MUST preserve the same `@id` when it redelivers the same underlying interaction. A changed target revision or changed set of available operations is a new interaction and MUST use a new identifier.

The service advertises how long it retains results. The minimum permitted value is 300 seconds. A service MUST make the result available for at least the advertised interval after it first records the request outcome.

## Requests and processing

The client sends an authenticated `POST` to `service.execution.url` with `Content-Type: application/json`. The body MUST validate as a MAP request and against the named type's request schema before the service applies an effect.

`requestId` is a UUID URN created by the client and persisted for retries and result recovery. `interactionId` repeats the description's `@id`. The request repeats the exact type reference, target and selected operation so that authorization and stale-target checks do not depend on mutable client state.

Authentication establishes the caller and tenant outside the request body. Receiving the description does not authorize the request. The service resolves the interaction and current target from authoritative state and checks the caller's permission, the offered operation, target revision, expiry, revocation and any service approval policy. Values repeated by the client are assertions to verify.

Malformed requests and requests for an unknown interaction MUST NOT claim their `requestId`. Once the service has a syntactically valid request, a recognized interaction and an authenticated principal, it applies these security constraints:

- an existing request identifier is isolated to its original principal;
- current authorization is checked before a saved response is disclosed;
- a changed reuse of the identifier cannot replace the original request;
- a new identifier is claimed before an effect begins;
- the claim and its first recoverable outcome, including a permission refusal, are recorded together.

The profile does not require a total precedence among independent validation failures. An implementation may perform checks in a different order provided it preserves the constraints above, applies no effect for a problem response and does not reveal protected state.

## Idempotency and recovery

Within one service tenant, a claimed `requestId` identifies one complete request document and the authenticated principal that first used it.

- A later request from the same principal with the same identifier and the same JSON values is an exact retry. Object member order is irrelevant; array order and every member value remain significant. The service MUST return the latest recorded response without applying the effect again.
- Reuse of the identifier with any changed value is an `idempotency-conflict`. The changed request MUST NOT be applied.
- Use of the identifier by another principal MUST be refused without disclosing the saved response.

The service returns a `Location` header containing the expanded `resultUrlTemplate`. An authenticated, side-effect-free `GET` to that address returns the latest recorded result or problem. Result retrieval and exact retries MUST recheck current permission before disclosing a saved response. A client SHOULD retrieve the result after a timeout before deciding whether another request is safe. A timeout is a client-local uncertain state; `uncertain` is not a MAP result value.

The service MUST make the response retrievable until at least the later of the interaction expiry and the advertised retention interval measured from the first recorded response. It MAY then remove the response, but it MUST retain enough request identity to prevent the operation from being applied again. An exact retry after both periods have ended returns `expired-interaction`; a changed reuse remains an idempotency conflict.

Claiming the request identifier, applying or durably initiating the effect and recording recoverable state MUST be one atomic transaction, or the service MUST reconcile an interrupted operation without repeating the effect. A successful response before durable state exists is non-conforming.

## Outcomes

Successful responses use `application/json` with a MAP result. Problems use `application/problem+json` and the standard [Problem Details](https://www.rfc-editor.org/info/rfc9457) members. This table is the canonical MAP 0.1 status mapping.

| Outcome                   | HTTP | Document | Lifecycle or client handling                                                                   |
| ------------------------- | ---: | -------- | ---------------------------------------------------------------------------------------------- |
| `accepted`                |  200 | Result   | Terminal. The requested record was accepted; separate downstream work may remain.              |
| `completed`               |  200 | Result   | Terminal. The requested effect completed.                                                      |
| `failed`                  |  200 | Result   | Terminal. Previously accepted asynchronous work ended without completing its effect.           |
| `pending`                 |  202 | Result   | Non-terminal. Retrieve the result resource for a later state.                                  |
| `approval-required`       |  202 | Result   | Non-terminal. Use the service's approval route, then retrieve the result resource.             |
| `invalid-request`         |  400 | Problem  | Correct the request. A malformed or unknown-interaction request remains unclaimed.             |
| `authentication-required` |  401 | Problem  | Establish acceptable service authentication before retrying.                                   |
| `refused`                 |  403 | Problem  | Terminal when recorded for a claimed request. Use a new request ID if authority later changes. |
| `result-not-found`        |  404 | Problem  | No retained result exists in the authenticated principal and tenant scope.                     |
| `stale-target`            |  409 | Problem  | Terminal. Obtain a description for the current target before creating a new request.           |
| `idempotency-conflict`    |  409 | Problem  | The identifier already belongs to another request value; do not replace it.                    |
| `request-in-progress`     |  409 | Problem  | The identifier is claimed but no result is available yet; retrieve the result resource.        |
| `expired-interaction`     |  410 | Problem  | Terminal. Obtain a new interaction before creating a new request.                              |
| `unsupported-profile`     |  422 | Problem  | The exact profile is not implemented.                                                          |
| `unsupported-type`        |  422 | Problem  | The exact type URI, version or contract digest is not implemented.                             |
| `unsupported-operation`   |  422 | Problem  | The operation was not offered or implemented.                                                  |

A result repeats the request, interaction, exact type, operation and target references and includes the authoritative result URL and recording time. `pending` and `approval-required` may advance to `accepted`, `completed` or `failed`; terminal outcomes MUST NOT advance.

MAP problems add `profile`, `requestId`, `interactionId`, `code` and, when relevant, `target`. The problem `type`, HTTP status and `code` MUST agree. When a result lookup has no known interaction, `result-not-found` includes `requestId` but MUST NOT invent an `interactionId`. If a malformed request does not supply usable correlation identifiers, the service returns an ordinary RFC 9457 response without MAP correlation members.

## Type contracts and the Registry

Profile, type version and contract digest are exact-match contracts in MAP 0.1. A client or service MUST NOT guess compatibility with an unknown value.

`contractDigest` is SHA-256 over the complete type contract serialized with the JSON Canonicalization Scheme (RFC 8785), prefixed with `sha-256:`. The contract binds the type's target semantics, operation meanings, request schema digest and normal result shapes. It does not contain its own digest.

The Registry record supplies discovery, status, maintainers, examples, implementation evidence and history. Its independent record digest identifies that catalogue record. Registry metadata can change without changing a compatible type contract, and clients do not need an online Registry lookup during an interaction.

MAP 0.1 defines no custom DNS discovery, global identity provider or universal permission language. Service configuration supplies endpoint trust and credentials. Contracts, schemas and contexts can be bundled with implementations and checked offline.
