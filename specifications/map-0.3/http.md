---
description: "Bind a MAP operation to an existing service API through a trusted connector."
---

# MAP HTTP binding 0.3

## HTTP binding

This binding maps a contract's credentialed operations to an existing HTTPS API. It does not prescribe a MAP endpoint, URL layout, request body, or response format. The client and service MUST satisfy Core's credentialed processing requirements in addition to this section.

### HTTP implementation mapping

A trusted implementation MUST document its service origin, tenant interpretation, supported contract digest, authenticated principal mapping, read operation, and each action operation. It SHOULD identify API operations by stable references to the service's API documentation or OpenAPI description. A reference is documentation or installed configuration, not something an email can cause the client to fetch or execute.

For the read, the mapping MUST identify the existing resource lookup and the service-backed sources establishing the interaction, recipient, subject, type, contract digest, terms, expiry, decision state, operations, and typed details. Where the API returns several resources, the mapping MUST define a coherent proposal version over them. A collection of independently changing reads cannot establish exact terms unless the service binds the resulting snapshot.

For each action, the mapping MUST specify the existing method and resource selection; the placement and encoding of the expected version; the sources of request values; authentication and tenant context; permitted success and pending-work responses; terminal and nonterminal error interpretation; and retry or idempotency behavior. Each semantic value MUST come from validated authoritative readback, a validated principal input, or trusted configuration. Email-provided identifiers MAY select records only within the independently authorized service and tenant. They MUST NOT provide request templates, method names, credentials, headers, or executable expressions.

The mapping MAY be ordinary connector code. If distributed as an implementation manifest, its immutable contents MUST be addressed by digest and accepted through the host's installation policy. Native API descriptions can identify the operations and their schemas; this draft defines no general mapping language. [Service bindings](/specification/bindings) gives implementation guidance. Services need no MAP discovery endpoint.

### HTTP origin and credential protection

The client MUST use HTTPS with authenticated server identity and the service's existing authentication. The credential MUST already be authorized for the selected service resource and principal. A message cannot cause acquisition of a new credential or enlarge its audience, scopes, or tenant access. When OAuth is used, the client and service SHOULD use resource-restricted tokens, with the audience protections described in [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707) and [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700).

The client MUST send credentials only to origins independently authorized by the installed connector. The ordinary case is `service.id`; any additional origin MUST have an explicit trusted mapping and suitable credential audience. The client MUST NOT automatically follow redirects for a credentialed read or action, including same-origin redirects. A connector MAY interpret a documented relocation only as a new independently authorized operation, after repeating origin and method checks, without forwarding credentials merely because a response names a destination.

Clients MUST bound response size and processing time. They MUST NOT execute scripts or fetch response-supplied locations except through the installed mapping. Cookies, client certificates, proxy credentials, and ambient browser sessions are credentials for these rules, not exceptions to them.

### HTTP exact terms

An implementation MAY use `If-Match` when the service-issued version is the strong entity-tag of the selected representation for the action request, as defined by [RFC 9110 section 13.1.1](https://www.rfc-editor.org/rfc/rfc9110#section-13.1.1). In that case it MUST use the exact strong tag, MUST NOT use a weak tag or `*`, and MUST perform strong comparison before the effect. A false precondition is reported as `412 Precondition Failed` under RFC 9110. The client MUST NOT automatically replace the failed version and retry the decision.

RFC 9110 also permits a success response when the server can determine that the same requested change has already succeeded. An implementation using that exception MUST report the prior decision without applying the effect again. It MUST NOT use the exception to accept changed terms or a different operation.

An entity-tag obtained from a campaign resource is not automatically a precondition on a different approval resource. A binding MUST NOT send such a tag to the latter and claim that HTTP semantics bind the former. The API must explicitly support the relationship or expose the selected proposal representation with the appropriate tag.

An existing API MAY instead accept an expected revision in its normal body, query, or service-defined header. The mapping MUST specify that mechanism and demonstrate its atomic enforcement. Its native conflict response MAY differ from 412; the connector MUST interpret it as a stale proposal without changing HTTP's meaning. A successful preliminary GET, an email digest, or a client-side comparison is not a substitute for service enforcement.

### HTTP decisions, retries, and outcomes

Safe methods MUST NOT perform MAP decisions. An action uses the existing unsafe method appropriate to the service operation. The service MUST recheck current authentication, authorization, recipient relationship, expiry, and proposal state at the decision boundary. It MUST reject any caller input that violates the contract even if the client already validated it.

A `202 Accepted` response establishes acceptance, not completion. Polling, callbacks, job identifiers, `Location`, and `Retry-After` retain their service and HTTP meanings. A connector MUST use only documented, trusted result operations and MUST preserve an unknown outcome after a timeout or lost response. It MUST NOT turn every `2xx` into a completed semantic effect.

If the API has an idempotency mechanism, the connector MUST follow its scope, lifetime, and request-identity rules. A retry of the same decision MUST preserve its idempotency identity and exact terms. A changed input, operation, or version is a new decision, not a retry. Without demonstrated replay safety, an indeterminate request MUST NOT be retried automatically. The client MAY read current decision state through its authorized mapping.

Services MAY use [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details, ordinary status codes, or existing domain responses. This binding requires no new problem type. The mapping MUST distinguish an accepted decline from an error, an already recorded decision from permission to repeat its effect, and stale terms from retryable transport failure. It MUST NOT expose unauthorized resource existence or details while interpreting those responses.

### HTTP example

The [MIME-to-service walkthrough](/examples) uses an existing API described by OpenAPI and a native `expected_revision` argument. The following smaller example shows the alternative: an API that already supports HTTP conditional requests.

Suppose an installed connector reads `GET /v1/proposals/p7` at its configured service origin and receives an authorized proposal with the strong tag `"p7-r4"`. The API documents `PATCH /v1/proposals/p7` as a conditional update of that same representation. The host displays the current typed terms and obtains a decision. The connector then uses the API's existing update format:

```http
PATCH /v1/proposals/p7 HTTP/1.1
Host: api.service.example
If-Match: "p7-r4"
Content-Type: application/json

{"decision":"approve"}
```

Authentication is omitted from this illustration. The path, PATCH method, and `decision` member belong to that hypothetical API; they are not MAP wire requirements. If the proposal changes before PATCH, the service applies nothing and responds with 412. An API that uses `expected_revision` in its existing body can conform without adopting this example's resource layout.
