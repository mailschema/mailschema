---
title: Email Confirmation
description: Confirm that you control an address to complete something you started, or report that you did not start it.
navTitle: Email Confirmation
---

A service needs proof that the recipient controls an address before it creates an account, completes a sign-in, changes an account's address or adds the address to a list. The message itself is the authority, as in [one-click unsubscribe](https://www.rfc-editor.org/rfc/rfc8058). That is exactly how an agent reading a mailbox can be led to confirm a request someone else made with its address. This type therefore confirms only a request the client can match to one it made, and lets it report a request it did not make.

## Target

The target is the pending request the details identify.

| Details member | Meaning                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `origin`       | The HTTPS origin that made the request.                                                         |
| `address`      | The address being confirmed.                                                                    |
| `purpose`      | What confirmation completes: `account-creation`, `sign-in`, `address-change` or `subscription`. |
| `requestedAt`  | When the request was made.                                                                      |

## Confirm

Confirm takes no input, and the service returns `completed` with `{"confirmed": true}`.

A client confirms automatically only when all of the following hold:

1. It holds exactly one pending request that it recorded itself before the message's Date.
2. That request has the same origin, and the origin's host is under the sender's organizational domain.
3. It has the same address, compared exactly.
4. It has the same purpose.
5. The interaction has not expired.

For a sign-in or an address change, the address must also be unique to that request, such as a per-request subaddress. In every other case, the decision goes to the principal.

## Report unrecognized

The input is an optional `note`. The service cancels the pending request and returns `completed` with `{"cancelled": true}`. A report never reveals whether an account exists.

## Authority and consequences

| Operation           | Authority  | Consequences | Kind     |
| ------------------- | ---------- | ------------ | -------- |
| Confirm             | Possession | Assertion    | Decision |
| Report unrecognized | Possession | Protection   | Decision |

The client first establishes possession trust as the [profile](/specification/profile#possession-authority) requires. That means verifying the aligned DKIM signature, checking that every link sits under the sender's organizational domain, and checking that the capability was issued to its principal's address. A lookalike domain can pass those checks, but it cannot satisfy the recorded-request rule.

## Codes

Where a service confirms with a code instead, the code travels in the [OTP-Token header](https://datatracker.ietf.org/doc/draft-goto-otp-token/), bound to its origin, never in the description. A message offers either a code or the confirm operation, never both. A code email may offer Report unrecognized alone.

## Existing standards

- [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058) is the precedent for a request authorized by the message alone.
- The [wrong-recipient report draft](https://datatracker.ietf.org/doc/draft-ietf-mailmaint-wrong-recipient/) is the precedent for a one-click report that something was not meant for the recipient.
- Where the [Email Verification Protocol](https://datatracker.ietf.org/doc/draft-hardt-email-verification/) is available, a service can verify control without sending an email at all.

## Contract

- [Contract](/contracts/email-confirmation-0.1.json)
- [Request schema](/schemas/email-confirmation-0.1.schema.json)
- [Signed example message](/fixtures/map-0.2/emails/email-confirmation.eml)
