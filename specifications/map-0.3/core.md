---
description: "Action descriptions, exact terms and trust rules for email agents."
---

# MAP Core 0.3

## Introduction

Mail Action Protocol (MAP) describes a service action in email. It tells a client what is proposed, which exact terms apply and which decisions are available. A type contract defines the meaning of those decisions. A trusted connector maps them to the service's existing operations.

For example, a publication request can offer approval of one article revision. The client reads that revision and its publication terms from the service, applies the user's policy, and obtains confirmation when required. The service checks permission and the terms version when it records the decision. An approval for one revision cannot authorize another.

MAP uses ordinary email delivery and service authentication. It defines the description and the rules for acting on it. The HTTP binding uses existing APIs; the optional capability binding permits a small set of actions without a service credential. Neither the message nor a Registry listing grants general permission to act.

### Conventions and terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in all capitals.

- A **principal** is the person or organization on whose behalf a client acts.
- A **host** is the application that enforces that principal's policy and obtains human decisions. A language model's output is not a human decision.
- A **producer** constructs and sends a MAP message. It may send on a service's behalf.
- A **consumer** extracts and processes MAP descriptions. It may present them in a mail client or to an agent host.
- A **service** owns the proposal, authorizes its operations, and applies their effects.
- An **interaction** is one proposal addressed to one recipient, using one contract and one terms version.
- A **type contract** is an immutable definition of an interaction's data, operations, effects, and client obligations.
- A **service binding** maps a type contract to the service's read and action operations. A connector implements that mapping, either as installed code or by interpreting a supported declarative binding.
- **Service readback** means reading the current proposal through the trusted service connection. It supplies the facts used to decide, independently of the email's claims.
- An **effect** is a semantic consequence declared by a contract, including downstream consequences directly authorized by the operation.
- A **capability** is an opaque bearer URL authorizing one narrowly limited operation. Possession, including possession of a forwarded copy, conveys that authority.

## Type contracts

### Contract identification

A contract binds all normative semantics, its schemas, and its operation declarations in one JSON document. The digest is SHA-256 of its UTF-8 JSON Canonicalization Scheme representation, using [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) and [RFC 6234](https://www.rfc-editor.org/rfc/rfc6234). The spelling is `sha-256:` followed by 64 lowercase hexadecimal characters. This hashes the canonical contract, not its download formatting and not the email description. A contract MUST NOT contain its own digest.

The contract's `id`, `version`, and `profile` MUST match the description and the selected profile. A consumer MUST obtain the contract from a bundled or explicitly configured catalogue and verify its digest before use. The presence of an unfamiliar URI in email MUST NOT trigger retrieval, installation, or acceptance of a contract. Failure to resolve an exact digest makes that interaction non-actionable. A catalogue MAY be local, organizational, vendor-maintained, or public; MailSchema is not a required online dependency.

Publication fixes the contract's canonical contents. An incompatible or compatible change to any normative content requires a new version and digest. A catalogue MAY update lifecycle metadata separately, including Draft, Experimental, Stable, Deprecated, or Superseded status and successor links. Such metadata MUST NOT rewrite a published contract or automatically authorize migration to its successor. Withdrawal from new use does not justify deleting artifacts required to interpret earlier messages.

### Contract format and obligations

A contract contains `id`, `version`, `profile`, `name`, `summary`, `requirements`, `detailsSchema`, and `operations`. `requirements` is a nonempty array of normative prose strings. It MUST state the exact terms covered, actor obligations, restrictions, and any semantic conditions that JSON Schema cannot express. Documentation outside the digest-bound contract MAY explain it but MUST NOT silently change its meaning.

`detailsSchema` and each input schema use [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation). They MUST be self-contained: references MAY target fragments within that schema document, but MUST NOT require external retrieval. Validation MUST use the format-assertion vocabulary for formats the contract uses. Consumers MUST reject contracts whose keywords, formats, or semantic requirements they cannot enforce. Resource limits apply during validation; a schema is not permission to consume unbounded computation.

Every operation object contains `id`, `name`, `semantics`, `effects`, `bindings`, `actors`, `exactTerms`, `inputSchema`, and `outcomes`. `semantics` is normative text, not text to execute. `effects` is a nonempty set of absolute HTTPS identifiers. `bindings` selects the permitted authority modes: `credential`, `capability`, or both. It does not enumerate service protocols; API calls, tool invocations and brokered commands can all use the credential mode. `actors` selects `human`, `agent`, or both; this declares permitted interfaces, not the caller's entitlement. `exactTerms` is a boolean. `inputSchema` is either a schema for one JSON input object or `null`, which means the operation accepts no caller-supplied semantic input. `outcomes` maps operation-local identifiers to their semantic meanings; these are not protocol response bodies or HTTP status codes.

An operation that permits the capability binding also contains `capability` with `kind` and `maxLifetimeSeconds`. Its kind is one of `refusal`, `protective-report`, or `address-confirmation`, with the additional restrictions in that binding. No other operation may contain that member. A capability operation MUST have `inputSchema: null` and `exactTerms: true`.

Every effect resulting directly from a successful operation or from work that it authorizes MUST be declared. Approval to send a campaign therefore declares external communication, even if sending occurs later. A service MUST NOT use a narrower label such as recording a decision to conceal that effect. A service binding MUST NOT broaden a contract's semantics or accept additional semantic inputs under its identifier.

A host MUST NOT automatically approve an unrecognized effect. It MAY present such an operation for an explicit principal decision only if it understands and can accurately explain the complete contract. Otherwise it MUST refuse it. A model-generated explanation alone does not establish this understanding. Capability processing has a stricter, closed set of permitted effects.

### Initial effect vocabulary

The initial vocabulary uses identifiers under `https://mailschema.org/effects/`. These meanings are stable; adding identifiers does not change Core. The following suffixes have these meanings:

- `communication`: sending or publishing content to an external audience.
- `disclosure`: making information available to another principal or audience.
- `payment`: authorizing or causing a monetary charge, transfer, purchase, or use of prepaid value. The amount, currency, payee and funding source are separate terms that a contract must define where they matter.
- `commitment`: accepting an obligation on behalf of the principal.
- `authorization`: granting or changing another actor's permission.
- `assertion`: making a statement of identity, control, or fact attributed to the principal.
- `state`: changing a service record.
- `protection`: reporting or taking action intended to protect the principal.
- `refusal`: declining the stated proposal without authorizing its requested effect.

These labels are inputs to host policy, not a universal policy language. A contract MUST provide the typed facts needed to judge its effect. A host MUST NOT treat a category as sufficient authorization without those facts. Other maintainers MAY define stable effect identifiers in their own namespaces.

## Message trust and recipient control

### Qualifying message authentication

Before exposing an actionable MAP control or making a MAP-driven service read, a consumer MUST establish one qualifying DKIM signature as specified in [RFC 6376](https://www.rfc-editor.org/rfc/rfc6376). That same signature MUST satisfy all of the following:

1. Its signing domain aligns with the RFC 5322 author domain under [RFC 9989](https://www.rfc-editor.org/rfc/rfc9989). Relaxed alignment suffices for credentialed operations unless local policy requires strict alignment. Capability operations require strict alignment. An SPF-only or aggregate DMARC pass is insufficient.
2. It verifies the entire body and contains no `l=` body-length tag, even if that tag happens to cover the received body.
3. It covers `From`, `To`, `Subject`, `Date`, `Message-ID`, `MIME-Version`, and `Content-Type`, all of which MUST be present, and `Cc`, `SUPERSEDES`, and `Expires` when present. A producer SHOULD oversign `From` to detect an added instance. Consumers MUST reject duplicate occurrences of these fields rather than choose the convenient copy.
4. It uses a currently acceptable DKIM algorithm and key. Implementations MUST reject `rsa-sha1` and RSA keys shorter than 1,024 bits in accordance with [RFC 8301](https://www.rfc-editor.org/rfc/rfc8301). Producers SHOULD use RSA keys of at least 2,048 bits or Ed25519; consumers MUST support verification of `ed25519-sha256` as specified in [RFC 8463](https://www.rfc-editor.org/rfc/rfc8463).

There MUST be exactly one author mailbox in `From`, parsed according to [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). Display names do not participate in authentication. Failure of these requirements disables MAP actions; it does not change general mail-delivery policy.

A consumer MAY verify the received message itself or rely on its trusted receiving pipeline. In the latter case, a locally configured `authserv-id` and the trust-boundary rules of [RFC 8601](https://www.rfc-editor.org/rfc/rfc8601) apply. The pipeline MUST supply evidence for all requirements above for the same signature and bind that evidence to the message and MAP part being processed. A bare `dkim=pass` does not prove absence of `l=`, header coverage, or preservation of the MAP data. This specification introduces no new Authentication-Results property; an implementation can retain the verified original message and signature metadata or use an authenticated receiver interface.

An intervening trusted transformation MAY change readable links or formatting only if the pipeline preserves the authenticated MAP bytes and security-relevant header values, or supplies the authenticated original for MAP processing. A consumer MUST NOT treat modified machine data as the signed original. A rewritten capability URL is unusable unless the trusted pipeline supplies the authenticated original URL; the consumer MUST NOT discover it by following the wrapper URL. An attacker-supplied Authentication-Results field, or a field merely containing a familiar `authserv-id`, MUST NOT be accepted across an untrusted boundary.

### Recipient and copy handling

The consumer MUST establish through its trusted mailbox context that the message was delivered to the mailbox named by `recipient` and that its principal controls that mailbox. A visible `To` address is insufficient evidence of delivery or control. Aliases and shared mailboxes require explicit provider or administrator mappings. A service MUST separately establish the principal's authority for the proposal; mailbox access alone does not supply service permission.

A forwarded copy does not establish control of its original recipient. Automatic forwarding is not reliably detectable and is not a separate protocol test: recipient control, original delivery evidence, and the service checks remain REQUIRED. A client creating an ordinary reply or manual forward MUST remove the active MAP part. Forwarded-as-attachment originals remain inert. This is a MAP-specific requirement in addition to Structured Email's treatment of non-representative data on forwarding.

Valid signed messages can be replayed. Message identifiers and DKIM verification are not freshness or single-use proofs. Clients SHOULD suppress duplicate prompts for the same service, tenant, recipient, interaction, and terms version. Services MUST enforce expiry, current authorization, decision state, and exact terms regardless of delivery count.

## Credentialed processing

### Binding independence

Core does not require an HTTP API or a particular tool protocol for credentialed operations. A service binding MUST satisfy the following processing rules using its chosen interface. It MUST document the trusted connection, account and tenant, current-proposal read, operation and input mapping, atomic version check, native outcomes and retry behaviour.

The service's HTTPS origin identifies the authority; it does not select the execution transport. The installed binding supplies the actual connection and credential destination. A consumer MUST refuse a binding it cannot enforce. The email MUST NOT select another protocol or connection as a fallback.

A binding MUST establish the authenticity of authoritative service data and protect the integrity of submitted decisions and results. It MUST protect credentials from disclosure outside their authorized audience. Its documentation MUST state how its native transport and authentication satisfy these requirements, including any intermediaries.

An additional binding can be specified independently of Core and the type contract when it preserves their semantics. Queued or delegated execution MUST preserve the same authorization and exact terms. Receipt by a broker, agent or intermediary MUST NOT be reported as the service's decision or completed effect without evidence that establishes that state. The service MUST establish the original principal's authority at the decision; authenticating an intermediary alone is insufficient. Results MUST be authenticated and correlated with the decision, service, tenant and principal through the installed binding. Delegation MUST NOT broaden the selected operation, semantic input or approved terms.

### Trusted service implementation

A consumer MUST use a service binding enabled by its principal or administrator for `service.id` and, when needed, `service.tenant`. Neither authenticated email nor a Registry record can install that implementation or extend its credential destinations. The mapping MUST bind the exact type contract digest it implements. A change to its code or manifest is subject to the host's normal installation and review policy; a message cannot select an unreviewed mapping revision.

The mapping identifies the service's existing read and action operations, authenticated principal, tenant interpretation, credential destination, request-value sources, expected-version mechanism, and response interpretation. It MUST establish these from trusted configuration and service information. It MUST NOT take an HTTP method, endpoint, tool name, executable template, or constant tool arguments from email. Parsing a service identifier or resource identifier MUST NOT permit it to override the mapped origin, path structure, or tenant.

A multi-tenant service MAY send through customer-owned domains. DKIM authenticates the sender domain; it does not prove that a resource belongs to the service or tenant. The implementation and service readback establish that relationship. A trusted sender-domain list MAY impose an additional restriction but does not replace readback.

### Authoritative readback and decision

The host MUST authorize the service read under local policy. Message arrival alone does not grant network access. When permitted, the connector MUST read current service state with an existing, appropriately scoped credential before evaluating an operation for execution or asking the principal to authorize it. The read MAY use a synchronous response or an authenticated, correlated reply through the installed binding. The host MUST complete it before evaluating or submitting the decision. No new MAP read endpoint or response envelope is required.

The binding MUST establish the following facts from the service and its documented API behaviour. Copying them from the email is insufficient:

1. The interaction exists for the stated service and tenant, concerns the stated subject and proposal, and was offered to the intended recipient.
2. The authenticated principal is permitted to inspect it and has the relevant relationship to that recipient.
3. Its type identifier, version, and contract digest match the description.
4. Its current terms identifier and version match the description, and it has not expired, been withdrawn, or been superseded.
5. The currently offered operations and the current typed details are known.

An existing API need not store a literal MAP object. A connector MAY derive these facts from authenticated records under an unambiguous, documented mapping. It MUST NOT manufacture a missing fact from message content. A read that returns only a generally readable subject is insufficient evidence that the principal was offered this proposal.

The connector MUST validate the details read from the service against the contract. The host MUST base policy and confirmation on those details, including any additional content retrieved through the trusted mapping that the policy needs. It MUST NOT treat the email's preview as evidence that a content, destination, or audience restriction passed. It MUST distinguish service-supplied user content from service assertions.

An operation MUST be offered by all three: the email, the selected contract and the service's current proposal. The service cannot add an action to the email by returning it in readback. A mismatch in identity, digest, version, or authority makes the interaction non-actionable. The consumer MUST NOT silently upgrade it to a newer proposal.

The host MUST apply the principal's standing policy to the complete operation, typed values, declared effects, and actor restrictions. If that policy does not authorize the operation, the host MUST obtain an explicit human decision through a trusted interface. A language model MUST NOT supply or simulate that decision. Any changed action-relevant value invalidates the decision and requires reevaluation. Free-form message text, contract prose, and service-returned content MUST NOT alter host instructions, permissions, connector configuration, or confirmation policy.

### Client readiness

A client MUST distinguish an unsupported action from a refused or completed action. When a profile, exact contract, binding or required semantic rule is unsupported, it MUST disable that operation and MAY continue displaying the ordinary email. Unknown fields or operations MUST NOT be discarded to make an otherwise unsupported action executable.

If the service is not connected, the host MAY offer a separate setup flow under the Registry and discovery rules. The email MUST NOT authorize setup. Once setup completes, the client MUST repeat message, contract, recipient and service checks before offering an action. Credential acquisition during explicit setup does not grant permission to execute the waiting proposal.

A client MUST make missing permission, changed terms, expiry and an unknown execution result distinguishable to its user or calling application. Its interface MAY use different wording, but MUST preserve those meanings. It MUST NOT silently substitute a newer proposal or retry an operation whose effect is uncertain.

### Exact terms and service enforcement

Every operation whose effect depends on proposal content MUST declare `exactTerms: true`. The service-issued version MUST change whenever a value that affects the action changes. This includes referenced content, destinations, audience membership and schedule. These values are the proposal's exact terms. A mutable document URL, audience label, or count alone is not an exact terms binding. A service MAY keep immutable referenced revisions or include their state in its version calculation.

For such an operation, the connector MUST convey the readback version through the trusted binding. Before committing the effect or authorizing the work, the service MUST check the acting account, recipient relationship, expiry, decision state and terms version together. These checks and the decision MUST be atomic: no intervening change may invalidate a check before the decision commits. A mismatch MUST commit no effect. A separate read followed by an unconditional write does not conform. Revocation or loss of permission between read and commit MUST take effect at commit.

When work is asynchronous, accepting the decision MAY authorize a job rather than complete its external effect. The job MUST remain bound to the accepted immutable terms; it MUST NOT later resolve a mutable audience, content revision, or destination to different terms. The binding MUST distinguish acceptance, pending work, completion, refusal, and indeterminate execution using the service's existing semantics. MAP does not promise exactly-once delivery or define a job protocol.

Services MUST prevent conflicting terminal decisions from both taking effect. Repetition MUST NOT repeat a terminal effect. Services MAY use their existing transaction, idempotency, and decision-record mechanisms. A consumer MUST NOT retry an indeterminate operation unless its trusted binding establishes that doing so cannot duplicate the effect.

### Semantic conditions and updates

A type defines successful decisions and the service-specific outcomes an implementation must interpret. These common conditions have the following meaning wherever reported: `already-decided` means a terminal decision exists; `superseded` means another interaction replaces this one; `stale` means the presented version is not current; `expired` means the allowed lifetime ended; `declined` means a refusal was recorded; and `withdrawn` means the service removed the proposal. They are semantic conditions, not six required HTTP problem types. A valid decline is a successful decision, not a transport failure.

A binding MUST preserve the distinction between failure before execution, acceptance with work pending, a known terminal outcome, and an unknown outcome. It MUST NOT represent lack of an error as proof of completion. It MUST expose no result details beyond the principal's current authorization.

Interaction expiry limits when a decision may be accepted. It does not by itself cancel work already authorized before expiry. A contract or the accepted schedule can impose an execution deadline; the service MUST preserve that deadline with the accepted terms and enforce it. Clients MUST NOT promise that recalling an email cancels an already accepted service operation.

When terms change, the producer MUST issue a new interaction identifier and version. It MUST use Structured Email's `SUPERSEDES` mechanism to associate a replacement with the previous message. A signed replacement header MAY inform presentation; it MUST NOT itself grant authority, revoke service state, or cause execution. Services enforce withdrawal and supersession independently of whether the recipient receives an update. Clients MUST NOT act on a recalled, empty structured representation as though it were an operation.

## Human route

The human URL MUST lead to a page that displays the current proposal without performing the action. GET and HEAD MUST be safe in the sense of [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110). Merely fetching a link, loading its subresources, opening a preview, or passing through an authentication redirect MUST NOT approve, decline, confirm an address, or consume a capability.

The URL in the email is a sender claim. A qualifying DKIM signature does not establish that its destination belongs to the named service. A consumer MAY show it as an ordinary email link with its actual origin visible. To present it as a verified service review route or use it for a MAP control, the consumer MUST establish the permitted route through its trusted service binding. An unconnected client cannot make that claim.

The page MUST require an explicit confirmation submitted by an unsafe method before applying the operation. It MUST check current authorization, expiry, proposal state, and exact terms at that submission. Consequential actions MUST require service authentication; the narrow bearer operations permitted by the capability binding MAY instead use an equivalent server-side bearer confirmation flow. A bearer flow MUST preserve all effect and lifetime limits and MUST NOT turn its initial GET into a decision.

An authenticated page MUST protect the confirmation against CSRF and clickjacking. It MUST use the application's established CSRF defenses and restrict framing to trusted origins, for example with CSP `frame-ancestors`. Cookie SameSite behavior alone MUST NOT be its only authorization check. A confirmation MUST be bound to the principal's session and exact proposal; a previously authorized form MUST NOT approve revised terms.

The page and any native action control MUST display the destination service origin, recipient or acting account, material terms, and effect before confirmation. Display names MUST NOT substitute for origins or account identity. A host SHOULD warn about confusable identifiers using [Unicode security mechanisms](https://unicode.org/reports/tr39/); it MUST escape or visibly flag bidirectional and invisible formatting controls in display text. Display defenses MUST NOT rewrite identifiers used for security comparisons.

## Email representation

A producer MUST include exactly one MAP description for the message's recipient. It MUST use an `application/ld+json` MIME part with the parameter `profile="https://mailschema.org/profiles/map/0.3"` and `Content-Purpose: Machine-readable`. The description MUST be a partial representation within `multipart/related`, together with the readable content it describes, as specified by [Structured Email](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06). MIME processing follows [RFC 2046](https://www.rfc-editor.org/rfc/rfc2046) and [RFC 2387](https://www.rfc-editor.org/rfc/rfc2387). The related root MUST be readable content, which MAY itself be `multipart/alternative`. Ordinary attachments MAY occur outside that related entity in an enclosing `multipart/mixed`.

The machine part MUST use base64 or quoted-printable transfer encoding as specified in [RFC 2045](https://www.rfc-editor.org/rfc/rfc2045). A consumer MUST reject ambiguous MIME headers or duplicate security-relevant parameters on that part, rather than let different parsers select different profiles or encodings. Size limits apply after transfer decoding; the receiver SHOULD also bound encoded message size and MIME nesting before extraction.

A consumer MUST associate the part with its containing outer message. It MUST NOT activate MAP data inside an attached message, including `message/rfc822`, or inside an entity marked as an attachment. It MUST NOT extract actionable MAP data from HTML, quoted text, or an arbitrary JSON attachment. More than one designated MAP part makes the message non-actionable. An unrecognized MAP profile MUST NOT be interpreted as this profile.

The readable content MUST describe the same proposal and offer a link to the human route. A producer MUST NOT conceal a materially different effect in the machine-readable part. A consumer MAY continue displaying ordinary readable email when MAP processing fails; it MUST NOT present that failure as a verified or authorized action.

### JSON processing limits

After MIME transfer decoding, the description MUST be UTF-8 I-JSON as specified in [RFC 7493](https://www.rfc-editor.org/rfc/rfc7493), with no byte order mark. Its decoded size MUST NOT exceed 65,536 octets. Container depth MUST NOT exceed 32, counting the root object as depth 1 and each nested object or array as one additional level. Duplicate member names, including names equal after JSON escape decoding, MUST be rejected before a parser discards them. Unpaired surrogates, Unicode noncharacters, and U+0000 in strings or member names MUST be rejected.

Numbers MUST be finite IEEE 754 binary64 values in the range -9007199254740991 through 9007199254740991. A numeric token MUST NOT exceed 64 ASCII characters. Producers MUST encode identifiers, exact decimal quantities, and integers outside that range as strings under their type contract. Consumers MUST reject tokens that underflow to zero or overflow during binary64 conversion. These restrictions are checked on the original JSON tokens, before canonicalization or schema validation. They also apply to contract documents; a contract MAY occupy up to 262,144 UTF-8 octets.

The root MUST be an object in the compact form defined here. JSON-LD expansion, alternate term aliases, additional contexts, and equivalent RDF serializations are not alternate wire forms of MAP 0.3. Consumers MUST resolve the fixed [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) context from their configured profile artifacts and MUST NOT retrieve a context because an email names it. Nested type-defined data is represented as JSON data by the context; it cannot introduce an executable or remotely resolved context.

### Description members

All members in the following list are REQUIRED except `service.tenant`. Members not specified by this profile MUST be rejected at the root and in its fixed objects. A type defines allowed members within `details`; it cannot add execution instructions to the core objects.

- `@context`: exactly `https://mailschema.org/contexts/map-0.3.jsonld`.
- `@type`: exactly `MailAction`.
- `@id`: an absolute URI identifying this interaction, unique within the service. A producer SHOULD use a UUID URN as specified in [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562). A new recipient, contract, proposal, or terms version requires a new interaction identifier. Retransmission of an unchanged interaction preserves the identifier.
- `profile`: exactly `https://mailschema.org/profiles/map/0.3`.
- `type`: an object containing `id`, an absolute HTTPS contract identifier; `version`, its version string; and `contractDigest`, its digest as defined under [Contract identification](#contract-identification).
- `issuedAt` and `expiresAt`: UTC timestamps in the restricted form `YYYY-MM-DDTHH:MM:SSZ`, with valid calendar values and seconds from 00 through 59. Expiry MUST be later than issuance. The consumer MUST NOT act before issuance or at or after expiry. A local clock tolerance MAY be used for issuance, up to 300 seconds; it MUST NOT extend expiry. A service MUST enforce expiry independently using its own clock.
- `inLanguage`: a well-formed BCP 47 language tag as specified in [RFC 5646](https://www.rfc-editor.org/rfc/rfc5646), identifying the language of display text. It does not change identifier comparison or operation semantics.
- `service`: an object containing `id`, the service's HTTPS origin, and optionally `tenant`, an absolute URI that distinguishes a tenant. An origin contains a scheme, host, and optional port, with no path, query, fragment, or user information. A multi-tenant implementation MUST require `tenant` wherever omission would make the authority ambiguous.
- `recipient`: a single mailbox in addr-spec form without a display name, comments, or a group. Internationalized mailboxes use the UTF-8 form of [RFC 6531](https://www.rfc-editor.org/rfc/rfc6531). A consumer MUST compare mailbox identity using its trusted mailbox provider's rules; it MUST NOT infer aliases, discard subaddress tags, case-fold local parts, or infer control from a header alone.
- `subject`: an object containing `id`, an absolute URI for the object being acted on, and `title`, plain display text. The title is not an identifier.
- `terms`: an object containing `id`, an absolute URI for the proposal, and `version`, a nonempty opaque service-issued token of at most 1,024 ASCII characters in the range U+0020 through U+007E. The consumer MUST preserve the token exactly. It is not necessarily an entity-tag or a digest.
- `details`: an object conforming to the selected contract's `detailsSchema`. Its values in email are claims available for preview, not authoritative service state.
- `operations`: a nonempty array of at most 32 objects, each with a unique `id` declared by the contract. An object MAY also contain `capability`, exactly as defined by the [Experimental capability binding](#experimental-capability-binding). Operation identifiers contain 1 to 64 ASCII characters, start with a lowercase letter, and thereafter contain only lowercase letters, digits, or hyphens. Array order MAY guide presentation; it MUST NOT indicate a preferred decision.
- `human`: an object containing `url`, the absolute HTTPS URL of the service's review page. Navigating to it does not perform the operation.

Except for the opaque version token, security-sensitive identifiers MUST NOT contain whitespace, control characters, Unicode bidirectional formatting controls, or invisible formatting characters. Network URLs MUST NOT contain user information or fragments. Hosts MUST use ASCII DNS labels, including valid IDNA A-labels where necessary; IDNA processing follows [RFC 5890](https://www.rfc-editor.org/rfc/rfc5890). IP-literal service origins are not permitted in this profile. An implementation MUST NOT normalize an opaque identifier or token to make a comparison succeed. Origin comparison follows [RFC 6454](https://www.rfc-editor.org/rfc/rfc6454); other identifiers compare exactly unless their defining standard explicitly provides an equivalence rule.

Identifiers are not instructions to fetch. In particular, `subject.id`, `terms.id`, a type URI, and an effect URI can identify something without being a client-accessible resource. The client MUST resolve service objects through its trusted mapping.

## Security considerations

DKIM establishes domain responsibility for signed content, not the honesty of the sender or correctness of a proposal. A malicious domain can authenticate its own mail. Credentialed readback, independently selected connectors, narrow capability rules, and host policy are therefore separate requirements. A compromise of the authorized service or connector is outside the protection offered by the email description.

The entire message is untrusted input to an agent. Producers and consumers MUST NOT interpret descriptive text as instructions to install tools, change policy, reveal secrets, contact new endpoints, or waive confirmation. Schema-valid text can still contain prompt injection. A host MUST retain control of tool selection and execution independently of model-generated text.

Consumers MUST NOT automatically fetch or unfurl identifiers, human links, images, contexts, schemas, manifests, or response links because they occur in email. Authorized connector reads and approved capability requests remain subject to egress controls and response-size limits. Connectors MUST validate identifier placement so path traversal, query injection, cross-tenant access, and server-side request forgery cannot redirect their authority. A type MUST NOT request passwords, authentication codes, private keys, or payment-card credentials as operation input.

Hosts SHOULD deduplicate, rate-limit, and group repeated prompts. They MUST NOT treat dismissal, timeout, a model's recommendation, or a prior unrelated approval as consent. Standing policies SHOULD be narrowly scoped to a trusted service, tenant, contract, operation, recipient, effect, and relevant typed values. Unknown effects and changed contract digests do not inherit approval.

Sender-domain alignment does not distinguish tenants sharing a domain, and a TLS certificate does not prove that a particular tenant issued a request. Recipient, tenant, proposal, and principal binding MUST be checked independently. A capability copied or leaked from an otherwise authentic message remains usable by a bearer; clients cannot make it non-transferable by checking headers.

## Privacy considerations

Email may be retained, indexed, copied, and read by intermediaries. Producers SHOULD include only the preview information needed to understand the proposal and keep sensitive material behind the service's existing authorization. An opaque subject identifier is preferable to putting a secret or personal information in a URL. Digests do not conceal low-entropy personal data and MUST NOT be treated as anonymization.

Readback and capability use reveal activity to the service. Hosts MUST apply local network policy before making those requests and SHOULD explain this behavior when a principal enables automation. Services SHOULD minimize retention of decision records and SHOULD disclose their retention policy. Audit records SHOULD identify the contract digest, exact terms, principal, and decision without logging credentials, bearer URLs, or unnecessary message content. Conformance fixtures MUST use synthetic identities and inert endpoints.

## Conformance

A claim MUST identify the MAP profile, supported roles, exact type contract digests, implemented bindings, and the evidence available. Core producer conformance covers description construction, MIME placement, readable correspondence, and message authentication. Core consumer conformance covers parsing, trust, recipient control, contract resolution, host decision, and applicable processing rules. Service conformance covers current state, authorization, exact terms, expiry, and decision integrity. Human-route conformance covers safe navigation and confirmed submission. HTTP and capability conformance add their respective binding requirements.

A parser or schema validator alone MUST NOT claim consumer or service conformance. Passing an example or a vector subset MUST NOT be described as passing the complete profile. Evidence MUST distinguish executable tests from scenario skeletons and identify missing adapters. Shared ownership between implementations MUST be disclosed when reporting interoperability. Implementation reports MUST identify the tested profile version; evidence from another version does not establish conformance.

## IANA considerations

This document requests no IANA action. It uses the existing `application/ld+json` media type and HTTPS. `Content-Purpose` and `SUPERSEDES` are used through Structured Email and its referenced specifications; this document does not register duplicate fields. MAP defines no DNS record, well-known URI, OAuth metadata parameter, global HTTP problem type, or new authentication mechanism. Its profile, contract, and vocabulary identifiers use ordinary HTTPS URIs controlled by their publishers.

Structured Email remains work in progress. Its applicable MIME and designation rules, and any resulting registration requirements for this vocabulary, need coordination with that work before RFC publication. The use of its container does not imply adoption of MAP by the SML working group.
