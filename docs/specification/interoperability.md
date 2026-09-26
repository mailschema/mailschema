---
title: Interoperability
description: Reusing existing standards and testing an interaction across services.
navTitle: Interoperability
---

MAP lets a client reuse its handling of an interaction type across services. Each service still supplies its own operation, authentication and configuration. Interoperability depends on agreement about both meaning and representation: implementations need compatible requests, results and recovery, not only shared names.

## Existing specifications

MAP 0.2 is a narrow core over existing formats and protocols. Where a mechanism exists, MAP names the slot it fills instead of defining a replacement.

| Work                                                                                                                                                                                                          | Use in MAP                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Structured Email](https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email-06), [MIME](https://www.rfc-editor.org/rfc/rfc2046)                                                                  | Carry the description as a designated partial representation beside readable content.                                        |
| [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/), [Schema.org Actions](https://schema.org/docs/actions.html)                                                                                                   | Give descriptions vocabulary identity. Operations map to `schema:potentialAction`; details are a JSON literal.               |
| [I-JSON, RFC 7493](https://www.rfc-editor.org/rfc/rfc7493), [JCS, RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)                                                                                           | Parse every document strictly, and compute the description, contract and schema digests.                                     |
| [HTTP, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110), [Problem Details, RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)                                                                                 | Carry requests, results and problems. Input errors use the JSON Pointer `errors` shape of RFC 9457's example extension.      |
| [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749), [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693), [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068)                                                   | Authorize credential-mode requests and name the actor that acts for a principal. MAP defines no credentials of its own.      |
| [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728), [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707)                                                                                                        | Identify the resource a credential is for, and publish a service's MAP configuration through `map_services`.                 |
| [HTTP Message Signatures, RFC 9421](https://www.rfc-editor.org/rfc/rfc9421)                                                                                                                                   | Let automated clients identify themselves, where a service accepts it as evidence of the actor.                              |
| [DKIM, RFC 6376](https://www.rfc-editor.org/rfc/rfc6376), [DMARC, RFC 9989](https://www.rfc-editor.org/rfc/rfc9989), [RFC 8601](https://www.rfc-editor.org/rfc/rfc8601)                                       | Authenticate possession-mode messages and find the sender's organizational domain through the DNS tree walk.                 |
| [One-click unsubscribe, RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)                                                                                                                                     | The precedent for authority carried by the message itself: a hard-to-forge URL, no credentials, no redirects, DKIM coverage. |
| [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396), [iCalendar](https://www.rfc-editor.org/rfc/rfc5545), [iTIP](https://www.rfc-editor.org/rfc/rfc5546), [JSCalendar](https://www.rfc-editor.org/rfc/rfc8984) | Type semantics: approval terms, calendar identity, revisions and participation.                                              |
| [MCP elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation), [HTML autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)             | The form fields block that Information Request, Meeting Scheduling and Subscription Preferences share.                       |
| [Shared Signals](https://openid.net/specs/openid-caep-1_0-final.html), [OTP-Token](https://datatracker.ietf.org/doc/draft-goto-otp-token/)                                                                    | Account activity types and codes that travel alongside a confirmation.                                                       |

The Structured Email and OTP-Token references are Internet-Drafts and may change. The HTTP Idempotency-Key draft expired in April 2026; `requestId` covers the same need in the request body, where it also names the result resource.

For each type, the Registry record identifies the existing definitions it reuses and what MAP adds. Similar vocabulary does not establish equivalent semantics. For example, [Schema.org ReviewAction](https://schema.org/ReviewAction) describes an opinion, not the revision approval Content Review defines.

## Cross-service testing

The public [fixture kit](/fixtures/map-0.2/content-review/description.json) and the conformance suite exercise every type without a product account. They cover:

- the core, including description binding, decisions, retries and recovery;
- the approval lifecycle;
- field bindings and type rules;
- possession trust against a set of DKIM-signed genuine and forged messages;
- RFC 8785 vectors that implementations in other languages can reproduce.

Persistent concurrency, crash recovery and deployed delivery remain separate implementation evidence.

Two implementations under common ownership can provide useful compatibility evidence. They do not establish independent adoption.

## Current status

MAP 0.2 publishes a working draft, ten type contracts and a reference suite. Nitrosend has recorded a first-party, provider-delivered Content Review exchange on the withdrawn MAP 0.1. Cross-service interoperability, and an implementation outside the initial common-ownership group, remain separate milestones.
