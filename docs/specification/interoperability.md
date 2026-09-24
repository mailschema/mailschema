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
| [Structured Email, draft-ietf-sml-structured-email-06](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06)         | Supplies the model for carrying a machine-readable alternative beside readable email content.          |
| [MIME, RFC 2046](https://www.rfc-editor.org/rfc/rfc2046) and [Internet Message Format, RFC 5322](https://www.rfc-editor.org/rfc/rfc5322) | Carry the readable and `application/ld+json` body parts without changing email transport.              |
| [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)                                                                                          | Gives descriptions explicit vocabulary identity while retaining ordinary JSON processing.              |
| [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)                                                                       | Carries authenticated operation requests, result retrieval and status semantics.                       |
| [Problem Details, RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)                                                                      | Encodes machine-readable execution failures.                                                           |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749)                                                                                      | Can authorize execution where a service already supports it; MAP does not define or grant credentials. |
| [Schema.org Actions](https://schema.org/docs/actions.html)                                                                               | Provides vocabulary that type authors should reuse or map where its semantics match.                   |

The Structured Email reference remains an Internet-Draft and may change. MAP therefore identifies its exact profile version and media-type treatment. A future Structured Email revision can be assessed without changing the meaning of registered types.

For proposed types, the Registry record should identify existing definitions and explain any additional behaviour MAP requires. Vocabulary similarity does not establish equivalent semantics. In particular, an opinion described by [Schema.org ReviewAction](https://schema.org/ReviewAction) is different from the revision approval defined by Content Review.

## Cross-service testing

The public fixture kit exercises description, request, result, retry and refusal behaviour without a product account. Its reference tests cover selected completion, feedback, retry, recovery, conflict, refusal, stale-target, expiry, type, approval, pending and endpoint cases. They do not yet establish complete conformance: representation, authorization, persistent state transitions and recovery require further specification and tests.

The first product compatibility test will apply Content Review to two independently configured action services using the same client review logic. It will exercise feedback, editing through the service's own workflow, approval, stale revisions, permission failures and recovery after a lost response. Sending a description to one action service is an integration test; cross-service compatibility requires a second execution service. The recorded product runs remain outstanding.

Two implementations under common ownership can provide useful compatibility evidence. They do not establish independent adoption.

## Registry records

The Registry organises submitted interaction types. Each record identifies its definition, version, status, maintainers, examples and relationship to existing standards.

Implementation evidence is attached to the relevant type version and execution profile. It records the service or client tested, the operations covered and the result. A declaration of support should be distinguishable from a reproduced compatibility test.

Registry inclusion does not grant execution permission. Clients need not consult the Registry during an interaction.

## Current interoperability status

MAP 0.1 publishes draft message, request, result and Content Review contracts. The current specification and reference implementation still have unresolved representation, authorization, lifecycle and compatibility requirements.

The next work is to resolve those requirements, expand conformance coverage, reproduce the exchange through deployed services and publish the exact run record. An implementation outside the initial common-ownership group is a further step. Published fixtures and passing reference tests do not establish deployed conformance or independent interoperability.
