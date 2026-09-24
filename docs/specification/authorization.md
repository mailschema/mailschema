---
title: Authorization
description: How services apply permissions to MAP requests.
navTitle: Authorization
---

MAP uses the service's existing authentication and permissions. A description tells a client which actions are offered. The service decides whether a caller may perform a requested action.

## Identity and permission

Sender identity, email authentication and permission to perform an operation serve different purposes. An authenticated email domain can help establish where a message came from. Permission to edit content, approve a revision or send a campaign comes from the service.

Receiving or forwarding the message does not transfer those permissions. Knowledge of an interaction identifier is also insufficient.

The initial profile introduces no new identity provider or mandatory DNS record. Implementations use the service's authentication and applicable authorization standards. That authentication establishes both the principal a request acts for and the actor that sent it, such as an agent acting for a user through a delegated OAuth token; the [profile](/specification/profile/#principal-and-actor) describes how services record each.

## Execution checks

Before applying an effect, the service checks:

- The authenticated caller and tenant established outside the MAP body.
- The interaction resolved from authoritative service state.
- The requested operation and target, including the revision where required.
- Any applicable expiry or revocation.
- Any additional approval required by the service.

The checks use the permissions and state that apply when the request is executed. Earlier discovery of an action does not replace them.

Exact retries and result retrieval check current permission again before returning a saved response. Revoking permission does not repeat or undo an effect, but it can prevent the former caller from reading the retained result. Request identifiers are isolated between tenants and cannot be used by a different principal to retrieve another caller's result.

## Human approval

An approval must identify the action and, where applicable, the content revision being approved. The person making the decision should receive enough context to understand its effect.

A changed revision or materially changed action requires a new decision according to the service's policy. While approval is pending, the client reports the work as awaiting approval.

Authority is explicit service state. A caller can have no authority to approve, authority to propose a decision for human review, or delegated authority to record the decision. Those levels produce `refused`, `approval-required` or `completed` respectively. MAP does not assign an authority level merely because the caller is automated.

An approval route identifies the exact pending request, operation and target revision. Its `GET` representation is side-effect free; the service records a decision only through an authenticated mutation protected by its normal session and cross-site request controls.

## Sending email

The sending service enforces recipient restrictions, content rules, attachment controls, limits and approval requirements on the send operation.

Content Review defines feedback and review approval. A recorded approval does not grant permission to send the content or replace the sending service's checks.

## Incoming content

Clients treat message text, action descriptions and remote references as untrusted input. A message cannot change the client's instructions, disclose credentials or extend its permissions.

The receiving system controls model processing, external fetches and disclosure of information. Receipt of a message does not itself authorise those activities.

Human links use side-effect-free `GET` routes. Link previews and security scanners cannot approve, send or otherwise mutate the target. A human decision is submitted separately with normal CSRF and session protections.

## Refusal

When a recognized request from an authenticated caller is refused, the service records that terminal problem under the request identifier. The client preserves the distinction between refusal, pending approval, completion and an execution state it cannot determine.
