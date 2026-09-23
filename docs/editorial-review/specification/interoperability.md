---
title: Interoperability
description: Reusing existing standards and testing an interaction across services.
navTitle: Interoperability
---

MAP is intended to let a client reuse its handling of an interaction type across services. Each service still supplies its own operation, authentication and configuration.

Interoperability depends on agreement about both meaning and representation. Shared names alone are insufficient; implementations need compatible request, result and recovery behaviour.

## Existing specifications

The representation profile should reuse existing standards where they meet its requirements.

| Work                                                                                                                             | Relevance                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Structured Email, draft-ietf-sml-structured-email-06](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06) | A proposed way to carry a machine-readable version of email content.       |
| [Schema.org Actions](https://schema.org/docs/actions.html)                                                                       | Vocabulary for actions, inputs, results and execution entry points.        |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749)                                                                              | Delegated authorization where supported by the service.                    |
| [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html)                                                          | Authentication and identity information where needed by an implementation. |

These references identify work to evaluate. The current MAP draft does not yet select a representation or declare a complete binding to these specifications. The Structured Email reference is an Internet-Draft and may change.

For proposed types, the Registry record should identify existing definitions and explain any additional behaviour MAP requires. Vocabulary similarity does not establish equivalent semantics. In particular, an opinion described by [Schema.org ReviewAction](https://schema.org/ReviewAction) is different from the revision approval defined by Content Review.

## Cross-service testing

The first compatibility test will apply Content Review to two independently configured services using the same client review logic. The test should exercise feedback, editing through the service's own workflow, approval, stale revisions, permission failures and recovery after a lost response.

Two implementations under common ownership can provide useful compatibility evidence. They do not establish independent adoption.

## Registry records

The Registry organises submitted interaction types. Each record identifies its definition, version, status, maintainers, examples and relationship to existing standards.

Implementation evidence is attached to the relevant type version and execution profile. It records the service or client tested, the operations covered and the result. A declaration of support should be distinguishable from a reproduced compatibility test.

Registry inclusion does not grant execution permission. Clients need not consult the Registry during an interaction.

## Remaining profile work

Before implementations can claim conformance to a stable MAP release, the profile needs:

- A selected message representation and media type treatment.
- Request and result encodings.
- Authentication bindings.
- Request correlation, duplicate handling and recovery rules.
- Type and profile version handling, including unsupported versions.
- Conformance tests for the profile and each type.

The semantic draft and local browser example provide material for this work. They do not establish wire compatibility.
