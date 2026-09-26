---
title: Interaction model
description: How an email describes an action, a client requests it and a service returns the result.
navTitle: Interaction model
---

A MAP interaction has three stages: description, request and result. An action can be described before a client has permission to perform it. Permission is checked when the service receives the request.

## Description

The service includes enough information for a client to identify the interaction, understand it and decide whether to act.

| Concept                | Meaning                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Type and version       | The contract that governs the interaction, bound by digest.                                              |
| Originating service    | The service responsible for the operation, and whether it acts on a credential or on the message itself. |
| Interaction identifier | A reference connecting the description, requests and results.                                            |
| Target                 | The object the operations concern, at an exact revision.                                                 |
| Details                | Type-defined data, such as the terms to approve, the fields to fill in or the times on offer.            |
| Available operations   | The operations the service offers, drawn from the contract.                                              |
| Execution route        | The service endpoint that accepts requests.                                                              |
| Human route            | A normal service page where a person can complete the interaction.                                       |

A description is immutable. Any change to what an interaction offers makes a new interaction. The [MAP 0.2 profile](/specification/profile) assigns these concepts exact JSON fields.

## Request

The client selects an offered operation, supplies its input and binds the request to the exact description by its digest. A service therefore acts only on the description it issued. A copy altered in any way, whether its terms, wording or links, cannot be used.

The request carries a client-generated identifier. The service records the first value for that identifier, returns the recorded response for an exact retry and rejects reuse with changed values.

## Result

The service reports the state of the requested operation and the target as it holds it. The result distinguishes recorded work from completed work. It also reports a failure with its reason, a pending approval with its link, and each refusal the core defines. A result resource returns the latest state after an interrupted exchange.

Some operations are decisions: the first that completes decides the interaction. Others, such as feedback or a calendar reply, can repeat.

## Human participation

The readable email and the structured description refer to the same operation and target. People can use the human route without a compatible agent. When a client asks its principal to decide, it shows the bound details rather than the readable text.

A client that meets an unknown type, an unsupported version or a description that fails its checks can still display the email. It must not guess how to execute an interaction it does not support.

## Delivery and execution

Email carries the description, and HTTPS carries the request and result. SMTP, IMAP and provider inbox APIs continue to handle email delivery and access.
