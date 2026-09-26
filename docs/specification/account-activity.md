---
title: Account Activity
description: Confirm or report account activity that a service attributes to you.
navTitle: Account Activity
---

A service reports activity on an account, such as a sign-in from a new device, a changed password or recovery address, or a new API key, and asks whether the account holder recognizes it. A report protects the account at once, and it works through the mailbox for someone who is locked out. Confirming needs the account's own login, because clearing a warning is what an attacker wants.

## Target

The target is the activity the details identify.

| Details member | Meaning                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summary`      | The activity in one sentence.                                                                                                                                                                             |
| `occurredAt`   | When it occurred.                                                                                                                                                                                         |
| `account`      | The account, masked.                                                                                                                                                                                      |
| `eventType`    | Optional: a Shared Signals event type URI from [CAEP](https://openid.net/specs/openid-caep-1_0-final.html) or [RISC](https://openid.net/specs/openid-risc-1_0-final.html), such as `session-established`. |
| `observedFrom` | Optional: where the service observed it, as an IP address, user agent and location.                                                                                                                       |

## Confirm

Confirm takes no input, and the service returns `completed` with `{"recognized": true}`.

A client confirms automatically only on exactly one activity it recorded itself, matching the event type, the time and, where given, the IP address. Otherwise its principal decides.

## Report unrecognized

The input is an optional `note`. The service returns `accepted` with `{"reportRecorded": true}` and takes its protective steps, such as ending sessions, revoking a key or requiring a new password. A report is sent only on the principal's statement. It can only start protective steps and never grants access or changes recovery details.

## Authority and consequences

| Operation           | Authority              | Consequences | Kind     |
| ------------------- | ---------------------- | ------------ | -------- |
| Confirm             | Credential             | Assertion    | Decision |
| Report unrecognized | Credential, possession | Protection   | Decision |

A notice sent with possession authority offers only Report unrecognized. Confirming then happens on the account's security page, after the person signs in.

## Existing standards

- [RFC 8417](https://www.rfc-editor.org/rfc/rfc8417) Security Event Tokens, and the OpenID Shared Signals event types, name the activity.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) requires account notifications to tell the recipient how to repudiate an event. This type makes that a structured operation.

## Contract

- [Contract](/contracts/account-activity-0.1.json)
- [Request schema](/schemas/account-activity-0.1.schema.json)
- [Example description](/fixtures/map-0.2/account-activity/description.json)
