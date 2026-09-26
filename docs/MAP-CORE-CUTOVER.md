# MAP core cutover plan

Status: plan for approval, 25 September 2026, revision 3. Nothing in it has shipped.

- Revision 2 took in an adversarial review of revision 1; section 10 lists every finding and what happened to it.
- Revision 3 adopts the simplest clean shape: MAP 0.2 as the one cutover, with 0.1 withdrawn and left untouched.

The plan publishes MAP 0.2, a type-agnostic core, and all ten interaction types as executable drafts on it. Nitrosend then switches to it.

## 1. Decisions

1. **MAP 0.2 is the one cutover.**
   - MAP 0.1's files stay published exactly as they are, marked withdrawn.
   - Nothing that exists changes meaning: the published packages, Nitrosend's current evidence and the Registry's history all stay true.
   - The normal rule holds. A published identifier, schema, contract and digest never change; a breaking change takes a new identifier.
2. **Adding a type never changes the core.** A type ships as data: a contract, a request schema, a Registry record and a specification chapter. The core changes only when the way actions execute or are trusted changes.
3. **All ten types become executable drafts on MAP 0.2.**
   - Content Review becomes 0.3; its 0.1 and 0.2 remain as history.
   - The other nine start at 0.1.
4. **Nitrosend has no MAP users, so it simply switches.** It moves to MAP 0.2 and Content Review 0.3 and deploys, and its dogfood evidence is run again. The earlier report stays as true history for 0.1.
5. **Language packages follow as a separate release.**
   - Because 0.1's bytes do not change, the site's package gate still passes, and the cutover does not wait on package publication.
   - Packages `0.2.0` then carry the MAP 0.2 core and validate any type from its contract (JavaScript, Python and Go; Rust embeds the artifacts).
   - Types reach implementers through the Registry catalogue.

## 2. Boundaries

| Layer               | Owns                                                                                                                                             | Changes when                                        | Lives in                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Core profile        | Envelope, description binding, authority modes and their trust rules, decisions and the approval lifecycle, states, problems, retry and recovery | The execution or trust model changes                | `public/schemas/map-0.2.schema.json`, `public/contexts/map-0.2.jsonld`, `docs/specification/profile.md` |
| Contract format     | What a MAP 0.2 type contract may declare                                                                                                         | A new kind of declaration is needed                 | `public/schemas/type-contract-0.2.schema.json`                                                          |
| Shared blocks       | Immutable schema components used by more than one type; today only form fields                                                                   | Never edited; a changed block is a new file         | `public/schemas/forms-0.1.schema.json`                                                                  |
| Type contract       | Details, inputs, outputs, success state, failure reasons, authority and repeatability per operation, consequences, field bindings                | That type changes, as a new type version            | `public/contracts/<type>-<version>.json` and its request schema                                         |
| Registry record     | Discovery, status, prose, examples, references, evidence                                                                                         | Editorial or evidence changes                       | `registry/types/`, `registry/contributions/`                                                            |
| Reference and suite | An executable reading of the core and every contract                                                                                             | Any of the above changes                            | `src/map/`, `conformance/map-0.2/`, `public/fixtures/map-0.2/`                                          |
| Language packages   | Core artifacts and generic contract-driven validation                                                                                            | The core, contract format or a shared block changes | `mailschema/{javascript,python,rust,go}`, prepared from this repository                                 |
| Implementations     | Their services and clients                                                                                                                       | Their products change                               | Nitrosend and, later, others                                                                            |

The core schema contains no type vocabulary. A contract pins, by canonical digest, every schema it depends on: the core schema and any shared block. Blocks are never edited, so adding one never changes another type's digest.

## 3. The core

### 3.1 Description

```json
{
  "@context": "https://mailschema.org/contexts/map-0.2.jsonld",
  "@type": "MailAction",
  "@id": "urn:uuid:…",
  "profile": "https://mailschema.org/profiles/map/0.2",
  "type": {
    "id": "https://mailschema.org/types/action-approval",
    "version": "0.1",
    "contractDigest": "sha-256:…"
  },
  "describedAt": "2026-09-25T09:00:00Z",
  "expiresAt": "2026-10-02T09:00:00Z",
  "service": {
    "id": "https://buy.example/service",
    "name": "Example Purchasing",
    "authority": "credential",
    "resource": "https://buy.example/",
    "execution": {
      "url": "https://buy.example/map/actions",
      "resultUrlTemplate": "https://buy.example/map/results/{requestId}",
      "resultRetentionSeconds": 604800
    },
    "humanUrl": "https://buy.example/approvals/po-881"
  },
  "target": {
    "id": "https://buy.example/proposals/po-881",
    "revision": "2",
    "title": "Design tool licence, 20 seats",
    "digest": "sha-256:…"
  },
  "details": { "…": "defined by the type contract" },
  "operations": [
    { "id": "approve", "name": "Approve", "description": "Approve purchase order 881 as stated." },
    { "id": "decline", "name": "Decline", "description": "Decline purchase order 881." }
  ]
}
```

| Member              | Rule                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service.authority` | The interaction's authority mode, `credential` or `possession`. Every offered operation's contract entry must permit it.                                                                                                                                                                                           |
| `service.resource`  | Required for `credential`, absent for `possession`. It is the RFC 9728 protected resource identifier.                                                                                                                                                                                                              |
| `recipient`         | Required for `possession`, absent for `credential`. It is the address the capability was issued to (section 3.4).                                                                                                                                                                                                  |
| `service.execution` | `url`, `resultUrlTemplate` (containing `{requestId}`) and `resultRetentionSeconds` (at least 300). The profile fixes POST, `application/json` requests and results, and `application/problem+json` problems, so they are no longer written in every message.                                                       |
| `target`            | `id`, `revision`, optional `title`, and `digest`. The revision and digest cover only terms the service controls, never responses to the interaction. When the representation travels in the message, such as an iCalendar part, the type defines `digest` as the SHA-256 of its bytes, and the client verifies it. |
| `details`           | Present if and only if the contract defines `detailsSchema`, and valid against it.                                                                                                                                                                                                                                 |
| `operations`        | `id`, `name` and `description`. The operations are drawn from the contract, which binds their request schema.                                                                                                                                                                                                      |

A description is immutable. A changed contract, target revision, details or operation set is a new interaction with a new `@id`.

The message carries exactly one designated `application/ld+json` part whose `@type` is `MailAction`, at the top level of the delivered message. A description inside an attached `message/rfc822` is never processed.

The JSON-LD context maps `details` as a JSON literal (`@type: @json`) and `recipient` to `schema:recipient`.

### 3.2 Description digest and the request

The **description digest** is `sha-256:` followed by the hex SHA-256 of the RFC 8785 canonical JSON of the description exactly as parsed from the message.

The service computes it when it sends, from the bytes it serialized, never from native objects. It stores it with the interaction, or rebuilds the identical description from the interaction identifier and state that cannot change; a description whose content would differ is a new interaction. A request carries the digest, and the service rejects a request whose digest differs from that of the description it issued. The rejection is an unclaimed `invalid-request`, as for an unknown interaction.

The digest binds everything the agent was shown: the title, the operation wording, the details and the human link. A forged message that reuses a genuine `interactionId` therefore cannot get a request through.

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

- **`type` stays** so a gateway can choose the request schema without looking up stored state.
- **The repeated `target` goes.** The description digest is the one precondition, and the service reports staleness from its own state.
- **`requestId` stays in the body.** It names the result resource, including behind a capability, and the HTTP Idempotency-Key draft expired in April 2026.
- **I-JSON (RFC 7493) applies to every MAP document.** That means no duplicate keys, no lone surrogates, and every number within ±(2^53−1). Details carry integers only; decimal values travel as strings.
- **Size limit:** a description is at most 64 KiB, and its arrays and objects nest at most 32 deep, the outermost counting as one. The shared I-JSON vectors pin every boundary.

### 3.3 Decisions, states and problems

**Decisions.** Each operation in a contract is either a decision (the default) or `repeatable`.

- The first decision operation that completes decides the interaction.
- A later decision request is refused with the new problem `already-decided` (409), recorded under its request identifier.
- A pending approval on a decided interaction ends as `failed` with reason `superseded`.
- Repeatable operations, such as feedback, progress reports, preference changes and calendar replies, stay available until the interaction expires. For a calendar reply, the latest response wins, as in iTIP.

**States** are unchanged: `accepted`, `completed`, `failed`, `pending`, `approval-required`.

- **`failed`:** terminal. Either a type-declared outcome, such as `unavailable`, or a terminal transition from `pending` or `approval-required`. Conditions the core evaluates when a request arrives are problems, not failures: authentication, staleness, expiry, a decided interaction, unsupported contracts and invalid input.
- **Reasons the core reserves:** `declined`, `stale-target`, `expired` and `superseded`. A contract may add others for its own operations.

| Result member       | Rule                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `descriptionDigest` | Echoes the request's value.                                                                                                                                                     |
| `target`            | The interaction's target as the service holds it, not a copy of anything the client sent.                                                                                       |
| `approvalUrl`       | Required exactly when the state is `approval-required`. It is side-effect-free on GET and renders the terms the description digest binds.                                       |
| `reason`            | Required exactly when the state is `failed`.                                                                                                                                    |
| `actor`             | Optional. An opaque reference to the client or agent that sent the request. It stays the same across transitions, is never an identity claim, and is absent in possession mode. |
| `output`            | Always an object, possibly empty, valid against the contract for that operation and state.                                                                                      |

**Problems** keep RFC 9457 and the MAP correlation members. `invalid-request` may carry `errors`, each with a `detail` and a JSON Pointer `pointer` into `input`, in the shape of RFC 9457's own example extension. `stale-target` carries the current target.

**Approval lifecycle.** This is core behaviour, the same for every type that declares it:

- An undecided approval becomes `failed` with reason `expired` at `expiresAt`. The service does not wait for someone to try deciding it.
- Retention runs from the latest recorded state.
- Responses with 202 and `request-in-progress` send `Retry-After`.

### 3.4 Authority modes

Authority is declared per operation in the contract. An interaction has one mode, and it offers only operations that permit that mode.

**Credential.**

- The client is configured with the service's resource identifier, directly or through RFC 9728 `map_services` metadata.
- It holds an existing credential for that resource, sent only in the `Authorization` header, and checks the execution URL, result template and human URL against that configuration. Cookies are never MAP credentials.
- In both modes the service answers another method on the execution URL with 405, and a `Content-Type` other than exactly `application/json` with 415.
- Authentication establishes the principal and actor.

**Possession.** The message is the authority for the operations it offers on its target, as in RFC 8058 one-click unsubscribe.

The service MUST do all of the following:

- Issue one capability per recipient: at least 128 bits from a cryptographically secure generator, in the execution URL path. The result template embeds the same capability, and results are scoped to it.
- Use HTTPS. Never redirect, never require cookies or HTTP authentication, and send `Referrer-Policy: no-referrer` from capability-bearing pages.
- Put the capability nowhere else. `humanUrl` never carries it, and logs redact it.
- Answer an unknown capability with a plain 404 carrying no MAP members, and an expired one with 410.
- Offer possession only for operations whose contract permits it. An operation that permits possession never declares `approval-required`.
- Sign the message with DKIM aligned with the From domain, using `rsa-sha256` with a key of at least 2048 bits or `ed25519-sha256`. The signature has no `l=` tag and covers From, To, Date, Message-ID, MIME-Version and Content-Type, and Cc, List-Id and OTP-Token whenever the message carries them.
- On a platform that sends for its customers, send possession descriptions only under the customer's own verified, aligned domain, never a shared one.

The client MUST check all of the following before any possession request:

1. The top-level delivered message has an aligned DKIM pass meeting the service rules above.
   - The client verifies DKIM on the raw message itself. The signature is currently valid, and its algorithm matches the published key.
   - Alignment follows the DMARC policy of the From domain or its organizational domain.
   - The client reads header fields as its DKIM verifier reads them and refuses a malformed field. Each signed header, and Subject, appears at most once; From names exactly one mailbox; Date is a valid RFC 5322 date-time.
   - It may also rely on RFC 8601 Authentication-Results, but only from its own configured authserv-id.
   - An SPF-only DMARC pass, or a pass obtained through ARC or a local override, does not count.
2. The host of the execution URL, the result template, `humanUrl` and `service.id` is the From domain's organizational domain, as RFC 9989 determines it, or a subdomain of it. Hosts are compared as A-labels.
3. `recipient` is an address the client's principal controls, and the message was delivered to it.
4. It sends no cookies, HTTP authentication or other credentials, and treats a redirect as a failure.
5. The operation's consequences and the type's client rule permit acting (section 3.5).
   - An operation whose consequences go beyond `refusal`, `protection` and `record` needs either a prior relationship between the principal and that organizational domain, or the principal's decision for this interaction.
   - A client that does not implement the type's rule treats `assertion` as needing the principal's decision.

The capability is the principal for request identifiers, retries and result access. The client presents the From organizational domain, not `service.name`, as the party asking.

### 3.5 Consequences

| Consequence     | Meaning                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `refusal`       | Declines what was asked. The principal may lose an opportunity, and nothing else changes.                                                     |
| `protection`    | Cancels a pending request or reports unrecognized activity. The service may stop something or restrict access, including the principal's own. |
| `record`        | Records a statement, such as feedback, a progress figure or a choice of settings. It commits and discloses nothing beyond that statement.     |
| `disclosure`    | Sends the principal's information to the service.                                                                                             |
| `commitment`    | Commits the principal's time, work or money.                                                                                                  |
| `authorization` | Records a decision that permits an effect the service or others carry out later, subject to their own checks.                                 |
| `assertion`     | Affirms that the principal made a request, performed an activity or completed work, and the service may grant or clear something on it.       |

- An operation declares the union of consequences over every valid details value. Action Approval's `approve` is therefore `authorization`, `commitment` and `disclosure`.
- `refusal` and `protection` are never combined with other consequences.
- No consequence is automatically safe. Consequences inform the principal's policy; they do not replace it.

### 3.6 Contract format

```json
{
  "kind": "MapTypeContract",
  "id": "https://mailschema.org/types/meeting-scheduling",
  "version": "0.1",
  "profile": "https://mailschema.org/profiles/map/0.2",
  "target": "Prose meaning of the target.",
  "dependencies": [
    { "url": "https://mailschema.org/schemas/map-0.2.schema.json", "canonicalDigest": "sha-256:…" },
    {
      "url": "https://mailschema.org/schemas/forms-0.1.schema.json",
      "canonicalDigest": "sha-256:…"
    }
  ],
  "detailsSchema": { "…": "inline JSON Schema" },
  "requestSchema": {
    "url": "https://mailschema.org/schemas/meeting-scheduling-0.1.schema.json",
    "canonicalDigest": "sha-256:…"
  },
  "operations": [
    {
      "id": "book",
      "effect": "Prose meaning.",
      "authority": ["credential", "possession"],
      "consequences": ["commitment", "disclosure"],
      "fieldBindings": [{ "input": "/values", "fields": "/attendeeFields" }],
      "results": [
        { "state": "completed", "outputSchema": { "…": "…" } },
        { "state": "failed", "reasons": ["unavailable"], "outputSchema": { "…": "…" } }
      ]
    }
  ]
}
```

The Registry build rejects a contract that breaks any of these rules:

- Every `$ref` resolves into a pinned dependency or the request schema, and the core schema is always pinned.
- Each operation declares exactly one success state, `accepted` or `completed`.
- `reasons` appears only on `failed` and uses no reserved name the core does not assign.
- An operation that declares `approval-required` also declares `failed` with `declined`, `stale-target`, `expired` and `superseded`, and does not permit possession.
- An operation that declares `pending` declares its failure reasons.
- The consequence rules in section 3.5 hold.
- Field binding pointers resolve to a `fields` block in the details schema and a `fieldValues` member in the request schema.
- Every object in `detailsSchema` restricts its property names to ASCII.
- The request schema binds the type identifier, the version and every operation identifier as constants.

`fieldBindings` states the rule for a form-shaped input. The input at `input` must contain only the fields that the details define at `fields`, and must satisfy them, including `required`, with formats asserted on both sides. If the details have no such fields, the input is absent.

### 3.7 Form fields

`forms-0.1.schema.json` defines three blocks.

**`fields`**, based on the Model Context Protocol elicitation schema:

- It is a closed, flat subset of JSON Schema: text, integer and number fields with integer bounds, true-or-false, single choice and multiple choice.
- It has no `pattern`, `$ref` or conditionals.
- Field names are ASCII.
- Each field may carry an `autocomplete` HTML autofill field name. Names for passwords, one-time codes and payment card data are rejected.

**`choiceFields`**: the same, restricted to true-or-false and choice fields.

**`fieldValues`**: the values that answer either block.

The label is advisory. Whatever a field is called, a client never supplies a password, one-time code, access token or payment card data through a form.

### 3.8 Processing

**Client:**

1. Find the single top-level `MailAction` part and parse it as I-JSON within the limits.
2. Validate it against the core schema and match the profile exactly.
3. Select the bundled contract and compare `contractDigest`.
4. Validate `details` against the contract, and verify `target.digest` where the type binds it to a part in the message.
5. Check each offered operation against the contract and the interaction's authority mode.
6. Check expiry.
7. Establish trust for the mode.
8. Apply the principal's policy through consequences and the type's client rule.
9. Compute the description digest. Prepare the request, persisting `requestId` and reusing it on redelivery. Validate it against the request schema and field bindings.
10. Submit it. After a timeout, read the result before any retry.

When asking a person to decide, the client shows the details and target, not the readable body.

**Service:** as in 0.1, with these changes:

- check the description digest first;
- resolve the capability as the principal in possession mode;
- report staleness from its own state;
- apply decisions and repeatable operations;
- apply field bindings and type rules, returning a claimed `invalid-request` with `errors`;
- run one approval lifecycle for every type that declares it.

### 3.9 Alternatives rejected

| Alternative                                                             | Why not                                                                                                                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changing 0.1 in place                                                   | The same identifier would mean different bytes in published packages and evidence, and the site's package gate would block the cutover until packages republished.          |
| A details digest in the description, plus a repeated target in requests | The client can compute a details digest itself, so carrying it proves nothing, and it leaves the title, wording and links unbound. One description digest binds everything. |
| Possession as a separate profile                                        | Documents, results, retries and recovery are identical. Only the authority differs, and authority is declared per operation.                                                |
| Authority per interaction only                                          | Account Activity shows why not: reporting must work through the mailbox, while confirming must need the account's login.                                                    |
| Schema.org actions as the envelope                                      | Schema.org has no binding, retry, result or approval semantics. MAP maps to it through JSON-LD.                                                                             |
| Signed descriptions (JWS)                                               | DKIM authenticates possession messages, and the description digest checked by the service binds credential-mode messages.                                                   |
| Idempotency-Key header                                                  | The draft expired, and `requestId` also names the result resource.                                                                                                          |
| One large shared definitions file                                       | Changing it would re-pin every contract. Blocks are small and never edited.                                                                                                 |

## 4. The ten types

Every type reuses an existing standard's meaning. Operations are decisions unless marked **repeatable**. "C" means credential and "P" means possession.

### Content Review 0.3

Reuses: Schema.org Actions, for vocabulary only.

| Operation                     | Authority | Input                                         | Success, failure                                                                             | Consequences  |
| ----------------------------- | --------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------- |
| `request-changes`, repeatable | C         | `feedback`, 1 to 12,000 characters, not blank | accepted `{feedbackRecorded: true, feedbackId}`, where `feedbackId` is issued by the service | record        |
| `approve`                     | C         | none                                          | completed `{decision: "approved"}`; approval lifecycle                                       | authorization |

Details, all optional:

- `supersedes`: the previous revision and its digest.
- `addressesFeedback`: service-issued feedback identifiers.

### Action Approval 0.1

Reuses:

- RFC 9396 for the terms;
- CIBA for a decoupled human decision;
- the Agent Payments Protocol's hash-bound approval, as a precedent.

| Operation | Authority | Input                                     | Success, failure                                                         | Consequences                          |
| --------- | --------- | ----------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| `approve` | C         | none                                      | completed `{decision: "approved"}`; approval lifecycle, plus `withdrawn` | authorization, commitment, disclosure |
| `decline` | C         | optional `reason`, up to 2,000 characters | completed `{decision: "declined"}`                                       | refusal                               |

Details:

- `summary`;
- optional `requester`, with a name and an identifier;
- `authorizationDetails`: 1 to 20 RFC 9396 objects with ASCII keys.

Client rule: a client never approves automatically when any authorization detail type is one it does not understand.

### Information Request 0.1

Reuses: MCP elicitation, HTML autofill, JSON Schema 2020-12.

| Operation         | Authority | Input                        | Success, failure                    | Consequences |
| ----------------- | --------- | ---------------------------- | ----------------------------------- | ------------ |
| `submit-response` | C, P      | `values`, bound to `/fields` | accepted `{responseRecorded: true}` | disclosure   |
| `decline`         | C, P      | optional `reason`            | completed `{decision: "declined"}`  | refusal      |

Details: `purpose` and `fields`.

### Event Response 0.1

Reuses:

- iCalendar, iTIP and iMIP for identity, revision and reply meaning;
- JSCalendar for the lowercase status values.

| Operation                         | Authority | Input              | Success, failure                               | Consequences |
| --------------------------------- | --------- | ------------------ | ---------------------------------------------- | ------------ |
| `accept`, repeatable              | C, P      | optional `comment` | completed `{participationStatus: "accepted"}`  | commitment   |
| `decline`, repeatable             | C, P      | optional `comment` | completed `{participationStatus: "declined"}`  | refusal      |
| `respond-tentatively`, repeatable | C, P      | optional `comment` | completed `{participationStatus: "tentative"}` | commitment   |

Details:

- `event`: the UID and an optional RECURRENCE-ID, as a UTC date-time or a date, never with RANGE.
- `attendee`: the invitee's `mailto:` calendar address.

Type rules:

- The target revision is the invitation's SEQUENCE.
- The message carries the iMIP REQUEST, and `target.digest` is the SHA-256 of that `text/calendar` part.
- The client verifies the UID, RECURRENCE-ID, SEQUENCE and digest against that part.
- A client using this route does not also send an iTIP REPLY.

### Meeting Scheduling 0.1

Reuses:

- VPOLL candidate identifiers;
- iCalendar for the booked event;
- RFC 7953 as related work.

| Operation | Authority | Input                                       | Success, failure                                    | Consequences           |
| --------- | --------- | ------------------------------------------- | --------------------------------------------------- | ---------------------- |
| `book`    | C, P      | `slot`; `values` bound to `/attendeeFields` | completed `{uid, start, end}`; failed `unavailable` | commitment, disclosure |
| `decline` | C, P      | optional `reason`                           | completed `{decision: "declined"}`                  | refusal                |

Details:

- `summary`;
- `slots`: 1 to 100, each with a unique id, a start and an end;
- optional `attendeeFields`.

Type rules:

- `slot` must be offered; if not, the service returns `invalid-request` with a pointer.
- Availability is service state outside the offer revision.

### Subscription Preferences 0.1

Reuses:

- RFC 8058 for leaving;
- RFC 2369 and RFC 2919 for list headers;
- the M3AAWG sender practices for confirmed opt-in.

| Operation                        | Authority | Input                        | Success, failure          | Consequences |
| -------------------------------- | --------- | ---------------------------- | ------------------------- | ------------ |
| `update-preferences`, repeatable | C, P      | `values`, bound to `/fields` | completed `{effectiveAt}` | record       |

Details:

- optional `listId`, which equals the message's List-Id header;
- `fields`, limited to the choice-only form block.

Leaving the list stays with RFC 8058.

### Task Assignment 0.1

Reuses:

- iCalendar to-dos and iTIP section 3.4;
- A2A and MCP task states, as related work.

| Operation                       | Authority | Input                                                                           | Success, failure                              | Consequences |
| ------------------------------- | --------- | ------------------------------------------------------------------------------- | --------------------------------------------- | ------------ |
| `accept`                        | C         | optional `comment`                                                              | completed `{participationStatus: "accepted"}` | commitment   |
| `decline`                       | C         | optional `reason`                                                               | completed `{participationStatus: "declined"}` | refusal      |
| `report-progress`, repeatable   | C         | `percentComplete`, an integer from 0 to 100 (PERCENT-COMPLETE); optional `note` | accepted `{progressRecorded: true}`           | record       |
| `report-completion`, repeatable | C         | `report`; up to 20 HTTPS `evidence` links                                       | accepted `{completionRecorded: true}`         | assertion    |

Details:

- `task`, identified by its UID;
- `summary`;
- optional `due` and `completionRequirements`.

Type rule: the target revision is the to-do's SEQUENCE, and `target.digest` is the SHA-256 of the VTODO part the message carries.

### Payment Request 0.1

Reuses:

- the SEPA Request-to-Pay scheme on ISO 20022 pain.013 and pain.014;
- RFC 9396's payment member names;
- schema.org Invoice;
- Peppol and EN 16931 for the invoice itself.

| Operation | Authority | Input                                                        | Success, failure                                | Consequences |
| --------- | --------- | ------------------------------------------------------------ | ----------------------------------------------- | ------------ |
| `accept`  | C         | `paymentDate`; the service may refuse a date after `dueDate` | completed `{decision: "accepted", paymentDate}` | commitment   |
| `decline` | C         | optional `reason`                                            | completed `{decision: "declined"}`              | refusal      |

Details:

- `creditorName`;
- required `creditorAccount` (an IBAN with an optional BIC, or another account identification);
- optional `creditorIdentifier`;
- `instructedAmount`, as a currency and a decimal string;
- `dueDate`;
- optional remittance text and `invoice`.

A changed account or amount is a new revision.

### Email Confirmation 0.1

Reuses:

- RFC 8058's request shape;
- the OTP-Token header;
- the wrong-recipient report draft as precedent;
- the Email Verification Protocol as the no-email alternative;
- the M3AAWG sender practices.

| Operation             | Authority | Input           | Success, failure              | Consequences |
| --------------------- | --------- | --------------- | ----------------------------- | ------------ |
| `confirm`             | P         | none            | completed `{confirmed: true}` | assertion    |
| `report-unrecognized` | P         | optional `note` | completed `{cancelled: true}` | protection   |

Details: `origin`, `address`, `purpose` (account creation, sign-in, address change or subscription), and `requestedAt`.

Client rules. Automatic confirmation needs all of the following:

- exactly one pending request the client itself recorded before the message's Date;
- the same origin, whose host is under the From organizational domain;
- the same address, compared exactly;
- the same purpose;
- a time within its validity.

For sign-in and address changes, the address must also be unique to that request, such as a per-request subaddress. Anything else goes to the principal.

Service rules:

- A report never reveals whether an account exists.
- A message offers either `confirm` or an OTP-Token code, never both. A code email may offer `report-unrecognized` alone.

### Account Activity 0.1

Reuses:

- RFC 8417 Security Event Tokens;
- OpenID Shared Signals, CAEP and RISC event types;
- NIST SP 800-63B-4 section 4.6, on notifications that let the recipient repudiate an event.

| Operation             | Authority | Input           | Success, failure                  | Consequences |
| --------------------- | --------- | --------------- | --------------------------------- | ------------ |
| `confirm`             | C         | none            | completed `{recognized: true}`    | assertion    |
| `report-unrecognized` | C, P      | optional `note` | accepted `{reportRecorded: true}` | protection   |

Details:

- `summary`;
- `occurredAt`;
- `account`, masked;
- optional Shared Signals `eventType`;
- optional `observedFrom`, as an IP address, user agent and location.

Client rules:

- Automatic confirmation needs exactly one activity the client recorded that matches the event type, time and, where given, the IP address.
- A report is sent only on the principal's statement.

Service rule: a report only starts protective steps. It never grants access or changes recovery details.

## 5. Work by repository

### 5.1 `mailschema/mailschema`

**MAP 0.1, withdrawn:**

- Its schema, context, profile record, contracts and fixtures stay published and byte-identical.
- The specification reader documents only MAP 0.2.
- `VERSIONING.md` records the withdrawal and the last commit whose suite covered 0.1.
- The 0.1 conformance suite and the 24 September readiness audit script retire from the build. The suite stays unchanged in `conformance/map-0.1/`, because the frozen 0.1 profile record links to its manifest, and `VERSIONING.md` records the commit where it last ran. The audit record and `SCOPE-AUDIT.md` stay as history.

**Canonical MAP 0.2 artifacts:**

- `map-0.2.schema.json`, `map-0.2.jsonld` and `profiles/map/0.2.json`.
- `type-contract-0.2.schema.json` and `forms-0.1.schema.json`.
- Ten contracts and request schemas: `content-review-0.3`, and the other nine at 0.1.
- The contract loader picks the contract format from each contract's profile, so the catalogue keeps listing Content Review 0.1 and 0.2 as history.

**Examples and fixtures:**

- `conformance/map-0.2/examples.mjs` is the one source of example data per type.
- `scripts/map-fixtures.mjs` writes `public/fixtures/map-0.2/<type>/` from it, computing every digest, and fails the check when files drift.
- It also writes the signed email kit. Every message is signed with a published test key and verified against stubbed DNS:
  - valid credential-mode and possession-mode messages;
  - negative messages that `assertTrustedPossession` refuses, each for the rule it breaks: no signature, spoofed Authentication-Results, an SPF-only pass, `l=` with appended text, a short RSA key, an Ed25519 signature over an RSA key, `rsa-sha1`, a future signature, an unsigned To, Content-Type, Cc or List-Id, a foreign endpoint, a description inside an attached or inline `message/rfc822`, obsolete or repeated headers, and a From with two mailboxes;
  - authentic messages that trust accepts by design and a type's client rule stops: a lookalike domain, and a confirmation that also carries an OTP-Token.
- It also writes the shared RFC 8785 vectors.

**Reference implementation:**

- `src/map/artifacts.ts` is the one loader, also used by `src/registry/contracts.ts`: schemas, dependencies, contracts, validators, digests and the contract rules.
- `src/map/reference.ts` holds one contract-driven service and client. The description digest, decisions, authority modes, field bindings, the approval lifecycle and recovery are all generic, and const-only outputs are derived from the contract.
- `src/map/behaviours.ts` is the only type-specific service and client code:
  - Content Review's feedback identifier;
  - Meeting Scheduling's slot rules (unique identifiers, each slot ending after it starts, and booking only an offered slot), availability and the booked event;
  - the Payment Request date rule and its accepted output;
  - the Subscription Preferences effective time;
  - the iCalendar SEQUENCE as the target revision of Event Response and Task Assignment;
  - the client rules for Email Confirmation, Account Activity, Action Approval and Payment Request.
- `src/map/mail.ts` binds a calendar part to its target digest, and `assertTrustedPossession` verifies DKIM on the raw message, the organizational domain, the recipient and the host rules.

**Conformance suite (`conformance/map-0.2/`):**

- The existing 34 cases, carried over to the new core.
- For every type:
  - the description validates and its digest is enforced;
  - each operation reaches its declared state;
  - an exact retry has no second effect;
  - a forged title, wording, details or human link is refused;
  - an operation or authority outside the contract is refused;
  - decisions and repeatable operations behave as specified, including `already-decided` and `superseded`.
- The type rules, and field-binding errors.
- The approval lifecycle, including expiry at the deadline and `Retry-After`.
- The signed email kit, capability scoping, 404, 405 and 410 behaviour, and the rule that possession requests carry no credentials.
- The RFC 8785 vectors.
- The requirements matrix and a manifest binding every artifact. `scripts/conformance.ts` and `scripts/map-profile.ts` become generic over the catalogue.

**Registry and website:**

- Ten Draft records on MAP 0.2. Content Review's record moves to 0.3, and its Nitrosend test report stays attached to the 0.2 snapshot it was made against.
- Nine new chapters, and a Types group in the navigation.
- `profile.md` rewritten for MAP 0.2. Revised `index.md`, `interaction-model.md`, `authorization.md`, `outcomes.md`, `interoperability.md` and `content-review.md`.
- The tests follow the data.
- The Tools page describes each selected package by the MAP version it implements, so the MAP 0.1 packages stay labelled as such until their 0.2 releases.

**Documents:**

- `VERSIONING.md`: MAP 0.2, 0.1 withdrawn, and "adding a type never changes the profile".
- `ROADMAP.md`: the finished items are removed.
- Also update: `README.md`, `ARCHITECTURE.md`, `TYPE-COLLECTION.md`, `CONTRIBUTIONS.md`, the proposal template and `VALIDATION.md`.
- The unsubmitted Internet-Draft is revised to describe MAP 0.2.

### 5.2 Language packages (step 7)

Each package's artifact list becomes the MAP 0.2 core:

- the contribution and record schemas;
- `map-0.2`, its context and `type-contract-0.2`;
- `forms-0.1`.

Content Review leaves the packages. Every package moves to `0.2.0`.

| Package    | API                                                                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JavaScript | `mapErrors`; `validateDescription(description, contract)`; `validateRequest(request, contract, requestSchema, description)`; `validateResult(result, contract)`; `descriptionDigest(description)`; `contractDigest(contract)`; core artifact getters |
| Python     | The same in snake case, with RFC 8785 from Trail of Bits' `rfc8785`                                                                                                                                                                                  |
| Go         | Typed MAP 0.2 documents, strict decoding, generic contract validation and `DescriptionDigest`, with RFC 8785 from the RFC author's reference implementation                                                                                          |
| Rust       | Embedded core artifacts only, as today                                                                                                                                                                                                               |
| Ruby       | New in this family: see section 5.2.1                                                                                                                                                                                                                |

- Each repository gets a pull request with native CI.
- After publication, `packages:promote --promote` writes the evidence.
- The same pull request switches the Tools page to the new API.
- The RFC 8785 vectors and the I-JSON vectors run in JavaScript, Python, Go and Ruby.

#### 5.2.1 The Ruby package

Approved on 25 September. The protocol mechanics a Ruby service needs live in the `mailschema` gem, so Nitrosend keeps only its product. It starts at `0.2.0`, with the MAP 0.2 core.

**Contents.** It bundles the MAP 0.2 core schema, its context, the contract format and the forms block, plus the Registry contribution schema every package binds, and no type contracts. An implementation vendors the contracts it supports, and the gem verifies them by digest. The gem carries the contribution schema as bytes and does not validate contributions: that schema asserts `format` and uses `\S`, which Ruby's validator reads differently from the Registry's, so contribution checks stay in the JavaScript and Python packages.

**API.** Everything lives in the module `Mailschema`, the constant `bundle gem mailschema` generates. The public surface is what `sig/mailschema.rbs` declares, and the gem's README lists every call; validators, the RFC 8785 encoder, JSON Pointer and form rules are private constants. The main calls:

| Call                                                                                      | Does                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mailschema.parse(json)`                                                                  | Parses a MAP document as I-JSON within the core limits, or raises `Mailschema::InvalidDocument`                                                                                                                                                                 |
| `Mailschema.canonicalize(value)`, `Mailschema.digest(value)`                              | RFC 8785, and `sha-256:` over it, for description and contract digests                                                                                                                                                                                          |
| `Mailschema.map_errors(document)` and the four core definition checks                     | Check any MAP document against the core schema, or a description, request, result or problem against its core definition only                                                                                                                                   |
| `Mailschema::Contract.new(contract, request_schema, digest:)`                             | Checks its format and profile, refuses any contract but the one pinned by `digest`, checks its pinned dependencies and request schema digest, validates every schema against JSON Schema 2020-12 and compiles every validator once, or raises `InvalidContract` |
| `contract.description_errors(description)`                                                | The reference's description rules: core schema, exact type, details and form rules, operations offered once and permitted by the authority mode, dates, and capability issuance                                                                                 |
| `contract.request_problem(description, request, now:)`                                    | The exact type, an offered operation the authority permits, and expiry, as a `Contract::Problem` or nil. The service then applies its own state, then `input_errors`                                                                                            |
| `contract.input_errors(description, request)`                                             | The operation's input and its field bindings, as `detail` and a JSON Pointer into `input`                                                                                                                                                                       |
| `contract.result_errors(result)`                                                          | The core result, the declared output schema and the declared reason                                                                                                                                                                                             |
| `Mailschema.result`, `Mailschema.problem`, `Mailschema.transition`                        | Builds results and problems with their correlation members, the status from the code, and state transitions that keep every correlation member                                                                                                                  |
| `Mailschema.retain_until(description, at)`, `Mailschema.settle(result, description, now)` | Result retention from the latest recorded state, and expiry of an undecided approval at `expiresAt`                                                                                                                                                             |
| `Mailschema.reached?(now, deadline, after:)`                                              | Whether a deadline has passed; anything but a core date-time has, so a mistake fails closed                                                                                                                                                                     |
| `Mailschema.capability(description)`, `Mailschema.written_path(url)`                      | The possession capability: the last segment of the execution URL's path as written                                                                                                                                                                              |

**Not in the gem:**

- possession trust (DKIM, DMARC and the organizational domain);
- type rules a contract cannot express, which belong to each type's implementation;
- persistence, authorization and effects.

**Choices:**

- `json_schemer` validates JSON Schema with ECMA-262 regular expressions. Its default Ruby regexps let `^` and `$` match at line breaks, so a pattern-bound token would accept `"approve\nevil"`. `format` is never asserted: lexical forms are core patterns in the portable subset.
- RFC 8785 is the gem's own implementation. The established Ruby gem, `json-canonicalization`, formats `0.30000000000000004` as `0.3` and patches core classes.
- `json` is at least 2.21, for duplicate member detection and the refusal of comments, and below 4.
- Ruby 3.3 or later. Ruby 3.2 reached end of life on 31 March 2026, and the locked development dependencies need 3.3.

**Scaffold.** The layout, `Rakefile`, `Gemfile`, `.gitignore`, `bin/` and gemspec metadata are those `bundle gem mailschema --test=minitest --linter=rubocop` generates, with `Gemfile.lock` committed. Four files differ. The `Gemfile` adds `rbs` and loads the development gems only on demand. The gemspec lists its files explicitly, because the gem is built from `.release/packages/ruby/`, which Git ignores here. `.rubocop.yml` enables new cops and sets size limits that fit validators. The `Rakefile` adds an `rbs` task, so `bundle exec rake` runs Minitest, RuboCop and `rbs validate`. The repository adds the family's `test.yml` and `release.yml`, with every action pinned by commit, plus `CONTRIBUTING.md`, `SECURITY.md` and `UPSTREAM.md`, as the Python, Rust and JavaScript repositories do.

**Verification.** The gem's tests are prepared from this repository and run on Ruby 3.3, 3.4 and 4.0:

- the shared RFC 8785, I-JSON (text and bytes) and lexical-form vectors;
- every published MAP 0.2 fixture document, validated with its contract pinned by the digest its description names, with each request's `descriptionDigest` recomputed;
- contracts that are not the one pinned, and pinned contracts that break a rule;
- request problems, capability rules, field formats, input error pointers, deadlines and problem correlation;
- a randomized comparison of number formatting with ECMAScript.

`rbs validate` checks the signatures on every run. Before release they were also checked against the running suite with `rbs test`, which flags only the two tests that pass non-JSON values on purpose.

**Release:**

- `packages:prepare` writes `.release/packages/ruby/`.
- A tested copy goes to a new `mailschema/ruby` repository.
- `release.yml` publishes on a `v*` tag through RubyGems trusted publishing, from the `rubygems` environment, and attaches the gem to a GitHub release.
- `packages:promote --registry RubyGems` reads the published gem back and compares every bundled artifact. The promotion workflow's pull request adds the release evidence and selects the release, and the Ruby tab, already defined, appears on the Tools page with it. The page's text follows each tool's MAP version.

### 5.3 Nitrosend

Nitrosend implements Content Review 0.3 with credential authority only, on the gem, and carries no MAP 0.1 code.

| Area                     | Change                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned artifacts         | `config/mailschema` holds only the Content Review 0.3 contract and request schema, which the gem verifies by digest. The 0.1 and 0.2 files go                                                                                 |
| Description              | Profile 0.2, `service.authority` and `resource`, `details` with `supersedes` when the revision has a predecessor, a title from immutable revision data, and no `inputSchema` or `authorization`                               |
| Interaction identifier   | A UUIDv8 carrying the revision identifier and 58 bits of the digest of everything else the description says. The service rebuilds the description from the identifier alone, and any change to it is a new interaction        |
| Execution                | Resolves the interaction from its identifier and compares the description digest, then the gem's `request_problem`, then `already-decided`, staleness against the current draft, input errors with pointers, and `feedbackId` |
| Lifecycle                | `superseded` when a decision completes, expiry settled on every read, retention from the latest state, and `Retry-After` on 202                                                                                               |
| HTTP                     | 405 for other methods on the execution URL, 415 by the gem's `json_request?`, credentials from the `Authorization` header only, and strict I-JSON parsing of the body                                                         |
| Inbound mail             | The designated part is read at the top level only and validated as MAP 0.2, and its digest is the description digest                                                                                                          |
| App                      | The review page reads `reason` from the result, and explains `superseded`                                                                                                                                                     |
| OpenAPI, SDK and dogfood | The MAP schemas move to 0.2, the Node SDK types are regenerated, and the dogfood harness pins the 0.2 artifacts                                                                                                               |

Decided on 25 September: Nitrosend rebuilds the identical description from the interaction identifier rather than storing its digest, so it needs no schema change. The specification allows either, provided that a description whose content would differ gets a new `@id`.

### 5.4 Evidence

After cutover:

- Run the provider-delivered Content Review dogfood against MAP 0.2 and Content Review 0.3.
- Publish its receipt under `docs/evidence/`.
- Add a first-party test report for the new record.

## 6. Sequence

| Step | Work                                                                                                              | Gate                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1    | Plan approved                                                                                                     | Your approval                                                                                 |
| 2    | MAP 0.2 core, contract format, forms block, ten contracts, examples, fixtures, signed email kit, reference, suite | Check scripts pass, and a second adversarial review of the built artifacts finds nothing open |
| 3    | Specification, records, site, documents, Internet-Draft                                                           | Full `npm run verify` green                                                                   |
| 4a   | The Ruby package, verified against the shared vectors and fixtures                                                | Its tests green, and a fresh adversarial review of MailSchema and the gem finds nothing open  |
| 4b   | Nitrosend on the Ruby package, MAP 0.2 and Content Review 0.3                                                     | Nitrosend suites green                                                                        |
| 5    | Merge MailSchema (the site deploys), then deploy Nitrosend                                                        | Your approval; live Nitrosend descriptions validate against the live 0.2 schema               |
| 6    | Evidence: dogfood run, receipt, Registry test report, `VALIDATION.md`                                             | The run passes, and you approve the merge                                                     |
| 7    | Packages `0.2.0`: pull requests, publication, promotion, Tools page                                               | Your approval to publish; public readback matches every byte                                  |

Step 7 can run alongside steps 4 to 6.

**Rollback:** revert the MailSchema merge and roll Nitrosend back with Kamal. MAP 0.1 was never changed, so nothing else needs undoing.

## 7. Verification

| Claim                                           | Proof                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The core is type-agnostic                       | The core schema and context contain no type vocabulary, and the contract rules reject unpinned references |
| Every type is executable                        | Every operation of every contract runs through the reference engine                                       |
| Nothing the agent was shown can be swapped      | Forged title, wording, details and human-link cases are refused with no effect                            |
| Possession mode holds against real mail attacks | Each forged or weak message in the kit is refused for its rule; each authentic abuse by its client rule   |
| Decisions happen once                           | `already-decided` and `superseded` cases                                                                  |
| Digests agree across languages                  | The shared RFC 8785 vectors pass in JavaScript, Python, Go and Ruby                                       |
| Packages carry exact canonical bytes            | Public readback evidence for each registry                                                                |
| Nitrosend speaks MAP 0.2                        | Its specs, plus the live provider-delivered run                                                           |

The suite proves the reference implementation and the fixtures. A deployed service's claims still rest on its own evidence.

## 8. Risks

| Risk                                         | Control                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RFC 8785 implementations disagree            | I-JSON limits, integer-only details, ASCII keys, and shared vectors in TypeScript and Ruby                                                             |
| Validators read one schema differently       | No `format` is asserted; every pattern is in the portable subset, linted at load; shared lexical, I-JSON and media type vectors in TypeScript and Ruby |
| Possession mode is abused                    | Recipient binding, strict DKIM, organizational domain, per-operation authority, consequences and type rules, backed by the negative message kit        |
| The specification, reference and draft drift | One source of examples; every artifact bound by digest; the draft revised in the same pull request                                                     |
| The Tools page lags the core until step 7    | It states that the current packages implement MAP 0.1                                                                                                  |

## 9. Approvals

1. This plan.
2. Merging MailSchema and deploying Nitrosend.
3. Merging the evidence.
4. Publishing the four `0.2.0` packages.
5. Creating `mailschema/ruby`, setting up RubyGems and publishing the gem.

## 10. Review findings

| Finding                               | Disposition                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 recipient binding                  | Adopted: `recipient`, one capability per recipient, top-level part only                                                                                     |
| B2 authentication strength            | Adopted: aligned DKIM only, no `l=`, required header coverage, key sizes, own authserv-id, no ARC or override                                               |
| B3 per-operation authority            | Adopted; the earlier rejection is reversed                                                                                                                  |
| B4 unbound description                | Adopted: one description digest replaces the details digest and the repeated target                                                                         |
| B5 confirmation matching              | Adopted: exactly one prior match, per-request address for sign-in and address change, origin under the From domain, `clientReference` removed               |
| S1 freeze 0.1 and use new identifiers | Adopted in revision 3: MAP 0.2, with 0.1 withdrawn and unchanged                                                                                            |
| S2 consequences                       | Adopted: `protection` split out, `assertion` narrowed, union rule, and the "loose rules" line removed                                                       |
| S3 domain trust                       | Adopted: `service.id` under the From domain, prior relationship or the principal's decision, tenant domains on sending platforms, A-labels                  |
| S4 capability handling                | Adopted in full                                                                                                                                             |
| S5 concurrency                        | Adopted: decisions and repeatable operations, `already-decided`, `superseded`, revisions over service terms only                                            |
| S6 failure versus problem             | Adopted                                                                                                                                                     |
| S7 approval expiry                    | Adopted                                                                                                                                                     |
| S8 RFC 8785 hardening                 | Adopted                                                                                                                                                     |
| S9 calendar binding                   | Adopted                                                                                                                                                     |
| S10 payee account                     | Adopted                                                                                                                                                     |
| S11 inputs                            | Adopted: inputs are listed per operation                                                                                                                    |
| S12 field semantics                   | Adopted                                                                                                                                                     |
| S13 digest pinning                    | Adopted: immutable blocks, core schema pinned in every contract                                                                                             |
| S14 Content Review request schema     | No longer applies                                                                                                                                           |
| S15 cutover gaps                      | No longer applies: 0.1 is unchanged, Nitrosend has no MAP users, and packages are decoupled                                                                 |
| S16 over-claims                       | Adopted: signed email kit, forged-display cases; Rust scoped explicitly                                                                                     |
| S17 cross-site requests               | Adopted: `Authorization` header only, exact `application/json`                                                                                              |
| Consider 1 to 7                       | Adopted: actor definition, RFC 9457 `errors`, OTP-Token exclusivity, List-Id match, unknown RFC 9396 types, one top-level part, service-issued feedback ids |

The first review above covered this plan. The second covered the built artifacts; every finding now has an executable case or a recorded decision.

| Finding                                                | Disposition                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 inline `message/rfc822`                             | Fixed: the reader walks the MIME tree itself; `inline-attached-message` and `embedded-message` are refused                                                                                                                      |
| B2 unsigned headers deciding structure                 | Fixed: Content-Type, MIME-Version and Cc must be signed, singletons enforced, and every header read by the DKIM verifier's own parser                                                                                           |
| B3 key strength from the `a=` tag                      | Fixed: real key type and length, `rsa-sha256` or `ed25519-sha256` only; `weak-key`, `ed25519-over-rsa` and `rsa-sha1` are refused                                                                                               |
| B4 List-Id                                             | Fixed: List-Id read from the raw headers, required in `h=`, and matched to `details.listId`                                                                                                                                     |
| Should fix 1 to 12                                     | Fixed, each with a case: From syntax, Account Activity rules, calendar binding, contract lint, capability issuance, input error pointers, client preparation, OTP-Token, strict UTF-8, forms, suite strength and record wording |
| Unparseable Date read as the current time              | Fixed: Date is parsed strictly from the raw header; `invalid-date` is refused                                                                                                                                                   |
| Capability lapse and possession keys                   | Fixed: a capability lapses at expiry plus retention, and request identifiers are keyed by capability                                                                                                                            |
| DMARC policy selection, DNS failure, top-level domains | Fixed: author then organizational policy, failing closed on DNS errors, and a top-level organizational domain refused                                                                                                           |
| Duplicate operations, reversed dates, future `t=`      | Fixed: refused by service and client                                                                                                                                                                                            |
| Problem type and status without a code                 | Fixed: the core schema correlates type and status on its own                                                                                                                                                                    |
| Forms block missing from the profile record            | Decided: the profile record binds the core only, which stays free of type vocabulary. Each contract that uses the forms block pins it by digest                                                                                 |
| 405 and no-credential checks were manual               | Fixed: `http-binding` covers methods, media type, credentials and redirects in the reference                                                                                                                                    |

The third review covered MailSchema and the Ruby gem together, before either was released.

| Finding                                 | Disposition                                                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 formats decided differently          | Fixed: `format` is never asserted. Lexical forms are core patterns in a portable subset, linted at load, with shared lexical vectors both implementations pass                                           |
| B2 expiry skipped for unparseable dates | Fixed: `reached` and `reached?` treat a deadline that does not parse as passed, and the core date-time pattern admits only dates both languages parse                                                    |
| B3 incomplete ECMA-262 translation      | Fixed: the portable subset forbids `\s`, `\d`, `\w` and unescaped dots, so no translation is needed                                                                                                      |
| S1 unescaped pointers                   | Fixed: RFC 6901 escaping in both, with a case for member names holding `/` and `~`                                                                                                                       |
| S2 capability extraction                | Fixed: the last path segment as written in both; dot segments and a trailing slash are refused at issuance                                                                                               |
| S3 request checks outside the gem       | Fixed: `contract.request_problem` returns the exact type, offered operation and expiry problems, with the reference's titles; the README gives the full order                                            |
| S4 punycode recipients                  | Fixed: recipient domains are compared as A-labels                                                                                                                                                        |
| S5 the 415 rule                         | Fixed: `application/json`, compared case-insensitively, with at most `charset=utf-8`, pinned by shared media type vectors that the reference, the gem and Nitrosend follow                               |
| S6 specification contradictions         | Fixed: the digest is compared with the description issued, `unsupported-profile` is gone, the 401 is an uncorrelated MAP problem, `actor` is optional, lapse is defined, and limits cover every document |
| S7 digest verification                  | Fixed: `Contract.new` takes the pinned `digest:` and refuses any other contract                                                                                                                          |
| Consider items                          | Adopted, each with a test or a case                                                                                                                                                                      |

The fourth review covered the release candidate across MailSchema, the gem and Nitrosend. It found no blockers; every other finding is fixed.

| Finding                                          | Disposition                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact retry after expiry answered 410            | Fixed: Nitrosend settles a recorded approval before its retention check on a retry, as a read does, with a spec                                                                                                                                                                                                                   |
| Possession descriptions in customer mail         | Fixed: Nitrosend sends credential descriptions only, and still carries any valid description it receives                                                                                                                                                                                                                          |
| Patterns the lint passed but engines split       | Fixed: the lint parses a printable-ASCII grammar and refuses empty classes, brackets and `&&` in classes, malformed or stacked quantifiers and stray braces. The core writes its whitespace class as `\uXXXX`. `Contract.new` reports a pattern that does not compile, or a reference that does not resolve, as `InvalidContract` |
| OpenAPI and SDK drift                            | Fixed: the result read documents 202 and every recorded problem status, 415 has its own plain problem schema, `unsupported-profile` is gone, and every other method on the execution URL, OPTIONS and TRACE included, answers 405                                                                                                 |
| The 0.1 profile record's conformance link        | Fixed: `conformance/map-0.1/` stays unchanged outside the build, and `VERSIONING.md` links the commit where it last ran                                                                                                                                                                                                           |
| The README omitted idempotency                   | Fixed: the service order includes the replay of a claimed request identifier                                                                                                                                                                                                                                                      |
| No `UPSTREAM.md` for the Ruby repository         | Fixed: `npm run packages:ruby-upstream` generates it from the merged source commit when the repository is created                                                                                                                                                                                                                 |
| Deadlines outside the core form                  | Fixed: `reached` and `reached?` first require a core date-time, so `Date.parse` and `Time.iso8601` leniencies never set a deadline                                                                                                                                                                                                |
| Principal addresses as U-labels                  | Fixed: principal addresses compare as A-labels, with a signed internationalized-recipient fixture                                                                                                                                                                                                                                 |
| `uniqueItems` and `multipleOf` across validators | Fixed: the gem parses integral numbers as Integers, as I-JSON reads them, and the lint requires an integer `multipleOf`                                                                                                                                                                                                           |
| `rbs` outside the build                          | Fixed: `bundle exec rake` validates the signatures                                                                                                                                                                                                                                                                                |
| Pattern and digest wording                       | Fixed: the profile and draft state the exact pattern subset, and that the digest covers what the client parses back                                                                                                                                                                                                               |
| `contract-rules` without matchers                | Fixed: the unchanged contract loads, and each mutation is refused by its own rule                                                                                                                                                                                                                                                 |
| Package documents                                | Fixed: `PACKAGE-NAMES.md` points at the release record; the Ruby tab joins the Tools page in the pull request after the gem's promotion                                                                                                                                                                                           |

The fifth review covered the same candidate after those fixes. It found no blockers.

| Finding                                        | Disposition                                                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Long exponents read differently in Ruby        | Fixed: the gem reads every decimal exactly and converts it to the double ECMAScript reads. Valid I-JSON vectors carry the RFC 8785 form JavaScript produces, and number-spelling vectors pin it |
| The gem's Registry checks disagreed            | Fixed: the gem no longer validates contributions or records; it carries the contribution schema as bytes, which the package set binds                                                           |
| `Contract.new` left request-time failures      | Fixed: `patternProperties` names compile at load, and a reference fragment must be a JSON Pointer in both implementations                                                                       |
| A customer `Content-Type` rebuilt the MIME     | Fixed: Nitrosend reserves `MIME-Version` and every `Content-*` header, with specs for each and for a possession description sent through the API                                                |
| A concurrent retry returned 500                | Fixed: the unique index decides a race, and the execution looks the request up again once it holds the flow                                                                                     |
| The catalogue named one contract format        | Fixed: each catalogue entry names its `contractFormat`, and the catalogue format is `mailschema-registry/2`                                                                                     |
| Stale counts and records                       | Fixed: the roadmap and validation record give current versions, counts and checks                                                                                                               |
| Pattern wording, RFC 9396, README gaps         | Fixed: the profile and draft list every allowed escape, RFC 9396 is cited for Action Approval only, and the README gives the full replay step and every call                                    |
| Upstream provenance                            | Fixed: the generator compares every bundled file with the cited commit before writing `UPSTREAM.md`                                                                                             |
| Null array elements dropped from customer mail | Fixed: Nitrosend reads `mail_action` from the JSON body itself, keeping nulls and reading numbers as ECMAScript does                                                                            |
| Second-principal replay untested               | Fixed: a teammate's key is refused both the claimed identifier and its result                                                                                                                   |
| Artifacts resolved from the working directory  | Fixed: the reference service validates with the artifacts it was given, and field checks run through the loaded contract                                                                        |
| V8 14.6 and negated classes before `$`         | Accepted: an engine defect on Node 26 for astral input; no published pattern has that shape, and CI runs Node 24                                                                                |
| Preflight OPTIONS and unknown methods          | Accepted: CORS preflight is answered by the CORS layer, and Rails refuses methods it does not know with 405 before routing                                                                      |

The sixth review covered the candidate after those fixes. It found no blockers.

| Finding                                      | Disposition                                                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| References to non-schemas and through arrays | Fixed: both loaders resolve a reference as RFC 6901 does, through arrays, require a schema at its target, and refuse `$dynamicRef` and `$recursiveRef`, with the same cases in the suite and the gem |
| U+0000 in a request crashed storage          | Fixed in the core: no MAP string or member name contains U+0000, which many stores refuse or truncate. Both parsers refuse it, and shared vectors pin it                                             |
| Repeated member names in customer mail       | Fixed: Nitrosend reads `mail_action` from a JSON body with repeated names refused. The 64 KiB and depth limits apply to the document Nitrosend delivers, which is its own serialization              |
| Quantifier bounds and forms undocumented     | Fixed: the profile and draft give `{n}`, `{n,}` and `{n,m}` with bounds of at most four digits                                                                                                       |
| Promotion does not add the Ruby tab          | Fixed in the plan: a pull request after promotion adds the tab, checked against the published gem                                                                                                    |
| The gem outside MailSchema's CI              | Fixed: the verify job runs the prepared gem's `rake` before any deployment                                                                                                                           |
| Another brand's interaction refused as known | Fixed: it is answered as an unknown interaction, unclaimed, revealing nothing                                                                                                                        |
| Stored headers applied after reservation     | Fixed: the message builder applies the same reservation, so a message stored earlier cannot rebuild the MIME                                                                                         |
| Inbound storage changed a description        | Fixed: a validated extraction is stored exactly, so its recorded digest still covers it                                                                                                              |
| Provenance covered the bundled files only    | Fixed: the generator requires the cited commit, clean, and prepares the gem from it                                                                                                                  |
| README, roadmap and audit links              | Fixed: `dependencies:` is documented, the roadmap no longer states the undeployed implementation as live, and the audit links the retired script at its last commit                                  |

The seventh review found one blocker, introduced by the sixth round's fixes, and nothing else it could not reproduce.

| Finding                                         | Disposition                                                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blocker: the builder stripped Nitrosend headers | Fixed: the reservation applies where a customer's stored headers are read, not in the builder, so `List-Unsubscribe` and `X-Nitro-*` reach the raw MIME again, with a sender spec asserting both |
| References that failed at request time          | Fixed: the gem resolves every reference at load, as a request would. Both loaders require a plain JSON Pointer fragment, a string `$ref`, and no nested `$id`, `$anchor` or `$dynamicAnchor`     |
| Input errors beyond the problem limits          | Fixed: a pointer too long to report names its nearest ancestor that fits, and a detail too long is cut, in both implementations                                                                  |
| Provenance let untracked files in               | Fixed: the generator refuses untracked and ignored files wherever preparation reads                                                                                                              |
| `mail_action` only in the query string          | Fixed: a JSON body without the member is refused as input, not a 500                                                                                                                             |
| Correlated `authentication-required`            | Fixed in the core: the problem `code` enum no longer includes it, and the gem's builder refuses to correlate it                                                                                  |
| Temporary roots left by `contract-rules`        | Fixed: each is removed when its mutation is checked                                                                                                                                              |

The eighth review found no blockers.

| Finding                                              | Disposition                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An unclaimed problem's detail past its limit         | Fixed: the gem's problem builder refuses an empty or overlong title, an empty detail and an empty error list, cuts a detail at the core limit, bounds each input error, and keeps only as many of the first 100 as fit in 64 KiB. The identifiers, result URL and target come from the caller, and `Mailschema.problem_errors` checks the whole problem |
| TypeScript counted pointer length in code units      | Fixed: both implementations count code points, as JSON Schema does, with a shared astral case                                                                                                                                                                                                                                                           |
| The site still labelled MAP 0.1 as current           | Fixed: the home page, footer, review example and specification footer name MAP 0.2 and Content Review 0.3                                                                                                                                                                                                                                               |
| Documents denied possession authority                | Fixed: the roadmap and security policy state possession as the one exception, as the profile does                                                                                                                                                                                                                                                       |
| Flow test sends failed on providers without raw MIME | Fixed: a test send carries the review description only through a provider that sends raw MIME, and an API `mail_action` its sender's provider cannot carry is refused before admission                                                                                                                                                                  |
| Malformed identifiers reached the database           | Fixed: only a UUID URN is looked up for a result or an approval                                                                                                                                                                                                                                                                                         |
| Contracts with malformed schemas                     | Fixed: the gem validates every contract schema against JSON Schema 2020-12 before compiling it                                                                                                                                                                                                                                                          |
| Strict compilation undocumented                      | Fixed: the profile states that the Registry compiles every schema strictly                                                                                                                                                                                                                                                                              |
| Snapshots of edited records would disappear          | Fixed: the four records edited in place are restored, and their 0.2 versions are amendments, so every earlier snapshot is still served                                                                                                                                                                                                                  |
| Stale documents                                      | Fixed: the validation record, Content Review's inputs, the Sourcey version and the reader test's scope are current                                                                                                                                                                                                                                      |
| The provenance generator outside the repository      | Fixed: it is `scripts/ruby-upstream.mjs`, run as `npm run packages:ruby-upstream`                                                                                                                                                                                                                                                                       |
| Promotion without the gem's suite                    | Fixed: the promotion workflow runs the prepared gem's `rake`, as verification does                                                                                                                                                                                                                                                                      |
| Timing across brands                                 | Fixed: an interaction is resolved within the caller's brand, so another brand's revision is never read                                                                                                                                                                                                                                                  |
| A body that is not UTF-8 at the execution URL        | Accepted: Rails refuses it with 400 while logging parameters, before the application runs; the status is right, and a MAP problem body would need middleware in front of Rails                                                                                                                                                                          |
| "Nothing in it has shipped"                          | Accepted until release: it is true until the MailSchema merge, and the release updates it                                                                                                                                                                                                                                                               |

The ninth review found no blockers.

| Finding                                                            | Disposition                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A repeated `Content-Purpose` lost an inbound message               | Fixed: the extractor records a repeated header, and any failure while reading the part, as an unreadable MAP part instead of raising                                                                                                                                                                                                          |
| RubyGems promotion would fail its own verification                 | Fixed: the Tools test expects exactly the selected registries, and neither the Tools page nor the package documents count the ecosystems                                                                                                                                                                                                      |
| Problems past 64 KiB, and builder inputs the core refuses          | Fixed: both implementations keep only as many input errors as fit, and the gem refuses an empty or overlong title, an empty detail and an empty error list                                                                                                                                                                                    |
| Strict compilation stated wrongly                                  | Fixed: the profile states Ajv's `strictTypes` rule, a type declared in the same schema or in an enclosing one on the same value                                                                                                                                                                                                               |
| Request identifier scope                                           | Fixed: an identifier is claimed within the service's tenant, the account or the capability, another principal in the tenant is refused, and each tenant has its own identifiers. A per-principal namespace was not chosen: Nitrosend claims per account, a teammate who reuses an identifier learns nothing, and identifiers are random UUIDs |
| Correlated access refusals                                         | Fixed: a problem is correlated only when it states what happened to a request, so refusing access on a retry, a read or a decision is uncorrelated and changes nothing                                                                                                                                                                        |
| Noncharacters accepted                                             | Fixed: both parsers refuse them, with vectors, and the profile, draft and requirement say so                                                                                                                                                                                                                                                  |
| Anchors not read alike                                             | Fixed: `^` and `$` are whole-value anchors in the profile and draft, and every anchored lexical form has line-break vectors, now including tokens, digests and UUID URNs                                                                                                                                                                      |
| Capability rules unwritten, and URLs the reference could not serve | Fixed: the capability is at least 22 base64url characters in the last segment of the execution URL, and the result template begins with the execution URL and `/`; both implementations check this at issue                                                                                                                                   |
| Ambiguous meeting slots                                            | Fixed: slot identifiers are unique and every slot ends after it starts, checked by service and client                                                                                                                                                                                                                                         |
| The draft omitted profile rules                                    | Fixed: the draft carries the retention minimum, the problem table and its agreement rule, the stale target, the contract rules, possession's actor and party, the log requirement, the tenant rule, request validation, refused decisions, the result URL and `Location`, and the ban on resolving a message-named schema                     |
| Lost Registry snapshots                                            | Fixed: every record edited in place before amendments existed, five from the launch and two later Content Review records, is archived verbatim in `registry/snapshots/`, named and checked by digest, and served again; a test pins all twelve digests ever published                                                                         |
| A capability could lapse before its results expire                 | Fixed: a capability lapses only once nothing recorded under it is still retained                                                                                                                                                                                                                                                              |
| Template expansion and fragments                                   | Fixed: the core pattern keeps `{requestId}` out of the fragment, and expansion writes each `:` as `%3A`, asserted on `Location`                                                                                                                                                                                                               |
| The media type `application/json;`                                 | Fixed: empty parameter slots are ignored, as RFC 9110 permits, in both implementations and in Nitrosend's spec                                                                                                                                                                                                                                |
| Number bound, details names, calendar parts and Registry rules     | Fixed: numbers are read as the nearest IEEE 754 double, details names are ASCII identifiers, the calendar digest covers the decoded bytes of exactly one part for Event Response and Task Assignment, with a to-do case, and the profile states every rule the Registry enforces                                                              |
| Test sends: expiry, replay order and Postmark                      | Fixed: a retry replays the stored description before resolving the sender, an expired description is omitted, and a spec covers a real Postmark sender                                                                                                                                                                                        |
| The review demo                                                    | Fixed: feedback stays available after approval, which stands, and the input limit is the contract's 12,000                                                                                                                                                                                                                                    |
| Invented history on new records                                    | Fixed: the five new records carry only their 0.1 entry                                                                                                                                                                                                                                                                                        |
| Document drift                                                     | Fixed: the roadmap, Sourcey, architecture, validation, audit, package and gem documents state the current state, including the gem's load order, 2020-12 check, `InvalidContract` and problem limits                                                                                                                                          |
| The reader baseline                                                | Fixed: refreshed for MAP 0.2 and Sourcey 3.6.9, with the comparison against the preceding baseline recorded                                                                                                                                                                                                                                   |
| Ruby versions in CI                                                | Accepted: the gem's own repository runs 3.3, 3.4 and 4.0; MailSchema's verification runs the prepared gem on 4.0 to prove agreement with the reference                                                                                                                                                                                        |

The tenth review found one blocker.

| Finding                                             | Disposition                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker: five launch snapshots were not served      | Fixed: the archive keeps records exactly as published and serves them without compiling them, since some predate the current record format. All seven records edited in place are archived, and a test pins the twelve digests ever published  |
| Holding a message kept its capability alive         | Fixed: a capability lapses at expiry plus retention unless a request claimed before expiry is still retained, and refusals recorded after expiry never extend it                                                                               |
| Where the calendar part sits                        | Fixed: the one calendar part may sit anywhere outside an attached message, as iMIP places it, and a second one anywhere refuses the binding; both layouts are cases                                                                            |
| The result route could not serve its own `Location` | Fixed: the reference matches the template's prefix and suffix, and anything but a request identifier is a plain 404, in the reference and in Nitrosend                                                                                         |
| The client dropped deliberate repeats               | Fixed: the reference client keys a request to an instruction of its principal; redelivery reuses it, and accepting again after declining is a new request                                                                                      |
| Nitrosend answered 406 for unreadable media types   | Fixed: the router admits only a POST of `application/json` and answers 405 and 415 from Rack endpoints, before Rails reads the body or a credential                                                                                            |
| Approving on the page was not the decision          | Fixed: the revision's own approval decides the interaction, and a pending proposal settles as superseded at that time on its next read                                                                                                         |
| Deleting a flow erased its claims                   | Accepted in the profile: a service may delete an interaction with its target, and then answers it as unknown. Owners must be able to delete their data, and keeping tombstones would add schema weight for no protocol gain                    |
| "In any order" against the claiming rule            | Fixed: malformed, unknown-interaction and digest refusals come first, without claiming                                                                                                                                                         |
| Registry rules the profile did not state            | Fixed: the profile lists them, and the Registry refuses Ajv's `nullable`, `dependencies` and `definitions`, which JSON Schema 2020-12 does not define; `nullable` had let a null through that other validators refuse. Mutations pin each rule |
| The profile against the schema                      | Fixed: `interactionId` only when known, the problem `type` form, the retention maximum, and the core schema now requires `code` on every problem but `invalid-request`, `refused` and `authentication-required`                                |
| Client checks missing from the draft                | Fixed: the draft requires validating the description, its details and expiry, and states the instruction rule                                                                                                                                  |
| SCOPE-AUDIT numbers                                 | Fixed: attributed to `e2f2cc6`, where they were measured                                                                                                                                                                                       |
| The gem README's replay steps                       | Fixed: tenant scope and uncorrelated access refusals                                                                                                                                                                                           |
| The gem's builders took invalid input               | Fixed: every builder raises rather than return a document the core refuses, and `Mailschema.request_id?` is the one definition of a request identifier, which Nitrosend now uses                                                               |
| Identifiers per tenant                              | Accepted: request identifiers are client-generated UUIDs, each authenticated account resolves its own, and a client acting in several tenants has no reason to reuse one                                                                       |
| Lexical vector gaps                                 | Fixed: details keys, contract digests, form field names and autocomplete tokens have vectors, and every anchored form refuses CR, CRLF, NEL, LS and PS as well as LF                                                                           |
| Draft and requirement wording                       | Fixed: the obsolete Date forms, the plain 410 on lapse, and five requirements the draft stated without MUST                                                                                                                                    |
| Nitrosend's 405 depended on the credential          | Fixed by the Rack endpoints                                                                                                                                                                                                                    |
| `multipart/related` without `type`                  | Fixed: the builder names the root part's type, as RFC 2387 requires                                                                                                                                                                            |
| The dogfood client never checked the human route    | Fixed: it finds the resource's organizational domain by the RFC 9989 tree walk and refuses a human route outside it                                                                                                                            |
| Cookie sessions could decide approvals              | Fixed: a decision takes the app's bearer sign-in and never a cookie session                                                                                                                                                                    |
| An invalid percent-encoding answered 500            | Fixed: a guard in front of rack-cors answers 400                                                                                                                                                                                               |
| Promotion text and the Ruby tab                     | Fixed: the Ruby tab is defined now and appears once the promotion selects the release, and the Tools page text follows each tool's MAP version                                                                                                 |

The eleventh review found one blocker.

| Finding                                                    | Disposition                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blocker: Nitrosend's quoted-printable part corrupted `=XX` | Fixed: Mail takes a body assigned under a transfer encoding as already encoded, so the builder encodes the JSON itself; a spec carries a query string and `=3D` through exactly                                                            |
| A nested `$schema` split the two implementations           | Fixed: only the request schema's root declares `$schema`, as JSON Schema 2020-12, in the Registry and the gem                                                                                                                              |
| `type: ["string", "null"]` passed                          | Fixed: a type list is refused, in the Registry and the gem                                                                                                                                                                                 |
| Nitrosend could send documents over 64 KiB                 | Fixed: MAP documents are written with `JSON.generate`, as the gem measures them, not Rails' HTML-escaping renderer                                                                                                                         |
| Processing order against the capability rules              | Fixed: the profile orders a service's answers in stages, the HTTP binding first with an unknown or lapsed capability before the body, then the unclaimed refusals; the reference's HTTP binding and the gem README follow it               |
| Two approvals could both complete                          | Fixed: Nitrosend reads the revision again under the flow lock                                                                                                                                                                              |
| Result URLs that are not result resources answered 200     | Fixed: the router admits only the exact result URL of a request identifier, as sent, and answers anything else with a plain 404 whatever the credential; the reference does the same, and matches a template's suffix without its fragment |
| The Tools page overflowed with a fifth tab                 | Fixed: the tab strip scrolls on small screens, with a test that adds a tab                                                                                                                                                                 |
| The SDK typed every input as empty                         | Fixed: the OpenAPI gives each operation its input                                                                                                                                                                                          |
| The dogfood client followed redirects                      | Fixed: every credential-bearing request refuses redirects                                                                                                                                                                                  |
| Content Review 0.2 called current                          | Fixed: labelled withdrawn                                                                                                                                                                                                                  |
| Field bindings missing from the draft                      | Fixed: the draft defines them for both clients and services                                                                                                                                                                                |
| The path guard never fired in production                   | Removed: Puma hands Rack a binary path, which rack-cors reads without failing, and a request target that is not well-formed gets HTTP's own 400, which the profile now allows                                                              |
| The reference client sent requests it had not validated    | Fixed: `prepare` checks the whole request against the core and the contract's request schema                                                                                                                                               |
| The field-validator cache kept every schema in Ajv         | Fixed: an evicted block is removed from Ajv too, so 1,000 blocks leave at most 128 compiled                                                                                                                                                |
| `autocomplete` anywhere                                    | Fixed: it belongs to the form fields block and is refused in a contract's own schemas                                                                                                                                                      |
| DMARC version case                                         | Fixed: the tag name ignores case and the value is exactly `DMARC1`, in the reference and the dogfood client                                                                                                                                |
| Requirement actors and Payment Request wording             | Fixed: the calendar binding is a client rule, and the due date is a MUST                                                                                                                                                                   |
| The catalogue and the archive                              | Fixed: the documents say the catalogue lists the snapshots a declaration can bind, and the archive is served only by digest                                                                                                                |
| Dogfood checks and fixtures                                | Fixed: results must repeat every correlation member and name the configured result URL, and the fixtures are valid MAP 0.2                                                                                                                 |
| Unknown HTTP methods                                       | Accepted: Rails refuses a method no HTTP specification defines before any route, with 405; every method it knows gets `Allow: POST` at the execution URL                                                                                   |
| The approval 409 undocumented                              | Fixed in the OpenAPI, with the cookie refusal                                                                                                                                                                                              |
| Tools page labels                                          | Fixed: each tab's MAP version comes from the core schema its release evidence binds, and the panels and the check command show it                                                                                                          |
| The formatter could rewrite released files                 | Fixed: `.prettierignore` protects every released MAP 0.1-era file, the evidence and the archive                                                                                                                                            |
| The review demo hid operations after feedback              | Fixed: both stay available                                                                                                                                                                                                                 |
| The provenance script listed files by hand                 | Fixed: it reads `packages/artifacts.json`                                                                                                                                                                                                  |

The twelfth review found no blockers.

| Finding                                                            | Disposition                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A body that is not UTF-8 got Rails' own 400                        | Fixed: the MAP controllers answer it as an unclaimed `invalid-request`, credential or not, since Rails raises it before any `rescue_from`                                                                                  |
| The processing order contradicted the binding                      | Fixed: the profile and draft order a service's answers in three stages, the HTTP binding first, including an unknown or lapsed capability, then the unclaimed refusals, then the rest; the eleventh-round row is corrected |
| The OpenAPI did not tie input to operation                         | Fixed: each operation is its own request variant with its input, the feedback carries the core's non-blank pattern, and every request identifier is the exact UUID URN                                                     |
| No verdict for a binding whose fields block is absent              | Fixed: its input is absent, in the profile, the draft and Meeting Scheduling, with a case                                                                                                                                  |
| Fragments in the resource and execution URL                        | Fixed: the core's `httpsTarget` keeps both fragment-free, with vectors                                                                                                                                                     |
| The draft did not name its artifacts and diverged from the profile | Fixed: the draft names the profile record and each artifact's digest, which the profile check compares; the keywords, the description rules, the processing stages, the strict rules and the HTTPS requirement agree       |
| The gem accepted a request schema in another dialect               | Fixed: it requires JSON Schema 2020-12 at the root, walks only schema positions, and refuses `autocomplete` and an `$id` or `$schema` anywhere else, as the Registry does                                                  |
| Withdrawn versions were not marked                                 | Fixed: one list of withdrawn profiles marks the Tools panels and the Registry's contract list                                                                                                                              |
| The demo's note contradicted a standing approval                   | Fixed: the note follows the decision                                                                                                                                                                                       |
| Strictness differed between routes and implementations             | Fixed: Nitrosend admits only the exact execution URL and the exact result URL, query included, as the reference does                                                                                                       |
| `autocomplete` under a member named like a keyword                 | Fixed: the Registry walks schema positions, never names                                                                                                                                                                    |
| The frozen MAP 0.1 manifest's commands                             | Accepted: VERSIONING records the revision where that suite last ran, and the suite stays byte-identical                                                                                                                    |
| `.prettierignore` coverage                                         | Fixed: contributions are protected too                                                                                                                                                                                     |
| Ruby versions in CI                                                | Accepted as before: the gem's own repository runs every supported Ruby                                                                                                                                                     |
| The Nitrosend declaration's present tense                          | Fixed: it states what production offered when the report was made                                                                                                                                                          |
| One request identifier for every operation of a type               | Fixed: each operation has its own identifiers in the fixtures                                                                                                                                                              |
| The Nitrosend approval page                                        | Fixed: it names the revision by its sequence, as the description does, shows the expiry and the revision it replaces, and its superseded message covers an approval on the flow page                                       |
| The Idempotency-Key date                                           | Fixed: revision 07 of October 2025 expired in April 2026                                                                                                                                                                   |
| Payment Request target, draft references and "authenticated POST"  | Fixed: the payee and due date are part of the target, RFC 2387, 9562 and 5890 are cited, and the profile says a request travels with its credential or through its capability                                              |
| Test gaps                                                          | Fixed: the approval 409 and 400 have a spec, and a case shows the binding's 405 and 415 before a lapsed capability's 410                                                                                                   |
| "Nothing in it has shipped"                                        | Accepted until release, as before                                                                                                                                                                                          |

The thirteenth review was limited to what could force MAP 0.3: the core schema, context, profile record, contract format, the profile's rules and its mapped requirements. It found five such issues.

| Finding                                                                    | Disposition                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carriage ruled out other structured parts, attachments and a later profile | Fixed: the part is labelled with the profile through the JSON-LD media type's `profile` parameter. A client processes the one part so labelled outside any attached message and ignores other structured parts, and the partial representation may sit inside `multipart/mixed`, beside attachments, with a published message and cases |
| Whether an `accepted` decision decides                                     | Fixed: the first decision to reach its success state, `accepted` or `completed`, decides the interaction; a pending decision holds it until it ends, since its effect has started; and a decision awaiting approval ends as `superseded`                                                                                                |
| No party asking under credential authority                                 | Fixed: the optional `service.onBehalfOf` names the party a platform asks for, under credential authority only, and a client presents it and keys its policy to its `id` with the service identifier                                                                                                                                     |
| Internationalized mailboxes refused                                        | Fixed: a local part may be RFC 6531 UTF-8 without spaces or invisible and bidirectional format characters, compared exactly apart from ASCII case, with vectors and a signed message; domains stay A-labels                                                                                                                             |
| Approvals only on decisions                                                | Fixed: a repeatable operation may require approval, and `superseded` belongs only to a decision awaiting approval, which the Registry enforces                                                                                                                                                                                          |
| Requirements that differed from the profile                                | Fixed: the approval's success state, the deadline rule, the assertion rule and the human routes match the profile, which now requires side-effect-free `GET`s, deliberate changes protected from cross-site requests, and an approval page that shows the proposal's input                                                              |
| Predictable request identifiers                                            | Fixed: a client SHOULD make them unpredictable, as UUIDv4 and UUIDv7 are                                                                                                                                                                                                                                                                |
| Nitrosend's carriage                                                       | Fixed: its part carries the gem's `Mailschema::DESCRIPTION_MEDIA_TYPE`, attachments sit beside the partial representation in `multipart/mixed`, and its extractor selects by the label                                                                                                                                                  |
| The profile page repeated its opening sections                             | Fixed in Sourcey 3.6.10, which MailSchema pins: 3.6.9 restored inline code as a replacement string, so `` `$` `` inserted the text before it, and a Sourcey test now covers every replacement pattern                                                                                                                                   |
