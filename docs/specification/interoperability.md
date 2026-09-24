---
title: Interoperability
description: Reusing existing standards and testing an interaction across services.
navTitle: Interoperability
---

MAP is intended to let a client reuse its handling of an interaction type across services. Each service still supplies its own operation, authentication and configuration.

Interoperability depends on agreement about both meaning and representation. Shared names alone are insufficient; implementations need compatible request, result and recovery behaviour.

## Existing specifications

MAP 0.1 selects a narrow profile over existing formats and protocols. Where a mechanism already exists, MAP names the slot it fills rather than defining a replacement.

| Work                                                                                                                                                        | Use in MAP                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Structured Email, draft-ietf-sml-structured-email-06](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06)                            | Supplies the MIME designation and partial-representation model used to carry a MAP description.                                                                                 |
| [MIME, RFC 2046](https://www.rfc-editor.org/rfc/rfc2046) and [Internet Message Format, RFC 5322](https://www.rfc-editor.org/rfc/rfc5322)                    | Carry the readable and `application/ld+json` body parts without changing email transport.                                                                                       |
| [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)                                                                                                             | Gives descriptions explicit vocabulary identity while retaining ordinary JSON processing.                                                                                       |
| [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)                                                                                          | Carries authenticated operation requests, result retrieval and status semantics.                                                                                                |
| [Problem Details, RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)                                                                                         | Encodes machine-readable execution failures.                                                                                                                                    |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749)                                                                                                         | Can authorize execution where a service already supports it; MAP does not define or grant credentials.                                                                          |
| [OAuth 2.0 Token Exchange, RFC 8693](https://www.rfc-editor.org/rfc/rfc8693)                                                                                | Names an agent acting for a user through a delegated token's `act` claim; a service can record it as the actor.                                                                 |
| [JWT Access Tokens, RFC 9068](https://www.rfc-editor.org/rfc/rfc9068)                                                                                       | Carry the subject and client identifiers a service records as principal and actor.                                                                                              |
| [Protected Resource Metadata, RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) and [Resource Indicators, RFC 8707](https://www.rfc-editor.org/rfc/rfc8707) | Identify the resource a credential is for and can publish a service's MAP configuration through `map_services`.                                                                 |
| [HTTP Message Signatures, RFC 9421](https://www.rfc-editor.org/rfc/rfc9421)                                                                                 | Lets automated clients identify themselves, as in the [Web Bot Auth](https://datatracker.ietf.org/wg/webbotauth/about/) work; a service may accept it as evidence of the actor. |
| [HTTP conditional requests, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#name-conditional-requests)                                                     | The target digest plays the role of an entity tag, carried in the body because requests go to the execution resource.                                                           |
| [Idempotency-Key header draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)                                                 | Addresses the same retry problem; `requestId` travels in the body to bind the complete request and its recoverable result.                                                      |
| [Schema.org Actions](https://schema.org/docs/actions.html)                                                                                                  | Provides vocabulary that type authors should reuse or map where its semantics match.                                                                                            |

The Structured Email reference remains an Internet-Draft and may change. MAP therefore identifies its exact profile version and media-type treatment. A future Structured Email revision can be assessed without changing the meaning of registered types.

For proposed types, the Registry record should identify existing definitions and explain any additional behaviour MAP requires. Vocabulary similarity does not establish equivalent semantics. In particular, an opinion described by [Schema.org ReviewAction](https://schema.org/ReviewAction) is different from the revision approval defined by Content Review.

## Cross-service testing

The public fixture kit exercises description, request, result, retry and refusal behaviour without a product account. Its reference tests cover completion, feedback, retry, recovery, conflict, refusal, stale targets, expiry, type contracts, approval, pending work, MIME structure, JSON-LD expansion and endpoint trust. Persistent concurrency, crash recovery and deployed provider delivery remain separate implementation evidence.

The first product run will carry a Content Review description through Nitrosend, execute an authenticated operation against the exact revision and retain the result. It will also record a permission or stale-target refusal. This establishes deployed first-party behaviour. A later cross-service test will run the same client logic against a second execution service; only that can support a cross-service interoperability claim.

Two implementations under common ownership can provide useful compatibility evidence. They do not establish independent adoption.

## Registry records

The Registry organises submitted interaction types. Each record identifies its definition, version, status, maintainers, examples and relationship to existing standards.

Implementation evidence is attached to the relevant type version and execution profile. It records the service or client tested, the operations covered and the result. A declaration of support should be distinguishable from a reproduced compatibility test.

Registry inclusion does not grant execution permission. Clients need not consult the Registry during an interaction.

## Current interoperability status

MAP 0.1 publishes a working draft, a canonical Content Review contract and a local reference suite. The next product evidence is one reproducible provider-delivered Content Review exchange through Nitrosend. Cross-service interoperability and an implementation outside the initial common-ownership group remain separate milestones.
