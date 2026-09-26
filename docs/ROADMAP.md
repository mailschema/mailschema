# MailSchema execution plan

Status date: 25 September 2026. This is the canonical dependency-ordered plan for publishing, proving and advancing MailSchema and Mail Action Protocol (MAP).

The [scope and readiness audit](SCOPE-AUDIT.md) reopened milestones 2–4. The protocol repairs now pass their reference and conformance gates, and the first-party Content Review boundary is deployed. A first-party provider-delivered run has passed ([validation](VALIDATION.md#provider-delivered-run)); changed package releases and independent adoption remain separate evidence gates. Its findings F1–F11 and acceptance criteria continue to govern those claims.

## Objective

Make MAP a useful open standard for service actions carried through email, with MailSchema as its specification, type Registry and implementation ecosystem. Prove the protocol in products we control, record exact evidence, accept external contributions through an open source workflow and approach the IETF with working code rather than a paper-only proposal.

## Scope and invariants

1. MailSchema is the project and ecosystem. Mail Action Protocol is the specification.
2. MAP layers typed action descriptions and authenticated HTTPS execution on existing email and IETF Structured Email work.
3. Receiving an email grants no authority except possession: a capability URL, issued to one recipient, for operations whose contract permits it and whose message passes DKIM and DMARC. Otherwise a client independently trusts the service endpoint and uses an existing service credential.
4. Human-readable email and normal service interfaces remain available.
5. MAP introduces no mandatory global identity provider, custom DNS mechanism, central runtime lookup or universal policy language.
6. Registry records bind definitions, versions, operation IDs and implementation evidence. Registry presence does not grant runtime authority.
7. Draft maturity, ownership and implementation evidence are stated exactly. Common-ownership dogfood is not presented as independent adoption.
8. Credentials and private operational data stay outside public artifacts.

## Current execution state

| Surface                     | State                                         | Evidence or next gate                                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project source and site     | Live                                          | [`mailschema/mailschema`](https://github.com/mailschema/mailschema) and [`mailschema.org`](https://mailschema.org)                                                                                                                |
| GitHub organization         | Live                                          | Public metadata and the [`mailschema/.github`](https://github.com/mailschema/.github) profile identify the project, working-draft status, repositories and contribution path                                                      |
| MAP 0.2 profile             | Working draft; replaces the withdrawn MAP 0.1 | Type-agnostic core: description digest binding, credential and possession authority, consequences, decisions and a core approval lifecycle; see the [cutover plan](MAP-CORE-CUTOVER.md)                                           |
| Interaction types           | Ten drafts on MAP 0.2                         | Content Review 0.3 and nine new types, each with a digest-bound contract, request schema, chapter and fixtures; see the [type collection](TYPE-COLLECTION.md)                                                                     |
| Reference implementation    | One contract-driven engine for every type     | Type-specific code is limited to a few service behaviours and client rules; possession trust verifies DKIM, the organizational domain and the recipient                                                                           |
| Conformance artifacts       | Requirement-mapped suite for MAP 0.2          | 134 digest-bound artifacts, 99 executable cases and 38 requirements, shared RFC 8785, I-JSON, lexical and media type vectors, and a DKIM-signed set of genuine and forged messages; deployment-only checks remain manual evidence |
| JavaScript, Python and Rust | JavaScript `0.1.4`; Python and Rust `0.1.3`   | Maintained repositories, green CI, tagged releases and verified public artifacts containing the canonical contracts; MAP 0.2 releases follow the cutover                                                                          |
| Go                          | `v0.1.1` published and CI green               | [`mailschema/go`](https://github.com/mailschema/go) and the Go module proxy                                                                                                                                                       |
| Ruby                        | `0.2.0` published for MAP 0.2                 | Published from [`mailschema/ruby`](https://github.com/mailschema/ruby) through RubyGems trusted publishing; Nitrosend's Content Review 0.3 implementation is built on it                                                          |
| Package promotion           | Full-contract gate live                       | Public readback verifies registry integrity and every distributed contract; the selected releases carry full-contract evidence                                                                                                    |
| Nitrosend API               | MAP 0.1 deployed; MAP 0.2 built               | [`nitrosend/api#527`](https://github.com/nitrosend/api/pull/527) deployed the MAP 0.1 Content Review boundary; the MAP 0.2 implementation on the `mailschema` gem deploys with the cutover                                        |
| Nitrosend app               | Exact-revision review deployed                | [`nitrosend/app#240`](https://github.com/nitrosend/app/pull/240) gives signed-in users a human review and approval route for the immutable revision named by MAP; its MAP 0.2 changes deploy with the cutover                     |
| Nitrosend Node SDK          | `0.10.6` published                            | [`nitrosend/node-sdk#11`](https://github.com/nitrosend/node-sdk/pull/11) carried the MAP 0.1 field; `0.10.6` carries the MAP 0.2 contract                                                                                         |
| Sourcey                     | `3.6.10` published and pinned                 | Sourcey remains the generic specification renderer. No stateful action service is added without an existing Sourcey product workflow.                                                                                             |
| Internet-Draft              | Standards Track source renders cleanly in CI  | Reconciled semantics, named author/contact and exact SML-06 dependency are present; community discussion and submission have not occurred                                                                                         |

## Repository map

- [`mailschema/mailschema`](https://github.com/mailschema/mailschema): specification, site, Registry, schemas, fixtures, conformance suite, package sources and Internet-Draft.
- [`mailschema/javascript`](https://github.com/mailschema/javascript): JavaScript and TypeScript validation library, CLI and npm release history.
- [`mailschema/python`](https://github.com/mailschema/python): Python validation library, CLI and PyPI release history.
- [`mailschema/rust`](https://github.com/mailschema/rust): embedded canonical schemas and crates.io release history.
- [`mailschema/go`](https://github.com/mailschema/go): typed Go implementation and embedded canonical schemas.
- [`mailschema/ruby`](https://github.com/mailschema/ruby): the MAP 0.2 Ruby gem and its RubyGems release history, created with the first release.
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

### 2. MAP 0.2 and the ten types

**Status:** working draft; every type is executable, and the TypeScript reference and the Ruby package agree on every shared vector and JSON fixture document

- Carry the description as JSON-LD in a designated `application/ld+json` Structured Email part labelled with the profile, in a partial representation outside any attached message.
- Bind every request to the exact description by its RFC 8785 digest.
- Define credential and possession authority per operation, consequences, decisions and one approval lifecycle.
- State every lexical form as a portable pattern, so no verdict depends on the validator.
- Publish valid and invalid fixtures for every type, a DKIM-signed message kit, and shared RFC 8785, I-JSON and lexical vectors.

**Done when:** an independently written implementation passes the shared vectors and fixtures without inventing representation, binding, state transitions, errors, recovery, retention or compatibility behaviour.

### 3. Reference implementation and conformance

**Status:** 99 executable cases and a 38-requirement matrix pass, with deployment-only checks recorded as manual evidence

- Run deterministic client and service behavior for every type from its contract.
- Cover completion, refusal, stale revisions, approval requirements, duplicate requests, changed-payload conflicts, lost-response recovery, expiry and unsupported contracts.
- Publish a conformance manifest that binds every fixture, schema and expected result to exact SHA-256 digests.
- Keep product-specific send-policy configuration outside the shared protocol while testing recipient, content, attachment, rate and human-approval controls in the product layer.

**Done when:** the public harness maps every normative requirement to executed assertions or explicit manual evidence at an immutable suite revision, including JSON-LD expansion, parsed MIME, authorization, concurrency, restart and recovery. The conformance suite passes without weakening its requirements.

### 4. Developer distributions

**Status:** MAP 0.1 packages published; the Ruby package is prepared for MAP 0.2; the `0.2.0` releases are pending

- Publish MAP and Registry validators for JavaScript and Python.
- Publish canonical embedded schemas for Rust.
- Publish typed documents, strict decoding and core validation for Go.
- Publish MAP 0.2 parsing, RFC 8785 digests, contract verification, validation and documents for Ruby.
- Verify every public artifact against the canonical schema bytes before selecting it on the website.
- Keep package versions independent of the MAP profile version and show the exact selected release per ecosystem.

**Done when:** npm, PyPI, crates.io, Go and RubyGems releases have immutable evidence for every distributed contract, one source owner per library, passing clean-consumer examples and a tested path from release to website promotion. Existing versions remain unless an actual package change requires a separately assessed release.

### 5. Nitrosend implementation

**Status:** MAP 0.1 deployed; Content Review 0.3 on MAP 0.2 is built and tested, and deploys with the cutover

- The API resolves its own interaction and immutable flow revision, separates API-key proposal from signed-in human approval, refuses stale targets, retains results and extracts MAP descriptions from inbound messages without executing them. The protocol mechanics come from the `mailschema` gem.
- Transactional sends carry an optional typed MAP description, include it in idempotency and preserve the readable text and HTML parts. A description the sender's provider cannot carry as raw MIME is refused before admission.
- Flow test sends carry the review description only through a provider that sends raw MIME.
- The app presents the exact revision named by the request and records approval without starting the flow.
- The Node SDK `0.10.6` carries the MAP 0.2 transactional contract.
- Keep Sourcey theming and rendering generic. Add MAP behavior to a Sourcey product only if that product already owns the authenticated revision, review and result state.

**Done when:** Nitrosend's MAP 0.2 implementation is deployed and implements Content Review against its own current flow revisions, authorization and durable review state. A received test message, stale target, denied permission, exact retry and result recovery are reproduced without coupling the protocol to the documentation renderer.

### 6. Product dogfood and Registry evidence

**Status:** the MAP 0.1 run is recorded against the Content Review 0.2 record; the MAP 0.2 run follows the Nitrosend deployment

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

1. Release MAP 0.2: merge and deploy the site, publish the Ruby gem, and deploy Nitrosend's implementation.
2. Complete one reproducible Nitrosend Content Review 0.3 exchange and attach its common-ownership evidence to the Registry.
3. Seek an externally operated implementation before claiming independent interoperability.
4. Update the Internet-Draft implementation section from public evidence, seek early community feedback and submit the individual draft.
5. Maintain the JavaScript, Python, Rust, Go and Ruby packages; release and promote each package when its distributed contract or maintained API changes and the public artifact passes the full-contract gate.

The detailed deliverables, owners and acceptance gates are in [SCOPE-AUDIT.md](SCOPE-AUDIT.md). Early standards feedback can run alongside this sequence; implementation and publication claims depend on the actual evidence.

## Release and consistency gates

- Canonical schemas live under `public/schemas/`; packages and product integrations pin exact copies or digests.
- `conformance/map-0.2/manifest.json` binds the profile, context, schemas, contracts, fixtures, reference implementation, requirements and executable suite. Deployment-specific requirements stay marked as manual evidence. The withdrawn MAP 0.1 suite stays unchanged in `conformance/map-0.1/`, outside the build.
- `docs/releases/current.json` selects independently downloaded package artifacts. Legacy evidence binds the contribution schema; new `mailschema-package-release/2` evidence binds every contract distributed by that artifact.
- This repository owns the normative schemas, profile and conformance suite. Language repositories own their language APIs, CI, tags and registry publication; their vendored contracts are exact projections and cannot redefine MAP.
- A contract change requires an explicit compatibility and distribution assessment. Release only changed packages after that assessment; do not bump unaffected languages or publish bookkeeping-only versions. The full-contract promotion gate is additive: existing immutable evidence is not rewritten, and a changed package is not promoted until its public artifact matches every canonical contract byte.
- The Nitrosend SDK follows the merged API schema; it is not published ahead of that API contract.
- Registry implementation claims require deployed behavior and reproducible evidence, not an open pull request.
- Protected `main` must pass repository verification before Cloudflare deployment.

## Material risks and controls

| Risk                                                                  | Control                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email content tricks a client into sending credentials to an attacker | Endpoint trust is configured independently of the email; descriptions carry no credentials or grants, except a possession capability, which is sent only to its own authenticated organization |
| A retry applies an action twice                                       | Stable request IDs, value equality, recorded results and explicit idempotency conflict behavior                                                                                                |
| Approval targets the wrong revision                                   | Every request is bound to the exact description by its digest; stale targets fail without an effect                                                                                            |
| Registry branding becomes a de facto central runtime                  | Clients may bundle definitions; MAP requires no online Registry lookup                                                                                                                         |
| MailSchema overclaims adoption                                        | Implementation state is recorded per exact type, profile, operations and digest; common ownership is disclosed                                                                                 |
| Package versions drift silently                                       | Every advertised channel is selected explicitly from immutable public readback evidence                                                                                                        |
| The IETF draft duplicates existing work                               | MAP reuses Structured Email, MIME, HTTP, Problem Details and service authentication and keeps its new surface narrow                                                                           |

## Core changes

MAP 0.2 delivered every change previously queued here: the resource identifier in place of the authorization block, the actor on results, feedback references for Content Review, type-defined details, and possession authority. Further core changes wait for a need that a type cannot meet through its contract.

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
