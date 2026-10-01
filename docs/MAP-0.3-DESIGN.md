# MAP 0.3 design

Status: architecture decision, 2 October 2026. Frozen as the baseline for specification drafting; no implementation or package change has been made.

## 1. Decision

MAP is an action description carried in email. It is not an execution API.

The message says what is being proposed, which exact terms are current, which operations are available, who the interaction is for, and which service owns it. A person can continue on the service's web page. An agent can use a connector it already trusts for that service. The service remains responsible for authentication, authorization and the atomic state change.

MAP does not define:

- a MAP endpoint;
- a request or result envelope;
- a request-body template carried in email;
- asynchronous job or retry semantics for every service;
- a universal error format for service APIs;
- a way for an email to install a connector, introduce an MCP server or choose where a credential is sent.

This fixes the central failure in 0.2. An adopter describes its real operation once through its existing connector or API integration. It does not build and maintain a second MAP execution surface.

## 2. The four layers

MAP separates four things that 0.2 mixed together.

### 2.1 Interaction

The email carries one interaction instance: its type, service, recipient, subject, exact terms version, expiry, typed details and offered operation identifiers. These are data. They have no instruction authority.

### 2.2 Type contract

A type contract defines the meaning and schema of an interaction. It declares:

- the details a recipient needs to understand the proposal;
- the operations that can be offered;
- the semantic input each operation may collect from the principal;
- the operation's effects, using stable Registry terms;
- whether exact-terms enforcement is required;
- the actors that may perform the operation;
- the semantic outcomes a client needs to understand.

Type contracts are concrete, immutable and addressed by digest. A type defines every field an agent needs to validate, display and evaluate one class of proposal. Types live in the Registry, including types maintained by MailSchema. Adding a type does not change MAP Core and does not require a package release. Schemas may reuse common fragments, but that reuse does not create another protocol layer or an executable generic type.

### 2.3 Service implementation

A service implementation maps the type's semantic operations to interfaces the service already exposes. It also defines a read operation that resolves `terms.id` for the authenticated principal and returns the current interaction, type contract digest, recipient, terms version, state, currently available operation identifiers and authoritative typed terms. The mapping belongs to an installed connector or a versioned, digest-addressed implementation manifest, not to an email.

An implementation may support HTTP, MCP, an SDK, a local tool or another transport. It binds the service identifier, authorized credential origin and tenant semantics. It may declare first-party sending domains as an additional signal, but a multi-tenant service does not have to enumerate every customer domain: authenticated sender identity establishes message provenance, while authoritative readback establishes that the claimed interaction belongs to the service and principal.

MailSchema may catalogue public implementation manifests in the Registry for discovery and conformance. A client never installs or trusts one because a message supplied its location.

### 2.4 Existing operation

Before a credentialed decision, the connector reads the interaction from the service with a credential it already holds. The host validates and presents the service-returned terms. It then calls the service's existing operation. The service authorizes the principal on current state and performs the action atomically against the exact terms version. Its normal success, pending-work and error conventions remain in force.

```text
email instance -> type contract -> trusted service implementation -> existing operation
```

This separation gives MAP a stable core while services, transports and type contributions evolve independently.

## 3. Description carried in email

MAP uses the Structured Email container: an `application/ld+json` partial representation in `multipart/related`, beside readable text or HTML, with the machine-readable part designated through `Content-Purpose` and a profile parameter. The current Structured Email draft defines this container and the relationship between machine-readable and human-readable parts ([draft-ietf-sml-structured-email-06](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/)).

```json
{
  "@context": "https://mailschema.org/contexts/map-0.3.jsonld",
  "@type": "MailAction",
  "@id": "urn:uuid:0199a6c2-4b1e-7c3a-9d2e-5f8a1b2c3d4e",
  "profile": "https://mailschema.org/profiles/map/0.3",
  "type": {
    "id": "https://mailschema.org/types/campaign-send-approval",
    "version": "0.1",
    "contractDigest": "sha-256:..."
  },
  "issuedAt": "2026-10-02T08:00:00Z",
  "expiresAt": "2026-10-05T08:00:00Z",
  "inLanguage": "en",
  "service": {
    "id": "https://api.nitrosend.com",
    "tenant": "https://api.nitrosend.com/accounts/123"
  },
  "recipient": "owner@acme.example",
  "subject": {
    "id": "https://api.nitrosend.com/v1/my/campaigns/42",
    "title": "September update"
  },
  "terms": {
    "id": "https://api.nitrosend.com/v1/my/campaigns/42/delivery-approval",
    "version": "\"sha-256:7c1e...\""
  },
  "details": {
    "summary": "Send “September update” to 4,210 contacts now.",
    "requester": "Automation 8D31",
    "audience": {
      "count": 4210,
      "segment": "Newsletter subscribers"
    }
  },
  "operations": [{ "id": "approve" }, { "id": "decline" }],
  "human": {
    "url": "https://app.nitrosend.com/my/campaigns/42/delivery-approval"
  }
}
```

The description contains instance data only. It does not contain a credentialed API method or endpoint, request body, JSON Pointer mapping, MCP server, tool name or constant tool arguments. The Experimental capability binding in section 5.5 is the sole exception: it may attach one opaque, no-input bearer URL to an eligible operation.

| Member       | Rule                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@id`        | Identifies this recipient's interaction instance. A materially changed interaction gets a new identifier.                                                                                                                        |
| `type`       | Names the type contract and binds its exact bytes by digest. Clients use a bundled or configured catalogue, never a contract location introduced by the message.                                                                 |
| `service`    | Names the service and optional tenant resolved through a trusted connector, or subject to the capability-origin rule in section 5.5. The values alone do not create trust.                                                       |
| `recipient`  | Names the intended mailbox. A client acts only for a principal that controls it and received the message there.                                                                                                                  |
| `subject`    | Names the resource the proposal concerns. Its title is display text, not identity or authority.                                                                                                                                  |
| `terms`      | Names the exact proposal and carries the service-issued version required for consequential operations.                                                                                                                           |
| `details`    | Carries type-defined proposal claims for preview. Before a credentialed decision, the client replaces them with authoritative values returned by the trusted service read. Third-party supplied values remain visibly untrusted. |
| `operations` | Offers operation identifiers from the type contract. The email cannot define new operation semantics.                                                                                                                            |
| `human`      | Names the service page where a person can review and act. Opening it never performs the action.                                                                                                                                  |

The I-JSON, size, nesting and lexical limits from 0.2 remain. URLs are absolute HTTPS URLs without user information. Clients do not dereference type, context or problem identifiers while processing a message.

## 4. Exact terms

The exact-terms rule is the protocol's central invariant.

`terms.version` is an opaque value issued by the service. Any operation whose effect depends on the proposal MUST present that version through its trusted implementation binding. The service compares it with current state in the same atomic transaction as the effect. A mismatch applies nothing.

The transport decides how the value is presented:

- an HTTP implementation may use `If-Match` when `terms.id` is the selected resource and the value is its strong entity-tag; RFC 9110 defines strong comparison and `412 Precondition Failed` for a false `If-Match` precondition ([RFC 9110 §13.1.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1));
- an existing HTTP operation may accept an expected version in its normal request body;
- an MCP tool may accept it as an ordinary argument;
- a web page keeps it in server-side state and re-checks it when the user confirms.

MAP standardizes the invariant, not one transport encoding. An operation that cannot compare the proposal version atomically does not conform for exact-terms actions.

Before it asks a principal to decide a credentialed action, the host MUST resolve `terms.id` through the trusted service implementation. The read MUST establish that the interaction exists, is available to the authenticated principal and intended recipient, uses the named type contract digest, and currently has the stated `terms.version`. An actionable operation must appear in the message, the type contract and the service read. The host evaluates policy and presents the authoritative typed terms and current operations returned by that read, not message-supplied detail fields. A missing, unauthorized or mismatched interaction is not actionable.

When terms change, the sender issues a new interaction. A replacement email uses `SUPERSEDES` as Structured Email specifies for updates ([draft-ietf-sml-structured-email-06 §5.3](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/)). Clients may mark the older message as replaced, but only the service's version check decides whether an operation can still run.

## 5. Bindings and connectors

### 5.1 Core rule

MAP Core is transport-neutral. A conforming client resolves an offered semantic operation only through a service implementation it already trusts. The message cannot supply the executable mapping.

This makes connector installation the trust boundary. A connector can be maintained by the service, the agent host or another reviewed provider. MailSchema's Registry records what a connector claims to implement and its conformance evidence; it does not grant the connector authority.

### 5.2 HTTP binding

The HTTP binding is the first normative companion to MAP Core. Its implementation manifest maps a type operation to an existing API operation and declares:

- the service identifier and allowed origin;
- the type contract digest it implements;
- the existing operation, preferably by a stable OpenAPI operation reference;
- the existing read operation that resolves `terms.id` for the authenticated principal;
- how the read response maps to the interaction identity, contract digest, recipient, version, state, available operations and typed terms;
- the sources of request values from the validated interaction and principal input;
- how `terms.version` is presented;
- the service's existing retry or idempotency behavior;
- how service responses map to the type's semantic outcomes.

The client sends credentials only to an origin already authorized for that connector, follows no credential-bearing redirect and does not acquire a credential because an email names a service. OAuth resource indicators exist to prevent tokens being sent to counterfeit resource servers ([RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html), [RFC 9700 §4.9.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.9.1)).

HTTP remains HTTP. Services may use their normal `2xx`, `202`, `Location`, `Retry-After`, `412` and RFC 9457 problem details. MAP does not redefine their semantics or require six new global problem types. RFC 9457 itself recommends plain status codes for generic conditions and existing domain formats where they already fit ([RFC 9457 §4](https://www.rfc-editor.org/rfc/rfc9457.html#section-4)).

### 5.3 MCP binding

MCP is a companion binding, not part of Core 0.3. Its manifest maps a type operation to a tool on an already configured server. The message never names or introduces the server, tool or arguments.

The binding remains Draft until Nitrosend proves it end to end and a second implementation confirms the mapping. This avoids making a fast-moving transport a normative dependency of the stable core. MCP tool annotations are explicitly hints and must be treated as untrusted unless the server itself is trusted ([MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)). Deferred work uses MCP's own Tasks extension when the server supports it; MAP does not mirror that state machine ([MCP Tasks](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)).

### 5.4 Human route

The human route works in every mail client. A GET or HEAD request displays the current proposal and has no side effect. A consequential operation requires an explicit confirmation submitted from the page, current authorization, CSRF protection and a fresh exact-terms check. RFC 9110 defines GET and HEAD as safe methods ([RFC 9110 §9.2.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)).

The page may use the same application service as the API or connector. It is another interface to one operation, not a separate MAP implementation.

### 5.5 Capability binding

MAP 0.3 includes a separate Experimental capability binding for narrow actions without sign-in. It does not call this mechanism RFC 8058 compatible.

RFC 8058 is a specific unsubscribe protocol. Its fixed `List-Unsubscribe=One-Click` body is deliberately limited to prevent an attacker from using email to submit arbitrary forms ([RFC 8058 §§3.2, 5 and 6](https://www.rfc-editor.org/rfc/rfc8058.html)). The MAP binding carries that lesson forward without reusing the unsubscribe signal:

- each permitted operation has its own opaque, per-interaction and per-recipient HTTPS capability URL;
- `service.id` and the capability URL have the same HTTPS origin, and that host is in the same organizational domain as the strictly aligned DKIM signing domain; a type or trusted local configuration may impose a narrower first-party relationship;
- the URL appears only in the machine-readable binding, and the client shows its origin before consent;
- the client sends one fixed `application/x-www-form-urlencoded` body, `Mail-Action=One-Click`;
- the request carries no operation name, input fields, cookies or HTTP credentials;
- the service accepts no redirect and makes the operation idempotent;
- the capability is scoped to the operation and `terms.version`, revocable, stored hashed and protected by at least 128 bits of randomness;
- the capability expires at or before `expiresAt`, and the service enforces that expiry independently of the client;
- the message goes to one recipient, not Bcc, a list or a distribution group;
- a client sends the POST only after the principal's explicit decision or standing policy.

The capability is the one deliberate exception to the rule that email conveys no authority. It conveys only the narrow bearer authority encoded by that URL. Anyone with a forwarded copy has the same authority, so a type may permit this binding only for an operation that remains acceptable under that condition. No operation with caller-supplied input can use it.

The first permitted cases are refusal, reporting unrecognized activity as a protective signal, and confirming an address for a request the recipient initiated. A protective report cannot by itself authorize an irreversible account change. Commitment, disclosure, payment, permission changes and external communication are excluded.

Each concrete type sets a maximum capability lifetime appropriate to its effect, and an implementation may choose a shorter lifetime. An Email Address Confirmation capability expires within 24 hours of issuance and is invalidated on use, matching NIST's address-confirmation requirements ([NIST SP 800-63A §3.8](https://pages.nist.gov/800-63-4/sp800-63a/ial-general/#ConfirmCodes)). A capability operation with an undeclared effect is invalid.

The binding stays Experimental until two independent clients interoperate with it. Human-readable links still open the explicit confirmation page; scanners and ordinary mail clients never receive a URL whose GET performs the action.

## 6. Trust boundary

MAP builds on Structured Email's trust model and adds an explicit authentication floor for actionable messages. The current SML trust draft requires a trusted sender and a valid signature but does not define a DKIM or DMARC profile ([draft-ietf-sml-trust-01](https://datatracker.ietf.org/doc/draft-ietf-sml-trust/)). MAP therefore requires all of the following before a client exposes a MAP action:

- at least one valid DKIM signature whose signing domain aligns with the RFC 5322 `From` domain under DMARC alignment; capability messages require strict alignment;
- a signature over the complete body, with no DKIM `l=` body-length tag;
- signed `From`, `To` and `Cc` when present, `Subject`, `Date`, `Message-ID`, `MIME-Version`, `Content-Type`, `SUPERSEDES` when present, and `Expires` when present; the signer SHOULD oversign `From` so an added field invalidates the signature;
- either local verification of that signature on the received message, or a passing DKIM result recorded by the client's trusted receiving system in `Authentication-Results` under a locally configured `authserv-id`; the latter is valid only when the receiving pipeline controls or trusts every subsequent body transformation and preserves the binding between the verdict and this message; a message-provided or untrusted `Authentication-Results` field is not evidence;
- exactly one unambiguous author mailbox and no malformed or conflicting copies of security-relevant fields.

These rules use DKIM's required `From` coverage, header-signing and body-length security guidance ([RFC 6376 §§5.4 and 8.2](https://www.rfc-editor.org/rfc/rfc6376.html)), DMARC's domain-alignment model ([RFC 9989 §3.1](https://www.rfc-editor.org/rfc/rfc9989.html#section-3.1)), and the configured trust boundary for `Authentication-Results` ([RFC 8601 §5](https://www.rfc-editor.org/rfc/rfc8601.html#section-5)). They allow a trusted receiver to preserve its authentication verdict when a known gateway subsequently rewrites the body without accepting a result asserted by the sender.

MAP also requires these processing rules:

- process only the designated MAP part belonging to the containing top-level message; never discover or activate MAP data inside an attached message, including `message/rfc822`;
- strip the MAP part when creating an ordinary reply or a manual forward; a forwarded-as-attachment copy remains inert under the top-level-part rule above; automatic forwarding does not change actionability, which is determined by the recipient-control rule below; this is a MAP rule because capabilities and recipient binding make copied actions unsafe, while Structured Email only requires removal when structured data no longer represents the message ([draft-ietf-sml-structured-email-06 §5.1](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/));
- validate security-sensitive identifiers after Unicode normalization, reject bidirectional controls and invisible formatting characters in identifiers, and visibly escape or warn on such characters in display text; use Unicode confusable detection to warn when displayed identities resemble trusted identities ([Unicode UTS #39](https://unicode.org/reports/tr39/)).

The remaining action rules are:

1. **No instruction authority.** The message and its readable body are untrusted data. They cannot change the agent's goals, permissions, connector set, memory policy or confirmation policy.
2. **Recipient control.** A client exposes operations only when its principal controls the mailbox named by `recipient` and the message was delivered to that mailbox. A forwarded copy does not transfer this authority.
3. **Known service.** A credentialed action requires a connector already associated with `service.id`. The authenticated sender must pass the message rules above, but a multi-tenant sender domain does not establish service authority. The connector readback in section 4 establishes that the interaction belongs to the authenticated principal and service. A capability action is the narrow exception defined in section 5.5 and carries no client credential.
4. **Typed data only.** A connector receives validated fields from the type contract and values the principal supplied. It does not turn free-form email prose into operation parameters.
5. **Current authorization.** The service authorizes the principal on every request. Possessing the email, knowing its identifier or passing DKIM does not authorize the action.
6. **Exact terms.** Consequential operations apply only after the atomic version check in section 4.
7. **Host decision.** The host applies its principal's standing policy to the operation, its declared effects and its typed values. An unrecognized effect can never satisfy standing policy: it requires an explicit principal decision, and a host that cannot render its meaning safely refuses the operation. When policy does not already authorize the operation, the host presents the authoritative service-read values for a human decision. Model output is not human confirmation.
8. **No ambient egress.** Processing a MAP part does not fetch, render or unfurl message-supplied URLs. Network access is limited to configured catalogues and trusted service implementations, except for the capability POST the principal authorizes under section 5.5.

Human pages show the destination origin and treat display names as labels only. Third-party supplied text is visibly distinguished from statements by the authenticated service.

## 7. Effects and policy

Every operation declares one or more effect identifiers. Effects let an agent host apply policy before it invokes a connector. The vocabulary lives in the Registry so it can grow without changing MAP Core.

The starter vocabulary must cover at least:

- sending an external communication;
- disclosing data;
- entering a commitment;
- granting or changing authorization;
- asserting identity or control;
- changing service state;
- taking a protective action;
- refusing a request.

Types add the fields needed to judge the effect. A campaign-send approval, for example, includes the audience, recipient count, sender identity, content or revision identifier and schedule. This is where Nitrosend can demonstrate recipient rules, volume limits, content restrictions and human approvals without pretending MAP itself is a universal outbound policy engine.

## 8. Types and Registry

### 8.1 Core and Registry stay separate

MAP Core defines how a type is identified, validated and used. It does not ship a closed list of use cases. The MailSchema Registry holds type contracts, effect vocabulary, implementation records, conformance evidence and lifecycle metadata.

The namespace is open. A type may be maintained by another standards body, vendor or community under a stable URI. Clients choose the catalogues they trust and verify the contract digest carried in the interaction. MailSchema is the initial public catalogue and contribution venue, not a protocol gatekeeper.

A type is accepted when it represents a distinct client obligation, is not already served by a deployed standard, has a credible trust story, declares its effects accurately and has a named implementation or remains Draft.

The Registry can also point to existing standards rather than duplicating them. Calendar responses resolve to iTIP/iMIP, and unsubscribe resolves to RFC 8058. These records make the boundary visible without inventing parallel MAP types.

### 8.2 Concrete types only

The Registry does not publish a generic `Approval` type. Campaign sending and content publication require different fields and effects, so they are separate contracts even when both offer `approve`, `decline` and `request-changes`. They may reuse schema fragments without introducing an "application profile" layer or letting a vendor redefine a generic `details` object.

### 8.3 Initial collection

| Contract                   | Kind            | Status                     | Decision                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign Send Approval     | Concrete type   | Draft; target Experimental | Nitrosend must prove approval of an exact campaign revision, audience, sender identity and schedule before external communication.                                                                                                                                                                                                                             |
| Publication Approval       | Concrete type   | Draft; target Experimental | Sourcey or Stompstart must prove approval of an exact content revision and publication destination.                                                                                                                                                                                                                                                            |
| Content Review             | Concrete type   | Superseded after migration | Its published identifier and contract remain immutable. Publication Approval succeeds it once equivalent fields and migration fixtures exist.                                                                                                                                                                                                                  |
| Email Address Confirmation | Concrete type   | Draft; target Experimental | Confirms control of an address for a recorded request; it is not sign-in or an authenticator. Promotion requires a conforming capability implementation. NIST excludes address-validation confirmation codes from its prohibition on email out-of-band authentication ([NIST SP 800-63B §3.1.3.1](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)). |
| Account Security Response  | Concrete type   | Draft                      | Report unrecognized activity or request a reversible protective step. It becomes Experimental only with an implementation.                                                                                                                                                                                                                                     |
| Event Response             | Boundary record | Existing standard          | Use iTIP/iMIP rather than a MAP type ([RFC 5546](https://www.rfc-editor.org/rfc/rfc5546.html)).                                                                                                                                                                                                                                                                |
| Subscription Preferences   | Boundary record | Existing standard          | Use RFC 2369 and RFC 8058 for unsubscribe; keep preference centres as service pages.                                                                                                                                                                                                                                                                           |
| Meeting Scheduling         | Candidate       | Deferred                   | No implementation and substantial overlap with calendar and booking systems.                                                                                                                                                                                                                                                                                   |
| Task Assignment            | Candidate       | Deferred                   | No implementation and substantial overlap with work-system connectors and iCalendar VTODO.                                                                                                                                                                                                                                                                     |
| Information Request        | Candidate       | Deferred                   | Disclosure-heavy and unsafe to standardize without a real implementation and a tighter threat model.                                                                                                                                                                                                                                                           |
| Payment Request            | Candidate       | Deferred                   | High fraud impact and no implementation. Reconsider only with a payment provider and a pre-existing account binding.                                                                                                                                                                                                                                           |

The target public launch promotes those three concrete types to Experimental only when their named implementations pass conformance. Account Security Response remains Draft. Boundary records direct overlapping use cases to established standards. The catalogue does not present a generic approval envelope or pretend every candidate is equally mature.

## 9. Outcomes

Outcomes are semantic type data, not a MAP response protocol. An approval type can distinguish approved, declined, changed, withdrawn, expired and superseded. A service implementation maps its normal API or tool result onto those outcomes.

`declined` is a successful decision, not an HTTP problem. `stale` is the failure of the exact-terms precondition and normally maps to HTTP 412. `expired`, `withdrawn` and `superseded` are interaction states. `already-decided` may be idempotent success when the same decision won, or conflict when a different one did. Treating all six as mandatory RFC 9457 problems would erase those distinctions and recreate a MAP-specific result protocol.

## 10. Conformance

MAP conformance is split so implementations can claim only what they prove:

- **Core producer:** emits a valid interaction for a pinned type contract and matching readable content.
- **Core consumer:** parses within limits, resolves only configured contracts, verifies trust inputs, validates typed data and exposes semantic operations without treating the message as instructions.
- **Type implementation:** proves each operation, effect and authoritative read shape against a concrete Registry contract.
- **HTTP binding:** proves authoritative readback, request construction from the trusted manifest, credential-origin checks, exact-terms behavior and outcome mapping.
- **MCP binding:** remains Draft until its separate suite has two implementations.
- **Capability binding:** proves fixed-body requests, recipient and operation scope, expiry, forwarding behavior, idempotency and the absence of ambient credentials.
- **Human route:** proves safe GET/HEAD, explicit confirmation, authorization and commit-time terms checking.

The conformance suite contains valid and invalid messages, DKIM alignment and signed-header cases, forged and trusted `Authentication-Results` cases, attached-message and forwarding cases, Unicode display hazards, contract-digest mismatches, authoritative-read mismatches, recipient cases, stale and changed terms, unknown operations and effects, connector-origin checks, expired capabilities and human-link scanner cases. It does not require a reference service to implement invented retry, task or problem conventions.

## 11. IETF path

MAP depends on Structured Email, but the current SML working-group charter says it will not define how recipient systems use structured data after extraction ([SML charter](https://datatracker.ietf.org/group/sml/about/)). The sentence in Structured Email 0.6 about a future specification is in its section on structured replies; it is not an open charter item for HTTP or MCP action execution ([draft-ietf-sml-structured-email-06 §5.2](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/)).

The correct path is:

1. produce an individual Internet-Draft for MAP Core and working implementations;
2. ask the SML list and authors to review the Structured Email binding and trust assumptions;
3. take the broader action-processing work to DISPATCH, whose role is to direct new ART-area work to an existing group, rechartering, a new group or an AD-sponsored path ([DISPATCH charter](https://datatracker.ietf.org/wg/dispatch/about/));
4. seek working-group adoption only after the venue and charter support it.

There is no IETF blocker to submitting an individual draft. Claiming that SML already owns or deferred this work would be inaccurate.

## 12. Versioning

The specification version is MAP 0.3. It is not renumbered to 0.1: the `https://mailschema.org/profiles/map/0.1` and `/0.2` identifiers have already been published and MUST never acquire different meanings. The number of subscribers does not change that identity rule. Pre-standard protocol revisions and Internet-Draft revisions have separate version spaces. The first IETF submission is `draft-...-00` even though it describes MAP 0.3.

Package versions follow package compatibility, not the specification number by accident.

The current public packages are all in the 0.2 line. The next package versions are not part of this architecture decision. Before any release, each package gets an explicit API compatibility diff and one cross-language release plan. If implementation replaces public 0.2 APIs, the release must communicate that pre-1.0 break; if it can add 0.3 support without breaking them, it should avoid needless version churn. Package development may proceed against the architecture baseline, but no version is chosen and no package is released during initial specification and IETF review.

New types and implementation records are Registry releases. Core packages update only when their validators, runtime APIs or bundled core artifacts change.

Every published profile identifier, type contract, tagged release and package release remains immutable. Superseded material may leave primary navigation and active catalogues, but its canonical release record remains available with a status and successor. This rule applies consistently to MAP 0.1, MAP 0.2 and Content Review. Nothing reuses or silently changes their identities.

## 13. Delivery order

1. Write MAP Core 0.3, the HTTP binding, the Experimental capability binding and the initial Registry contracts as specification text, with conformance-vector skeletons.
2. Generate and submit the first individual Internet-Draft (`-00`) before the IETF 127 Internet-Draft cutoff on 2 November 2026 ([IETF 127 important dates](https://datatracker.ietf.org/meeting/127/important-dates/)), then request review from SML and guidance from DISPATCH.
3. Implement Campaign Send Approval against Nitrosend's existing hold and approval operation, including authoritative readback and the exact-terms race.
4. Implement Publication Approval in Sourcey or Stompstart so the types and binding are not fitted only to Nitrosend.
5. Revise the draft and contracts from standards and implementation feedback, then publish the conformance suite.
6. Decide and cut package releases only after the cross-language contract and compatibility diff are final. Registry-only additions do not release packages.
7. Implement and evaluate the MCP binding as a separate Draft.

## 14. Architecture decisions

1. **Transport:** transport-neutral Core; HTTP as the first normative companion; a narrow Experimental capability binding for no-sign-in actions; MCP as a separate Draft proven through dogfood before promotion.
2. **Types:** Campaign Send Approval, Publication Approval and Email Address Confirmation as concrete types that move from Draft to Experimental only with conforming implementations; Account Security Response remains Draft; existing-standard and deferred records cover the rest. No generic Approval type or application-profile layer.
3. **Packages:** keep package versions outside this architecture decision. Produce a compatibility diff before choosing versions; no release is made for merely adding a Registry type.
4. **IETF:** keep the protocol at MAP 0.3, submit the first Internet-Draft as `-00` before package releases, consult SML, and use DISPATCH for venue. Do not describe MAP as work the current SML charter already owns.
