---
title: Interoperability
description: Reusing existing standards and testing an interaction across services.
navTitle: Interoperability
---

MAP is intended to let a client reuse its handling of an interaction type across services. Each service still supplies its own operation, authentication and configuration.

Interoperability depends on agreement about both meaning and representation. Shared names alone are insufficient; implementations need compatible request, result and recovery behaviour.

## Existing specifications

MAP 0.1 selects a narrow profile over existing formats and protocols.

| Work                                                                                                                                     | Use in MAP                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Structured Email, draft-ietf-sml-structured-email-06](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06)         | Supplies the MIME designation and partial-representation model used to carry a MAP description.        |
| [MIME, RFC 2046](https://www.rfc-editor.org/rfc/rfc2046) and [Internet Message Format, RFC 5322](https://www.rfc-editor.org/rfc/rfc5322) | Carry the readable and `application/ld+json` body parts without changing email transport.              |
| [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)                                                                                          | Gives descriptions explicit vocabulary identity while retaining ordinary JSON processing.              |
| [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)                                                                       | Carries authenticated operation requests, result retrieval and status semantics.                       |
| [Problem Details, RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)                                                                      | Encodes machine-readable execution failures.                                                           |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749)                                                                                      | Can authorize execution where a service already supports it; MAP does not define or grant credentials. |
| [Schema.org Actions](https://schema.org/docs/actions.html)                                                                               | Provides vocabulary that type authors should reuse or map where its semantics match.                   |

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
