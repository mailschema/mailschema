---
title: Authorization
description: How services apply permissions to MAP requests.
navTitle: Authorization
---

MAP uses the service's existing authentication and permissions. A description tells a client which actions are offered. The service decides whether a caller may perform a requested action.

## Identity and permission

Sender identity, email authentication and permission to perform an operation serve different purposes. An authenticated email domain can help establish where a message came from. Permission to edit content, approve a revision or send a campaign comes from the service.

Receiving or forwarding the message does not transfer those permissions. Knowledge of an interaction identifier is also insufficient.

The initial profile introduces no new identity provider or mandatory DNS record. Implementations use the service's authentication and applicable authorization standards.

## Execution checks

Before applying an effect, the service checks:

- The authenticated caller.
- The requested operation and target, including the revision where required.
- Any applicable expiry or revocation.
- Any additional approval required by the service.

The checks use the permissions and state that apply when the request is executed. Earlier discovery of an action does not replace them.

## Human approval

An approval must identify the action and, where applicable, the content revision being approved. The person making the decision should receive enough context to understand its effect.

A changed revision or materially changed action requires a new decision according to the service's policy. While approval is pending, the client reports the work as awaiting approval.

## Sending email

The sending service enforces recipient restrictions, content rules, attachment controls, limits and approval requirements on the send operation.

Content Review defines feedback and review approval. A recorded approval does not grant permission to send the content or replace the sending service's checks.

## Incoming content

Clients treat message text, action descriptions and remote references as untrusted input. A message cannot change the client's instructions, disclose credentials or extend its permissions.

The receiving system controls model processing, external fetches and disclosure of information. Receipt of a message does not itself authorise those activities.

## Refusal

When a request is refused, the service reports that result. The client preserves the distinction between refusal, pending approval, completion and an execution state it cannot determine.
