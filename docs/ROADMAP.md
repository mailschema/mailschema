# MailSchema execution plan

Status date: 23 September 2026. This is the canonical dependency-ordered plan for taking MailSchema from its published project surface to an implemented and reviewable open standard.

## Objective

Publish and operationalize MailSchema end to end: establish the public project, freeze an implementable Mail Action Protocol profile, prove it through Nitrosend and Sourcey, publish conformance evidence, open contribution intake and prepare an evidence-based IETF submission.

## Invariants

1. MailSchema is the project and ecosystem. Mail Action Protocol is the specification.
2. MAP reuses established email, MIME, HTTP, authentication, authorization and error standards where they satisfy the requirement.
3. Readable human participation and the service's existing authority remain intact.
4. MAP 0.1 introduces no mandatory global identity provider, custom DNS mechanism, central runtime Registry lookup or universal policy language.
5. Draft maturity and implementation evidence are stated accurately.
6. Credentials and private operational data remain outside public artifacts.

## Milestones

### 1. Public foundation

**Status:** in progress

- Create `github.com/mailschema/mailschema` as the canonical public repository.
- Publish the current verified site, Registry and tooling sources.
- Add code and specification licensing, contribution terms, governance, security reporting and versioning policy.
- Protect `main`, require verification, configure package-promotion pull requests and deploy verified `main` builds to Cloudflare.
- Remove local agent-runtime files from the public source set.

**Done when:** a clean checkout passes package and site verification; the protected repository deploys `mailschema.org` without local credentials.

### 2. MAP 0.1 profile

**Status:** planned; depends on milestone 1

- Carry the structured description as JSON-LD using the IETF Structured Email MIME model.
- Define exact description, request, result and problem schemas.
- Define HTTPS execution, service-established authentication, authorization, idempotency, result recovery and version handling.
- Define endpoint and external-reference rules, prompt-injection boundaries, privacy requirements and human fallback.
- Publish valid and invalid Content Review fixtures, including a complete `.eml` message.

**Done when:** two independent implementations can be written from the specification without selecting unspecified field names or status behavior.

### 3. Reference implementation and conformance

**Status:** planned; depends on milestone 2

- Build a deterministic client and service harness around Content Review.
- Test completion, refusal, stale revisions, approval requirements, duplicate requests, changed-payload conflicts, lost-response recovery and unsupported versions.
- Publish a conformance manifest that binds fixtures and results to exact schema digests.
- Keep Nitrosend's send-policy format implementation-specific while testing recipient, content, attachment, volume and human-approval controls.

**Done when:** the public harness reproduces every normative state and failure condition without a network account.

### 4. Nitrosend and Sourcey dogfood

**Status:** planned; depends on milestone 3

- Sourcey creates an exact content revision and exposes Content Review operations.
- Nitrosend sends the readable email and MAP description to a test inbox.
- A configured agent client submits feedback and approval through Sourcey's authenticated action endpoint.
- Sourcey rejects stale revisions and safely returns a prior result after a retry.
- Nitrosend separately applies sending restrictions and human approval before any follow-on email is delivered.

**Done when:** a recorded test run binds source versions, profile, type, operations, requests and results. Common ownership is disclosed and is not presented as independent adoption.

### 5. Registry evidence and contribution intake

**Status:** planned; depends on milestone 4

- Add implementation declarations and reproduced evidence to the Content Review record.
- Publish the conformance fixtures and exact reproduction command.
- Let contributors prepare files in the browser or CLI and submit the same file through a narrowly scoped GitHub pull-request path.
- Require review for normative changes and implementation claims.

**Done when:** an external contributor can propose a type or implementation without a private account or a second Registry database.

### 6. Standards submission

**Status:** planned; depends on milestone 5

- Produce an Internet-Draft source with terminology, architecture, protocol fields, processing rules, security, privacy, IANA considerations and implementation status.
- Position MAP as an action vocabulary and execution profile carried by Structured Email, not a replacement for email transport or Structured Email.
- Run IETF author tooling and submit an individual draft for discussion with the relevant application-area community.

**Done when:** the draft source passes author checks and every implementation claim links to reproducible evidence.

## Integration checks

- All consumers use the same versioned MAP schemas and Content Review definition.
- The fixture suite covers success, refusal, stale revision, approval required, duplicate request, lost response, unsupported version and policy-blocked sending.
- Registry evidence names exact versions, operations, fixtures and observed results.
- Protected `main` passes verification before deployment.
- Package promotion never depends on a mutable registry label.
- The Internet-Draft makes no claim stronger than the recorded evidence.

## Work deliberately deferred

- custom DNS discovery;
- a universal agent identity provider;
- a universal sending-policy language;
- mandatory online Registry lookup;
- additional language packages without an implementation consumer;
- stable or certified conformance claims before independent evidence exists.

## Plan provenance

The plan was validated by the Runx `work-plan` package in run `run_work-plan-agent_dbd35f81ed05879f`, receipt `sha256:069ced3883c313625149c16987a1002bbeaa5fe20387fa1dd48c32df449e25fa`.
