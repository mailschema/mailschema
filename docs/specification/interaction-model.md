---
title: Interaction model
description: How an email describes an action, a client requests it and a service returns the result.
navTitle: Interaction model
---

A MAP interaction has three stages: description, request and result. An action can be described before a client has permission to perform it. Permission is checked when the service receives the request.

## Description

The service includes enough information for a client to identify the interaction and determine which operations it understands.

| Concept                | Meaning                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Type and version       | The definition that governs the interaction.                                         |
| Originating service    | The service responsible for the operation.                                           |
| Interaction identifier | A reference connecting the description, requests and results.                        |
| Target                 | The object the operation concerns, including a revision where the type requires one. |
| Available operations   | The actions offered by the service and their required inputs.                        |
| Execution route        | The service endpoint that accepts requests.                                          |
| Human route            | A normal service interface through which a person can complete the interaction.      |

The [MAP 0.1 profile](/specification/profile/) assigns these concepts exact JSON fields and binds descriptions to a versioned profile, canonical type contract and target revision.

## Request

The client selects an offered operation and supplies its required inputs. It identifies the target and uses authentication accepted by the service.

Before performing the operation, the service checks the caller's permission, the requested action and the target. It also checks any applicable expiry, revocation or additional approval. A Content Review request includes the exact revision being reviewed.

The request carries a client-generated UUID URN. The service records the first request value for that identifier, returns the recorded response for an exact retry and rejects reuse with changed values.

## Result

The service reports the state of the requested operation. It identifies the request and the affected target, including the revision where required by the type.

The result distinguishes work that has been accepted from work that has completed. It also reports refusal, stale content, pending work or a required approval when those conditions apply.

[Results and retries](/specification/outcomes/) explains the distinctions clients preserve. The [profile](/specification/profile/) defines their wire values and HTTP mappings.

## Human participation

The readable email and the structured description refer to the same operation and target. People can use the human route without a compatible agent.

A client that encounters an unknown type, unsupported version or conflicting description can continue to display the email. It must not infer execution rules for an interaction it does not support.

## Delivery and execution

In the initial profile, email carries the description and authenticated HTTPS carries the request and result. SMTP, IMAP and provider inbox APIs continue to handle email delivery and access.

Carrying requests and results through email would require an additional profile. Such a profile would need defined correlation, delivery and recovery behaviour.
