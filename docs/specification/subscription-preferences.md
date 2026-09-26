---
title: Subscription Preferences
description: Choose which emails a service sends and how often.
navTitle: Subscription Preferences
---

A recipient changes the email a service sends: which topics, how often, or a pause. Leaving the list stays with [one-click unsubscribe](https://www.rfc-editor.org/rfc/rfc8058) from the message headers. This type covers the choices between staying and leaving. It concerns email preferences, not paid subscriptions.

## Target

The target is the recipient's subscription at the revision the description names. The revision changes when the offered settings change.

| Details member | Meaning                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `listId`       | Optional: the list's [RFC 2919](https://www.rfc-editor.org/rfc/rfc2919) List-Id value. When present, it equals the message's List-Id header.                                               |
| `fields`       | The offered settings as choice fields in the [form fields block](/schemas/forms-0.1.schema.json): true or false, single choice and multiple choice. The current settings are the defaults. |

## Update preferences

The input is `values` for offered settings only. Omitted settings stay as they are. An option that is not offered is reported as `invalid-request`, and nothing is replaced silently. The service returns `completed` with `effectiveAt`, the time the settings apply.

## Authority and consequences

| Operation          | Authority              | Consequences | Kind       |
| ------------------ | ---------------------- | ------------ | ---------- |
| Update preferences | Credential, possession | Record       | Repeatable |

A change records the recipient's own choices and discloses nothing beyond them, so it needs no further relationship under possession authority. Settings can change again until the interaction expires.

## Existing standards

- [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058) for leaving the list.
- [RFC 2369](https://www.rfc-editor.org/rfc/rfc2369) for the list's header fields.
- The [M3AAWG sender practices](https://www.m3aawg.org/sites/default/files/doc_files/m3aawg-sender-best-common-practices-aug-27-2026.pdf) for confirmed opt-in.

## Contract

- [Contract](/contracts/subscription-preferences-0.1.json)
- [Request schema](/schemas/subscription-preferences-0.1.schema.json)
- [Example description](/fixtures/map-0.2/subscription-preferences/description.json)
