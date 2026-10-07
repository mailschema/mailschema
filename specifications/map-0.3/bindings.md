---
description: "Connect a type contract to a service's existing operations, descriptions and authorization."
---

# Service bindings

## What a binding supplies

A type contract gives a decision its meaning. A service binding connects that decision to the operations of a particular service. The same Publication Approval contract could use a GraphQL mutation, a gRPC call, an agent tool or a command handled by a service worker.

This chapter is implementation guidance. The requirements are in [Core](/specification/core#credentialed-processing) and any applicable binding specification, such as the [HTTP binding](/specification/http). MAP does not define a general mapping language or require a new service endpoint.

The binding belongs in the host's installed integration. The email identifies the proposal; it cannot supply a method, tool name, command topic, request template or credential destination. Installing support for an interface does not grant permission to perform every operation on it.

## Start with the service's description

Use the description the service already maintains. OpenAPI describes HTTP operations; OpenRPC describes JSON-RPC methods; protobuf service definitions describe gRPC methods. GraphQL has its schema. AsyncAPI describes messaging operations, channels and request/reply relationships. An MCP server has native tool schemas. These are different interfaces with useful existing machinery.

Some standards go further. Arazzo describes API workflows and the values passed between operations. WoT Thing Description expresses actions, forms and security metadata across protocols. A reusable MAP binding format needs to account for this prior art before introducing another selector syntax or workflow engine.

Native descriptions are inputs to a binding, not evidence that a service enforces its promises. The association with the exact MAP contract, interpretation of native results and service guarantees still need to be documented. No universal declarative format is selected by this draft. A connector can implement those associations using its host's existing integration mechanism.

The [interface research](/interfaces) records the source material, role and unresolved requirements for each option. A researched candidate is not an implemented MAP binding.

## Follow one decision

For Publication Approval, the binding answers seven practical questions:

| Question | What the integration establishes |
| --- | --- |
| Which service and account? | The independently configured connection, tenant, principal and credential audience. |
| Which proposal? | A service read that establishes the interaction, recipient, contract, current terms and offered operations. |
| What is being approved? | The actual content, destinations and schedule, in a coherent version supplied by the service. |
| Which operation and inputs? | The native operation implementing the contract, with values from that read, validated principal input and trusted configuration. |
| Where is the decision enforced? | The service checks permission, recipient relationship, expiry, decision state and expected terms together. |
| What happened? | The native result establishes rejection, acceptance, pending work, completion, failure or uncertainty with its actual domain meaning. |
| What happens after interruption? | The service's recovery and duplicate-handling rules prevent a timeout or redelivery from authorizing another effect. |

The host evaluates policy and obtains any required confirmation after reading the proposal and before submitting the decision. A workflow engine's next step cannot substitute for that gate.

The [worked examples](/examples#worked-examples) show this sequence using an illustrative service's HTTP operations and MCP tools. Their names and request formats belong to that service. They are teaching artifacts, not a new MAP API.

## Queued and delegated work

A broker can deliver the decision; a worker or another agent can carry it out. The binding still needs evidence from the service that owns the effect. A queue acknowledgement does not establish that the service accepted publication, and acceptance does not establish that publication finished.

The service must establish the original principal's authority, not merely authenticate the worker. The expected version remains attached to the decision through delegation and redelivery. When a decision authorizes later work, the service keeps the approved snapshot. The result needs authenticated correlation to that decision and account. These obligations do not require a MAP queue format or a new task protocol.

Use native task, stream and result mechanisms where they exist. An A2A task, MCP Tasks extension, webhook or event stream can report progress under the installed integration. Its completion status has to establish the contract's effect before the host can report that effect as complete.

## Evidence before a reusable binding

Start with an actual service operation. Document its current-state read, decision, authorization, version check and result sequence. Exercise changed terms, revoked permission, duplicate delivery, delegated execution where applicable and an indeterminate response. A schema can describe the version field; it cannot establish atomic enforcement by the service.

The [Registry](/specification/registry) can associate that implementation and its evidence with the exact contract. Existing service directories can supply discovery information. Listing, installation approval and permission to act remain separate decisions.

When implementations demonstrate a shared need that native descriptions do not cover, a small binding profile can define that association. Core and type contracts need not change merely because another interface is added.
