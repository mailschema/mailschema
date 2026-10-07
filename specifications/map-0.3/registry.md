---
description: "Find a type, choose a service implementation and connect an account deliberately."
---

# Registry and discovery

## From a type to a service

A type catalogue answers “what does this action mean?” An implementation record answers “which service supports it, and how can a client connect?” A host may use MailSchema's Registry, an organization catalogue or a locally installed collection.

A client MUST select catalogues through its own configuration. Identifiers in email are lookup keys within those catalogues, not permission to fetch or install arbitrary resources. If no configured catalogue supplies the exact contract, the action remains unsupported.

The Registry holds descriptions and evidence. Account permissions remain with the service; installation and execution policy remain with the host.

### Type records

A type record identifies the contract's URI, version, profile and canonical digest, together with a download reference, lifecycle status and maintainers. Examples and explanatory material MAY accompany it. The contract supplies the name, semantics and schemas; a record MUST NOT override them.

Before use, a client MUST verify the downloaded contract's identity and digest. Matching a digest establishes which bytes were obtained. It does not establish that the publisher is trustworthy or that the client can enforce the contract's semantics.

### Implementation records

An implementation record MUST identify:

- the service origin and the party maintaining the integration;
- the exact contract identifier, version and digest;
- the operation identifiers it supports;
- the binding it implements;
- its lifecycle status, documentation and a support declaration or report.

If a record distributes an installable integration, it MUST also identify the
artifact's location and digest, the exact digest procedure, and the supported
host interface or declarative format. Built-in service support does not require
a downloadable connector or public source code. A service listing describes
support; it does not itself supply an executable connection.

The `binding` value is an HTTPS identifier for its binding specification or documented service binding, not a closed transport enumeration. A client must explicitly support that binding; the identifier does not trigger a fetch. A declarative integration names the specific description or workflow format and profile it uses. A code integration names its actual host interface and version. Clients MUST NOT assume either form supports an unlisted contract version, operation or host.

Records MUST distinguish a publisher's support declaration from an implementation report. A declaration states the scope claimed by the maintainer. A report identifies the implementation revision, tested roles and operations, setup, observations and missing coverage so others can reproduce it. The record MUST disclose common ownership when making an interoperability claim. A listing is not certification. A consumer-only report states its actual role; it is not a service implementation record.

### First connection

When the service is unconnected, a client MAY offer setup separately from the email's action. Setup MUST use a binding obtained through configured discovery and selected under host installation policy. The host MUST show the service identity, integration publisher, requested account access and supported effects before the principal grants access. An administrator can perform this setup for an organization under its policy.

Authentication follows the service's existing mechanism. For OAuth, clients can use [Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728) to discover authorization configuration for an independently selected resource. Such metadata does not attest to a MAP contract or authorize an action. MAP introduces no identity provider or DNS record.

After setup, the consumer MUST restart Core processing for the waiting message. It MUST obtain current service state and reevaluate permission, terms, expiry and the offered operation. Approval to connect an account is not approval to carry out that message.

If setup is unavailable or declined, the client MAY retain the readable email and its ordinary links. It MUST NOT present an unverified link as the service's trusted review route or fall back to another protocol, account or bearer action merely to make the operation succeed.

### Client states

Clients can use their own presentation and internal APIs, but MUST preserve these distinctions:

| Situation | Required behaviour |
| --- | --- |
| Unsupported profile, contract or binding | Keep ordinary email readable; do not execute the action. |
| Service not connected | Offer explicit setup or the ordinary review link with its actual origin visible; do not label the link verified. |
| Permission missing | Explain that the current account cannot perform this operation. |
| Confirmation needed | Present the service's exact terms and requested effect. |
| Terms changed | Stop; obtain a new proposal and a new decision. |
| Expired, withdrawn or superseded | Disable the old action. |
| Decision accepted or work pending | Report acceptance or progress without claiming completion. |
| Outcome unknown | Preserve uncertainty; recover only through a trusted service mechanism. |

A human route remains a separate service interaction. Its page must enforce Core's safe-navigation and confirmation requirements; opening it never performs the operation.

## Versions and lifecycle

### Separate identities

Core, contracts and service bindings have separate identities. Adding a type does not change Core. Adding a service binding does not change the type. An implementation MUST list the exact contract digests it supports; support for a name or a numeric version range is insufficient.

A published contract version fixes all its canonical bytes, including normative prose. Changing those bytes requires a new version and digest. A published binding revision likewise retains its original artifact. A record that offers an installable integration uses `artifact.digestMode`: `canonical-json` for an RFC 8785 representation or `bytes` for the exact downloaded artifact; both use SHA-256. The declared format determines which procedure applies; a JSON artifact is not implicitly canonicalized. Code artifacts use `bytes`. Consumers MUST verify the declared digest before installation and MUST NOT infer a different procedure to make it match. Lifecycle metadata, evidence and successor references can change without changing those definitions.

Development previews MUST be labelled as drafts. A catalogue MUST distinguish a mutable preview from an immutable published revision. Clients MUST pin exact artifacts before execution, including when evaluating a draft. A publisher MUST NOT replace an immutable revision with a changed preview under the same identity.

### Moving to a new version

A successor record is a discovery hint. It MUST NOT rewrite an earlier message's contract, convert a prior decision or silently extend standing permission. The host can review and install support for the successor under its ordinary policy. A proposal using that successor needs its own current terms and decision.

An older message may remain usable only while its exact contract and binding are supported and the service still authorizes its proposal. Retaining history does not oblige a service to keep accepting an old operation. Conversely, ending support does not justify deleting the published definition needed to interpret past messages.

Core additions require a new profile when they change interpretation of the fixed description. Type-specific fields belong in the type's details or input schema. New transports have their own bindings. A consumer MUST refuse required features it cannot enforce; it MUST NOT guess a compatible interpretation.

### Maturity labels

A catalogue SHOULD distinguish Draft, Experimental, Stable, Deprecated and Superseded records. Draft means a definition is under review. Experimental means implementation experience is being gathered. Stable requires the publisher's stated evidence and review criteria. Deprecated discourages new use. Superseded identifies a replacement without authorizing migration.

A status label alone proves none of those claims. Records MUST link the evidence or policy on which they rely. The current MailSchema contracts remain Draft, and illustrative mappings are kept separate from implementation listings.
