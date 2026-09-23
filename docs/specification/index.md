---
title: Mail Action Protocol
description: A common interface for agents and services to work through email.
navTitle: Overview
---

Mail Action Protocol (MAP) defines how a service describes an action in an email, how a client requests that action and how the service reports the result. A client may be an agent, an inbox or another application.

A shared interaction type defines what the action means. For example, a Content Review request identifies a draft and the operations available to its reviewer. A client that understands that type can use the same review logic with other services that support it.

The service remains responsible for the operation and its permissions. People can read the email and use the service's normal interface to take part.

## Document status

MAP 0.1 is a working draft. It defines the interaction model, a JSON-LD description carried by Structured Email, an authenticated HTTPS execution profile and the first type, Content Review. The published schemas and fixtures are implementable, but the draft may still change. This document is not an IETF specification.

The initial execution profile delivers action descriptions by email and submits requests over authenticated HTTPS. [MAP 0.1 profile](/specification/profile/) defines its fields, status behavior, trust checks and recovery rules.

## Participants

| Participant | Responsibility                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Service     | Describes available actions, checks permission, performs operations and reports results.                                   |
| Client      | Recognises supported interaction types, presents or selects an action and submits the request.                             |
| Connector   | Connects a client or service to a particular environment while preserving the interaction's meaning and permission checks. |

Services still require integration and configuration. Supporting a type allows a client to reuse its interpretation of the interaction; it does not give the client access to every service that publishes the type.

## An interaction

| Stage       | Information exchanged                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Description | The type and version, originating service, target, available operations and routes for clients and people. |
| Request     | The selected operation, target, required inputs and information needed to identify the request.            |
| Result      | The state of the operation, the target affected and any reference needed to inspect the result.            |

The type determines whether the target needs a revision. Content Review requires an exact content revision. Other proposed types must state their own target and versioning requirements.

## Content Review example

An email service sends a test message for revision 3 of a campaign. A reviewer requests a change to the opening paragraph. The service records that feedback. An editor creates revision 4, which an authorised reviewer then approves.

The approval applies to revision 4. A request to approve the old revision is refused. The campaign is sent only through the service's separate sending operation and permission checks.

[Try the review example →](/examples/)

## Types and the Registry

A type defines a particular interaction's operations, inputs and results. The MailSchema Registry holds submitted type definitions, their versions, examples and review status. A record may also link to implementations that declare support for a particular type version.

Registering a type does not demonstrate that a product implements it correctly. Type status and implementation evidence are recorded separately. Clients can support a type without making a Registry lookup during an interaction.

## Scope

This draft covers action descriptions, requests, permission checks and results. It also requires a usable route for people to complete the interaction.

MAP uses existing email infrastructure and service authentication. New identity systems, global service discovery and a general policy engine are outside this profile. Related specifications and vocabularies are considered in [Interoperability](/specification/interoperability/).
