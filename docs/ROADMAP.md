# MailSchema execution plan

Status date: 24 September 2026. This is the canonical dependency-ordered plan for publishing, proving and advancing MailSchema and Mail Action Protocol (MAP).

The [scope and readiness audit](SCOPE-AUDIT.md) reopened milestones 2–4. The protocol repairs now pass their reference and conformance gates, and the first-party Content Review boundary is deployed. A first-party provider-delivered run has passed ([validation](VALIDATION.md#provider-delivered-run)); changed package releases and independent adoption remain separate evidence gates. Its findings F1–F11 and acceptance criteria continue to govern those claims.

## Objective

Make MAP a useful open standard for service actions carried through email, with MailSchema as its specification, type Registry and implementation ecosystem. Prove the protocol in products we control, record exact evidence, accept external contributions through an open source workflow and approach the IETF with working code rather than a paper-only proposal.

## Scope and invariants

1. MailSchema is the project and ecosystem. Mail Action Protocol is the specification.
2. MAP layers typed action descriptions and authenticated HTTPS execution on existing email and IETF Structured Email work.
3. Receiving an email never grants authority. A client independently trusts the service endpoint and uses an existing service credential.
4. Human-readable email and normal service interfaces remain available.
5. MAP 0.1 introduces no mandatory global identity provider, custom DNS mechanism, central runtime lookup or universal policy language.
6. Registry records bind definitions, versions, operation IDs and implementation evidence. Registry presence does not grant runtime authority.
7. Draft maturity, ownership and implementation evidence are stated exactly. Common-ownership dogfood is not presented as independent adoption.
8. Credentials and private operational data stay outside public artifacts.

## Current execution state

| Surface                     | State                                                    | Evidence or next gate                                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project source and site     | Live                                                     | [`mailschema/mailschema`](https://github.com/mailschema/mailschema) and [`mailschema.org`](https://mailschema.org)                                                                                                                            |
| GitHub organization         | Live                                                     | Public metadata and the [`mailschema/.github`](https://github.com/mailschema/.github) profile identify the project, working-draft status, repositories and contribution path                                                                  |
| MAP 0.1 profile             | Revised working draft; local contract checks pass        | Exact context and schema digests, Structured Email placement, authorization, lifecycle and compatibility decisions are executable                                                                                                             |
| Content Review 0.2          | Published                                                | Stable `request-changes` and `approve` operations with revision and digest binding                                                                                                                                                            |
| Reference implementation    | 34 cases and 13 readiness probes pass locally            | Required principal/tenant context, current authorization, exact targets, lifecycle, recovery and endpoint trust are exercised                                                                                                                 |
| Conformance artifacts       | Requirement-mapped local suite                           | 21 digest-bound artifacts, 34 executable cases and 19 requirements; deployment-only checks remain explicit manual evidence                                                                                                                    |
| JavaScript, Python and Rust | JavaScript `0.1.3`; Python and Rust `0.1.2`              | Maintained repositories, green CI, tagged releases and verified public artifacts containing the canonical schemas                                                                                                                             |
| Go                          | `v0.1.0` published and CI green                          | [`mailschema/go`](https://github.com/mailschema/go) and the Go module proxy                                                                                                                                                                   |
| Package promotion           | Full-contract gate implemented; changed releases pending | Public readback verifies registry integrity and every distributed contract; current selected releases remain honestly labelled as Registry-schema-only evidence                                                                               |
| Nitrosend API               | Content Review boundary deployed                         | [`nitrosend/api#527`](https://github.com/nitrosend/api/pull/527) deploys exact-revision description, API-key proposal, human approval, stale-target refusal, retained result recovery, inbound extraction and corrected Structured Email MIME |
| Nitrosend app               | Exact-revision review deployed                           | [`nitrosend/app#240`](https://github.com/nitrosend/app/pull/240) gives signed-in users a human review and approval route for the immutable revision named by MAP                                                                              |
| Nitrosend Node SDK          | Merged                                                   | [`nitrosend/node-sdk#11`](https://github.com/nitrosend/node-sdk/pull/11) carries the generated typed contract                                                                                                                                 |
| Sourcey                     | `3.6.8` published and pinned                             | Sourcey remains the generic specification renderer. No stateful action service is added without an existing Sourcey product workflow.                                                                                                         |
| Internet-Draft              | Standards Track source renders cleanly in CI             | Reconciled semantics, named author/contact and exact SML-06 dependency are present; community discussion and submission have not occurred                                                                                                     |

## Repository map

- [`mailschema/mailschema`](https://github.com/mailschema/mailschema): specification, site, Registry, schemas, fixtures, conformance suite, package sources and Internet-Draft.
- [`mailschema/javascript`](https://github.com/mailschema/javascript): JavaScript and TypeScript validation library, CLI and npm release history.
- [`mailschema/python`](https://github.com/mailschema/python): Python validation library, CLI and PyPI release history.
- [`mailschema/rust`](https://github.com/mailschema/rust): embedded canonical schemas and crates.io release history.
- [`mailschema/go`](https://github.com/mailschema/go): typed Go implementation and embedded canonical schemas.
- [`mailschema/.github`](https://github.com/mailschema/.github): public organization profile and current project status.
- Nitrosend and Sourcey remain in their product repositories. MailSchema records their exact supported versions and evidence rather than copying their application code into the standards repository.

Create another MailSchema repository only when a maintained implementation has its own release lifecycle and consumer value. Empty language or ecosystem repositories are not part of the naming strategy.

## Milestones

### 1. Public foundation

**Status:** complete

- Publish the canonical repository, project site, Registry and tooling sources.
- Add licensing, contribution terms, governance, security reporting and versioning policy.
- Protect `main`, require verification and deploy verified `main` builds to Cloudflare.
- Keep local agent-runtime files and credentials out of public source.

**Done when:** a clean checkout passes verification and the protected repository deploys `mailschema.org` without local credentials.

### 2. MAP 0.1 and Content Review 0.2

**Status:** revised working draft; local contract decisions and checks pass

- Carry the structured description as JSON-LD in an `application/ld+json` Structured Email body part.
- Define exact description, request, result and Problem Details schemas.
- Define authenticated HTTPS execution, service-established authorization, idempotency, result recovery and exact version handling.
- Define endpoint trust, external-reference, prompt-injection, privacy and human-fallback rules.
- Bind Content Review operations to stable IDs and exact target revisions and digests.
- Publish valid and invalid fixtures, including a complete multipart email.

**Done when:** two implementations can be written without inventing representation, caller/tenant binding, state transitions, error, recovery, retention or compatibility behaviour. Audit F1–F7 decisions are recorded and consistent across the specification, schema and fixtures.

### 3. Reference implementation and conformance

**Status:** 34 executable cases and a 19-requirement matrix pass locally

- Run deterministic client and service behavior around Content Review.
- Cover completion, refusal, stale revisions, approval requirements, duplicate requests, changed-payload conflicts, lost-response recovery, expiry and unsupported contracts.
- Publish a conformance manifest that binds every fixture, schema and expected result to exact SHA-256 digests.
- Keep product-specific send-policy configuration outside the shared protocol while testing recipient, content, attachment, rate and human-approval controls in the product layer.

**Done when:** the public harness maps every normative requirement to executed assertions or explicit manual evidence at an immutable suite revision, including JSON-LD expansion, parsed MIME, authorization, concurrency, restart and recovery. The readiness probes pass without weakening their requirements.

### 4. Developer distributions

**Status:** current packages published; next full-contract releases deliberately pending

- Publish MAP and Registry validators for JavaScript and Python.
- Publish canonical embedded schemas for Rust.
- Publish typed documents, strict decoding and core validation for Go.
- Verify every public artifact against the canonical schema bytes before selecting it on the website.
- Keep package versions independent of the MAP profile version and show the exact selected release per ecosystem.

**Done when:** npm, PyPI, crates.io and Go releases have immutable evidence for every distributed contract, one source owner per library, passing clean-consumer examples and a tested path from release to website promotion. Existing versions remain unless an actual package change requires a separately assessed release.

### 5. Nitrosend implementation

**Status:** in progress

- Nitrosend API support for an optional typed MAP description in transactional sends is merged and deployed.
- Nitrosend preserves the readable text and HTML parts and adds the structured `application/ld+json` alternative only on providers that support exact MIME construction.
- Nitrosend includes the MAP description in idempotency and rejects unsupported delivery paths before calling a provider.
- The flow test path constructs a readable multipart message and adds the designated, transfer-encoded MAP partial representation. A provider-delivered copy still needs to be preserved and parsed as live evidence.
- Nitrosend's campaign Content Review boundary now resolves its own interaction and immutable flow revision, separates API-key proposal from signed-in human approval, rejects stale targets, retains outcomes and extracts MAP descriptions from inbound messages without executing them.
- The Nitrosend app presents the exact revision named by the request and records approval without starting the flow.
- The Nitrosend Node SDK carries the merged transactional MAP field contract.
- Keep Sourcey theming and rendering generic. Add MAP behavior to a Sourcey product only if that product already owns the authenticated revision, review and result state.

**Done when:** Nitrosend implements Content Review against its own current flow revisions, authorization and durable review state. A received test message, stale target, denied permission, exact retry and result recovery are reproduced without coupling the protocol to the documentation renderer.

### 6. Product dogfood and Registry evidence

**Status:** ready for a live run on the deployed product surfaces

- Send one readable MAP-bearing review email through Nitrosend to a configured inbox.
- Apply one Content Review operation through Nitrosend's authenticated endpoint and record its retained result.
- Record the product versions, exact MAP profile and type contract, the request and result, the observed review effect and one permission or stale-target refusal.
- Link the deployed source and reproducible run from a Content Review implementation declaration. Disclose common ownership and keep independent adoption as a separate claim.
- Keep this proof in product and Registry evidence. MailSchema does not acquire an operational inbox, account system or action runtime.

**Done when:** another operator can follow the public evidence and reproduce the recorded product behavior. The evidence discloses common ownership.

### 7. Contribution and adoption loop

**Status:** browser intake and pull-request review are live; external evidence remains

- Accept new types, amendments and implementation declarations through one versioned JSON format and GitHub review.
- Keep the browser checker local and use Git as the only source of accepted Registry state.
- Hand checked contributions to GitHub without a MailSchema submission service, credential store or second queue.
- Publish conformance fixtures and exact reproduction commands for implementers.
- Seek one implementation outside the common ownership group before using language such as independent interoperability.

**Done when:** an external contributor can propose a type or implementation without a private account or second Registry database, and at least one external implementation can reproduce a core case.

### 8. IETF discussion and submission

**Status:** Standards Track source renders cleanly; discussion and submission pending

- Maintain the XML Internet-Draft source with terminology, architecture, processing rules, security, privacy, IANA considerations and implementation status.
- Position MAP as an action vocabulary and authenticated execution profile carried by Structured Email, not a replacement for email transport, Structured Email, OAuth or HTTP.
- Re-run author tooling and update the implementation section from public evidence.
- Ask the relevant application-area and Structured Email community for early scope feedback.
- Distinguish MAP HTTPS execution from SML's deferred structured-email reply work. Do not presume charter fit or split documents before feedback establishes a useful contribution.
- Submit an individual draft, then revise from list and meeting feedback before asking for working-group adoption.

Product evidence is this project's quality gate for the intended submission, not an IETF requirement for every individual draft. Any independent-implementation requirement must be checked against the applicable venue and stage.

**Done when:** the submitted draft passes IETF tooling and every implementation claim links to reproducible evidence.

## Immediate dependency sequence

1. Publish the browser-to-Git contribution path while retaining Git as the only accepted Registry state.
2. Complete one reproducible Nitrosend Content Review exchange and attach its common-ownership evidence to the Registry.
3. Seek an externally operated implementation before claiming independent interoperability.
4. Update the Internet-Draft implementation section from public evidence, seek early community feedback and submit the individual draft.
5. Maintain the JavaScript, Python, Rust and Go packages; release and promote each package when its distributed contract or maintained API changes and the public artifact passes the full-contract gate.

The detailed deliverables, owners and acceptance gates are in [SCOPE-AUDIT.md](SCOPE-AUDIT.md). Early standards feedback can run alongside this sequence; implementation and publication claims depend on the actual evidence.

## Release and consistency gates

- Canonical schemas live under `public/schemas/`; packages and product integrations pin exact copies or digests.
- `conformance/map-0.1/manifest.json` binds the profile, context, schemas, fixtures, reference implementation, requirements and executable suite. Deployment-specific requirements stay marked as manual evidence.
- `docs/releases/current.json` selects independently downloaded package artifacts. Legacy evidence binds the contribution schema; new `mailschema-package-release/2` evidence binds every contract distributed by that artifact.
- This repository owns the normative schemas, profile and conformance suite. Language repositories own their language APIs, CI, tags and registry publication; their vendored contracts are exact projections and cannot redefine MAP.
- A contract change requires an explicit compatibility and distribution assessment. Release only changed packages after that assessment; do not bump unaffected languages or publish bookkeeping-only versions. The full-contract promotion gate is additive: existing immutable evidence is not rewritten, and a changed package is not promoted until its public artifact matches every canonical contract byte.
- The Nitrosend SDK follows the merged API schema; it is not published ahead of that API contract.
- Registry implementation claims require deployed behavior and reproducible evidence, not an open pull request.
- Protected `main` must pass repository verification before Cloudflare deployment.

## Material risks and controls

| Risk                                                                  | Control                                                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Email content tricks a client into sending credentials to an attacker | Endpoint trust is configured independently of the email; descriptions carry no credentials or grants                 |
| A retry applies an action twice                                       | Stable request IDs, value equality, recorded results and explicit idempotency conflict behavior                      |
| Approval targets the wrong revision                                   | Every request repeats the exact target revision and digest; stale targets fail without an effect                     |
| Registry branding becomes a de facto central runtime                  | Clients may bundle definitions; MAP 0.1 requires no online Registry lookup                                           |
| MailSchema overclaims adoption                                        | Implementation state is recorded per exact type, profile, operations and digest; common ownership is disclosed       |
| Package versions drift silently                                       | Every advertised channel is selected explicitly from immutable public readback evidence                              |
| The IETF draft duplicates existing work                               | MAP reuses Structured Email, MIME, HTTP, Problem Details and service authentication and keeps its new surface narrow |

## Next profile version

These breaking improvements are recorded here and ship together in the next MAP profile version, once another breaking need justifies one. MAP 0.1 and its published artifacts stay unchanged until then.

- Replace the description's `authorization` object with the protected resource identifier alone; schemes and configuration come from RFC 9728 metadata.
- Require services to record the actor, and let a result carry an opaque actor reference.
- Let a target name the revision it supersedes and give recorded feedback a reference that a later revision can cite, so an agent can confirm its feedback was addressed.

## Deliberately deferred

- custom DNS discovery;
- a universal agent identity provider;
- a universal sending-policy language;
- mandatory online Registry lookup;
- certification claims before independent evidence;
- additional package ecosystems without an implementation consumer;
- a central marketplace of executable services.

The Registry may later expose discovery views over implementations, but its first responsibility is maintaining shared interaction types and evidence. Runtime endpoint discovery or commercial marketplace behavior requires a separate problem statement and threat model.

## Plan provenance

The first dependency graph was validated by the Runx `work-plan` package in run `run_work-plan-agent_dbd35f81ed05879f`, receipt `sha256:069ced3883c313625149c16987a1002bbeaa5fe20387fa1dd48c32df449e25fa`. This document records the implemented state and supersedes earlier provisional milestone wording.

The 24 September readiness audit corrects completion claims using source inspection and executable probes. It does not revalidate the historical Runx receipt or claim independent review.
