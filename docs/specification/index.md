---
title: Mail Action Protocol
description: A common interface for agents and services to work through email.
navTitle: Overview
---

Mail Action Protocol (MAP) defines how a service describes an action in an email, how a client requests that action and how the service reports the result. A client may be an agent, an inbox or another application.

A shared interaction type defines what the action means. An Action Approval states exact terms to approve; an Email Confirmation names the pending request it would complete. A client that understands a type can apply the same logic to every service that offers it. It can also apply its principal's policy to types it has never seen, because every operation declares what completing it gives away.

The service remains responsible for the operation and its permissions. People can read the email and use the service's normal interface to take part.

## Document status

MAP 0.2 is a working draft. It is a type-agnostic core:

- a JSON-LD description carried by Structured Email;
- a request bound to that exact description by its digest;
- execution over HTTPS with credential or possession authority;
- recoverable results.

Types are defined by digest-bound contracts, and adding one never changes the core. The [MAP 0.2 profile](/specification/profile) defines the fields and processing rules. MAP 0.1 is withdrawn, and its artifacts remain published unchanged. This document is not an IETF specification.

## Participants

| Participant | Responsibility                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Service     | Describes available actions, checks permission, performs operations and reports results.                                        |
| Client      | Recognises supported types, verifies the description and its authority, applies its principal's policy and submits the request. |

Supporting a type lets a client reuse its interpretation of the interaction. It does not give the client access to every service that publishes the type.

## An interaction

| Stage       | Information exchanged                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Description | The type, the service and its authority, the target and its revision, the details the type defines, the offered operations and the human route. |
| Request     | The operation and its input, bound to the exact description by its digest, with an identifier that makes retries safe.                          |
| Result      | The recorded state, the target as the service holds it, and a resource for recovering the latest state.                                         |

## Types

Ten types are published as drafts. Each has its own chapter under Types:

- Content Review and Action Approval, which are decisions;
- Information Request, which collects values;
- Event Response and Meeting Scheduling, for calendars;
- Subscription Preferences, for email settings;
- Task Assignment, for assigned work;
- Payment Request, for invoices;
- Email Confirmation and Account Activity, for accounts.

The [Registry](/registry) holds their records, versions and evidence.

## Scope

MAP uses existing email infrastructure, email authentication and service authentication. It introduces no identity provider, custom DNS record or central runtime lookup. Related specifications are considered in [Interoperability](/specification/interoperability).

[Try the review example →](/examples)
