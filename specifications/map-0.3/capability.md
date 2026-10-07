---
description: "An experimental binding for narrowly scoped actions without sign-in."
---

# MAP capability binding 0.3

## Experimental capability binding

This optional binding permits a small class of decisions without a preexisting service credential. An operation carries a bearer URL in its `capability.url` member. No other member is allowed in that object. This URL is the sole exception to Core's rule that email cannot supply an executable destination. Implementations MUST explicitly opt into the binding. Unsupported capability data MUST NOT be executed or reinterpreted as a human link.

This mechanism is not an extension to one-click unsubscribe and MUST NOT be advertised as RFC 8058 compatible. It uses the fixed-body and safe-navigation lessons of [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058). Subscription removal remains a use case for that existing protocol, not a reason to define a parallel MAP contract.

### Capability eligibility

The exact contract MUST permit `capability` for the offered operation, declare all its effects, set `exactTerms: true`, and accept no semantic input. Its `capability.kind` MUST be one of the following:

- `refusal`: declines the exact proposal. Permitted effect identifiers are `https://mailschema.org/effects/refusal` and `https://mailschema.org/effects/state`, both REQUIRED. The refusal MUST NOT execute the proposed work, change access rights, cancel an independent commitment, or instruct communication to another audience.
- `protective-report`: records that the recipient reports the specified activity as unrecognized. The REQUIRED effects are `https://mailschema.org/effects/protection` and `https://mailschema.org/effects/state`. The report MUST NOT by itself lock or delete an account, revoke credentials, transfer assets, disclose protected data, or otherwise make a consequential account change.
- `address-confirmation`: confirms control of the addressed mailbox solely for a matching request previously initiated by the principal. The REQUIRED effects are `https://mailschema.org/effects/assertion` and `https://mailschema.org/effects/state`. It MUST NOT authenticate a session, reset a password, grant access, link an account, add a recovery authenticator, or confirm an unsolicited request.

No additional or unrecognized effect is permitted for these capability kinds. A human decision cannot waive this restriction. An operation with communication, disclosure, commitment, authorization, payment, or caller-supplied input MUST use an appropriately authorized credentialed or human route instead. The service MAY acknowledge the decision to the same principal through its ordinary receipt mechanism; it MUST NOT use that exception to deliver the proposal's content or notify a new audience.

The contract MUST set a positive integer maximum lifetime. This binding imposes upper bounds of 604800 seconds for refusal, 259200 seconds for a protective report, and 86400 seconds for address confirmation. These are conservative MAP limits, not claims that another standard defines limits for all three effects. A type or service MAY choose a shorter limit. Expiry MUST be no later than `issuedAt` plus the permitted lifetime and no later than the interaction's `expiresAt`.

### Capability origin and delivery

All Core message-authentication and recipient rules apply, with strict DKIM author-domain alignment. The URL MUST be an absolute HTTPS URL without user information or fragment and MUST have the same origin as `service.id`. That host and the strictly aligned signing domain MUST have the same Organizational Domain under RFC 9989's discovery rules. A client MUST NOT substitute a last-two-label heuristic. An unresolved or ambiguous organizational relationship MUST fail closed. Local policy or a contract MAY require the exact same host or a previously approved first-party relationship.

The producer MUST address the message to exactly one intended mailbox in `To`, with no `Cc` or `Bcc`, and MUST NOT send it through a mailing list or distribution group. There MUST be exactly one envelope recipient. The receiver cannot in general prove that no other envelope recipient existed; producer conformance covers this fact, and clients MUST NOT claim otherwise. A client MUST reject visible groups, additional recipients, known list delivery, or a mismatch with its trusted original-recipient evidence. It MUST NOT rely on the absence of a Bcc header to prove exclusive delivery.

The capability MUST occur only in the designated machine part and MUST NOT be placed in readable links, tracking pixels, quoted prose, or the human URL. Each capability MUST bind one recipient, interaction, tenant where applicable, type contract digest, operation, terms identifier and version, and expiry. A service MUST generate at least 128 bits of cryptographically secure randomness, store only a cryptographic digest of the secret or an equivalently protected verifier, support revocation, and prevent secret disclosure through logs, telemetry, errors, or referrers.

Possession is sufficient bearer authority. A recipient check by a compliant client does not stop a holder from copying the URL into another HTTP client. The contract's limited effects MUST therefore remain acceptable when exercised by anyone possessing the message. DKIM replay protection and non-transferability are not claimed.

### Capability decision and request

The host MUST validate the complete description and contract and obtain an explicit principal decision or apply an existing standing policy scoped to the understood effect, recipient, service, tenant, and typed values. Authentication of a previously unseen sender is not standing policy. The host MUST display the service origin and the limited effect for a human decision. It MUST treat the message's details as signed sender claims, not as an authoritative credentialed readback.

For address confirmation, the host MUST additionally correlate the service origin, mailbox, purpose, and request identifier with a request recorded when its principal initiated it. The recorded request MUST be independent of the confirmation email. A human route can satisfy this rule using the authenticated or session-bound initiation flow; merely asking whether an unsolicited email looks familiar is insufficient. If the host cannot establish the match, it MUST NOT submit the capability.

The client then sends exactly this request body, without a trailing newline:

```text
Mail-Action=One-Click
```

The method MUST be POST and the Content-Type MUST be `application/x-www-form-urlencoded`. No semantic parameters, alternate encodings, operation identifiers, or user input are permitted. The request MUST contain no cookies, HTTP authentication, client-certificate authentication, or Referer header. Clients MUST use an HTTP context isolated from browser sessions and ambient credentials. They MUST NOT follow redirects, including same-origin redirects. A service MUST NOT redirect a capability request.

Before connecting, the client MUST apply its egress policy and reject loopback, private, link-local, unspecified, multicast, and otherwise non-public destinations. DNS resolution and connection establishment MUST be bound so DNS rebinding cannot bypass that check. TLS certificate and hostname validation remain REQUIRED. Clients MUST bound response size and time, MUST NOT execute or render response content, and MUST NOT fetch response links. A public HTTPS name and domain alignment alone do not make a destination safe.

### Capability service processing

The service MUST accept only the exact POST representation above. It MUST NOT perform the operation on GET, HEAD, OPTIONS, a form with extra fields, or a request with the wrong media type. It MUST resolve the token server-side and atomically check its scope, expiry, revocation, current proposal version, and decision state before applying the bound effect. A stale, withdrawn, expired, or superseded token MUST apply nothing. No client-provided field can change the operation or recipient bound to the token.

The operation MUST be idempotent. Address confirmation MUST consume its confirmation authority on first successful use; subsequent uses MUST NOT create another confirmation, extend its validity, or authorize anything else. A service MAY return a non-sensitive acknowledgement for a repeated identical request. It MUST NOT reveal protected account, recipient, or decision details to a bearer. A consumer MUST NOT infer completion merely from an opaque response; it may claim only what the documented service response establishes. A lost response leaves the outcome unknown unless a safe retry or established service route resolves it.

The fixed POST is not a replacement for CSRF protection on the human route. Services MUST keep its bearer validation separate from ambient authenticated browser authority. Link scanners normally issue safe requests, but a scanner or intermediary that extracts and POSTs bearer URLs can exercise them; the protocol cannot prevent that misuse by a bearer. This limitation is a reason for the narrow effect classes, not a reason to make GET actionable.
