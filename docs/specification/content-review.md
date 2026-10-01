---
title: Content Review
description: Request changes, approve or decline a specific revision of content.
navTitle: Content Review
---

Content Review defines three operations on a revision of content: request changes, approve and decline. The service owns the content and controls who can review it. Version 0.4 runs on MAP 0.2.

The first example is a campaign test email. The same review model applies to a documentation draft or a company listing, provided the service supports the same operations and results.

## Target

A review identifies the content and its exact revision, so the reviewer can tell which version a decision concerns. The target digest is a service-issued SHA-256 digest of that revision's representation. A client treats it as an opaque state validator unless the service publishes the representation.

| Details member      | Meaning                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `supersedes`        | Optional: the revision and digest this revision replaces.                            |
| `addressesFeedback` | Optional: the service-issued identifiers of recorded feedback this revision answers. |

With both members, an agent that requested changes can confirm that its feedback was addressed before it approves the new revision. When content changes, the new revision needs its own review; an earlier approval does not carry forward.

## Request changes

The input is `feedback`, up to 12,000 characters. The service records it against the revision and returns `accepted` with `feedbackRecorded` and a service-issued `feedbackId`, which a later revision can cite. Feedback is repeatable. Editing the content is a separate operation, under the service's own workflow and permissions.

## Approve

Approve takes no input. The service decides how a caller may take part:

- A caller with no review authority receives `refused`.
- A caller allowed to propose approval receives `approval-required` and the service's `approvalUrl`.
- A caller with decision authority receives `completed` with `{"decision": "approved"}`.

MAP does not infer authority from whether the caller is a person or an agent.

The human decision is a separate authorized act. Another reviewer in the same tenant may decide under the service's team and role rules, and an unauthorized attempt leaves the proposal unchanged. The approval lifecycle is the core's. A proposal ends as `failed` with one of these reasons:

- `declined`: a person declined it;
- `stale-target`: the content changed before the decision;
- `expired`: the interaction expired;
- `superseded`: another decision came first.

The service's content and sending rules still apply at the decision. If they do not permit the approval, the service refuses that attempt and the proposal stays open until it is declined or expires.

Approval records a review decision. Sending, publication and any other operation stay under the service's separate permissions.

## Decline

Decline takes an optional `reason` for the content's author, up to 2,000 characters, and the service returns `completed` with `{"decision": "declined"}`. It decides the interaction: a later approval is refused with `already-decided`, and a proposed approval still awaiting a person ends as `failed` with reason `superseded`. A changed revision is a new interaction, which can be approved.

Declining a revision differs from declining an agent's proposed approval. The first decides the interaction; the second ends that proposal and leaves the revision undecided.

## Authority and consequences

| Operation       | Authority  | Consequences  | Kind       |
| --------------- | ---------- | ------------- | ---------- |
| Request changes | Credential | Record        | Repeatable |
| Approve         | Credential | Authorization | Decision   |
| Decline         | Credential | Refusal       | Decision   |

## Example exchange

1. A service sends a test email for campaign revision 3.
2. A reviewer's agent requests a change, and the service records it as feedback `feedback-7c1d…`.
3. An editor creates revision 4, whose details name revision 3 as superseded and cite that feedback.
4. The agent checks that its feedback is cited and proposes approval. A person approves on the service's page.
5. The service records approval of revision 4.

The [interactive example](/examples) simulates this exchange in the browser, including a caller without permission and a request for an old revision.

## Contract

- [Contract](/contracts/content-review-0.4.json)
- [Request schema](/schemas/content-review-0.4.schema.json)
- [Example description](/fixtures/map-0.2/content-review/description.json)
- [Example message](/fixtures/map-0.2/emails/content-review.eml)
