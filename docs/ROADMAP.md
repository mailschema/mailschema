# MailSchema roadmap

The [0.3 specification bundle](../specifications/map-0.3/README.md) governs new work; the [architecture decision](MAP-0.3-DESIGN.md) explains its boundaries without adding requirements. The bundle contains Core, the HTTP and experimental capability bindings, four draft contracts, conformance skeletons, and the generated `-00` candidate. The site builds a coherent 0.3 reader, Registry, examples and tools experience from those sources. The legacy package and implementation evidence below remains explicitly historical until replacements are implemented and verified.

## Objective

Make MAP a useful open standard for service actions carried through email, with MailSchema as its specification, type Registry and implementation ecosystem. Prove it in products we control, record exact evidence, accept external contributions through reviewed Registry data, and state maturity and ownership exactly.

## Invariants

1. MailSchema is the project and ecosystem. Mail Action Protocol is the specification.
2. MAP layers typed action descriptions on email and Structured Email. For 0.3, a trusted implementation maps them to existing service operations; there is no universal execution endpoint or request/result envelope.
3. Receiving an email grants no authority for credentialed operations: a client selects its service connection independently and uses an existing credential. The optional experimental capability binding permits only contract-approved, limited bearer actions after Core's qualifying DKIM, strict alignment, recipient and host-policy checks. Possession of that URL remains transferable bearer authority.
4. Human-readable email and normal service interfaces remain available.
5. MAP introduces no mandatory global identity provider, custom DNS mechanism, central runtime lookup or universal policy language.
6. Registry records bind definitions, versions, operation IDs and implementation evidence. Registry presence does not grant runtime authority.
7. Draft maturity, ownership and implementation evidence are stated exactly. Common-ownership dogfood is not presented as independent adoption.
8. Credentials and private operational data stay outside public artifacts.

## Delivery status

The branch updates the site to MAP 0.3 in development and production builds. Browser and build verification precede merge and deployment; no package version is changed.

## Published implementation baseline

| Surface                   | State                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site and Registry         | Live at [mailschema.org](https://mailschema.org), deployed from [`mailschema/mailschema`](https://github.com/mailschema/mailschema) after verification                                |
| MAP 0.2 profile           | Working draft: a type-agnostic core, with types published through the Registry and resolved by clients from its catalogue                                                             |
| Interaction types         | The initial [collection](TYPE-COLLECTION.md) of ten drafts, each with a digest-bound contract, request schema, chapter and fixtures                                                   |
| Reference and conformance | One contract-driven engine for every type; 100 executable cases mapped to 39 requirements, with shared vectors and a DKIM-signed message kit                                          |
| Ruby                      | `mailschema` `0.2.0` on RubyGems processes MAP 0.2, published from [`mailschema/ruby`](https://github.com/mailschema/ruby) through trusted publishing                                 |
| JavaScript                | `mailschema` `0.2.2` on npm processes MAP 0.2 from the same core the reference implementation and conformance suite run                                                               |
| Python, Rust, Go          | PyPI and crates.io `0.2.1` and Go `v0.2.0` carry the MAP 0.2 core artifacts and the Registry tooling, and no type contracts                                                           |
| Nitrosend                 | Content Review 0.3 on MAP 0.2 deployed in production, on the Ruby gem; the MAP 0.2 evidence run is pending                                                                            |
| Sourcey                   | `3.6.10` renders the specification                                                                                                                                                    |
| Internet-Draft            | The 0.3 `-00` candidate is generated from the new specification and contracts. The prior 0.2 candidate remains reproducible in `ietf/archive/`. No submission or adoption is claimed. |

## Repositories

- [`mailschema/mailschema`](https://github.com/mailschema/mailschema): specification, site, Registry, schemas, fixtures, conformance suite, package sources and Internet-Draft.
- [`mailschema/ruby`](https://github.com/mailschema/ruby), [`javascript`](https://github.com/mailschema/javascript), [`python`](https://github.com/mailschema/python), [`rust`](https://github.com/mailschema/rust) and [`go`](https://github.com/mailschema/go): one repository and release history per language.
- [`mailschema/.github`](https://github.com/mailschema/.github): the organization profile.
- Nitrosend and Sourcey stay in their product repositories. MailSchema records their supported versions and evidence rather than copying their code.

## Next

**MAP 0.3 release gate:** Nitrosend's controlled product send, signed receipt,
native review, service decision and resulting SES delivery have been observed.
The next build follows the [release plan](#map-03-release-plan) below. Publish
implementation evidence only when its sources are available, with its limits.
The observations below also contain Nitrosend deployment checks and later
milestones; they are not all prerequisites for the first working draft.

| Area | Current state | Next check or follow-on |
| --- | --- | --- |
| Producer and receiver | An owner-only hold ran through Nitrosend's `NotificationEmailJob`, `Notification::Sender`, durable message admission and SES. Its original signed SNS callback entered the isolated local controller; the received S3 MIME matched the persisted outbound MAP description, passed receiver verification and bound to the pending native inbox review. The temporary capture subscription was removed. Development's local provider was bypassed for that one isolated send process. | Check the production platform sender and inbound configuration. This is one first-party chain, not general interoperability. |
| Native human interaction | A product-delivered campaign appeared as a verified pending native card in the running local inbox at desktop and mobile widths, with its original email and ordinary links retained. GET and HEAD of the local links left the hold and delivery untouched. The current exact-version request was then approved through the native inbox API under an authorized owner test bearer. Its one-recipient campaign completed through SES; the receiving S3 store contains the matching original email. The campaign and native inbox both read back terminal state. A headless browser then exercised lost-response handling against the isolated API: a still-pending request kept its uncertainty message and did not retry, while an initial pending view of an already-approved request resolved to the real terminal readback. The intercepted POSTs were not forwarded, so this did not prove an in-flight commit. Hold 6 remains untouched. | Review the public HTTPS route before deploying the inbox; retain the distinction between UI recovery and a concurrent service race. This was an operator rehearsal, not a claim that the owner clicked the UI. |
| Progressive enhancement | The native card is primary and the collapsed Original email retains ordinary review links. The product-delivered message displayed both, and its local approve/decline GET and HEAD routes had no effects. Unsupported types retain the ordinary email. | Exercise absent connections, failed trust, stale service state and native presentation failure through the running UI. |
| Agent host | The local MCP server returned the product-delivered campaign message as a pending first-party action with `approve` and `decline` descriptions, while `decision_policy` remained `human_only` and `can_execute: false`. Earlier it withheld messages with mismatched recipients or bindings. | Apply connection permissions and host policy before any agent-decidable contract is claimed; model output never stands in for human approval. |
| Enforcement and recovery | Focused local tests cover selected stale, expiry, repeated-decision and spending-cap cases. The owner-inbox campaign decision leaves the reusable template unapproved. A cancelled campaign now presents its still-saved approval hold as withdrawn in both campaign and verified inbox views, hides decision operations, and refuses preview and customer or operator decisions under the existing service lock. The operator screen no longer offers stale approval controls. At scheduled cleanup, cancellation is recorded as withdrawn; an unanswered live proposal is recorded as expired, not as a human decline. Pausing an undecided Safe Mode send fails without stranding its sealed attempt. A repeated customer approval through the ordinary campaign route now returns conflict without changing the admitted job; operator retry behavior remains intact. The 19 focused Safe Mode request and 15 approval-service examples pass. This uses the same hold and the send attempt's authoritative stop signal rather than a second decision record. Nitrosend's `human-scanner` adapter observed GET and HEAD leave a pending hold and delivery admission unchanged; its running-API rehearsal mapped to `http-existing-revision-field` observed mismatched decline → 409 with zero changes, exact decline → 200 and cancellation, replay → 409. Both ran on an isolated local hold against the same canonical scenario manifest. The mismatched value was arbitrary, not a previously valid revision. A completed campaign now refuses a new approval request before creating a hold or notification; its focused request spec passes. These observations do not establish full 0.3 conformance, a concurrent race, or the result of an in-flight commit whose response is lost. | Review the service lock and customer decision path for the first draft. Add real revision, revoked-permission, concurrent-decision and lost-response vectors to the later executable conformance suite. Distinguish acceptance from completion. |
| Campaign billing semantics | The draft Campaign Send Approval contract now excludes additional charges and prepaid debits. Nitrosend checks included email capacity before recording approval and rejects a billable reservation before dispatch; focused refusal, rollback and terminal-recovery specs pass. Both review surfaces show the current allowance refusal. | Prove the included and exhausted-allowance paths in the running send, including an allowance change after approval. Check that no prepaid hold, external usage charge or provider dispatch occurs on the denied path. A paid campaign needs a separate type or version with a declared payment effect and exact amount, cap, currency and funding terms. |
| Private financial dogfood | The owner approved a local 500-contact order capped at $5; it awaits funding and has queued no work. Its first Stripe test Checkout attempt failed because automatic tax lacked a head-office address. The owner supplied the address; the test-mode Tax setting now reads `active`, but Checkout has not been retried. The local Prospeo profile rate and rate-card version are absent, leaving no supported enrichment route. The saved quote is stale, so the MCP host offers no decision. | Configure the real provider rate and version, then create a fresh exact-terms proposal. Prove verified funding or existing balance, bounded holds, accepted outcomes, charges, unused credit, and failed or abandoned funding without presenting a Checkout session as payment. Keep this contract private until those observations exist. |
| Draft reconciliation | The site, generated draft and shape checks build from the current sources. Contract and other authored JSON now pass the 0.3 lexical I-JSON limits before generation; the browser contribution checker rejects the same invalid contract bytes. Generated examples are checked against the message byte limit. Runtime scenarios remain unimplemented. | Resolve dogfood findings in the canonical text or an explicit support limit, then regenerate and review examples, schemas, contracts and the Internet-Draft together. Link the bounded Nitrosend evidence; keep unimplemented runtime scenarios marked as such. |
| Architecture and threat review | Core delegates execution to existing service interfaces and confines email to signed description plus optional narrow bearer capabilities. The reference receiver accepts original SES S3 MIME from strictly DKIM-aligned senders; its installed action bindings remain first-party. Its extractor rejects duplicate machine-part MIME headers and parameters, unsupported transfer encoding, and a non-readable related root, including an empty `multipart/alternative` root; the stored Mailgun-to-SES original still parses. The first-party inbox bindings now match saved-object, message and inbox brands; a focused cross-brand campaign case exposed no action. MAP human decisions reject ambient cookie-session authentication and require the app's explicit token. A configured local inbound rehearsal now checks SNS signature, exact topic and S3 bucket instead of taking the ordinary development bypass; 20 focused controller/normalizer checks pass. A running local server with the expected topic and bucket returned 403 for an unsigned notification without admitting an inbox job. An original signed SNS callback for a real SES delivery passed the isolated inbound controller and stored a verified MAP message. A read-only cloud check found a broad SES publish statement; the local provisioner now repairs it to the receiving account and receipt rule, but the live policy remains unchanged. | Review the actual boundary for forwarded mail, replay, gateways, lookalike origins, prompt injection, URL leakage, sender/recipient changes, tenant isolation, role revocation, scanner GETs and capability misuse. Configure the inbound ARN and bucket, apply and verify the scoped topic policy through the reviewed setup path, and retain signed-callback evidence. Remove unsupported normative scope instead of adding speculative machinery. |
| Content and UX | The 0.3 reader and catalogue are built from canonical sources. A local browser pass of 19 key routes at 390px and 1440px found no HTTP error, horizontal overflow, duplicate/missing H1 or page-script exception; the built site's internal links resolved. Home, reader, Types and Registry were visually inspected at both sizes. About, Examples, Interfaces, Tools, Contribute, a Registry detail, Payment effect and Search were also inspected at both sizes, at the top and end of each page. A middle-page check of Core, type contracts and a Registry detail found the full Registry JSON schema obscuring the example and implementation status; complete schema and description now sit behind keyboard-accessible disclosures. Both widths opened and closed the schema with Enter without overflow or page errors. The MCP tab, stale-terms demo and contract checker responded correctly in the browser, including rejection of duplicate JSON members. A 5 October source review reread the current public page copy, Core, bindings, Registry rules and four contract sources. It corrected two stale Types references, pinned the MAP 0.2 historical source links and marked older design notes as historical. The site verification and current draft render pass. | Complete the source and rendered-page review in the release plan; keep public claims matched to the recorded implementation evidence. |
| Packages | Published language packages implement 0.2. No 0.3 package version has been selected or published. | Keep the site clear that these packages implement 0.2. Later, extract only demonstrated shared processing, review compatibility and versions, verify each package, publish deliberately and read back public artifacts. A new Registry type alone triggers no package release. |
| IETF submission | The generated individual `-00` candidate has a 5 October document date. It renders to text and HTML with pinned `xml2rfc`; the only renderer warning is its automatic consensus value for the Standards Track category. Offline `idnits` 3.1.0 submission mode reports zero errors, warnings and comments. No venue consultation, author confirmation or submission has occurred. | Confirm author metadata, final submission date and stable URLs; review the rendered draft; consult SML about the email container and DISPATCH about venue; submit only the reviewed candidate and record the public readback. |

Nitrosend owns its implementation plan in `api/doc/map-aware-inbox.md`; MailSchema
owns the protocol and this release gate. Product code and evidence stay in their
owning repository. Record exact revisions, contract digests, setup and observed
outcomes for passed rows. Planning does not pass any row.

The first isolated Nitrosend database lacked a platform notification brand, so
`Notification::Sender` correctly refused to send. A fresh isolated copy now
records the observed SES `nitrosend.com` identity and a dedicated platform brand.
An owner-only hold went through the normal notification job, sender, durable
message admission and SES to the account 1 inbox. The original S3 MIME matched
the saved description, passed independent DKIM checks and entered the local
MAP-aware inbox from a reconstructed receipt. The pending native card and MCP
read path both resolve the current saved hold. Its ordinary links reach a
localhost HTTPS review on this machine; they are not public demo URLs. The
queued notification replay completed with no duplicate message or provider ID.
The exact evidence is in Nitrosend's `api/doc/map-aware-inbox.md`.

The earlier adapter-only delivery established the original signed SNS callback
through the isolated controller. A subsequent product-sender request also
entered through its own original signed callback, with the referenced MIME
matched to the persisted outbound message. Nitrosend's generic receiver trust
check accepts an independently,
strictly DKIM-aligned sender; its installed action bindings remain first-party.
The human-decision guard rejects administrator impersonation and ambient-cookie
authentication. A focused request left the hold pending after an impersonated
approval, while the owner's explicit token could decide it.

The local scanner and HTTP-decision rehearsals now share a snapshot of the
sealed attempt, admission reservations, outbox messages, provider-dispatch
timestamps and send counters. They refuse an already admitted attempt and
compare this ledger before calling a negative path effect-free. The prior
observed HTTP run used the narrower decision-state checks. A fresh pending
account 1 hold passed the strengthened `human-scanner` adapter on 5 October:
GET and HEAD returned 200, with the full effect ledger unchanged. After signed
callback capture, the HTTP decision adapter observed an arbitrary mismatched
version return 409 with no changed effects, the exact owner decline return 200
and cancel the send, and a replay return 409 with no further effects. This is
distinct from a formerly valid version superseded by new terms and from
lost-response recovery.

The human-route gate also includes Nitrosend's app framing policy. Its static
Vercel header currently allows every `*.myshopify.com` ancestor; [Shopify's
guidance](https://shopify.dev/docs/apps/build/security/set-up-iframe-protection)
calls for the authenticated shop's specific domain and the admin domain. Verify
a narrower policy against installed embedded shops and standalone MAP review
before claiming clickjacking protection. A shop name supplied only in a URL is
not a trusted basis for that header.

The draft now distinguishes an email's ordinary review link from a verified
service route. DKIM authenticates the sender's claim, not the destination
service. A connected consumer must establish any MAP-promoted route through
its installed binding; an unconnected consumer may show the link with its
actual origin. The `human-unverified-route` runtime scenario remains
unimplemented. Nitrosend's first-party inbox bindings rebuild and compare the
complete description from saved service state before offering native controls;
the ordinary email links remain visible as ordinary links. A focused local
request with an unrelated `human.url` and fixture verification metadata
exposed no native action or review endpoint and left the hold pending. It does
not prove ordinary-link presentation or a real signed hostile message.

The isolated Nitrosend development review first exercised the $5 enrichment
card, human decision and funding boundary with synthetic receipt metadata. A
later provider transport probe delivered an actual MAP MIME message through
Mailgun and SES to an existing test inbox. Its stored original passed
independent DKIM and recipient checks and entered the local native inbox through
an ingress replay; the replay reconstructed the SES receipt from read-only
evidence and did not use the original signed SNS callback. The owner approved
the $5 cap in the inbox; the order remained unfunded with no work queued or
usage charge. The configured Stripe test account initially rejected Checkout
creation because automatic tax lacked a head-office address. The owner supplied
the address; the test-mode Tax setting reads `active`, but Checkout has not been
retried and no funding or enrichment was completed. Nitrosend's
`api/doc/map-aware-inbox.md` records the bounded observations. A later
owner-only campaign request followed the product sender, SES, an original signed
callback and the verified native inbox in one isolated local chain. Opening its
fallback link did not decide or queue delivery. A separate owner approval
completed one local-provider campaign send; that fixture did not prove campaign
delivery through a real provider. The later owner-inbox approval on hold `7`
completed a one-recipient campaign through SES, with the matching original in
the receiving S3 store. Payment and independent interoperability remain open;
neither is claimed by the first working-draft release.

**Public framing: actionable email.** MAP describes service actions delivered
by email; a supporting inbox presents and carries out authorized decisions.
Native interaction and ordinary-email review links present the same proposal.
This does not expand Core into an embedded application platform.

**Shared library boundary.** Extract proven, service-independent processing into
the maintained language packages: strict description and contract parsing,
validation, canonicalization, digests, typed structures, bounded MIME helpers
where appropriate, and conformance fixtures. Ruby can also supply description
and MIME construction and reusable version, expiry and operation checks. The
service runs these checks with its own current authorization and state checks
inside the decision transaction. A helper does not make a separate read/write
sequence atomic. Reuse established email authentication libraries or trusted
receiver evidence; do not add a second cryptographic implementation.

Inbox components, accounts, credentials, service bindings, approval records,
workflow storage and transactions stay in implementing products. Host helpers
must require explicit trusted receiver, service and policy interfaces; they
cannot infer authority from mail. A proven fallback-toolbar convention can have
optional helpers and implementation guidance without prescribing a widget
language or inbox layout. Only interoperable obligations enter normative text.
Keep vendor identifiers and product logic out of MailSchema packages and the
specification. Nitrosend should consume the shared Ruby processing once extracted,
not maintain a permanent duplicate. The published JavaScript/TypeScript and Ruby
packages currently implement MAP 0.2; this boundary describes forthcoming 0.3
work. Package development continues; select versions from reviewed compatibility
diffs, and keep catalogue additions independent of Core package releases.

## MAP 0.3 release plan

This is the next pass's build order, not a description of work already finished.
Keep the existing description, trust boundary and service-owned execution model.
Correct actual inconsistencies; do not reshape Core around a particular dogfood
example or turn the specification into a conversation history.

| Part | Responsibility |
| --- | --- |
| Core | The email description, contract selection, trust, permission and exact-terms processing. |
| Type contract | The interaction's identity, details, operations, inputs, effects and obligations. |
| Service binding | Mapping those semantics to existing service operations through an independently enabled integration. |
| Registry | Optional discovery of exact contracts and declared service support, with maintainers, lifecycle and evidence. |

### 1. Reconcile scope and terminology

Read `core.md`, `http.md`, `registry.md`, `capability.md` and `overview.md`
together. Preserve the current wire shape and security rules unless a concrete
contradiction requires correction. Types can describe inputs and service actions
beyond approval; they are not limited to Nitrosend's workflows. Explain extension
once: new meanings use contracts, new interfaces use bindings, and changes to
common wire or authority rules need a new profile. A client still needs to
understand the contract's semantics. Keep the capability binding explicitly
optional and experimental. Catalogue editorial policy belongs outside Core.

Finish with one clear account of what the email describes, what the client
checks and what the service enforces. Do not add an exhaustive list of future
use cases or exclusions to the introduction.

### 2. Make contract publication durable

Use versioned contract filenames and download URLs, following the existing
project convention: for example,
`/artifacts/map-0.3/contracts/campaign-send-approval-0.1.json`. The canonical
digest belongs in the record; no additional digest-based URL system is needed.
Contract JSON owns identity and semantics. Registry metadata references it and
owns status, maintainers, selected version and successor. Preserve each published
version; the friendly type page can select the current one and link its history.

Before publication, local drafts remain editable. After publication, even a
Draft contract revision is fixed: any canonical-content change requires a new
contract version. Metadata and explanatory pages can evolve separately. Update
contract sources, `registry.json`, `src/data/types.ts`, the artifact route and
`scripts/map-0.3.mjs` together. Keep historical URLs intact. Moving an unpublished
file alone changes neither its contract version nor its digest.

### 3. Complete the type-centred Registry

Keep one type catalogue, with service records displayed within each applicable
type and version. A service record names its maintainer, exact contract,
operations, binding documentation, status and support declaration or report.
A declaration states claimed support; a report records observations. Neither
implies certification or supplies an executable connection by itself.

Revise `schemas/implementation.schema.json` and the matching Registry prose:
require the artifact, host format and digest only when a record distributes an
installable integration. Built-in support must not require publishing a connector
package or service source code. Scope these as service records; consumer-only
reports must retain their actual conformance role rather than masquerade as
service connections.

Use one canonical service-record collection and derive associations with types.
Replace hard-coded Draft status with per-version metadata. Pages and the public
catalogue use the same assembled data. Keep `catalogue.json` a file inventory;
remove its duplicated lifecycle fields and invented empty evidence arrays.
Show support on type pages without adding a separate marketplace. List the
Nitrosend observations only when their exact evidence can be publicly referenced.

### 4. Align contribution and versioning instructions

Extend the existing browser checker and GitHub flow to prepare a contract or
service record, using the same parsers as the repository. Document the exact
source files and companion example required. Anyone can propose a contribution;
maintainers review meaning, overlap, identifier ownership and maintenance.
Preserve external contract namespaces. A page slug is not protocol identity.
A Draft type does not need two deployed services, and a support declaration is
not a verified interoperability report.

Update `/contribute`, `CONTRIBUTING.md` and the PR template together: the root
guide currently points at the 0.2 importer. Retain that importer for historical
maintenance. Rewrite current guidance in `VERSIONING.md`, whose shared-block
model and same-digest clarification rule conflict with 0.3. Reconcile terminology
in `GOVERNANCE.md`, `SECURITY.md` and `PRODUCT.md`. Do not create a submission
backend, new review lifecycle or new package-release requirement.

### 5. Decouple the protocol document from the collection

Change `scripts/draft.mjs` to select one explicit illustrative contract revision
and exchange instead of inserting every Registry contract or its changing count.
Keep its values derived from the canonical contract and example sources. A new
type must not change the generated protocol document. The website can continue
to regenerate its catalogue and useful contract reference material.

Keep the reader's type chapter useful; remove duplication only where it harms
navigation or reading. It need not disappear to establish independent versions.
Update source-ownership descriptions in `README.md`, the specification README
and `ietf/README.md` to match what lands. Contract rules remain authored once.

### 6. Edit and review the complete reading journey

Read home, overview, specification, Registry and type pages, contributions,
examples, interfaces, tools and About in order. Preserve the approved hero and
visual hierarchy. Explain familiar work first. Define contract and binding once,
and use them consistently. Put full trust requirements in the specification and
maturity information beside the claims it qualifies; avoid repetitive caveats
and implementation bookkeeping throughout the site.

Check the initial contracts on their own semantics. Preserve Core's existing
support for typed input and asynchronous work. Financial requests and multiple
approvers can have their own contracts and service rules; do not invent types or
broaden existing ones to imply demonstrated support. Keep protocol capability
distinct from implementation evidence. Correct stale references and conflicting instructions.
Regenerate after the source work, inspect dev pages and use the existing
artifact/build checks. No new test programme or external adopter is required by
this release plan. Finish with a clean candidate and an accurate publication
queue, without claiming completion of later milestones.

Nitrosend production deployment, independent interoperability, the private $5
enrichment workflow, full runtime conformance, package releases and IETF
submission remain separate follow-ons. The individual IETF candidate still
needs author confirmation, venue consultation and a reviewed date before upload.

## Gates

- Published versioned artifacts retain their original bytes. Changing a contract's contents requires a new contract version; changing wire or authority interpretation requires a new profile.
- Every package release is verified against the canonical bytes by public readback before the site selects it.
- Implementation listings distinguish a maintainer's support declaration from a report of observed behavior. Reports identify the tested revisions, coverage, evidence and implementation owner.
