# MAP 0.3 specification bundle

Status: specification draft, 2 October 2026. The architecture baseline is [MAP-0.3-DESIGN.md](../../docs/MAP-0.3-DESIGN.md). This directory is the source for the new text. The published site, Registry, runtime, packages, and historical artifacts still describe their existing versions.

Read in this order:

1. [MAP Core 0.3](core.md): description, contracts, trust, service readback, exact terms, human route, security, privacy, and conformance.
2. [HTTP binding](http.md): mapping to an existing API, credential protection, conditional decisions, retries, and native outcomes.
3. [Experimental capability binding](capability.md): limited bearer operations, delivery, fixed POST, correlation, lifetime, and replay limits.
4. [Four initial contracts](contracts.md): generated readable projection of the complete JSON contracts in [contracts/](contracts/).
5. [Conformance skeletons](../../conformance/map-0.3/README.md).
6. [Generated Internet-Draft](../../ietf/draft-mailschema-mail-action-protocol-00.xml).

## Source ownership and generation

Edit `core.md`, `http.md`, and `capability.md` for normative prose. Edit `contracts/*.json` for a type's semantics, schemas, operations, effects, inputs, and outcomes. All normative type requirements are inside that contract's canonical digest. The readable contract chapter and the draft's contract appendix are projections; they are never separate authorities.

`schemas/` and `context.jsonld` are draft companion artifacts. Schema success checks shape only: it does not prove MIME, authentication, recipient control, lexical limits, authorization, or atomic execution. Core prose governs processing; the schema is not a shortcut around it. `catalogue.json` is a generated draft inventory, not the active public Registry or a published profile record. Its byte hashes bind drafting sources; contract identities separately use RFC 8785 canonical SHA-256.

`examples/source.json` supplies illustrative instance values. Generation adds the fixed context, profile, and current contract digest to each standalone example, validates their shape, and expands their JSON-LD with an offline loader. The inert `.example` destinations and illustrative content digests are not implementation evidence.

```sh
npm run spec:generate
npm run spec:check
npm run draft:check
npm run verify
```

The 0.2 draft projection remains reproducible from the existing site text in `ietf/archive/`. Its historical contents are retained unchanged. The new `-00` describes 0.3; neither file is evidence that an Internet-Draft was submitted.

## Drafting clarifications

- A qualifying DKIM signature must satisfy all coverage rules itself. A trusted `dkim=pass` alone does not establish those facts or bind rewritten machine data.
- Recipient control and trusted delivery evidence govern forwarded copies. There is no invented test for detecting automatic forwarding.
- Canonical contract bytes, including normative prose, are hashed. Lifecycle metadata stays outside that immutable definition.
- Opaque tokens and mailbox local parts are preserved; Unicode display defenses do not rewrite identity.
- Publication Approval authorizes publication. It cannot silently inherit historical Content Review's review-only decisions.
- Capability limits are seven days for refusal, three days for a protective report, and one day for address confirmation. They are explicit MAP choices. The last adopts NIST's email-confirmation limit without extending NIST's scope to every mailbox-validation use case.
- The first two approval types close a proposal on approve, decline, or request-changes. New terms require a new interaction and decision. Neither an approval nor feedback creates standing authorization.

## Implementation handoff

The next product step is Campaign Send Approval against the existing service hold/approval operation. Use the canonical contract, not the illustrative API in the HTTP chapter. Document how the existing API establishes the proposal, principal, recipient, tenant, exact contract digest, immutable content, fixed audience, schedule, and current operation set. Demonstrate an intervening terms change, a permission revocation, and a competing decision at the atomic boundary. Queueing must preserve the accepted snapshot.

Do not update dogfood examples by renaming a 0.2 request. The new description has no action endpoint, request envelope, or result protocol. A connector maps to the service's existing read and operation. Where the service cannot establish a required fact or enforce a version atomically, record that implementation gap rather than infer it from email.

MCP, new package APIs, package version choices, Registry activation, and production deployment remain subsequent work. Adding these four draft contracts does not require a package release. No Nitrosend example or product code is changed by this delivery.

## Submission preparation

The draft is an individual-submission candidate, not an adopted standard. [IETF 127's cutoff](https://datatracker.ietf.org/meeting/127/important-dates/) is 2 November 2026 at 23:59 UTC, including `-00` submissions. The MAP profile version and Internet-Draft revision are independent.

Before upload, review implementation feedback, confirm author details and the submission date, make the cited artifact location durable, and rerun generation and `xml2rfc`. Consult SML on the container and receiver trust assumptions and DISPATCH on venue. Preparation and rendering do not submit the document or send those communications.
