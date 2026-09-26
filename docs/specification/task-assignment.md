---
title: Task Assignment
description: Accept assigned work and report its progress or completion.
navTitle: Task Assignment
---

A service assigns work to a person or agent, who accepts or declines it and reports progress and completion. The assignment is an iCalendar to-do carried in the same message, as [iTIP](https://www.rfc-editor.org/rfc/rfc5546#section-3.4) assigns it. This binding lets the assignee answer and report through the service with recorded results.

## Target

| Member                           | Meaning                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| `details.task.uid`               | The to-do's iCalendar UID.                                                  |
| `details.summary`                | The work in one or two sentences.                                           |
| `details.due`                    | Optional: when the work is due.                                             |
| `details.completionRequirements` | Optional: what a completion report must show.                               |
| `target.revision`                | The to-do's SEQUENCE.                                                       |
| `target.digest`                  | The SHA-256 of the decoded bytes of the message's one `text/calendar` part. |

The message MUST carry the to-do as an iCalendar REQUEST in exactly one `text/calendar` part anywhere in the message outside an attached message, such as inside `multipart/alternative` as iMIP places it. Before acting, the client MUST check that the SHA-256 of that part's decoded bytes is `target.digest`, and that it contains exactly one to-do with the described UID, whose SEQUENCE is `target.revision`.

An update to a changed or cancelled assignment is refused as `stale-target`.

## Accept

The input is an optional `comment`. The service returns `completed` with `{"participationStatus": "accepted"}`.

## Decline

The input is an optional `reason`. The service returns `completed` with `{"participationStatus": "declined"}`.

## Report progress

The input is `percentComplete`, an integer from 0 to 100 as in iCalendar's PERCENT-COMPLETE, and an optional `note`. The service returns `accepted` with `{"progressRecorded": true}`.

## Report completion

The input is a `report` and up to 20 HTTPS links to `evidence`. The service returns `accepted` with `{"completionRecorded": true}`. Whether the work is verified is the service's own decision, and it may ask for more.

## Authority and consequences

| Operation         | Authority  | Consequences | Kind       |
| ----------------- | ---------- | ------------ | ---------- |
| Accept            | Credential | Commitment   | Decision   |
| Decline           | Credential | Refusal      | Decision   |
| Report progress   | Credential | Record       | Repeatable |
| Report completion | Credential | Assertion    | Repeatable |

A completion report is an assertion the service may pay or credit on, so a client sends one only for work actually done. Accepting grants no access to the resources the work needs.

## Existing standards

- [iCalendar](https://www.rfc-editor.org/rfc/rfc5545) and [iTIP section 3.4](https://www.rfc-editor.org/rfc/rfc5546#section-3.4) define to-dos, their assignment and progress.
- [A2A](https://a2a-protocol.org/latest/specification/) and [MCP tasks](https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/tasks) define task states between software. This binding does not add another set.

## Contract

- [Contract](/contracts/task-assignment-0.1.json)
- [Request schema](/schemas/task-assignment-0.1.schema.json)
- [Example assignment](/fixtures/map-0.2/task-assignment/assignment.ics)
