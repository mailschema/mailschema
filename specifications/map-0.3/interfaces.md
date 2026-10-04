---
description: "How APIs, agent protocols, messaging, discovery and identity fit around MAP."
---

# Service interfaces

## One decision, different interfaces

An email offers a decision. A type contract defines its meaning. The host's installed binding connects it to a service operation. That operation can be an API call, a tool invocation, a typed agent request or a command delivered through a broker.

MAP standardizes the proposal and the conditions for acting on it. It does not standardize every path a service can use to receive the decision. A new interface does not need a new action type when the decision's meaning stays the same.

The contract's `bindings` field names authority modes, `credential` and `capability`. It is not a list of transports. Core's HTTPS service identifier identifies an authority; it does not require the service operation to use HTTP. An installed binding must establish any association with a different server, protocol identity or tenant.

## The landscape

The [research catalogue](/interfaces) examines the service interfaces and the surrounding systems separately. Each entry records primary sources, publication status, possible use and unresolved requirements. It includes established enterprise interfaces, constrained and federated systems, and common agent protocols.

<!-- interfaces:table -->
| Area | Interfaces examined | Relationship to MAP |
| --- | --- | --- |
| Service APIs | HTTP APIs, GraphQL, gRPC, JSON-RPC, SOAP / WSDL, OData, CoAP, SDKs and local tools | Native read and decision operations. |
| Agent protocols | Model Context Protocol, Agent2Agent | Tool calls, typed requests, delegation and native tasks. |
| Messaging | AMQP, MQTT, Core NATS, NATS JetStream, Apache Kafka, Webhooks, WebSub | Command delivery, correlated replies and updates. |
| Streams and federation | WebSocket, Server-sent events, WebRTC data channels, WebTransport, HTTP/2, HTTP/3 and QUIC, XMPP, ActivityPub | Channels or application protocols that may carry service interactions. |
| Descriptions and discovery | OpenAPI, OpenRPC, AsyncAPI, Arazzo, WoT Thing Description, CloudEvents, Schema.org Actions | Existing descriptions and vocabulary to reuse. |
| Email and human interfaces | SMTP and MIME, IMAP, JMAP, Structured Email, iTIP / iMIP, One-click unsubscribe | Proposal delivery, mailbox access and existing interaction surfaces. |
| Identity and authorization | OAuth, OAuth resource metadata, OpenID Connect, OAuth Rich Authorization Requests, GNAP, HTTP Message Signatures | Existing account access, identity and request authentication. |
<!-- /interfaces:table -->

These are not equivalent layers. OpenAPI describes an API; HTTP carries its calls. A2A can itself use different protocol bindings. SSE carries server events but cannot submit the client's decision. OIDC authenticates a subject without approving a particular publication.

## What stays the same

Every credentialed binding must establish the trusted connection and principal, read current service facts, preserve the selected operation and exact terms, and interpret native results accurately. The service checks permission and the terms version when it records the decision. A successful preliminary read is insufficient.

An asynchronous read can use a correlated reply. An asynchronous decision can use the service's existing task or result mechanism. The host must distinguish delivery, service acceptance and completion. A lost response leaves an unknown outcome until trusted evidence resolves it.

Delegation does not expand authority. A worker's credential, an authenticated agent card or permission to publish to a topic is insufficient evidence that the original principal may perform this operation. The binding must preserve that relationship and the approved terms through to the service.

## Reuse before adding a format

Several existing descriptions overlap with a portable binding language. [Arazzo](https://spec.openapis.org/arazzo/v1.1.0.html) supplies workflow operation references and value passing. [AsyncAPI](https://www.asyncapi.com/docs/reference/specification/v3.0.0) describes message operations and request/reply. [WoT Thing Description](https://www.w3.org/TR/wot-thing-description11/) supplies action affordances and forms across protocols. OpenAPI, OpenRPC and native service schemas cover other parts.

The remaining MAP association is specific: this installed service operation implements this exact contract, with these authority, terms and outcome guarantees. This draft leaves the representation of that association open. It does not introduce a second generic workflow or mapping language.

Existing domain protocols deserve the same treatment. Calendar replies should use iTIP/iMIP; one-click unsubscribe should use RFC 8058. MAP should connect a useful email proposal to an existing workflow where that adds value.

## Support and evidence

The draft specifies an HTTP binding and a restricted experimental capability binding. HTTP and MCP have illustrative exchanges. The wider catalogue contains research and design assessments, not declarations of compatibility or working integrations.

The next binding should follow an implementer's actual service, with evidence for authority, exact terms, duplicate delivery and uncertain outcomes. It need not be HTTP or MCP. See [Service bindings](/specification/bindings) for the implementation questions and the [research catalogue](/interfaces) for the full assessment.
