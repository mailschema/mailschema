---
title: MAP 0.1 profile
description: The JSON-LD, MIME and authenticated HTTPS contract for Mail Action Protocol 0.1.
navTitle: MAP 0.1 profile
---

MAP 0.1 carries an action description in a readable email and executes the action through the service's authenticated HTTPS API. This page defines the fields and processing rules needed for two implementations to exchange that interaction.

The key words **MUST**, **MUST NOT**, **SHOULD** and **MAY** are to be interpreted as described by [BCP 14](https://www.rfc-editor.org/info/bcp14) when they appear in capitals.

## Published artifacts

| Artifact | Address |
| --- | --- |
| Profile record | [`/profiles/map/0.1.json`](/profiles/map/0.1.json) |
| JSON-LD context | [`/contexts/map-0.1.jsonld`](/contexts/map-0.1.jsonld) |
| MAP schema | [`/schemas/map-0.1.schema.json`](/schemas/map-0.1.schema.json) |
| Content Review binding | [`/schemas/content-review-0.1.schema.json`](/schemas/content-review-0.1.schema.json) |
| Complete email | [`content-review.eml`](/fixtures/map-0.1/content-review.eml) |

The profile URI is `https://mailschema.org/profiles/map/0.1`. A client MUST match that value exactly. A client that does not implement the profile can still display the readable email.

## Email representation

The service adds the MAP description as an `application/ld+json` body part in a `multipart/alternative` message. The text and HTML alternatives describe the same action, target revision and human route. This follows the MIME shape defined by the IETF Structured Email work; MAP defines the action vocabulary and execution exchange layered on it.

The structured part MUST validate against the MAP schema. Its `@context`, `@type`, `@id` and `profile` fields identify the representation and interaction. `type` binds the interaction to an exact Registry type version and record digest. `target` binds it to the service object, revision and SHA-256 digest on which the operations act.

The description MUST NOT contain access tokens, session credentials or a new authorization grant. The `authorization` object only tells a configured client which existing service authentication schemes may be used.

## Trust before execution

Every description and every value derived from it is untrusted input. Email authentication can provide evidence about message delivery; it does not grant service permission or make an action endpoint safe.

Before submitting a request, a client MUST establish all of the following independently of the email:

- the service identifier is configured for the client;
- the exact HTTPS execution origin is allowed for that service;
- the client already holds an applicable service credential;
- the profile, interaction type, type version, record digest and operation are supported;
- the description has not expired.

A client MUST NOT send service credentials to an endpoint solely because that endpoint appears in an email. It MUST NOT follow an execution redirect to a different origin without applying the same checks to that origin. It MUST NOT automatically fetch or interpret an unknown schema, URL or instruction named by the message.

## Description

The [MAP schema](/schemas/map-0.1.schema.json) is the field-level contract. A description contains:

| Field | Meaning |
| --- | --- |
| `@id` | A UUID URN identifying the interaction. |
| `profile` | The exact MAP profile URI. |
| `type` | The type URI, version and Registry record digest. |
| `describedAt`, `expiresAt` | The description's creation and expiry times. Expiry MUST be later than creation. |
| `service` | The service identity, execution route, result route, human route and authentication metadata. |
| `target` | The service object, exact revision and digest presented for action. |
| `operations` | Stable operation IDs and readable labels offered for this interaction. |

The service advertises how long it retains results. The minimum permitted value is 300 seconds. A service MUST make the result available for at least the advertised interval after it first records the request outcome.

## Request

The client sends an authenticated `POST` to `service.execution.url` with `Content-Type: application/json`. The body MUST validate as a MAP request and against the named interaction type's input rules.

`requestId` is a UUID URN created by the client. `interactionId` repeats the description's `@id`. The request repeats the exact type reference, target and selected operation so that authorization and stale-target checks do not depend on mutable client state.

Receiving the description does not authorize the request. At execution time the service MUST authenticate the caller and check its permission for the operation and target. It MUST also check expiry, revocation, target currency and any service approval policy.

## Idempotency and recovery

Within one service, a `requestId` identifies one complete request document.

- The first request using an identifier establishes its request value.
- A later request with the same identifier and the same JSON values is a retry. Object member order is irrelevant; array order and every member value remain significant. The service MUST return the previously recorded response without applying the effect again.
- Reuse of the identifier with any changed value is an `idempotency-conflict`. The changed request MUST NOT be applied.

The service returns a `Location` header containing the expanded `resultUrlTemplate`. An authenticated `GET` to that address returns the recorded result or problem response. After a timeout, the client SHOULD retrieve that resource before deciding whether to retry. A timeout is a client-local uncertain state; `uncertain` is not a service result value.

## Results

A successful response uses `application/json` and a MAP result body.

| State | HTTP status | Meaning |
| --- | --- | --- |
| `accepted` | 200 | The requested record was accepted; later work may remain. |
| `completed` | 200 | The requested effect completed. |
| `pending` | 202 | Work is still in progress. |
| `approval-required` | 202 | A service approval is required before the effect can complete. |

The result repeats the request, interaction, operation and exact target references. It includes the authoritative result URL and the time at which this state was recorded.

## Problems

Errors use `application/problem+json` and the [Problem Details](https://www.rfc-editor.org/info/rfc9457) members. MAP adds `profile`, `requestId`, `interactionId`, `code` and, when relevant, `target`.

| Code | Status | Required interpretation |
| --- | ---: | --- |
| `invalid-request` | 400 | The body or type-specific input is invalid. |
| `refused` | 403 | The authenticated caller lacks permission or another required condition. |
| `stale-target` | 409 | The target reference is not current; no effect was applied. |
| `idempotency-conflict` | 409 | The request ID was reused with changed values. |
| `request-in-progress` | 409 | The same request is still being resolved and no recorded result is available yet. |
| `expired-interaction` | 410 | The interaction expired before execution. |
| `unsupported-profile` | 422 | The exact profile is not implemented. |
| `unsupported-type` | 422 | The exact type version or record digest is not implemented. |
| `unsupported-operation` | 422 | The operation was not offered or implemented. |

The service MUST leave its target and business state unchanged when returning one of these problems.

## Version handling

Profile, type version and Registry digest are exact-match contracts in 0.1. A client or service MUST NOT guess compatibility with an unknown value. A new compatible type record still has a new digest and must be declared explicitly by an implementation.

MAP 0.1 defines no custom DNS discovery, global identity provider, mandatory Registry lookup or universal permission language. Service configuration supplies endpoint trust and credentials. Registry documents and schemas can be bundled with implementations and checked offline.
