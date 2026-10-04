---
description: "Operation semantics, effects and schemas for the initial type contracts."
---

# Type contracts

## Initial Registry contracts

These contracts define separate interactions. Each specifies its operations, effects, exact terms and permitted bindings. Implementations select the types they support; Core does not require this collection. MailSchema maintains the initial contributions, and other maintainers can define types in their own namespaces. The JSON contract is the authoritative definition.

## Account Security Response

Record that a recipient does not recognize a specific account event, without changing account access.

[Contract and schemas](/registry/account-security-response) · [JSON definition](/artifacts/map-0.3/contracts/account-security-response.json)

### Requirements

1. The event MUST be a concrete event in the addressed principal's service account. The terms version MUST bind that account, event identifier, occurrence time, activity description, and presented device or location information.
2. The report MUST be recorded as the recipient's unverified protective signal. It MUST NOT claim that fraud occurred or that a device or location was verified merely because the recipient submitted the report.
3. The report MUST NOT by itself lock or delete the account, revoke sessions or credentials, change recovery settings, transfer assets, disclose protected data, or execute another consequential action. Any such response requires a separate authenticated service process and its own authorization.
4. The contract MUST NOT offer a recognize, authorize-login, or approve-device operation. Recognizing an event is not authorization for a new session.
5. For capability use, the event report MUST expire within 259200 seconds of issuedAt and no later than expiresAt. A copied capability can submit only the same report for the same event. It cannot supply a message or identify another event.
6. The email SHOULD minimize device and location information. The human route MUST authenticate the principal before disclosing protected event details beyond the minimal email preview.

### Operations

**Report unrecognized activity (`report-unrecognized`).** Record that the recipient reports this event as unrecognized, without executing account remediation or making a verified fraud assertion.

Bindings: `credential`, `capability`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/protection`, `https://mailschema.org/effects/state`.

Input: none.

Capability kind: `protective-report`; maximum lifetime: 259200 seconds.

- `reported`: The service recorded the protective report; no account remediation is implied.

## Campaign Send Approval

Authorize sending one immutable campaign revision to one fixed audience under stated delivery terms, without an additional charge.

[Contract and schemas](/registry/campaign-send-approval) · [JSON definition](/artifacts/map-0.3/contracts/campaign-send-approval.json)

### Requirements

1. The service MUST bind the subject, recipient, service tenant, contract digest, and all action-relevant details to terms.version. Every decision MUST atomically compare that version and enforce current authorization, expiry, and proposal state.
2. The service MUST freeze the referenced content revision and all other action-relevant inputs for accepted asynchronous work. If it cannot execute those exact terms it MUST stop that work; it MUST NOT substitute current mutable values.
3. The host MUST obtain the actual immutable content and relevant destination or audience information through the trusted service binding before claiming a policy check over those values. A digest, title, preview, count, or identifier alone does not demonstrate content-policy compliance.
4. The service MUST permit at most one terminal decision for the proposal. approve, decline, and request-changes are mutually exclusive terminal decisions for that proposal version. A revised proposal requires a new interaction and new decision.
5. The request-changes operation MUST only record the supplied feedback and close this proposal as requiring revision. It MUST NOT generate, edit, approve, send, or publish revised content automatically. Feedback remains untrusted text.
6. A capability offered for decline MUST be independently scoped to that refusal and exact proposal, expire within seven days of issuedAt and no later than expiresAt, and convey no authority to approve or supply feedback.
7. Exact terms MUST include sender mailbox and display name, reply destination when present, message subject and all content variants, personalization rules and their input snapshot, audience membership and exclusions, attachments, link destinations, and schedule. Changed audience membership invalidates the version even if its label and count are unchanged.
8. The audience snapshot MUST identify the effective recipient set after exclusions. Its count MUST equal that set's size. The service MUST preserve that snapshot for execution and MUST NOT expand a live segment at send time. Normal suppression to respect a later opt-out or a new safety restriction MAY reduce delivery; it MUST NOT add or substitute recipients.
9. Content digest MUST identify the immutable service content artifact, including attachments and personalization definitions. The trusted implementation MUST document the artifact representation and digest verification. Personalized output MUST be derived only from the approved definition and frozen inputs.
10. The sender mailbox MUST belong to an identity the service currently authorizes the principal to use. Approval MUST NOT grant sending permission for another sender, tenant, campaign, or subsequent revision.
11. The schedule MUST specify immediate execution or one UTC instant. The service MUST NOT silently shift the approved schedule to a materially different one. Operational delivery delays MAY occur and MUST be reported accurately.
12. Approval under this contract MUST NOT cause an incremental monetary charge or debit prepaid value. The service MUST refuse approval if the maximum approved audience is not covered by an included entitlement at decision time, and MUST stop dispatch rather than charge if that entitlement is no longer available at admission. A paid send needs a different contract that declares the payment effect and binds its exact financial terms.

### Operations

**Approve (`approve`).** Authorize sending this campaign on the exact terms displayed, without an additional charge. Acceptance may queue the work; the connector MUST distinguish acceptance from completion. This decision does not grant standing permission for later proposals.

Bindings: `credential`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/communication`, `https://mailschema.org/effects/disclosure`, `https://mailschema.org/effects/state`.

Input: none.

- `accepted`: The service accepted the exact decision; the authorized work may still be pending.
- `completed`: The service confirms sending this campaign completed under the accepted terms.
- `failed`: The authorized work failed; the connector preserves the service's partial-progress information and MUST NOT claim that no external effect occurred.

**Decline (`decline`).** Refuse this exact proposal and close it without authorizing the requested work. The service MUST NOT execute the proposed work as a consequence of refusal.

Bindings: `credential`, `capability`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/refusal`, `https://mailschema.org/effects/state`.

Input: none.

Capability kind: `refusal`; maximum lifetime: 604800 seconds.

- `declined`: The service recorded refusal of this proposal.

**Request changes (`request-changes`).** Record specific feedback and close this proposal as requiring revision, without authorizing the proposed work or a future revision.

Bindings: `credential`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/state`.

Input: an object validated by the contract's input schema.

- `changes-requested`: The service recorded the feedback; a revised proposal requires a new decision.

## Email Address Confirmation

Confirm access to a mailbox for a principal-initiated communication request, without creating a signed-in session or granting account authority.

[Contract and schemas](/registry/email-address-confirmation) · [JSON definition](/artifacts/map-0.3/contracts/email-address-confirmation.json)

### Requirements

1. The sole permitted purpose is communication-address: validating a mailbox for future communications requested by its controller. Confirmation MUST NOT itself send a campaign or disclose private data. Subsequent communication requires its own applicable consent and service permission.
2. The service origin, recipient, details.mailbox, details.requestId, and details.purpose MUST match a request recorded independently when the principal initiated it. details.mailbox MUST identify the same controlled mailbox as recipient. The initiator MUST retain enough session or authenticated request state to establish this match; the email cannot create that state.
3. The terms version MUST bind the mailbox, request identifier, purpose, and any associated non-authentication account context. Changes require a new request, interaction, and confirmation.
4. Confirmation MUST NOT authenticate a session, reset a password, link or take over an account, add a recovery address, grant access, or serve as an authentication factor. Those flows require their own established security mechanisms.
5. The interaction and capability MUST expire within 86400 seconds of issuedAt. The service MUST invalidate confirmation authority on first successful use. A duplicate MAY acknowledge prior processing but MUST NOT revalidate or extend confirmation.
6. The human route MUST establish the independently recorded initiation context and require an explicit unsafe-method submission. Fetching the email link MUST NOT confirm the mailbox or consume confirmation authority.
7. The 24-hour and invalidation-on-use limits adopt the design of NIST SP 800-63A-4 section 3.8 for email confirmation codes. This contract does not assert that every email validation use case falls within that publication's identity-proofing scope.

### Operations

**Confirm address (`confirm`).** Confirm that the principal controls the addressed mailbox for the independently matched communication request, once only. This is not a login or grant of account access.

Bindings: `credential`, `capability`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/assertion`, `https://mailschema.org/effects/state`.

Input: none.

Capability kind: `address-confirmation`; maximum lifetime: 86400 seconds.

- `confirmed`: The service recorded the requested mailbox confirmation.

## Publication Approval

Authorize publishing one immutable content revision at stated destinations and visibility.

[Contract and schemas](/registry/publication-approval) · [JSON definition](/artifacts/map-0.3/contracts/publication-approval.json)

### Requirements

1. The service MUST bind the subject, recipient, service tenant, contract digest, and all action-relevant details to terms.version. Every decision MUST atomically compare that version and enforce current authorization, expiry, and proposal state.
2. The service MUST freeze the referenced content revision and all other action-relevant inputs for accepted asynchronous work. If it cannot execute those exact terms it MUST stop that work; it MUST NOT substitute current mutable values.
3. The host MUST obtain the actual immutable content and relevant destination or audience information through the trusted service binding before claiming a policy check over those values. A digest, title, preview, count, or identifier alone does not demonstrate content-policy compliance.
4. The service MUST permit at most one terminal decision for the proposal. approve, decline, and request-changes are mutually exclusive terminal decisions for that proposal version. A revised proposal requires a new interaction and new decision.
5. The request-changes operation MUST only record the supplied feedback and close this proposal as requiring revision. It MUST NOT generate, edit, approve, send, or publish revised content automatically. Feedback remains untrusted text.
6. A capability offered for decline MUST be independently scoped to that refusal and exact proposal, expire within seven days of issuedAt and no later than expiresAt, and convey no authority to approve or supply feedback.
7. Exact terms MUST cover all content and attachments, publication destinations and accounts, visibility, schedule, and the existing revision being replaced, if any. A change to any of these values requires new terms.
8. The destination list MUST enumerate the exact locations affected. A mutable collection label MUST NOT authorize new locations added after approval. For restricted publication, audience.id and audience.revision MUST identify an immutable authorized readership; a vague label such as team is insufficient.
9. Content digest MUST identify the immutable publication artifact. The trusted implementation MUST document its representation and verify the artifact. Approval of a title or an inaccessible digest alone MUST NOT be presented as review of the content.
10. Publication approval MUST NOT change account permissions, purchase promotion, schedule unrelated content, or publish a subsequent revision.
11. This contract authorizes publication. Approval under a different contract MUST NOT be treated as permission to publish without a new, explicit publication decision.

### Operations

**Approve (`approve`).** Authorize publishing this content on the exact terms displayed. Acceptance may queue the work; the connector MUST distinguish acceptance from completion. This decision does not grant standing permission for later proposals.

Bindings: `credential`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/communication`, `https://mailschema.org/effects/disclosure`, `https://mailschema.org/effects/state`.

Input: none.

- `accepted`: The service accepted the exact decision; the authorized work may still be pending.
- `completed`: The service confirms publishing this content completed under the accepted terms.
- `failed`: The authorized work failed; the connector preserves the service's partial-progress information and MUST NOT claim that no external effect occurred.

**Decline (`decline`).** Refuse this exact proposal and close it without authorizing the requested work. The service MUST NOT execute the proposed work as a consequence of refusal.

Bindings: `credential`, `capability`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/refusal`, `https://mailschema.org/effects/state`.

Input: none.

Capability kind: `refusal`; maximum lifetime: 604800 seconds.

- `declined`: The service recorded refusal of this proposal.

**Request changes (`request-changes`).** Record specific feedback and close this proposal as requiring revision, without authorizing the proposed work or a future revision.

Bindings: `credential`. Actors: human, agent. Exact terms: required. Effects: `https://mailschema.org/effects/state`.

Input: an object validated by the contract's input schema.

- `changes-requested`: The service recorded the feedback; a revised proposal requires a new decision.
