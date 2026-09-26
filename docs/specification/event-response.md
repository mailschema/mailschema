---
title: Event Response
description: Tell an organizer whether an invitee expects to attend.
navTitle: Event Response
---

An invitation asks whether the recipient will attend an event or one occurrence of it. [iCalendar](https://www.rfc-editor.org/rfc/rfc5545) and [iTIP](https://www.rfc-editor.org/rfc/rfc5546) already define the invitation and the reply. This binding carries the iTIP invitation in the same message and lets a client reply through the organizer's service with a recorded result, rather than by an unsigned email reply. The event identity, revision rules and response values stay iTIP's own.

## Target

| Member                       | Meaning                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `details.event.uid`          | The iCalendar UID.                                                                               |
| `details.event.recurrenceId` | Optional: the RECURRENCE-ID of one occurrence, as a UTC date-time or a date, never with a range. |
| `details.attendee`           | The invitee's `mailto:` calendar address.                                                        |
| `target.revision`            | The invitation's SEQUENCE.                                                                       |
| `target.digest`              | The SHA-256 of the decoded bytes of the message's one `text/calendar` part.                      |

The message MUST carry the invitation as an iMIP REQUEST in exactly one `text/calendar` part anywhere in the message outside an attached message, such as inside `multipart/alternative` as iMIP places it. Before replying, the client MUST check that the SHA-256 of that part's decoded bytes is `target.digest`, and that it contains exactly one event with the described UID and RECURRENCE-ID, never a range, whose SEQUENCE is `target.revision` and which invites `details.attendee`. It reads the event's time and place from that part.

## Accept

The input is an optional `comment` for the organizer. The service returns `completed` with `{"participationStatus": "accepted"}`, which is iCalendar's ACCEPTED in [JSCalendar](https://www.rfc-editor.org/rfc/rfc8984)'s form.

## Decline

The input is an optional `comment`. The service returns `completed` with `{"participationStatus": "declined"}`.

## Respond tentatively

The input is an optional `comment`. The service returns `completed` with `{"participationStatus": "tentative"}`.

## Authority and consequences

| Operation           | Authority              | Consequences | Kind       |
| ------------------- | ---------------------- | ------------ | ---------- |
| Accept              | Credential, possession | Commitment   | Repeatable |
| Decline             | Credential, possession | Refusal      | Repeatable |
| Respond tentatively | Credential, possession | Commitment   | Repeatable |

Replies can change until the invitation expires, and the latest stands, as in iTIP. A reply to an outdated SEQUENCE is refused as `stale-target`, which iTIP leaves optional. The client reads the update before answering again.

Accepting commits the invitee's time. With possession authority, a client therefore needs a prior relationship with the organizer or its principal's decision. A client that replies this way does not also send an iTIP REPLY.

## Contract

- [Contract](/contracts/event-response-0.1.json)
- [Request schema](/schemas/event-response-0.1.schema.json)
- [Signed example message](/fixtures/map-0.2/emails/event-response.eml)
