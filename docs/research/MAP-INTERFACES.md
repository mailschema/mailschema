# MAP interface research

<!-- Generated from map-interfaces.json by npm run spec:generate. -->

Common service interfaces, descriptions, discovery, delivery, identity and established email workflows relevant to MAP. This catalogue does not enumerate every protocol or vendor SDK.

Primary specifications and project/provider documentation were retrieved and relevant sections inspected. Existing capabilities are source-backed; possible MAP uses, remaining requirements and assessments are design judgments. No entry claims a tested MAP implementation.

43 entries across 7 groups; 47 primary-source documents. Source retrieval URLs, times and byte hashes are recorded in [the evidence catalogue](map-interfaces.json).

## Architecture decision

Keep the email action contract and its safety invariants independent of service interface. Reuse native descriptions, identity, tasks, results and established domain workflows. Do not standardize a second generic mapping language before the reuse comparison is resolved.

The earlier draft x-map extension and companion schema have been removed. Native OpenAPI examples remain; they define no MAP mapping language. Service bindings is now an informative implementation chapter, excluded from the generated Internet-Draft. Core explicitly accommodates correlated asynchronous reads and preserves the original principal through delegated decisions.

### Keep the common boundary small

MAP owns the email proposal, shared decision semantics and conditions for exercising authority. Service APIs, agent protocols and messaging systems keep their native calls, tasks and result formats. Extending Core for each transport would create unnecessary coupling.

Sources: [http](https://www.rfc-editor.org/rfc/rfc9110.txt) · [a2a](https://a2a-protocol.org/latest/specification/) · [asyncapi](https://www.asyncapi.com/docs/reference/specification/v3.0.0).

### Reuse descriptions before defining annotations

Use the description a service already maintains. OpenAPI/OpenRPC/AsyncAPI, Arazzo and WoT cover enough of the structural problem that a universal x-map language is premature. A later semantic profile should add only a demonstrated gap, with evidence from more than one implementation.

Sources: [openapi](https://spec.openapis.org/oas/v3.1.2.html) · [openrpc](https://spec.open-rpc.org/) · [asyncapi](https://www.asyncapi.com/docs/reference/specification/v3.0.0) · [arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) · [wot](https://www.w3.org/TR/wot-thing-description11/).

### Treat asynchronous execution as a first-class case

Readback may arrive as a correlated reply. Decisions can queue or delegate work. The service still needs the original principal, exact approved snapshot, atomic decision and authenticated result. Preserve delivery, acceptance and completion as distinct facts.

Sources: [amqp](https://docs.oasis-open.org/amqp/core/v1.0/amqp-core-messaging-v1.0.html) · [mqtt](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html) · [grpc](https://grpc.io/docs/guides/status-codes/) · [a2a](https://a2a-protocol.org/latest/specification/).

### Reuse identity without choosing an identity vendor

Existing OAuth, OIDC or GNAP connections can establish account access. Neither sign-in nor discovery authorizes the email’s particular request, and MAP needs no new global identity provider or DNS record.

Sources: [oauth](https://www.rfc-editor.org/rfc/rfc9700.txt) · [oidc](https://openid.net/specs/openid-connect-core-1_0.html) · [gnap](https://www.rfc-editor.org/rfc/rfc9635.txt).

### Do not duplicate complete domain workflows

Calendar scheduling and one-click unsubscribe already have protocols. Use their native semantics when they fit; add a MAP type only where a useful email interaction remains and an implementer can establish the required guarantees.

Sources: [itip](https://www.rfc-editor.org/rfc/rfc5546.txt) · [imip](https://www.rfc-editor.org/rfc/rfc6047.txt) · [unsubscribe](https://www.rfc-editor.org/rfc/rfc8058.txt).

## Reuse comparison

| Existing work | Already supplies | MAP association still needed | Assessment |
| --- | --- | --- | --- |
| OpenAPI / OpenRPC / native schemas ([openapi](https://spec.openapis.org/oas/v3.1.2.html) · [openrpc](https://spec.open-rpc.org/)) | Operation identities, inputs, outputs and protocol-specific descriptions. | Associate an exact MAP contract with native operations and document authorization, revision and outcome semantics. | Use as the service-description source; do not duplicate its schema. |
| AsyncAPI ([asyncapi](https://www.asyncapi.com/docs/reference/specification/v3.0.0)) | Channels, messages, security, protocol bindings and request/reply. | Define which application result establishes the decision, its principal and the atomic commit. | Use for messaging integrations; no MAP queue envelope. |
| Arazzo ([arazzo](https://spec.openapis.org/arazzo/v1.1.0.html)) | API workflow steps, operation references, runtime values and success criteria. | Keep host policy and confirmation outside automatic step advancement; establish the service’s actual enforcement. | Reuse for suitable API workflows. Do not make a workflow engine a Core requirement. |
| WoT Thing Description ([wot](https://www.w3.org/TR/wot-thing-description11/)) | Cross-protocol action affordances, forms, input/output and security descriptions. | A MAP profile would still need recipient, principal, exact-contract and exact-terms semantics. | Strong cross-protocol prior art; evaluate a profile when a real integration needs this shape. |
| A2A tasks / MCP Tasks ([a2a](https://a2a-protocol.org/latest/specification/) · [mcp-tasks](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)) | Native representations for longer-running work and its state. | Establish how task results prove the contract’s effect; preserve approval and authority across delegation. | Reuse when the service supports them; no generic MAP job API. |

## Evaluation questions

- How is a trusted service and operation discovered?
- How is the acting principal authorized?
- How is the current proposal read?
- Where is the expected version enforced atomically?
- What proves acceptance or completion?
- How are duplicates, retries and uncertain outcomes handled?
- What authority survives delegation or queued delivery?

## Service APIs

### HTTP APIs

RFC 9110. **Binding candidate.**

**Existing capability.** HTTP supplies methods, status codes, conditional requests and authentication conventions.

**Possible MAP use.** Use the existing read and decision endpoints. OpenAPI can identify their schemas and operation IDs.

**Unresolved requirement.** If-Match must govern the actual approved representation; 202 is acceptance, and a lost response is indeterminate.

Primary sources: [http](https://www.rfc-editor.org/rfc/rfc9110.txt) · [openapi](https://spec.openapis.org/oas/v3.1.2.html).

### GraphQL

September 2025 specification. **Binding candidate.**

**Existing capability.** Queries, mutations and subscriptions operate on a typed schema. Results can include both data and errors.

**Possible MAP use.** Read the proposal with an installed query; call the service’s mutation with its expected-version argument.

**Unresolved requirement.** Serial root mutation execution is not an atomic business transaction. Interpret domain state and partial errors.

Primary sources: [graphql](https://spec.graphql.org/September2025/).

### gRPC

gRPC documentation. **Binding candidate.**

**Existing capability.** RPCs return status codes; a deadline can expire even after a state-changing operation succeeds.

**Possible MAP use.** Select installed service and method descriptors. Map native request fields and result messages to the contract.

**Unresolved requirement.** The service must enforce expected revision and principal authority. A deadline does not establish failure before execution.

Primary sources: [grpc](https://grpc.io/docs/guides/status-codes/).

### JSON-RPC

2.0 specification. **Binding candidate.**

**Existing capability.** Transport-independent calls carry a method, parameters and correlation ID. Notifications receive no response.

**Possible MAP use.** Use a service read call and decision call over the already authorized connection; retain native result/error objects.

**Unresolved requirement.** A request ID is correlation, not an idempotency guarantee. Notifications alone cannot prove a consequential decision.

Primary sources: [jsonrpc](https://www.jsonrpc.org/specification) · [openrpc](https://spec.open-rpc.org/).

### SOAP / WSDL

SOAP 1.2; WSDL 2.0. **Binding candidate.**

**Existing capability.** SOAP has a protocol-binding framework and faults; WSDL describes interfaces, operations and bindings.

**Possible MAP use.** Use the installed WSDL operation and existing service security. Map the proposal revision into its native message.

**Unresolved requirement.** SOAP success and reliable delivery do not establish contract effects. Service-specific version checks and fault meanings remain necessary.

Primary sources: [soap](https://www.w3.org/TR/soap12-part1/) · [wsdl](https://www.w3.org/TR/wsdl20/).

### OData

4.01 OASIS Standard. **Binding candidate.**

**Existing capability.** OData defines actions and conditional action requests, including native ETag checks and concurrency failures.

**Possible MAP use.** Bind the contract to a documented resource-bound action and the resource state it actually covers.

**Unresolved requirement.** OData permits weak ETag comparison in its own conditional semantics. Do not mislabel that as RFC 9110 strong comparison.

Primary sources: [odata](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html).

### CoAP

RFC 7252. **Specialist candidate.**

**Existing capability.** CoAP provides constrained resource operations, ETags, If-Match and request/response exchanges.

**Possible MAP use.** An installed constrained-service binding can map the decision to the native resource and its precondition.

**Unresolved requirement.** CoAP tokens, acknowledgements and retransmission rules are not business-decision deduplication. Account authorization and secure transport need an explicit profile.

Primary sources: [coap](https://www.rfc-editor.org/rfc/rfc7252.txt).

### SDKs and local tools

Host-specific interfaces; POSIX execution model. **Binding candidate.**

**Existing capability.** A host can invoke an installed library or executable. This is an implementation choice, not a common network protocol.

**Possible MAP use.** Map contract operations through a reviewed host adapter, fixed executable identity and structured arguments.

**Unresolved requirement.** Do not execute email-supplied commands. The adapter still needs authoritative service state and atomic enforcement; an exit code alone is insufficient.

Primary sources: [posix-exec](https://pubs.opengroup.org/onlinepubs/9799919799/functions/exec.html).

## Agent protocols

### Model Context Protocol

2026-07-28; Tasks extension separately versioned. **Binding candidate.**

**Existing capability.** MCP describes tools, calls and structured results over standard or custom bindings; Tasks is a separate extension.

**Possible MAP use.** Use installed tool mappings and the server’s existing authorization. Reuse native task support when negotiated.

**Unresolved requirement.** Tool annotations are hints. Successful calls and completed protocol tasks require interpretation against the contract’s actual effect.

Primary sources: [mcp-current](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) · [mcp-transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) · [mcp-tasks](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks).

### Agent2Agent

Current project specification. **Binding candidate.**

**Existing capability.** A2A defines agent cards, structured messages, tasks, extensions and multiple protocol bindings.

**Possible MAP use.** Map a typed decision through an explicitly supported service extension; preserve native task and result handling.

**Unresolved requirement.** SendMessage idempotency is optional. Agent discovery, task completion and downstream delegation do not automatically prove exact-terms execution.

Primary sources: [a2a](https://a2a-protocol.org/latest/specification/).

## Messaging

### AMQP

1.0 OASIS Standard. **Binding candidate.**

**Existing capability.** AMQP supplies message transfer, delivery states, settlement and message properties.

**Possible MAP use.** Use a trusted request/reply route and service decision record, retaining native correlation and delivery semantics.

**Unresolved requirement.** Identify which receiver accepted the message. A broker’s accepted disposition is not proof that an application committed the effect.

Primary sources: [amqp](https://docs.oasis-open.org/amqp/core/v1.0/amqp-core-messaging-v1.0.html).

### MQTT

5.0 OASIS Standard. **Binding candidate.**

**Existing capability.** MQTT defines publish/subscribe delivery, QoS, Response Topic and Correlation Data for request/reply patterns.

**Possible MAP use.** Use installed command and response topics, with authorization for each topic and a service-side decision check.

**Unresolved requirement.** QoS describes message delivery, not an atomic application effect. Prevent retained or replayed commands from causing new decisions.

Primary sources: [mqtt](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html).

### Core NATS

Project documentation. **Binding candidate.**

**Existing capability.** Core NATS supplies ephemeral at-most-once messaging and request/reply using reply subjects.

**Possible MAP use.** Map read and decision requests to authorized subjects; authenticate the service response and retain native correlation.

**Unresolved requirement.** A timeout can mean no response, not no effect. Subject access alone must not substitute for the acting principal’s permission.

Primary sources: [nats](https://docs.nats.io/learn/core-nats/).

### NATS JetStream

Project documentation. **Binding candidate.**

**Existing capability.** JetStream adds persisted streams and per-consumer delivery tracking with acknowledgements.

**Possible MAP use.** Use durable command delivery where needed and a separate correlated application result.

**Unresolved requirement.** Acknowledging consumption does not prove the business transaction. Couple decision deduplication to the service’s actual commit.

Primary sources: [jetstream](https://docs.nats.io/learn/jetstream/).

### Apache Kafka

4.1 design documentation. **Binding candidate.**

**Existing capability.** Kafka provides durable logs and transaction mechanisms; coordinating effects in external systems remains a separate concern.

**Possible MAP use.** Use installed command/result topics and a service decision ledger or equivalent atomic storage mechanism.

**Unresolved requirement.** Broker transactions do not automatically cover publishing an article or sending mail. Preserve account authority through consumers and retries.

Primary sources: [kafka](https://kafka.apache.org/41/design/design/).

### Webhooks

Standard Webhooks project specification. **Binding candidate.**

**Existing capability.** Standard Webhooks defines signed payload and delivery metadata, including an identifier and attempt timestamp.

**Possible MAP use.** Reuse an existing authenticated webhook for decisions or results when its API defines that role.

**Unresolved requirement.** A callback must be installed and authorized independently of email. Signature freshness does not prove current terms or grant permission.

Primary sources: [webhooks](https://raw.githubusercontent.com/standard-webhooks/standard-webhooks/main/spec/standard-webhooks.md).

### WebSub

W3C Recommendation. **Reuse supporting layer.**

**Existing capability.** WebSub defines publisher, hub and subscriber relationships for delivering updates.

**Possible MAP use.** Reuse it for authenticated update notification followed by the service’s trusted state read.

**Unresolved requirement.** Subscription verification and notification delivery do not define a command, exact-terms decision or completed effect.

Primary sources: [websub](https://www.w3.org/TR/websub/).

## Streams and federation

### WebSocket

RFC 6455. **Reuse supporting layer.**

**Existing capability.** WebSocket provides a bidirectional message channel and subprotocol negotiation.

**Possible MAP use.** Carry an existing RPC or command protocol over the authorized connection.

**Unresolved requirement.** A WebSocket connection has no built-in MAP read, decision or outcome meaning. The application subprotocol must supply those.

Primary sources: [websocket](https://www.rfc-editor.org/rfc/rfc6455.txt).

### Server-sent events

WHATWG HTML standard. **Reuse supporting layer.**

**Existing capability.** SSE delivers server-to-client event streams and supports reconnection with event identifiers.

**Possible MAP use.** Use an installed service stream for progress or authenticated result updates.

**Unresolved requirement.** It is not the client’s decision-submission path. Replayed event IDs and disconnected streams must not manufacture completion.

Primary sources: [sse](https://html.spec.whatwg.org/multipage/server-sent-events.html).

### WebRTC data channels

RFC 8831. **Specialist candidate.**

**Existing capability.** WebRTC data channels carry application data over SCTP with channel-specific ordering and reliability choices.

**Possible MAP use.** A peer-service integration could carry an existing command protocol over an authenticated channel.

**Unresolved requirement.** Signaling, peer identity, recipient authority, correlation and recovery must be specified. Channel delivery does not mean the action committed.

Primary sources: [webrtc](https://www.rfc-editor.org/rfc/rfc8831.txt).

### WebTransport

W3C Candidate Recommendation Snapshot, July 2026. **Specialist candidate.**

**Existing capability.** WebTransport exposes streams and datagrams for application communication.

**Possible MAP use.** Reuse a deployment’s application protocol over its established session rather than defining a MAP stream format.

**Unresolved requirement.** Streams and datagrams do not supply contract semantics, principal delegation or an atomic expected-version check.

Primary sources: [webtransport](https://www.w3.org/TR/webtransport/).

### HTTP/2, HTTP/3 and QUIC

HTTP/3 RFC 9114; underlying protocol family. **Reuse supporting layer.**

**Existing capability.** HTTP/3 carries HTTP semantics over QUIC. Transport evolution is separate from the API’s application semantics.

**Possible MAP use.** Keep the HTTP service binding independent of the HTTP wire version.

**Unresolved requirement.** A different connection or multiplexing mechanism is not another action contract or evidence of safe retry.

Primary sources: [http3](https://www.rfc-editor.org/rfc/rfc9114.txt) · [http](https://www.rfc-editor.org/rfc/rfc9110.txt).

### XMPP

RFC 6120. **Specialist candidate.**

**Existing capability.** XMPP includes authenticated XML streams and an IQ request/response mechanism.

**Possible MAP use.** An installed service namespace could carry reads and decisions with correlated IQ responses.

**Unresolved requirement.** Map JIDs and delegated identities to the service principal. An IQ result still needs domain-specific exact-terms and outcome semantics.

Primary sources: [xmpp](https://www.rfc-editor.org/rfc/rfc6120.txt).

### ActivityPub

W3C Recommendation. **Specialist candidate.**

**Existing capability.** ActivityPub defines actor inboxes, outboxes and activity delivery for social applications.

**Possible MAP use.** Reuse existing social activity semantics where they match the desired operation.

**Unresolved requirement.** Delivery or acceptance of an activity is not generic business approval. A bespoke publishing workflow still needs a documented service binding.

Primary sources: [activitypub](https://www.w3.org/TR/activitypub/).

## Descriptions and discovery

### OpenAPI

3.1.2 examined. **Reuse before inventing.**

**Existing capability.** OpenAPI describes HTTP operations, security requirements, schemas and links to related operations.

**Possible MAP use.** Reuse operation identifiers and native API definitions as binding inputs.

**Unresolved requirement.** Links do not guarantee permission. OpenAPI alone does not define MAP effects or prove a service’s atomic version check.

Primary sources: [openapi](https://spec.openapis.org/oas/v3.1.2.html).

### OpenRPC

Project specification. **Reuse before inventing.**

**Existing capability.** OpenRPC describes JSON-RPC methods and supplies an optional rpc.discover discovery method.

**Possible MAP use.** Reference trusted method descriptions and their parameters rather than defining another RPC descriptor.

**Unresolved requirement.** Discovery does not install a binding or authorize execution. Outcome and exact-terms semantics remain service-specific.

Primary sources: [openrpc](https://spec.open-rpc.org/).

### AsyncAPI

3.0.0. **Reuse before inventing.**

**Existing capability.** AsyncAPI describes servers, channels, operations, security, messages and request/reply relationships with protocol bindings.

**Possible MAP use.** Reuse its native channel and message descriptions for queue and event-driven service integrations.

**Unresolved requirement.** A reply relationship does not prove business acceptance. Pin trusted configuration and define the service’s decision/result semantics.

Primary sources: [asyncapi](https://www.asyncapi.com/docs/reference/specification/v3.0.0).

### Arazzo

1.1.0. **Reuse before inventing.**

**Existing capability.** Arazzo describes API workflows with operation references, runtime values, payload replacements and success criteria.

**Possible MAP use.** Evaluate its existing mappings before standardizing the custom x-map selector language.

**Unresolved requirement.** A workflow runner must stop for host policy and confirmation before the decision. Success criteria cannot prove unimplemented atomic enforcement.

Primary sources: [arazzo](https://spec.openapis.org/arazzo/v1.1.0.html).

### WoT Thing Description

1.1 W3C Recommendation. **Reuse before inventing.**

**Existing capability.** Thing Descriptions provide action affordances, forms, input/output descriptions and security metadata across protocol bindings.

**Possible MAP use.** Compare a MAP semantic profile over existing affordances with a new binding-description format.

**Unresolved requirement.** Do not equate invokeaction with informed approval. Recipient relationship, exact terms and business effects still need explicit service guarantees.

Primary sources: [wot](https://www.w3.org/TR/wot-thing-description11/).

### CloudEvents

1.0.2. **Reuse supporting layer.**

**Existing capability.** CloudEvents standardizes event context and its representation across formats and protocol bindings.

**Possible MAP use.** Use it around existing service notifications or result events when the service already does so.

**Unresolved requirement.** An event envelope does not define a command contract, authority, atomic commit or exactly-once application behaviour.

Primary sources: [cloudevents](https://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/spec.md).

### Schema.org Actions

Schema.org vocabulary. **Reuse supporting layer.**

**Existing capability.** Schema.org describes actions, their participants, results and potential actions.

**Possible MAP use.** Reuse suitable vocabulary or documented mappings where its meaning agrees with a MAP type.

**Unresolved requirement.** A potentialAction or target URL is descriptive metadata, not a permission grant or executable request template.

Primary sources: [schema-actions](https://schema.org/Action).

## Email and human interfaces

### SMTP and MIME

RFC 5321; Structured Email container. **Reuse supporting layer.**

**Existing capability.** SMTP delivers mail; MIME carries readable and structured message parts.

**Possible MAP use.** Keep email delivery as MAP’s proposal channel, independent of the service execution interface.

**Unresolved requirement.** Mail acceptance and a delivered reply do not prove execution. A generic reply-command binding would need its own trust and result rules.

Primary sources: [smtp](https://www.rfc-editor.org/rfc/rfc5321.txt) · [sml](https://www.ietf.org/archive/id/draft-ietf-sml-structured-email-06.txt).

### IMAP

RFC 9051. **Reuse supporting layer.**

**Existing capability.** IMAP accesses and manages mailbox messages; it does not specify mail submission.

**Possible MAP use.** Use an existing mail client or provider integration to obtain the message and trusted delivery context.

**Unresolved requirement.** Mailbox access does not establish permission to act in the external service.

Primary sources: [imap](https://www.rfc-editor.org/rfc/rfc9051.txt).

### JMAP

RFC 8620. **Binding candidate.**

**Existing capability.** JMAP defines account-scoped method calls, capabilities and state preconditions such as ifInState.

**Possible MAP use.** Reuse JMAP mailbox access or a separately defined domain capability when its actual semantics fit.

**Unresolved requirement.** Mailbox state is not the version of an external publication or campaign. Core JMAP is not a universal action API.

Primary sources: [jmap](https://www.rfc-editor.org/rfc/rfc8620.txt).

### Structured Email

IETF working-group draft -06. **Reuse before inventing.**

**Existing capability.** Structured Email specifies structured MIME content and defers details of structured replies to future work.

**Possible MAP use.** Reuse its container for the proposal and coordinate MAP’s specific action requirements with SML.

**Unresolved requirement.** A shared MIME container neither standardizes execution nor reserves the entire action problem for MAP.

Primary sources: [sml](https://www.ietf.org/archive/id/draft-ietf-sml-structured-email-06.txt).

### iTIP / iMIP

RFC 5546 and RFC 6047. **Reuse existing workflow.**

**Existing capability.** iTIP defines calendaring scheduling exchanges; iMIP binds them to MIME email.

**Possible MAP use.** Use calendar-native requests and replies for attendance and scheduling semantics they already define.

**Unresolved requirement.** Do not recreate an RSVP protocol as a generic MAP type. A broader workflow must preserve organizer, attendee and revision semantics.

Primary sources: [itip](https://www.rfc-editor.org/rfc/rfc5546.txt) · [imip](https://www.rfc-editor.org/rfc/rfc6047.txt).

### One-click unsubscribe

RFC 8058. **Reuse existing workflow.**

**Existing capability.** RFC 8058 defines an authenticated email signal and a fixed one-click unsubscribe POST.

**Possible MAP use.** Use it directly for list unsubscribe. Keep MAP’s experimental capability actions explicitly separate.

**Unresolved requirement.** It is not a general bearer approval protocol and does not authorize consequential actions.

Primary sources: [unsubscribe](https://www.rfc-editor.org/rfc/rfc8058.txt).

## Identity and authorization

### OAuth

RFC 9700 security BCP. **Reuse supporting layer.**

**Existing capability.** OAuth deployments have established authorization flows and security requirements for clients, tokens and resources.

**Possible MAP use.** Use the service’s existing scoped connection and resource protections.

**Unresolved requirement.** Possession of a token is not confirmation of a particular proposal. Keep credentials outside email and model-generated arguments.

Primary sources: [oauth](https://www.rfc-editor.org/rfc/rfc9700.txt).

### OAuth resource metadata

RFC 9728. **Reuse supporting layer.**

**Existing capability.** Protected Resource Metadata advertises authorization configuration for an OAuth resource.

**Possible MAP use.** Use it during explicit setup for a service independently selected by the host.

**Unresolved requirement.** Metadata is not proof of MAP support, publisher trust, recipient authority or consent to the waiting action.

Primary sources: [oauth-metadata](https://www.rfc-editor.org/rfc/rfc9728.txt).

### OpenID Connect

Core 1.0, errata set 2. **Reuse supporting layer.**

**Existing capability.** OIDC supplies authentication and identity claims on top of OAuth 2.0.

**Possible MAP use.** Accept an already trusted provider’s identity through the service’s existing sign-in flow.

**Unresolved requirement.** Authentication identifies a subject; it does not authorize every action that subject’s email describes.

Primary sources: [oidc](https://openid.net/specs/openid-connect-core-1_0.html).

### OAuth Rich Authorization Requests

RFC 9396. **Reuse supporting layer.**

**Existing capability.** RAR carries structured authorization_details, with reusable fields for API-defined authorization types.

**Possible MAP use.** Reuse it when a service needs fine-grained authorization requests rather than inventing a MAP permission language.

**Unresolved requirement.** An authorization_details object needs agreed semantics and enforcement. It does not itself bind an approval to current service terms.

Primary sources: [rar](https://www.rfc-editor.org/rfc/rfc9396.txt).

### GNAP

RFC 9635. **Reuse supporting layer.**

**Existing capability.** GNAP specifies grant negotiation, access tokens and interaction with a resource owner.

**Possible MAP use.** Allow a service’s established GNAP authorization through its trusted binding.

**Unresolved requirement.** Grant negotiation must remain separate from the email’s proposal. MAP need not require migration from OAuth or introduce its own grant system.

Primary sources: [gnap](https://www.rfc-editor.org/rfc/rfc9635.txt).

### HTTP Message Signatures

RFC 9421. **Reuse supporting layer.**

**Existing capability.** HTTP signatures cover selected message components and can carry creation time, expiry and nonce metadata.

**Possible MAP use.** Reuse them for request or callback authentication where the native service already defines the signature profile.

**Unresolved requirement.** A valid signature proves neither authorization nor a completed effect. Coverage, freshness, key trust and replay handling require a profile.

Primary sources: [http-signatures](https://www.rfc-editor.org/rfc/rfc9421.txt).

## Open implementation questions

- Whether a small semantic annotation over OpenAPI/Arazzo, AsyncAPI, OpenRPC or WoT is sufficient for reusable MAP bindings; no universal format is selected.
- Which real services can demonstrate atomic principal, permission, expiry and terms enforcement across the different interface families.
- How a delegated or brokered integration proves the original acting principal at the service decision, rather than only a worker or broker identity.
- How a non-HTTP service identity is explicitly associated with Core’s current HTTPS-origin identifier; this survey does not change Core’s identity syntax.
- Which provider action renderers can preserve the contract and recipient checks end to end; their presence is not a MAP compatibility claim.
