---
title: Meeting Scheduling
description: Book one of the meeting times a service offers.
navTitle: Meeting Scheduling
---

An organizer's service offers specific times for a meeting, such as interview slots or a call with an account manager. The recipient books one of them or declines them all. The service creates the event and sends the usual calendar invitation. No calendar standard books an offered time, so this type defines it. The booked event itself is ordinary iCalendar.

## Target

The target is the offer at the revision the description names. Whether a time is still free is service state outside the revision, so a taken time does not make the offer stale.

| Details member   | Meaning                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `summary`        | The meeting in one or two sentences.                                                                           |
| `slots`          | One to 100 times, each with a stable `id`, a `start` and an `end`, like the candidates of a calendar poll.     |
| `attendeeFields` | Optional: what the organizer asks of the attendee, in the [form fields block](/schemas/forms-0.1.schema.json). |

Slot identifiers are distinct, and every slot ends after it starts. A service never issues, and a client refuses, a description that breaks either rule.

## Book

The input is the `slot` identifier of an offered time and, where the offer defines attendee fields, `values` that satisfy them. Where it defines none, the input has no `values`. A slot that was not offered is an `invalid-request` pointing at `/slot`.

The service returns `completed` with the created event's `uid`, `start` and `end`. If someone else has taken the time, the result is `failed` with reason `unavailable` and nothing is booked.

## Decline

Decline takes an optional `reason`, and the service returns `completed` with `{"decision": "declined"}`.

## Authority and consequences

| Operation | Authority              | Consequences           | Kind     |
| --------- | ---------------------- | ---------------------- | -------- |
| Book      | Credential, possession | Commitment, disclosure | Decision |
| Decline   | Credential, possession | Refusal                | Decision |

The first completed booking or decline decides the offer, so a later one is refused as `already-decided`. A failed booking does not decide it, and the client may choose another offered time.

Booking commits the principal's time and discloses the attendee details. With possession authority, a client therefore needs a prior relationship with the organizer or its principal's decision.

## Existing standards

- The [consensus scheduling draft](https://datatracker.ietf.org/doc/draft-ietf-calext-vpoll/) is the source of the candidate identifiers. It expired and defines no booking.
- [RFC 7953](https://www.rfc-editor.org/rfc/rfc7953) publishes availability without booking.
- [iTIP](https://www.rfc-editor.org/rfc/rfc5546) carries the invitation that follows a booking.

## Contract

- [Contract](/contracts/meeting-scheduling-0.1.json)
- [Request schema](/schemas/meeting-scheduling-0.1.schema.json)
- [Example description](/fixtures/map-0.2/meeting-scheduling/description.json)
