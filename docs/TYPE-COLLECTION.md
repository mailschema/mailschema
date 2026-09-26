# Interaction type collection

Design record, 25 September 2026. It explains which interaction types the Registry holds, why each exists, which standards each reuses and how the MAP 0.2 core carries them. The records in [`registry/types/`](../registry/types/) and the contracts in [`public/contracts/`](../public/contracts/) are the source of truth; this document is their rationale. Every standard cited was checked at its link on this date.

## The problem

Email is where services, businesses and people ask for things to be done: approve this, confirm your address, pick a time, answer these questions, was this you. An agent reading a mailbox today faces four problems:

- it has to infer the request from prose;
- it cannot tell what completing the request would commit its principal to;
- it follows links whose authority it cannot see;
- it gets back a web page instead of a result.

An agent that follows a confirmation link in a message it did not ask for has confirmed someone else's request.

MAP 0.2 is the core that fixes execution for all of these. A description names an exact target and the type's details, and a request binds that exact description by its digest. Execution uses either the service's existing credential or, where the message itself is the authority, a narrow capability. The result is recorded and recoverable. Types supply the meaning. A client that implements a type once can handle the same interaction from every service that offers it, and apply its principal's rules before acting.

## When a type exists

1. **A type is a distinct obligation for the client, not a business noun.** Approving a purchase, a refund and an access grant are one type, Action Approval. Invoices, orders and expense reports are not separate types.
2. **Each operation declares its consequences.** A client's policy keys on them: `refusal`, `protection`, `record`, `disclosure`, `commitment`, `authorization` or `assertion`.
3. **The owning standard keeps its semantics.** Where a standard defines identity, revisions and values, the type binds to them. MAP adds only what the standard lacks for an agent: the description in the email, the digest binding, authenticated or capability execution, a recorded result and the human route.
4. **An operation identifier means the same thing in every type.**
5. **Notifications are data, not interactions.** Receipts, shipping updates and reservations use [schema.org](https://schema.org/docs/actions.html) vocabulary carried by [Structured Email](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/), and the Registry does not duplicate them.
6. **Receiving a message grants nothing, except where a contract permits possession authority.** Even then it authorizes one narrow effect, for a recipient the client's principal controls.

## The collection

All ten types are drafts on MAP 0.2.

| Type                                                                                 | Version | Authority                               | Reuses                                                                                                                                                                                                                                                                   | MAP adds                                                                                      |
| ------------------------------------------------------------------------------------ | ------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [Content Review](https://mailschema.org/registry/content-review)                     | 0.3     | Credential                              | [Schema.org Actions](https://schema.org/docs/actions.html) for vocabulary                                                                                                                                                                                                | Revision binding, feedback references, supervised approval                                    |
| [Action Approval](https://mailschema.org/registry/action-approval)                   | 0.1     | Credential                              | [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396) terms; [CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html) for a decoupled decision                                                                                     | Terms bound by the description digest; agent proposes, human decides                          |
| [Information Request](https://mailschema.org/registry/information-request)           | 0.1     | Credential, possession                  | [MCP elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) field schema; [HTML autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill) names                                                     | Field bindings, per-field errors, a recorded decline                                          |
| [Event Response](https://mailschema.org/registry/event-response)                     | 0.1     | Credential, possession                  | [iCalendar](https://www.rfc-editor.org/rfc/rfc5545#section-3.2.12), [iTIP](https://www.rfc-editor.org/rfc/rfc5546), [JSCalendar](https://www.rfc-editor.org/rfc/rfc8984)                                                                                                 | An authenticated reply bound to the carried invitation; stale revisions refused               |
| [Meeting Scheduling](https://mailschema.org/registry/meeting-scheduling)             | 0.1     | Credential, possession                  | [VPOLL](https://datatracker.ietf.org/doc/draft-ietf-calext-vpoll/) candidate identifiers; iCalendar for the booked event                                                                                                                                                 | Booking an exact offered time, with unavailability and decisions defined                      |
| [Subscription Preferences](https://mailschema.org/registry/subscription-preferences) | 0.1     | Credential, possession                  | [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058) for leaving; [RFC 2369](https://www.rfc-editor.org/rfc/rfc2369) and [RFC 2919](https://www.rfc-editor.org/rfc/rfc2919)                                                                                                | Choice fields for the settings between staying and leaving                                    |
| [Task Assignment](https://mailschema.org/registry/task-assignment)                   | 0.1     | Credential                              | iCalendar to-dos and [iTIP section 3.4](https://www.rfc-editor.org/rfc/rfc5546#section-3.4); [A2A](https://a2a-protocol.org/latest/specification/) and [MCP](https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/tasks) task states as related work | Authenticated execution and recorded results for assignment, progress and completion          |
| [Payment Request](https://mailschema.org/registry/payment-request)                   | 0.1     | Credential                              | [SEPA Request-to-Pay](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2024-11/EPC014-20%20v4.0%20SEPA%20RTP%20Scheme%20Rulebook.pdf) responses; RFC 9396 payment names; [schema.org Invoice](https://schema.org/Invoice)                              | The request to pay as bound data; account changes become new revisions                        |
| [Email Confirmation](https://mailschema.org/registry/email-confirmation)             | 0.1     | Possession                              | RFC 8058's request shape; [OTP-Token](https://datatracker.ietf.org/doc/draft-goto-otp-token/) for codes; [wrong-recipient report](https://datatracker.ietf.org/doc/draft-ietf-mailmaint-wrong-recipient/) as precedent                                                   | Confirming only a request the client recorded; a structured report of an unrecognized request |
| [Account Activity](https://mailschema.org/registry/account-activity)                 | 0.1     | Credential to confirm; either to report | [RFC 8417](https://www.rfc-editor.org/rfc/rfc8417) events; [CAEP](https://openid.net/specs/openid-caep-1_0-final.html) and [RISC](https://openid.net/specs/openid-risc-1_0-final.html) types                                                                             | A structured answer to "was this you"; reports can only protect                               |

Content Review and Action Approval are both decisions, but on different targets: a revision of content, with a feedback loop, against a set of terms that define an effect. Email Confirmation and Account Activity share operation names but not risk. Confirming a pending request creates something, while confirming past activity only clears a warning, which is why Account Activity confirms only with a credential.

## Operation vocabulary

| Operation             | Meaning in every type                                                               | Consequences in its contracts                                     |
| --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `accept`              | Commit the principal to what was asked: attend, do the work, pay.                   | Commitment                                                        |
| `decline`             | Refuse what was asked. The service records it and nothing else changes.             | Refusal                                                           |
| `approve`             | Authorize the exact target, or propose that for a human decision.                   | Authorization; for Action Approval also commitment and disclosure |
| `request-changes`     | Record feedback on the exact target.                                                | Record                                                            |
| `respond-tentatively` | Record a tentative commitment.                                                      | Commitment                                                        |
| `submit-response`     | Supply the requested values.                                                        | Disclosure                                                        |
| `book`                | Take one offered option.                                                            | Commitment, disclosure                                            |
| `update-preferences`  | Change what email the service sends.                                                | Record                                                            |
| `confirm`             | Affirm that the principal made the request or performed the activity.               | Assertion                                                         |
| `report-unrecognized` | Say the principal did not. The service cancels the request or protects the account. | Protection                                                        |
| `report-progress`     | Report a task's percent complete.                                                   | Record                                                            |
| `report-completion`   | Report the work complete, for the service to verify.                                | Assertion                                                         |

The contracts carry these consequences as data. Under possession authority, a client needs a prior relationship or its principal's decision for anything beyond refusal, protection and record.

## Relationship to schema.org

MAP descriptions map `operations` to `schema:potentialAction`, so each type has a nearest schema.org action for JSON-LD processors. That is lineage, not equivalence: [schema.org action states](https://schema.org/ActionStatusType) have no pending, approval-required, stale or expired values, so results keep MAP's own.

| Type                     | Nearest schema.org actions                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content Review           | [ReviewAction](https://schema.org/ReviewAction), which is an opinion rather than a revision approval                                                    |
| Action Approval          | [AuthorizeAction](https://schema.org/AuthorizeAction), [AcceptAction](https://schema.org/AcceptAction), [RejectAction](https://schema.org/RejectAction) |
| Information Request      | [AskAction](https://schema.org/AskAction) answered by [ReplyAction](https://schema.org/ReplyAction)                                                     |
| Event Response           | [RsvpAction](https://schema.org/RsvpAction)                                                                                                             |
| Meeting Scheduling       | [ChooseAction](https://schema.org/ChooseAction), [ScheduleAction](https://schema.org/ScheduleAction)                                                    |
| Subscription Preferences | [UpdateAction](https://schema.org/UpdateAction)                                                                                                         |
| Email Confirmation       | None; [ConfirmAction](https://schema.org/ConfirmAction) means notifying that something will happen                                                      |
| Account Activity         | None                                                                                                                                                    |
| Task Assignment          | [AssignAction](https://schema.org/AssignAction), [AcceptAction](https://schema.org/AcceptAction)                                                        |
| Payment Request          | [PayAction](https://schema.org/PayAction), [Invoice](https://schema.org/Invoice)                                                                        |

## How the core carries the collection

Everything a type needs is data in its contract:

- the details it carries;
- its inputs and outputs;
- the authority and consequences of each operation, and whether it repeats;
- the fields its inputs must answer;
- its failure reasons.

The core never names a type. Shared schema blocks, today only [form fields](../public/schemas/forms-0.1.schema.json), are pinned by digest and never edited. The reference implementation runs every type from its contract, and its type-specific code is a handful of service behaviours and client rules. The [cutover plan](MAP-CORE-CUTOVER.md) records the design and its adversarial reviews.

## Candidates outside the collection

| Candidate                               | Disposition                                                                                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signature request                       | Signature formats and legal effect belong to e-signature standards. An agent asking its principal to sign is Action Approval with signature terms; a separate type needs a demonstrated difference.                                 |
| Membership invitation                   | Joining a workspace gives the inviter visibility into the joiner's activity. It needs a concrete workflow and a clear account of what accepting shares.                                                                             |
| Acknowledgement of a document or notice | Close to a one-option decision. It needs a use where recording receipt of an exact revision changes what a service may do.                                                                                                          |
| Order or booking change                 | Needs availability, pricing and cancellation semantics that should follow a real service integration.                                                                                                                               |
| Receipts, shipping and reservations     | Data, not interactions. Use schema.org through Structured Email.                                                                                                                                                                    |
| Send, reply, forward or delete          | Mailbox and sending APIs already expose these operations.                                                                                                                                                                           |
| Disclosing that an agent sent a message | A header concern, not an interaction type. Related individual drafts include [agent attribution header fields](https://datatracker.ietf.org/doc/draft-chuang-agent-attribution-header-fields/); none is adopted by a working group. |

## Where the collection sits among standards

| Layer                          | Owned by                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transport and mailbox access   | SMTP, MIME and JMAP.                                                                                                                                                                                                                                                                                                                                                                                       |
| Message authentication         | [DKIM](https://www.rfc-editor.org/rfc/rfc6376) and [DMARC](https://www.rfc-editor.org/rfc/rfc9989).                                                                                                                                                                                                                                                                                                        |
| Carrying structured data       | [Structured Email](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/). The [SML charter](https://datatracker.ietf.org/doc/charter-ietf-sml/) excludes domain vocabulary and what recipients do with extracted data, and draft -06 leaves structured replies to a future specification.                                                                                                     |
| Vocabulary                     | [Schema.org](https://schema.org/docs/actions.html).                                                                                                                                                                                                                                                                                                                                                        |
| Agent task lifecycle           | [A2A](https://a2a-protocol.org/latest/specification/), [MCP tasks](https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/tasks) and iCalendar to-dos.                                                                                                                                                                                                                                   |
| Authorization                  | Each service's own authentication, [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396) for describing grants and [CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html) for decoupled decisions. The [WIMSE AI identity draft](https://datatracker.ietf.org/doc/draft-ietf-wimse-aims/) notes that a decision raised in the middle of a task is not yet covered. |
| Typed, executable interactions | MAP and this collection.                                                                                                                                                                                                                                                                                                                                                                                   |

Structured Email creates IANA registries for vocabularies whose registration procedure is not yet defined. When that procedure exists, and once a type has independent implementation evidence, registering the MAP context there is the route to recognition beyond this project. SML's deferred reply work is the point to coordinate with; it is not a claim that SML will adopt MAP.
