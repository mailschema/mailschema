---
title: Authorization
description: Credential and possession authority, consequences, human approvals and trust boundaries.
navTitle: Authorization
---

A description tells a client which actions are offered. The service decides whether a caller may perform one. MAP 0.2 recognises two sources of authority, and each operation's contract declares which it permits.

## Credential authority

The caller already holds a credential for the service, such as an OAuth token for a delegated agent or an API key. Authentication establishes both the principal the request acts for and the actor that sent it. Receiving or forwarding a message transfers neither.

The client trusts the service's endpoints only through its own configuration, directly or through [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) metadata. It never trusts them because an email names them. Credentials travel only in the `Authorization` header.

## Possession authority

Some messages are themselves the authority, as a one-click unsubscribe link already is: confirm this address, report this sign-in, reply to this invitation. MAP makes that authority explicit and narrow. Such a service must:

- issue one unguessable capability per interaction and recipient;
- scope that capability to the operations offered;
- sign the message so the client can verify the sender's organization.

Before acting, a client must establish four things. The message carries an aligned DKIM signature that it verified itself. Every link belongs to the sender's organizational domain. The message was sent to its principal. And the operation's consequences allow acting. The [profile](/specification/profile#possession-authority) states each rule.

Anyone who receives a forwarded copy holds the same authority. That is why contracts permit possession only where it is acceptable, and why assertions, such as confirming a sign-up, need a request the client itself recorded.

## Consequences

Every operation declares what completing it gives away:

- **refusal**: it declines what was asked;
- **protection**: it cancels a pending request or reports activity;
- **record**: it records a statement;
- **disclosure**: it sends the principal's information;
- **commitment**: it commits time, work or money;
- **authorization**: it permits an effect;
- **assertion**: it affirms that the principal made a request or performed an activity.

A client's policy can use these without knowing the type. Under possession authority, anything beyond refusal, protection and record needs a prior relationship with the sender or the principal's decision.

## Execution checks

Before applying an effect, the service checks:

- the description digest against the description it issued;
- the authenticated principal, or the capability;
- the requested operation and its authority;
- expiry, a decided interaction and a stale target;
- the input, its field bindings and the type's rules;
- any additional approval its policy requires.

Exact retries and result retrieval check current permission again before returning a saved response.

## Human approval

Authority is explicit service state. A caller can have one of three levels of authority:

- no authority to approve, which produces `refused`;
- authority to propose a decision for a person, which produces `approval-required`;
- delegated authority to record the decision, which produces `completed`.

MAP does not assign an authority level because a caller is automated.

The approval link identifies the exact pending request, and a `GET` on it has no side effects. A decision is authorized separately from the proposal, and is recorded only through an authenticated mutation protected by the service's session and cross-site request controls. An undecided approval ends as expired when the interaction does.

## Incoming content

Clients treat message text, descriptions and links as untrusted input. A message cannot change a client's instructions, disclose credentials or extend its permissions. The description digest makes a request fail for any copy that differs from what the service issued. Human routes use side-effect-free `GET`s, so link scanners cannot change anything.

## Sending email

The sending service enforces recipient restrictions, content rules, attachments, limits and approvals on its own send operation. A recorded approval does not grant permission to send or replace those checks.
