---
title: Action Approval
description: Approve or decline a proposed action on the exact terms shown.
navTitle: Action Approval
---

A service holds an action that needs a decision before it runs: a purchase, a payment, a refund, an access grant or a deployment. Action Approval carries the exact terms in the description. The request that decides them carries the description digest, so an approval applies only to the terms the decider saw.

A revision of content uses [Content Review](/specification/content-review) instead. Action Approval is for terms that define an effect.

## Target

The target is the proposed action at the revision the description names. A changed amount, recipient or scope is a new revision and therefore a new interaction.

| Details member         | Meaning                                                                                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summary`              | The proposal in one or two sentences.                                                                                                                                                                                                                                       |
| `requester`            | Optional: who proposed the action, with an optional HTTPS identifier.                                                                                                                                                                                                       |
| `authorizationDetails` | One to twenty terms in the [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396) `authorization_details` structure. Each has a `type`, and may have `actions`, `locations`, `identifier`, `datatypes`, `privileges` and type-specific members, each named as a details member. |

RFC 9396 leaves each `type` to its deployment and recommends a collision-resistant value, such as a URI the service controls. Amounts travel as strings, so the details stay integer-only.

## Approve

Approve takes no input, because the terms are part of the bound description. A caller with decision authority receives `completed` with `{"decision": "approved"}`. A caller that may only propose receives `approval-required` and the service's `approvalUrl`, and a person decides there.

A proposal ends as `failed` with one of these reasons:

- `declined`: a person declined it;
- `stale-target`: the terms changed before the decision;
- `expired`: the interaction expired;
- `superseded`: another request decided the interaction first;
- `withdrawn`: the requester withdrew it.

Recording an approval does not report the action's own outcome. A payment that later fails is reported through the service's normal records.

## Decline

Decline takes an optional `reason` for the requester, and the service returns `completed` with `{"decision": "declined"}`. The service does not run the action.

## Authority and consequences

| Operation | Authority  | Consequences                          | Kind     |
| --------- | ---------- | ------------------------------------- | -------- |
| Approve   | Credential | Authorization, commitment, disclosure | Decision |
| Decline   | Credential | Refusal                               | Decision |

The service applies its own rules, such as spending limits, separation of duties and who may grant access. It applies them when the request arrives and again when a person decides. The requester of an action cannot approve their own proposal unless those rules allow it. An approval grants no standing permission.

## Client rule

A client never approves automatically when any authorization detail has a `type` it does not understand. It approves only within limits its principal set, and otherwise proposes approval or leaves the decision to its principal. When it asks a person, it shows the details, not the readable body.

## Existing standards

- [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396) defines the terms structure.
- [OpenID Connect CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html) is a way for a service with an OAuth server to collect the person's decision on another device.
- The [AI Identity Management System draft](https://datatracker.ietf.org/doc/draft-ietf-wimse-aims/) notes that a decision raised in the middle of a task is not yet covered by existing standards.

## Contract

- [Contract](/contracts/action-approval-0.1.json)
- [Request schema](/schemas/action-approval-0.1.schema.json)
- [Example description](/fixtures/map-0.2/action-approval/description.json)
