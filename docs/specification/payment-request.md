---
title: Payment Request
description: Accept or decline a request to pay, such as an emailed invoice.
navTitle: Payment Request
---

A payee asks a payer to pay a stated amount by a due date, usually with an invoice. The description states the payee, account, amount and due date as data. Accepting records the payer's commitment to pay, and the money moves through the payer's own payment route. The [SEPA Request-to-Pay scheme](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2024-11/EPC014-20%20v4.0%20SEPA%20RTP%20Scheme%20Rulebook.pdf) defines the same accept and refuse exchange between payment providers. This type carries it by email to the payer's agent.

## Target

The target is the request at the revision the description names. A change to the payee, the account, the amount or the due date is a new revision.

| Details member                      | Meaning                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `creditorName`                      | The payee.                                                                            |
| `creditorAccount`                   | The payee's account: an IBAN with an optional BIC, or another account identification. |
| `creditorIdentifier`                | Optional: an identifier for the payee.                                                |
| `instructedAmount`                  | The amount, as an ISO 4217 currency and a decimal string.                             |
| `dueDate`                           | The date payment is due.                                                              |
| `remittanceInformationUnstructured` | Optional: the reference the payer includes with the payment.                          |
| `invoice`                           | Optional: the invoice identifier and an HTTPS link to it.                             |

The member names follow [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396)'s payment example, so the payer's platform can seek approval with the same terms through [Action Approval](/specification/action-approval).

## Accept

The input is the `paymentDate`. The service MUST refuse a date after the due date as `invalid-request`, with an error at `/paymentDate`. The service returns `completed` with `{"decision": "accepted"}` and the payment date.

## Decline

The input is an optional `reason`. The service returns `completed` with `{"decision": "declined"}`.

## Authority and consequences

| Operation | Authority  | Consequences | Kind     |
| --------- | ---------- | ------------ | -------- |
| Accept    | Credential | Commitment   | Decision |
| Decline   | Credential | Refusal      | Decision |

Accepting commits the payer's money, so a client needs its principal's approval under the payer's own rules. A client never accepts a request whose account differs from the one on record for the payee until a person has checked it. That change is the commonest invoice fraud.

## Existing standards

- The SEPA Request-to-Pay scheme and its ISO 20022 pain.013 and pain.014 messages define the accept and refuse exchange.
- [Schema.org Invoice](https://schema.org/Invoice) and [Peppol BIS Billing](https://docs.peppol.eu/poacc/billing/3.0/bis/) describe the invoice itself.

## Contract

- [Contract](/contracts/payment-request-0.1.json)
- [Request schema](/schemas/payment-request-0.1.schema.json)
- [Example description](/fixtures/map-0.2/payment-request/description.json)
