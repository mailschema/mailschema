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

**MAP 0.3 release gate:** Nitrosend is the first-party reference, and its
controlled send, signed receipt, native owner decision and resulting SES delivery
have been observed. Before publishing the 0.3 working draft, reconcile that
behavior with the canonical specification, review the deployable security and
fallback paths, and verify the generated site and draft. Publish the evidence
with its limits. Independent interoperability, private financial dogfood,
executable coverage of every runtime scenario, language-package releases and
IETF submission are separate follow-on milestones, not claims made by the first
working-draft release.

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
| Content and UX | The 0.3 reader and catalogue are built from canonical sources. A local browser pass of 19 key routes at 390px and 1440px found no HTTP error, horizontal overflow, duplicate/missing H1 or page-script exception; the built site's internal links resolved. Home, reader, Types and Registry were visually inspected at both sizes. About, Examples, Interfaces, Tools, Contribute, a Registry detail, Payment effect and Search were also inspected at both sizes, at the top and end of each page. A middle-page check of Core, type contracts and a Registry detail found the full Registry JSON schema obscuring the example and implementation status; complete schema and description now sit behind keyboard-accessible disclosures. Both widths opened and closed the schema with Enter without overflow or page errors. The MCP tab, stale-terms demo and contract checker responded correctly in the browser, including rejection of duplicate JSON members. A 5 October source review reread the current public page copy, Core, bindings, Registry rules and four contract sources. It corrected two stale Types references, pinned the MAP 0.2 historical source links and marked older design notes as historical. The site verification and current draft render pass. | Obtain independent editorial and interaction review in the PR; build and shape checks are not a substitute for that review. |
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

**0.3 release cut, in order:**

1. **Set the Core boundary.** State once, in Core and the opening copy, that MAP describes one actionable proposal for one recipient and one terms version. Type contracts define its meaning; independently installed service bindings read and act through existing interfaces. Keep the credentialed path and safe human route as the baseline. Keep the narrow capability binding explicitly experimental. New types, service integrations and transports must have clear extension paths without turning MAP into a general packet or workflow protocol. Resolve any remaining contradiction between Core, the HTTP binding and the Registry rules in those source chapters.
2. **Make published type identity durable.** Before publishing the four 0.3 contracts, give each published version an immutable artifact URL keyed by its contract identity, version and digest. Separate a mutable draft preview from a published draft revision. A later version gets a new artifact; the old bytes, status and successor remain available. The Registry catalogue and type page must point to the exact artifact, while a friendly type URL may point to the selected current version. Keep already published 0.1 and 0.2 URLs intact.
3. **Finish one Registry, with two linked record kinds.** The type record owns identity, lifecycle, maintainer and the contract reference. A service implementation record names the exact type digest, supported operations, binding artifact, maintainer, status and evidence. Use the existing implementation schema and reviewed repository contributions; generate the catalogue, type pages, implementation listings and downloads from those records. Replace the hard-coded Draft status and loose evidence-link arrays. List Nitrosend only after its exact source revision and bounded evidence have public references; otherwise show no implementation. A listing must not install an integration, certify it or grant authority. A type can be published in another maintainer's catalogue; MailSchema is an optional curated index.
4. **Separate the specification from the collection.** Keep contract-format and processing rules in Core. Keep each type's normative semantics in its immutable contract and render them on Registry pages. Make the reader's type chapter a concise guide to the collection. Remove the full, changing set of Registry contracts from the generated Internet-Draft appendix; retain a clearly illustrative example. Adding a type should update the catalogue and site, not republish the Core draft or every package.
5. **Make the public copy match the shipped shape.** Review the four contract meanings, then read home, overview, reader navigation, Registry, type and implementation pages, contribution flow, tools and About as one journey. Explain who can submit what, that contributions are reviewed, how a client selects a catalogue and connection, what is supported today and what remains draft. Preserve the current hero. Avoid claims of arbitrary packets, automatic compatibility, independent interoperability, payment completion or full runtime conformance. Regenerate the site and draft from the canonical sources and perform one final build and rendered-page review using the existing checks.

The first working-draft release can use the bounded Nitrosend evidence already recorded, with its limits. Nitrosend production deployment, independent interoperability, the private $5 enrichment funding and outcome path, the full runtime conformance suite, language-package releases and IETF submission remain distinct follow-ons. The [interface research](research/MAP-INTERFACES.md) remains input to later bindings; no universal mapping language is selected by this release. The IETF candidate still needs author confirmation, venue consultation and a reviewed final date before submission.

## Gates

- A change to a published profile, contract or schema is a new version; its artifacts are never edited in place.
- Every package release is verified against the canonical bytes by public readback before the site selects it.
- Every implementation claim links to reproducible evidence and states who operates the implementation.
