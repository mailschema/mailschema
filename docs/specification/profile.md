---
title: MAP 0.2 profile
description: The core of Mail Action Protocol 0.2, with its descriptions, requests, results, authority modes and type contracts.
navTitle: MAP 0.2 profile
---

MAP 0.2 is a type-agnostic core. An email carries a description of an interaction. A client acts on it over HTTPS with a request bound to that exact description, and the service reports a result it can recover. What an interaction means comes from its type contract. Adding a type never changes this profile.

The key words **MUST**, **MUST NOT**, **SHOULD** and **MAY** are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) when they appear in capitals.

MAP 0.1 is withdrawn. Its artifacts remain published unchanged at their addresses, and its text is kept in the repository history.

## Published artifacts

| Artifact           | Address                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Profile record     | [`/profiles/map/0.2.json`](/profiles/map/0.2.json)                                                   |
| JSON-LD context    | [`/contexts/map-0.2.jsonld`](/contexts/map-0.2.jsonld)                                               |
| Core schema        | [`/schemas/map-0.2.schema.json`](/schemas/map-0.2.schema.json)                                       |
| Contract format    | [`/schemas/type-contract-0.2.schema.json`](/schemas/type-contract-0.2.schema.json)                   |
| Form fields block  | [`/schemas/forms-0.1.schema.json`](/schemas/forms-0.1.schema.json)                                   |
| Type contracts     | Listed with their digests in the [Registry catalogue](/registry/catalog.json)                        |
| Fixtures and email | [`/fixtures/map-0.2/`](/fixtures/map-0.2/content-review/description.json), including signed messages |

The profile URI is `https://mailschema.org/profiles/map/0.2`, and clients MUST match it exactly. The profile record binds the schema, context and contract format by SHA-256. Implementations bundle those exact bytes. They MUST NOT resolve a schema or context named by a message.

## Email representation

A description represents part of a message, as a [Structured Email](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06) partial representation. The service MUST place it in an `application/ld+json` part labelled with the profile through the media type's `profile` parameter, `Content-Type: application/ld+json; profile="https://mailschema.org/profiles/map/0.2"`. The part MUST carry `Content-Purpose: Machine-readable`, use `base64` or `quoted-printable` transfer encoding, and sit in a `multipart/related` entity beside the readable text and HTML. That entity is the message body or one of its parts, as when the message also carries attachments. Other structured parts, including descriptions labelled with other profiles, may sit beside it.

A client MUST consider only parts outside any attached message. It processes the one designated part whose `profile` parameter lists the profile it implements, ignores every other structured part, and refuses the message when more than one part carries that label or the part is not in a `multipart/related` entity with readable content. A description inside an attached message is never processed.

Every MAP document is [I-JSON](https://www.rfc-editor.org/rfc/rfc7493): valid UTF-8 with no byte order mark, no duplicate member names, no lone surrogates or noncharacters (U+FDD0 to U+FDEF, and the last two code points of every plane), and every number, read as the nearest IEEE 754 double, within ±(2^53−1). No string or member name contains U+0000 either, which many stores refuse or truncate, and which a document bound by its digest cannot lose. Every MAP document is at most 64 KiB, and its arrays and objects nest at most 32 deep, the outermost counting as one. The [shared I-JSON vectors](/fixtures/map-0.2/ijson-vectors.json) pin each boundary.

Lexical forms are the core schema's patterns: date-times, dates, URIs, HTTPS URLs and origins, the result template and email addresses. A date-time has an uppercase `T` and `Z`, at most millisecond precision, a colon in any offset and no leap second. MAP schemas never rely on `format`, and a validator MUST NOT assert it, since format checkers differ between implementations. Every pattern in a MAP schema is printable ASCII in a subset that ECMA-262 with the `u` flag and other regular expression engines read alike, with any other code point written as `\uXXXX`. Its only escapes are an escaped syntax character, `\t`, `\n`, `\f`, `\r` and `\uXXXX` outside the surrogates, and within a class `\-`. It has literal and escaped characters, non-empty character classes with a hyphen only in a range or at either end, `(?:` groups, alternation, `^` and `$`, and one `*`, `+`, `?`, `{n}`, `{n,}` or `{n,m}` after an atom, with bounds of at most four digits and `n` no greater than `m`. It has no class escape such as `\s`, `\d` or `\w`, no unescaped dot, no bracket or `&&` inside a class, and no quantifier on a quantifier. `^` and `$` anchor the start and end of the whole value, as in ECMA-262; an engine whose `$` also matches before a final newline, or whose anchors match at line breaks, as Python's and Ruby's do, MUST read them as absolute anchors. Every `multipleOf` is an integer, since validators round fractional divisors differently. The [shared lexical vectors](/fixtures/map-0.2/lexical-vectors.json) pin each form.

JSON-LD expansion is optional. When it is used, the bundled context maps `MailAction` to `https://mailschema.org/ns/map#MailAction` and `details` to a JSON literal, so expansion never depends on the message's base IRI. Extraction and validation MUST NOT execute an operation or grant authority.

## Description

| Member                     | Rule                                                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@id`                      | A UUID URN identifying the interaction.                                                                                                                                                                                                                                                                  |
| `profile`, `type`          | The exact profile, and the type URI, version and contract digest.                                                                                                                                                                                                                                        |
| `describedAt`, `expiresAt` | When the interaction was created and when it expires. Expiry is later than creation.                                                                                                                                                                                                                     |
| `service.authority`        | `credential` or `possession`. Every offered operation's contract entry MUST permit it.                                                                                                                                                                                                                   |
| `service.resource`         | Required with credential authority and absent with possession authority. It is the [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected resource identifier of the service's MAP API, without a fragment.                                                                                        |
| `service.execution`        | `url` (without a fragment), `resultUrlTemplate` (containing `{requestId}` once, outside any fragment) and `resultRetentionSeconds` (from 300 to 31,536,000, one year). Requests use `POST` with `application/json`; results use `application/json`; problems use `application/problem+json`.             |
| `service.onBehalfOf`       | Optional, and only with credential authority: the party the service asks for when that is not the service itself, as when a platform sends for its customers. `id` is a URI that identifies the party at the service, the same in all its interactions, and `name` is the name the service shows for it. |
| `service.humanUrl`         | A normal service page where a person can complete the interaction.                                                                                                                                                                                                                                       |
| `recipient`                | Required with possession authority and absent with credential authority. It is the address the capability was issued to.                                                                                                                                                                                 |
| `target`                   | `id`, `revision`, optional `title`, and `digest`. The revision and digest cover only terms the service controls, never responses to the interaction.                                                                                                                                                     |
| `details`                  | Present exactly when the contract defines `detailsSchema`, and valid against it. Numbers are integers, and member names are ASCII identifiers at every depth (see [Type contracts](#type-contracts)).                                                                                                    |
| `operations`               | `id`, `name` and `description` for each offered operation of the contract, each at most once.                                                                                                                                                                                                            |

A `GET` on `service.humanUrl`, or on a result's `approvalUrl`, is side-effect free, since link scanners follow links in mail. Anything a person changes there takes their deliberate action, protected from cross-site requests.

A description is immutable. A changed contract, target revision, details or operation set is a new interaction with a new `@id`. A service that delivers the same interaction again MUST send the same description.

The description MUST NOT contain access tokens, session credentials or other grants. Possession authority is the one exception, and it is carried only by the capability in the execution URL, as described below.

## Description digest

The description digest is `sha-256:` followed by the lowercase hex SHA-256 of the [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) canonical form of the description, exactly as parsed from the message.

- **The service computes the digest when it sends.** It computes it over the description it serializes into the message, which a client parses back to the same canonical form. It stores the digest with the interaction, or rebuilds the identical description from the interaction identifier and state that cannot change. A rebuilt description whose content would differ is a different interaction, with a new `@id`.
- **A request carries the digest.** The service refuses a request whose digest differs from that of the description it issued, without claiming its request identifier, as for an unknown interaction.

The digest binds everything the client was shown: the terms, the title, the operation wording and the human route. A forged message that reuses a genuine interaction identifier therefore cannot get a request through.

## Request

```json
{
  "kind": "MapRequest",
  "profile": "https://mailschema.org/profiles/map/0.2",
  "requestId": "urn:uuid:…",
  "interactionId": "urn:uuid:…",
  "descriptionDigest": "sha-256:…",
  "type": { "id": "…", "version": "…", "contractDigest": "sha-256:…" },
  "operation": "approve",
  "input": {}
}
```

The client sends it with a `POST` to `service.execution.url`, with its credential or through its capability. It MUST validate against the core schema and the contract's request schema. `type` lets a gateway choose the request schema without stored state. The service MUST answer another method on the execution URL with 405 and `Allow: POST`, and MUST answer 415 unless the `Content-Type` media type is `application/json`, compared case-insensitively, with no parameter other than `charset=utf-8`; empty parameter slots, which RFC 9110 permits, are ignored. The [shared media type vectors](/fixtures/map-0.2/media-type-vectors.json) pin the rule.

A contract's field bindings name an input that must contain only the fields the details define and satisfy them, including required fields and formats. Where the details define no fields block for a binding, its input is absent. A text field's `format` names a core lexical form: `email`, `uri`, `date` or `date-time`. The service rejects input that fails its contract, a field binding or a type rule with a claimed `invalid-request`. That problem carries `errors`, each with a `detail` and an [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) JSON Pointer into `input`. Implementations may report different sets of errors for the same input; the verdict is what must agree.

## Authority

Each operation in a contract declares the authority it permits. An interaction has one mode and offers only operations that permit it.

### Credential authority

The client already holds a credential for the service, sent only in the `Authorization` header. Cookies are never MAP credentials.

Before sending a credential, the client MUST establish all of the following independently of the email:

- the service identifier is configured;
- the exact execution URL, result template and resource are configured, directly or through [service configuration](#service-configuration);
- the human route sits under the organizational domain of the resource;
- every redirect passes the same checks.

Authentication establishes the principal, on whose behalf the request is made, and the actor, the client or agent that sent it. Neither comes from the MAP body.

The party asking is the service, or the party in `service.onBehalfOf`, for which the service vouches. The client presents that party with the service, and keys its principal's policy to the service identifier and the party's `id` together, never to a name.

### Possession authority

The message itself is the authority for the operations it offers on its target, as in [one-click unsubscribe](https://www.rfc-editor.org/rfc/rfc8058). Anyone who receives a forwarded copy holds the same authority, which is why each contract decides whether an operation permits it.

The service MUST:

- issue one capability per interaction and recipient: at least 128 bits from a cryptographically secure generator, written as at least 22 base64url characters without padding, as the last segment of the execution URL path;
- begin the result template with the execution URL followed by `/`, so every result sits under the capability, and scope request identifiers, retries and results to it;
- use HTTPS, never redirect, and never require cookies or HTTP authentication;
- send `Referrer-Policy: no-referrer` from capability-bearing pages;
- keep the capability out of `humanUrl` and out of its logs;
- answer an unknown capability with a plain 404 carrying no MAP members, and a lapsed one with 410. A capability lapses once the interaction has expired, its retention interval has passed, measured from `expiresAt`, and no result of a request claimed before expiry is still retained. A refusal recorded after expiry never extends it. Once lapsed, the plain 410 replaces every MAP answer under the capability, including `expired-interaction`;
- read the capability from the path exactly as written, never decoded or normalized, and use no dot segments in capability URLs;
- sign the message with DKIM aligned with the From domain, using `rsa-sha256` with a key of at least 2048 bits or [`ed25519-sha256`](https://www.rfc-editor.org/rfc/rfc8463). The signature has no `l=` tag and covers From, To, Date, Message-ID, MIME-Version and Content-Type, and Cc, List-Id and OTP-Token whenever the message carries them;
- when it sends for customers, emit possession descriptions only under the customer's own verified, aligned domain.

Before any possession request, the client MUST establish all of the following:

1. The top-level message carries a DKIM signature that the client verified on the raw message itself and that meets the service rules above. The signature is currently valid, its algorithm matches the published key, and it is aligned with the From domain under the [DMARC](https://www.rfc-editor.org/rfc/rfc9989) policy of that domain or its organizational domain. The client reads header fields as its DKIM verifier reads them and refuses a malformed field. The message carries each signed header, and Subject, at most once, its From header names exactly one mailbox, and its Date is a valid [RFC 5322 section 3.3](https://www.rfc-editor.org/rfc/rfc5322#section-3.3) date-time: a numeric zone, a year from 1900, and none of the obsolete forms. An SPF-only DMARC pass, a pass obtained through ARC or a local override, or an Authentication-Results header from anyone but the client's own receiving system, does not count.
2. The hosts of the execution URL, result template, human route and service identifier are the From domain's organizational domain, as RFC 9989's DNS tree walk determines it, or subdomains of it, compared as A-labels. A DNS failure other than a definite absence, or an organizational domain that is a top-level domain, refuses the message.
3. `recipient` is an address the principal controls, and the message was sent to it. Addresses are compared with their ASCII letters in lowercase, every other character exactly, and their domains as A-labels. A local part may be internationalized, as [RFC 6531](https://www.rfc-editor.org/rfc/rfc6531) allows, without spaces or invisible and bidirectional format characters; a domain in a MAP document is always written as A-labels.
4. The request carries no cookies, HTTP authentication or other credentials, and a redirect is treated as a failure.
5. The operation's consequences and the type's client rule permit acting (see [Consequences](#consequences)).

With possession authority, results never name an actor, and the client presents the From organizational domain, not `service.name`, as the party asking.

## Consequences

Every operation declares what completing it gives away, so a client can apply its principal's policy to a type it has never implemented.

| Consequence     | Meaning                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `refusal`       | Declines what was asked. The principal may lose an opportunity; nothing else changes.                                                         |
| `protection`    | Cancels a pending request or reports unrecognized activity. The service may stop something or restrict access, including the principal's own. |
| `record`        | Records a statement, such as feedback, a progress figure or a choice of settings. It commits and discloses nothing beyond that statement.     |
| `disclosure`    | Sends the principal's information to the service, and through it to any party it asks for.                                                    |
| `commitment`    | Commits the principal's time, work or money.                                                                                                  |
| `authorization` | Records a decision that permits an effect the service or others carry out later, subject to their own checks.                                 |
| `assertion`     | Affirms that the principal made a request, performed an activity or completed work; the service may grant or clear something on it.           |

An operation declares the union of its consequences over every valid details value. `refusal` and `protection` stand alone.

Under possession authority, a client MUST NOT complete an operation whose consequences go beyond `refusal`, `protection` and `record` without one of two things: a prior relationship between the principal and the sending organization, or the principal's decision for that interaction. A client without the type's own rule treats `assertion` as needing the principal's decision. No consequence is safe by itself; consequences inform the principal's policy and never replace it.

## Decisions and repeatable operations

Every operation is a decision unless its contract marks it `repeatable`.

- The first decision whose result reaches its operation's success state, `accepted` or `completed`, decides the interaction.
- A decision whose result is `pending` holds the interaction while the service carries it out. It decides the interaction if it succeeds, and leaves it undecided if it fails.
- A decision request made while the interaction is decided or held is refused with `already-decided`, which is recorded under its request identifier.
- Any decision still awaiting approval when the interaction is decided ends as `failed` with reason `superseded`.
- Repeatable operations, such as feedback, progress reports, preference changes and calendar replies, remain available until the interaction expires. A decision never ends them.

## Results

A result repeats the request, interaction, description digest, type and operation. It carries the interaction's target as the service holds it, the recording time and the result URL.

| Member        | Rule                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state`       | One of the states in [Outcomes](#outcomes).                                                                                                      |
| `approvalUrl` | Required exactly when the state is `approval-required`. It shows the proposal's input and the terms the description digest binds.                |
| `reason`      | Required exactly when the state is `failed`.                                                                                                     |
| `actor`       | Optional: an opaque reference to the client or agent that sent the request. It stays the same across transitions and is never an identity claim. |
| `output`      | Always an object, possibly empty, valid against the contract for the operation and state.                                                        |

The core owns the approval lifecycle:

- An operation that declares `approval-required` MUST also declare `failed` with the reasons `declined`, `stale-target` and `expired`, and a decision also `superseded`. Types may add further reasons, such as `withdrawn`.
- A human decision is authorized independently of the principal that proposed it. An unauthorized decision attempt, or one the service's rules refuse at that moment, is answered with `refused` and leaves the proposal unchanged.
- An undecided approval becomes `failed` with reason `expired` at `expiresAt`, without waiting for someone to attempt a decision.
- Responses with status 202 send `Retry-After`.

## Principal and actor

The principal is the subject on whose behalf a request is made. The actor is the client or agent that sent it: an OAuth client, the actor named in a delegated token's `act` claim ([RFC 8693](https://www.rfc-editor.org/rfc/rfc8693)), an API key, or a client authenticated with [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421).

With credential authority, the service MUST record the actor of each claimed request and each human decision separately from the principal. With possession authority, the capability is the principal.

## Idempotency and recovery

A claimed `requestId` identifies one complete request value within the service's tenant: under credential authority, the account the service scopes the principal to; under possession authority, the capability. Each tenant has its own identifiers.

- An exact retry by the principal that claimed it, compared by value, returns the latest recorded response without applying the effect again.
- Reuse of the identifier with any change is an `idempotency-conflict`.
- Use of the identifier by another principal in the tenant is refused without disclosing the saved response.

A client SHOULD make request identifiers unpredictable, as random UUIDv4 and UUIDv7 values are, since another principal in the tenant who predicts one could claim it first.

`requestId` travels in the body rather than in an Idempotency-Key header, because it also names the result resource, including behind a capability.

The result URL is the result template with `{requestId}` replaced by the request identifier, each `:` written as `%3A`. The service returns it in a `Location` header. A URL whose place for the identifier holds anything but a request identifier is not a result resource, and the service answers it with a plain 404, whatever credential comes with it; a request target that is not well-formed, such as one whose percent-encoding is not UTF-8, may instead get HTTP's own 400. A side-effect-free `GET` there by the principal that made the request returns the latest recorded result or problem, after rechecking current permission. After a timeout, a client SHOULD read the result before any retry.

Results remain retrievable until the later of the interaction's expiry and the retention interval, measured from the latest recorded state. After that the service keeps enough to refuse the old request as `expired-interaction`.

A service MAY delete an interaction with its target, as when the target's owner deletes it. It then answers a request for the interaction as for an unknown interaction, and a read of any of its results as `result-not-found`; nothing is applied again, because the target is gone.

Malformed requests, and requests for an unknown interaction or description, MUST NOT claim their `requestId`. For any other request, claiming the identifier, applying or durably starting the effect, and recording recoverable state MUST be atomic, or the service MUST reconcile an interrupted effect without repeating it.

## Outcomes

Results use `application/json`. Problems use `application/problem+json` with the [Problem Details](https://www.rfc-editor.org/info/rfc9457) members plus `profile`, `requestId`, `interactionId`, `code`, and `target` or `errors` where relevant. A problem's `type` is `https://mailschema.org/problems/` followed by its code, and its `type`, HTTP status and `code` MUST agree as the table below gives.

A problem is correlated, carrying the result URL as `instance` with `profile`, `requestId`, `code` and, when the service knows it, `interactionId`, only when it states what happened to a request: a claimed request's recorded response, or an `idempotency-conflict`, `request-in-progress`, `result-not-found` or `expired-interaction` for its identifier. A refusal of the caller's access to a claimed request, on a retry, a read or a decision, says nothing about the request, so it is not correlated and changes nothing. Neither is a problem for an unclaimed request, nor `authentication-required`. So only `invalid-request`, `refused` and `authentication-required` are ever uncorrelated, and the core schema requires `code` on every other problem.

| Outcome                   | HTTP | Document | Meaning                                                                                               |
| ------------------------- | ---: | -------- | ----------------------------------------------------------------------------------------------------- |
| `accepted`                |  200 | Result   | Terminal. The request was recorded; the service may carry out further work.                           |
| `completed`               |  200 | Result   | Terminal. The effect completed.                                                                       |
| `failed`                  |  200 | Result   | Terminal. A type-declared outcome, or the end of pending or approval work, with its `reason`.         |
| `pending`                 |  202 | Result   | Non-terminal. Read the result resource later.                                                         |
| `approval-required`       |  202 | Result   | Non-terminal. A person decides through `approvalUrl`.                                                 |
| `invalid-request`         |  400 | Problem  | Correct the request. Malformed, unknown-interaction and unknown-description requests are not claimed. |
| `authentication-required` |  401 | Problem  | Establish acceptable credentials. The problem is not correlated with any request.                     |
| `refused`                 |  403 | Problem  | Terminal when it is a claimed request's recorded response; an access refusal is uncorrelated.         |
| `result-not-found`        |  404 | Problem  | No retained result exists for the caller.                                                             |
| `stale-target`            |  409 | Problem  | Terminal. The target changed; the problem carries the current target.                                 |
| `idempotency-conflict`    |  409 | Problem  | The identifier belongs to another request value.                                                      |
| `request-in-progress`     |  409 | Problem  | The identifier is claimed without a result yet; read the result resource.                             |
| `already-decided`         |  409 | Problem  | Terminal. Another request decided the interaction, or holds it while its decision is carried out.     |
| `expired-interaction`     |  410 | Problem  | Terminal. The interaction, or its retained result, has expired.                                       |
| `unsupported-type`        |  422 | Problem  | The exact type URI, version or contract digest is not implemented.                                    |
| `unsupported-operation`   |  422 | Problem  | The operation was not offered or implemented.                                                         |

## Type contracts

A contract binds a type's meaning to exact bytes. Its canonical digest is the RFC 8785 SHA-256 digest that descriptions and requests name.

| Member                       | Meaning                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `target`                     | What the operations act on.                                                                        |
| `dependencies`               | Every schema the contract refers to, pinned by canonical digest. The core schema is always pinned. |
| `detailsSchema`              | The details the description carries.                                                               |
| `requestSchema`              | The request schema, pinned by canonical digest.                                                    |
| `operations[].authority`     | `credential`, `possession` or both.                                                                |
| `operations[].consequences`  | What completing the operation gives away.                                                          |
| `operations[].repeatable`    | Whether the operation leaves the interaction undecided.                                            |
| `operations[].fieldBindings` | Inputs that must answer a form fields block in the details.                                        |
| `operations[].results`       | Each permitted state with its output schema, and for `failed` its reasons.                         |

Each operation declares exactly one success state, `accepted` or `completed`. Only `failed` carries reasons, and always at least one. An operation that declares `approval-required` never permits possession, and only such an operation uses the reserved reasons `declined`, `stale-target` and `expired`. A decision among them also declares `superseded`, and only such a decision uses it. An operation that declares `pending` declares how it fails. Each field binding names a form fields block in the details and a field values input. The request schema extends the core request, binds the type identifier and version, and has one branch for each operation of the contract and no other. Details member names are ASCII identifiers: a letter, then at most 63 letters, digits or underscores. The Registry refuses a contract that breaks these rules or refers to a schema it has not pinned. It compiles every schema strictly:

- every keyword belongs to a JSON Schema 2020-12 vocabulary, so earlier or vendor keywords such as `additionalItems`, `dependencies`, `definitions` and `nullable` are refused. The one annotation beyond them, `autocomplete`, belongs to the form fields block and never to a contract's own schemas;
- `type` names one type, never a list;
- a keyword that constrains one JSON type has that `type` declared in the same schema, or in an enclosing one that applies to the same value through `allOf`, `anyOf`, `oneOf`, `not`, `if`, `then`, `else` or `dependentSchemas`; the `type` of a referenced schema does not count;
- no keyword is left without effect: `if` has `then` or `else`, `then` and `else` have `if`, and `minContains` and `maxContains` have `contains`;
- `prefixItems` with n schemas sets `minItems` to n, and `items` to `false` or `maxItems` to n;
- every `$ref` is a pinned URL with an empty fragment or a plain JSON Pointer to a schema, never a relative reference, an anchor or a dynamic reference, and no schema declares `$anchor`, `$dynamicAnchor`, a nested `$id` or a nested `$schema`; the request schema declares JSON Schema 2020-12.

Shared blocks, such as [form fields](/schemas/forms-0.1.schema.json), are never edited in place; a changed block is a new file.

## Service configuration

A client MAY configure a credential-mode service from its [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected resource metadata. It starts from a resource identifier it already trusts and applies RFC 9728's validation. The `map_services` parameter lists the services at that resource:

| Member                | Meaning                                        |
| --------------------- | ---------------------------------------------- |
| `id`                  | The service identifier that descriptions name. |
| `profiles`            | The MAP profile URIs the service implements.   |
| `execution_url`       | The exact execution URL.                       |
| `result_url_template` | The exact result template.                     |

Both URLs MUST use HTTPS on the resource identifier's origin. Nothing in an email selects the resource or its metadata.

## Processing

A client:

1. finds the one designated part labelled with the profile, outside any attached message and in a `multipart/related` entity with readable content, and parses it as I-JSON within the limits;
2. validates it against the core schema and matches the profile exactly;
3. selects its bundled contract and compares `contractDigest`;
4. validates the details, and checks any target digest the type binds to a part of the message;
5. checks each offered operation against the contract and the authority mode;
6. checks expiry and establishes trust for the mode;
7. applies its principal's policy through the party asking, the consequences and the type's client rule, and shows a person the party, details and target, not the readable body, when asking for a decision;
8. computes the description digest, prepares one request for each instruction of its principal, with a persisted `requestId` it reuses when the same instruction is carried out again, as on redelivery, and validates the request against the request schema and field bindings. A later instruction on the same interaction, such as accepting again after declining, is a new request;
9. submits the request, and after a timeout reads the result before any retry.

A service answers in three stages. Nothing answered in the first two is claimed:

1. The HTTP binding, before the body is read, in any order: a method other than `POST` with 405, a media type other than `application/json` with 415, a URL that names no result resource with a plain 404, and a missing credential with `authentication-required`. Under possession authority, an unknown capability gets a plain 404 and a lapsed one a plain 410.
2. The request itself, with an uncorrelated `invalid-request`: a malformed request, an unknown interaction, and a request whose digest differs from the description it issued.
3. In any order that applies no effect for a problem and reveals no protected state:
   - the principal's current permission;
   - the profile, type, operation and authority;
   - expiry;
   - a decided interaction;
   - staleness against its own state;
   - the input, field bindings and type rules.

It then applies the approval lifecycle or the effect, and records the result.
