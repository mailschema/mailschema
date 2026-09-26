---
title: Information Request
description: Supply specified information in response to a service’s request.
navTitle: Information Request
---

A service asks for a defined set of information, such as a company's support address, a delivery instruction or the answers to a short questionnaire. The fields travel in the description, and each can name the kind of information it holds. A client can then apply its principal's disclosure rules field by field.

## Target

The target is the request at the revision the description names.

| Details member | Meaning                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purpose`      | Why the service is asking.                                                                                                                                                |
| `fields`       | The fields, in the [form fields block](/schemas/forms-0.1.schema.json): text, number, true or false, single choice and multiple choice, with titles, limits and defaults. |

The form block is a closed, flat subset of JSON Schema based on [Model Context Protocol elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation). It has no patterns, references or conditions.

A field may carry an `autocomplete` value, an [HTML autofill field name](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill) such as `organization`, `work email` or `street-address`. The names for passwords, one-time codes and payment card data are not valid.

## Submit response

The input is `values`. It must contain only the defined fields and satisfy them, including required fields and formats, which both client and service check. The service returns `accepted` with `{"responseRecorded": true}`. Each failing value is reported in an `invalid-request` problem, with a JSON Pointer such as `/values/supportEmail`.

A client never supplies a password, one-time code, access token or payment card number through a form, whatever a field is called. The service sends a person to its own page for those.

## Decline

Decline takes an optional `reason`, and the service returns `completed` with `{"decision": "declined"}`. The service records that no response will follow.

## Authority and consequences

| Operation       | Authority              | Consequences | Kind     |
| --------------- | ---------------------- | ------------ | -------- |
| Submit response | Credential, possession | Disclosure   | Decision |
| Decline         | Credential, possession | Refusal      | Decision |

Submitting discloses the principal's information. With possession authority, a client therefore needs a prior relationship with the sending organization or its principal's decision. Declining needs neither. Supplying information does not approve a separate business operation.

## Existing standards

- [Model Context Protocol elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) is the source of the field schema, its accept and decline meaning, and its rule against asking for secrets through a form.
- [HTML autofill field names](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill) name each kind of information.
- [OpenID for Verifiable Presentations](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) proves claims. Information Request collects values and proves nothing about them.

## Contract

- [Contract](/contracts/information-request-0.1.json)
- [Request schema](/schemas/information-request-0.1.schema.json)
- [Example description](/fixtures/map-0.2/information-request/description.json)
