# MailSchema execution plan

Status date: 23 September 2026. This is the canonical dependency-ordered plan for publishing, proving and advancing MailSchema and Mail Action Protocol (MAP).

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

| Surface | State | Evidence or next gate |
| --- | --- | --- |
| Project source and site | Live | [`mailschema/mailschema`](https://github.com/mailschema/mailschema) and [`mailschema.org`](https://mailschema.org) |
| MAP 0.1 profile | Implemented on the release branch | JSON-LD context, profile record, exact schemas, complete email fixture and specification reader |
| Content Review 0.1 | Implemented on the release branch | Stable `request-changes` and `approve` operations with revision and digest binding |
| Reference implementation | Passing | Deterministic description, request, result, retry, refusal, expiry, stale-target and approval tests |
| Conformance artifacts | Passing | Digest-bound manifest covering 12 artifacts and 12 core cases |
| JavaScript, Python and Rust | `0.1.1` published | Public artifacts contain the canonical MAP, Content Review and Registry schemas |
| Go | `v0.1.0` published and CI green | [`mailschema/go`](https://github.com/mailschema/go) and the Go module proxy |
| Package promotion | Verified | npm, PyPI, crates.io and Go artifacts were independently downloaded and matched to the canonical schema bytes |
| Nitrosend API | Merged; production verification pending | [`nitrosend/api#522`](https://github.com/nitrosend/api/pull/522) adds typed MAP descriptions and `application/ld+json` email delivery |
| Nitrosend Node SDK | Merged | [`nitrosend/node-sdk#11`](https://github.com/nitrosend/node-sdk/pull/11) carries the generated typed contract |
| Sourcey | Renderer in production; action service pending | Sourcey already serves the specification. Content Review execution remains dogfood work. |
| Internet-Draft | Source builds cleanly | Submission waits for public product evidence and an implementation-status update |

## Repository map

- [`mailschema/mailschema`](https://github.com/mailschema/mailschema): specification, site, Registry, schemas, fixtures, conformance suite, package sources and Internet-Draft.
- [`mailschema/go`](https://github.com/mailschema/go): typed Go implementation and embedded canonical schemas.
- Nitrosend and Sourcey remain in their product repositories. MailSchema records their exact supported versions and evidence rather than copying their application code into the standards repository.

Create another MailSchema repository only when a maintained implementation has its own release lifecycle. Empty language or ecosystem repositories are not part of the naming strategy.

## Milestones

### 1. Public foundation

**Status:** complete

- Publish the canonical repository, project site, Registry and tooling sources.
- Add licensing, contribution terms, governance, security reporting and versioning policy.
- Protect `main`, require verification and deploy verified `main` builds to Cloudflare.
- Keep local agent-runtime files and credentials out of public source.

**Done when:** a clean checkout passes verification and the protected repository deploys `mailschema.org` without local credentials.

### 2. MAP 0.1 and Content Review 0.1

**Status:** complete on the release branch

- Carry the structured description as JSON-LD in an `application/ld+json` Structured Email body part.
- Define exact description, request, result and Problem Details schemas.
- Define authenticated HTTPS execution, service-established authorization, idempotency, result recovery and exact version handling.
- Define endpoint trust, external-reference, prompt-injection, privacy and human-fallback rules.
- Bind Content Review operations to stable IDs and exact target revisions and digests.
- Publish valid and invalid fixtures, including a complete multipart email.

**Done when:** two implementations can be written without selecting unspecified field names, operation identifiers or status behavior.

### 3. Reference implementation and conformance

**Status:** complete on the release branch

- Run deterministic client and service behavior around Content Review.
- Cover completion, refusal, stale revisions, approval requirements, duplicate requests, changed-payload conflicts, lost-response recovery, expiry and unsupported contracts.
- Publish a conformance manifest that binds every fixture, schema and expected result to exact SHA-256 digests.
- Keep product-specific send-policy configuration outside the shared protocol while testing recipient, content, attachment, rate and human-approval controls in the product layer.

**Done when:** the public harness reproduces every normative state and failure condition without a network account.

### 4. Developer distributions

**Status:** complete on the release branch

- Publish MAP and Registry validators for JavaScript and Python.
- Publish canonical embedded schemas for Rust.
- Publish typed documents, strict decoding and core validation for Go.
- Verify every public artifact against the canonical schema bytes before selecting it on the website.
- Keep package versions independent of the MAP profile version and show the exact selected release per ecosystem.

**Done when:** npm, PyPI, crates.io and Go releases all have immutable public evidence, the Tools page builds from that evidence and a clean consumer can run each documented example.

### 5. Nitrosend and Sourcey implementation

**Status:** in progress

- Merge Nitrosend API support for an optional typed MAP description in transactional sends.
- Preserve the readable text and HTML parts and add the structured `application/ld+json` alternative only on providers that support exact MIME construction.
- Include the MAP description in idempotency and reject unsupported delivery paths before calling a provider.
- Release matching SDK types after the API contract lands.
- Add Sourcey Content Review operations against an exact content revision using Sourcey's existing authentication and authorization.
- Keep Sourcey theming and rendering generic; MAP behavior belongs in an implementation boundary, not fixed reader-theme content.

**Done when:** both services implement the exact released profile and schemas, with focused tests and public source or reproducible build evidence.

### 6. End-to-end dogfood and Registry evidence

**Status:** planned; depends on milestone 5

- Create an exact Sourcey content revision and Content Review description.
- Send a readable test email and MAP description through Nitrosend to a configured test inbox.
- Have an independently configured client submit `request-changes` and `approve` through Sourcey's trusted authenticated endpoint.
- Prove stale revision rejection, approval policy, exact retry and lost-response recovery.
- Exercise Nitrosend sending restrictions and human approval before any follow-on email.
- Record source versions, profile, type digest, operation, request and result digests in a reproducible run packet.
- Add the implementation declaration to the Content Review Registry record only after the behavior is deployed and reproduced.

**Done when:** another operator can reproduce the public run and obtain the recorded outcomes. The evidence discloses common ownership.

### 7. Contribution and adoption loop

**Status:** open for pull requests; hosted submission and external evidence remain

- Accept new types, amendments and implementation declarations through one versioned JSON format and GitHub review.
- Keep the browser checker local and use Git as the only source of accepted Registry state.
- Add a narrowly scoped website-to-pull-request flow only when it reduces real contributor friction.
- Publish conformance fixtures and exact reproduction commands for implementers.
- Seek one implementation outside the common ownership group before using language such as independent interoperability.

**Done when:** an external contributor can propose a type or implementation without a private account or second Registry database, and at least one external implementation can reproduce a core case.

### 8. IETF discussion and submission

**Status:** draft source prepared; submission depends on milestone 6 evidence

- Maintain the XML Internet-Draft source with terminology, architecture, processing rules, security, privacy, IANA considerations and implementation status.
- Position MAP as an action vocabulary and authenticated execution profile carried by Structured Email, not a replacement for email transport, Structured Email, OAuth or HTTP.
- Re-run author tooling and update the implementation section from public evidence.
- Ask the relevant application-area and Structured Email community for early scope feedback.
- Submit an individual draft, then revise from list and meeting feedback before asking for working-group adoption.

**Done when:** the submitted draft passes IETF tooling and every implementation claim links to reproducible evidence.

## Immediate dependency sequence

1. Run package-native checks, the MAP conformance suite, the site build and browser tests from a clean release tree.
2. Open and merge the MailSchema release pull request after its required check passes; verify the new public schemas, profile page, Tools page and social metadata from `mailschema.org`.
3. Complete Nitrosend `main` CI and production readback for the merged API contract.
4. Implement Sourcey's Content Review service boundary and test it with the same fixtures.
5. Run and publish the common-ownership dogfood evidence, then add exact implementation declarations to the Registry.
6. Refresh the Internet-Draft implementation status and begin IETF community review.
7. Use the conformance kit and Registry contribution path to recruit an external implementation.

## Release and consistency gates

- Canonical schemas live under `public/schemas/`; packages and product integrations pin exact copies or digests.
- `conformance/map-0.1/manifest.json` binds normative artifacts and expected cases.
- `docs/releases/current.json` selects only independently downloaded package artifacts whose embedded contribution schema matches the current canonical bytes.
- A schema change requires new affected package releases and promotion evidence before the site can build.
- The Nitrosend SDK follows the merged API schema; it is not published ahead of that API contract.
- Registry implementation claims require deployed behavior and reproducible evidence, not an open pull request.
- Protected `main` must pass repository verification before Cloudflare deployment.

## Material risks and controls

| Risk | Control |
| --- | --- |
| Email content tricks a client into sending credentials to an attacker | Endpoint trust is configured independently of the email; descriptions carry no credentials or grants |
| A retry applies an action twice | Stable request IDs, value equality, recorded results and explicit idempotency conflict behavior |
| Approval targets the wrong revision | Every request repeats the exact target revision and digest; stale targets fail without an effect |
| Registry branding becomes a de facto central runtime | Clients may bundle definitions; MAP 0.1 requires no online Registry lookup |
| MailSchema overclaims adoption | Implementation state is recorded per exact type, profile, operations and digest; common ownership is disclosed |
| Package versions drift silently | Every advertised channel is selected explicitly from immutable public readback evidence |
| The IETF draft duplicates existing work | MAP reuses Structured Email, MIME, HTTP, Problem Details and service authentication and keeps its new surface narrow |

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
