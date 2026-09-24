# MAP scope and readiness audit

24 September 2026. Baseline: `eddc7456910bf6a3c33de51c46ebf50f61ee7342`.

## Verdict

Proceed with the selected MailSchema / Mail Action Protocol architecture. The useful proposition remains an agent understanding and requesting a service action offered in an email, with the service enforcing permission and reporting the outcome. The local contract and deployed first-party boundary now establish the core mechanics; provider-delivered execution, a second useful service and external adoption remain open evidence gates.

**Implementation update, 24 September 2026:** the protocol work closes the reference-boundary defects in F1–F4 and F6–F8: 29 executable cases pass, 16 requirements are mapped, 20 artifacts are digest-bound and all 13 focused readiness probes pass. The Structured Email fixture and deployed Nitrosend MIME builder use the partial-representation shape and designation. Public package releases still contain the earlier contract and are labelled accordingly; the full-contract promotion gate is ready for a future changed release. Nitrosend's action service and exact-revision human review route are merged and deployed, with the API's 13,591-example suite and the app's 2,241-test suite passing. The Internet-Draft source requests Standards Track status, names a contact author, carries the reconciled semantics and renders in CI. No authenticated production send, received-MIME artifact, independently configured client run, external adoption or IETF submission has been recorded. The findings below retain the defects observed at the audit baseline.

The audit covers the current specification, schemas, JSON-LD context, MIME fixture, reference service, conformance manifest, Registry, package preparation and promotion, language repository workflows, product integration source and Internet-Draft. It also reconciles George's framing proposal and the earlier A-Mail / VERB / provenance recommendations. Historical naming and provenance-first proposals do not override subsequent decisions.

This is a source and local-execution audit, not an independent security review. Product deployment claims below retain their existing evidence; no authenticated production send, inbox receipt or service execution was performed during this audit. No draft was submitted and no external party was contacted.

## Claim and scope

The technical claim to substantiate is:

> MAP describes service actions in email and defines how an authorized client requests them and retrieves their outcomes.

The first agent-facing use is review of an exact content revision. MailSchema houses the specification, type definitions, contribution history and implementation evidence. Nitrosend supplies product adoption through useful sending, receiving and review workflows. Sourcey supplies the generic documentation renderer. A Sourcey action service is not part of MAP 0.1 unless a real Sourcey product workflow earns that boundary.

An email address supplies an existing delivery destination and human contact path. It does not establish the recipient's service permissions, the agent's principal, or permission to disclose content. MAP requires service configuration; it does not make every email address an executable API.

| Recommendation                                                     | Disposition and reason                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Put the problem and reason for using email below the homepage hero | Keep. Show the concrete review workflow and the integration problem before explaining the components. Prepare copy for review under `PRODUCT.md`; do not apply another site-wide rewrite during an architecture audit.                               |
| Frame this as the future of all white-collar work                  | Drop. It is unnecessary to justify the current use case and cannot be demonstrated by this project.                                                                                                                                                  |
| Say existing communication protocols are inadequate                | Replace with a specific gap. SMTP carries messages; JSON represents data; MCP and A2A address different interactions. MAP must explain its additional contract without dismissing them.                                                              |
| Say email has no machine-readable actions                          | Drop. Schema.org Actions, Gmail actions and other actionable-message systems already exist. The proposed contribution is a reusable interaction contract with precise execution behaviour.                                                           |
| Lead with security, guardrails and control                         | Keep the boundary explicit. The service enforces send policy; the receiver controls model use and disclosure. MAP must specify required checks and demonstrate them, without claiming to solve prompt injection or supply a universal policy engine. |
| Reuse standards, including competitor work                         | Keep. Reuse where semantics fit; an adapter or mapping requires tests before an interoperability claim.                                                                                                                                              |
| Build identity/provenance headers, agent keys or new DNS discovery | Defer. The current workflow does not justify a new identity or provenance standard. Existing authentication can be used without treating identity as authority.                                                                                      |
| Core, specification, Types and Registry                            | Keep the responsibilities. Common requirements stay in MAP until multiple real profiles justify a separate Core document. Registry entries describe types; implementation evidence belongs to a specific contract.                                   |
| Registry as a directory or marketplace                             | A future projection over type support is plausible. Mandatory discovery, credential brokerage and commercial execution are separate problems and are not required for 0.1.                                                                           |
| A-Mail receiver controls                                           | Retain as implementation requirements: admission, processing/disclosure and execution are separate decisions. A refused action must not be retried through an ungoverned alternate route. Do not restore unrelated machinery.                        |
| VERB-style existing tool descriptions and adapters                 | Retain the reuse question. A connector can translate a type to an existing service API. Do not add arbitrary tool dispatch to the core or assert that schemas alone make adapters frictionless.                                                      |
| Content Review: request changes, another test, approve             | The shared type currently defines feedback and approval. Editing and sending another test are product operations with their own authorization. Record this separation in the demo; do not silently add a third shared operation.                     |
| Plain email replies as requests                                    | Product intake can collect feedback; parsing a reply is not authorization. Structured reply transport, correlation, replay handling and authenticated execution need a separate binding if pursued. They are absent from MAP 0.1.                    |
| Sourcey claim verification                                         | Use a real documentation review workflow first. Ownership or factual-claim verification needs its own semantics and evidence; completing a MAP action would not itself prove a company's claim true.                                                 |
| More package managers and more types                               | Defer until a consumer and a maintained implementation justify them. Existing distributions must agree before increasing their number.                                                                                                               |

The earlier full mockup direction—homepage, specification reader, Types, Registry and a concrete interaction—still fits this architecture. Its example must disclose whether it is a browser simulation or a reproduced service interaction.

## Existing work and the standards route

These are reuse decisions, not a claim that MAP already interoperates with every item.

| Work                                                                                                                                                          | Required treatment                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Structured Email -06](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06), §§4.2–4.3                                                   | Apply its MIME designation and full/partial representation rules. JSON-LD in an arbitrary alternative is insufficient. The source fixture currently omits `Content-Purpose: Machine-readable`. |
| [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)                                                                                                               | Define stable absolute vocabulary identities and a pinned, offline processing path. Test actual expansion, not only JSON Schema validation.                                                    |
| [Schema.org Actions](https://schema.org/docs/actions.html) and [Gmail actions](https://developers.google.com/workspace/gmail/markup/actions/actions-overview) | Map operations, inputs, target and status field by field before asserting novelty. Content revision approval needs more precision than a generic action label.                                 |
| [AAMP](https://github.com/larksuite/aamp/blob/main/docs/AAMP_CORE_SPECIFICATION.md)                                                                           | Compare its mailbox task lifecycle with the proposed type and execution semantics. Candidate collaborator; no implemented mapping or independent commitment is established here.               |
| [A2A](https://a2a-protocol.org/latest/specification/) and [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)   | Evaluate whether existing task/tool contracts can carry the required behaviour with less custom machinery. Keep adapter work outside core until there is a demonstrated consumer.              |
| [AgentID](https://www.agentmail.to/blog/every-agent-has-a-human)                                                                                              | Identity and owner disclosure can be inputs to an integration. They do not replace object-level permission or send policy. No competitor identity dependency or compatibility is implied.      |
| HTTP, Problem Details, OAuth security                                                                                                                         | Reuse RFC 9110, RFC 9457 and applicable RFC 9700 guidance. Authentication is service-configured; document the security obligations without inventing a credential exchange.                    |
| Existing unsubscribe and calendar contracts                                                                                                                   | Before promoting Subscription Preferences or Event Response, compare RFC 8058 and iCalendar/iTIP/iMIP respectively. Those Registry entries remain proposals or assessments.                    |

Structured Email -06 §5.2 defers structured email replies. MAP currently executes over HTTPS. These are related but different work items. The [SML charter](https://datatracker.ietf.org/group/sml/about/) excludes general domain vocabulary and how recipient systems use extracted data. It is therefore reasonable to seek scope feedback; it is not reasonable to promise SML adoption of MAP or describe MAP as the already-requested reply specification.

Do not split the project into two standards documents merely to fit a presumed venue. First establish the necessary behaviour and ask where a bounded contribution fits. An individual Internet-Draft does not require working-group adoption. Product evidence is our quality gate, not a universal prerequisite for submitting a draft. Nor is “two independent implementations” a universal rule for submitting an individual draft. The venue and applicable charter must be checked for each stage.

## Findings

Priority **P0** blocks an implementation-ready or conformance claim. **P1** must be resolved before coordinated release or an interoperability claim. None of the reference-service findings below establishes a vulnerability in a deployed Nitrosend service.

### F1 — Interaction binding and input validation are missing at the reference boundary (P0)

`src/map/reference.ts` returns `200 completed` for an approval whose `interactionId` does not identify the configured description. It also completes `approve` with extra input that the Content Review schema rejects. It checks against a copied description, not a service's current target state. The optional authorization callback has no explicit caller or tenant context and defaults to allowing execution.

**Close when:** untrusted bytes are decoded and validated; the service resolves its own interaction and current target; caller and tenant come from authenticated server context; unknown interactions, invalid inputs and stale targets produce no effect. The reference must either implement this boundary or clearly expose a required adapter with executable contract tests. A permissive simulation is not an execution reference.

### F2 — Cached results bypass authorization in the reference (P0)

An exact retry returns before the authorization callback. After permission is removed, the probe still receives the saved `200` response; the callback has run only once. `recover(requestId)` has no authorization boundary. The XML draft says result access must be protected equivalently to the underlying operation.

**Close when:** principal/tenant isolation, authorization before result disclosure, result access after revocation and identifier collision rules are specified and tested. Preserve exactly-once business effects while checking current access to an existing result; do not confuse permission to read a past outcome with permission to execute again.

### F3 — Endpoint trust is only partly implemented (P0)

`assertTrustedExecution` accepts an HTTP URL when its origin is configured. It does not check the advertised result origin. A description with a trusted execution origin and an attacker-controlled recovery URL passes. This helper does not itself make network calls; the defect is treating it as sufficient client trust behaviour.

**Close when:** HTTPS, configured endpoint/resource and credential audience checks apply to execution, recovery and redirects. Specify what clients may fetch from schema, context, human and approval URLs. Test redirects, cross-origin recovery, multi-tenant service origins, URL credentials, CSRF for session-based clients and scanner-triggered human links. No state change on link preview or ordinary GET.

### F4 — JSON-LD identifiers depend on document base (P0)

The context does not define `MailAction`; its global `id` alias is also used for local operation strings. With `jsonld@9.0.0`, the fixture expands `MailAction` to `https://one.example/MailAction` or `https://two.example/MailAction` depending on base. `approve` and `request-changes` likewise change identity. Safe RDF conversion without a base rejects the relative type reference.

**Close when:** define the type IRI and distinguish local operation tokens from node identifiers, using the smallest appropriate context change. Test expansion and RDF conversion without remote loads and with different base IRIs. Bind the context bytes in the conformance release. Decide compatibility before changing the published context URI.

### F5 — SML compatibility is incomplete (P0)

The `.eml` fixture omits the required MIME designation header. The inspected Nitrosend integration at `440ba07f` also creates the JSON-LD part without that header (`app/services/email/message_builder.rb:62`). It appends structured content to arbitrary readable content; the SML full-versus-partial representation choice is not enforced. The current fixture check uses a regular expression, not MIME parsing.

**Close when:** choose the correct representation for the real campaign review email; update the profile, fixture and product MIME builder together; parse a received MIME message and verify the designation, tree, transfer encoding, readable fallback and exact structured payload. Include arbitrary campaign text, attachments, forwarding and duplicate structured parts. Provider re-encoding must not invalidate the demonstrated contract.

### F6 — Result lifecycle and recovery still require normative decisions (P0)

`pending` and `approval-required` are immutable entries in the simulator: there is no transition to completion or refusal. The spec requires an exact retry to return the recorded response but does not settle initial versus latest state. It defines a minimum result-retention period without defining duplicate suppression after deletion. It does not settle unknown result IDs, malformed requests without IDs, unauthenticated requests, terminal asynchronous failures or crash recovery between an effect and its recorded result.

**Close when:** write one state/HTTP table, including transitions, retrieval and errors; define expiry boundary and timestamp role; define deduplication retention and safe retry after missing results; state the atomicity obligation without promising impossible cross-system exactly-once delivery. Prove simultaneous duplicate requests, restart, revocation during pending approval and failure after an external effect. Product adapters must satisfy the documented transaction/reconciliation strategy.

### F7 — Integrity and compatibility boundaries are underspecified (P1)

Content Review names a SHA-256 digest but does not specify which bytes represent reviewed content. Subject, body alternatives, attachments and render dependencies matter for a campaign review. The Registry digest includes editorial fields and history, yet is an exact wire-compatibility check. `recordDigest` uses JavaScript JSON serialization and locale-based key ordering without a cross-language normative algorithm. The profile URI identifies 0.1 but does not bind a draft revision or artifact set.

**Close when:** define the content representation at the type/product boundary and whether clients verify or compare an opaque service digest. Separate immutable protocol/type artifacts from mutable catalogue metadata. If structured-value canonicalization is needed, assess RFC 8785 rather than inventing it. Publish test vectors and immutable artifact digests; decide how editorial changes preserve implementer compatibility and historical records. Record this decision before any protocol or package version change.

### F8 — The conformance label exceeds the harness (P0)

The six reference tests pass. The manifest lists twelve cases, while its validator checks artifact hashes and a minimum case count. It does not bind each case to executed assertions. The context, profile record, test code and normative prose are not in the artifact manifest. Schema checks accept contradictory problem `type`/`code`/`status` combinations; whitespace feedback passes the schema but fails the reference. These can be semantic checks outside JSON Schema, but they must be specified and exercised.

**Close when:** every normative requirement has an identifier, responsible actor, executable case or explicit manual verification, and evidence at a named suite revision. Include malformed MIME/JSON, duplicate keys, size/depth limits, unsupported profiles/types, result correlation, concurrency, persistence and all F1–F7 cases. A schema-valid document, a passing simulator and a conforming deployed service are different claims.

### F9 — Package promotion does not protect the advertised complete contract (P1)

`scripts/promote-package.mjs` and `src/lib/package-release.ts` verify only the contribution schema. Package-preparation tests compare MAP and Content Review locally, but the public promotion gate does not. npm integrity is recorded without verifying the downloaded bytes against that integrity string. `tests/tools.spec.ts` imports fixed release filenames, so the next promotion needs a source edit despite dynamic site data. The JavaScript release workflow does not invoke site promotion; the promotion dispatch choices omit Go. API sources exist in both main and language repositories, with contradictory contribution ownership guidance. Go's `UPSTREAM.md` names `4b1fd74`, while the local `v0.1.0` tag resolves to `ee1879f315d737a0dda01830d0d313e9cda1c25b`.

**Close when:** choose one source owner per library; bind every distributed schema and generated artifact to a release; check downloaded integrity where provided; test promotion with a different selected version; correct provenance through source history; document and test the release-to-promotion-PR path for every channel. Existing immutable evidence must not be rewritten. Re-read existing package artifacts into additive evidence if possible; do not republish unchanged packages for bookkeeping.

### F10 — The planned product proof does not yet demonstrate cross-service adoption (P1)

Nitrosend transport plus a speculative Sourcey execution endpoint would not establish useful interoperability by itself. Nitrosend's generic description field also does not itself implement campaign review actions, inbound extraction or the agent-inbox consumer.

**Close when:** first complete the useful Nitrosend campaign-test review loop against its own service state. Then run the same type-specific client against a second service with a real Content Review workflow; that service may be Sourcey only if Sourcey already owns the relevant authenticated revision and review state. Configuration and authentication adapters may differ; operation interpretation must not. Include human review, inbound action handling, stale revision, denied permission, lost-response recovery and the distinct permission to send. Preserve raw received MIME and redacted result/effect evidence. Disclose common ownership, and reserve independent-interoperability language for an externally operated implementation.

### F11 — IETF readiness is broader than a successful XML build (P1)

The XML points to a mutable external schema for the field contract, omits several profile details, uses a collective author without a contact email, and is not built in CI. It requests Informational status; that should be an explicit choice. Existing instructions report a clean build, but `xml2rfc` and `idnits` were not on this audit environment's PATH, so that build was not reproduced here.

**Close when:** reconcile prose, field definitions, profile and examples; pin normative dependencies; resolve author/contact and intended status; add reproducible rendering and submission checks; update implementation claims from exact evidence. Discuss scope with the appropriate community before treating a venue as settled. Draft publication, working-group adoption and RFC status remain distinct.

## Dependency-ordered implementation plan

| Order | Owning surface                       | Deliverable                                                                                                                                               | Acceptance gate                                                                                                                                                            |
| ----- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | MailSchema specification             | One decision record for representation, state machine, caller/result authorization, content binding and version identity; field-by-field reuse comparison | F1–F7 and F11 have precise decisions. Any new mechanism has a demonstrated gap and a compatibility disposition.                                                            |
| 2     | MailSchema reference and conformance | Executable client/service boundary and requirement matrix, tied to immutable artifacts                                                                    | All readiness probes pass; every normative requirement is covered. Crash/retry tests count actual effects. JSON-LD and MIME processing use real parsers.                   |
| 3     | Main and language repositories       | Source ownership, schema parity, additive public evidence and tested promotion                                                                            | F9 closed using existing releases wherever possible. Clean-consumer examples and shared negative fixtures run in relevant languages. No forced synchronized version bumps. |
| 4     | Nitrosend                            | Campaign review endpoint, correct MIME, inbound extraction and agent/human review                                                                         | A real test email produces feedback, a new revision and approval; stale approval and unauthorized sends leave state unchanged. Record the actual inbox receipt.            |
| 5     | Second useful service                | Another Content Review boundary in a product that already owns authenticated revisions and review state                                                   | The same client runs both operation definitions against both services. A static renderer is never made stateful for demonstration purposes.                                |
| 6     | MailSchema Registry and site         | Exact evidence record, clear draft/implementation labels, reviewed problem-led homepage copy                                                              | Registry uses real evidence; the demo and homepage claims match proved behaviour. Existing Sourcey layouts and public metadata remain verified.                            |
| 7     | Maintainers and standards process    | Reviewed individual draft, scoped community discussion, external implementation exercise                                                                  | Submission checks pass; limitations and ownership are disclosed. Independent interoperability is claimed only after external reproduction.                                 |

Standards feedback and external implementation recruitment can begin while repairs proceed, once there is a concrete scope packet. They need not wait for a polished website or additional package managers. Communications and submission are separate explicit actions.

The acceptance packet for the first product proof must identify source commits, immutable profile/type/context digests, client/service configurations with secrets removed, received MIME digest, request/result digests, observed business-state change and expected no-change cases. Measure whether real review rounds complete through the email workflow and how often users fall back to chat; do not substitute protocol activity counts for product value.

## Verification and limitations

- `npm run check`: passes Registry, profile, 29-case MAP, 13-probe readiness, 16-requirement conformance and Astro diagnostics.
- `npm run packages:prepare && npm run packages:test`: nine checks pass for locally prepared artifacts and bind all distributed contracts. These are unreleased build candidates at the existing version declarations and must not be published without an explicit version decision.
- [`scripts/audit-map-readiness.mjs`](../scripts/audit-map-readiness.mjs): all 13 focused probes pass. [`audits/2026-09-24-readiness.json`](audits/2026-09-24-readiness.json) records the observations and source hashes. This is a local diagnostic, not a deployed conformance certificate.
- JSON-LD and MIME checks use the pinned project dependencies and offline context loader. The Internet-Draft renders with `xml2rfc` 3.34.1 without warnings.

This audit changes planning and readiness claims. It does not silently revise the published wire contract, upgrade package versions, publish releases or certify an implementation. Repairs must close the recorded findings, preserve useful existing work and avoid another round of speculative scope expansion.
