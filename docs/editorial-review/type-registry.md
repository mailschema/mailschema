# Types and Registry: collection proposal

Status: design for discussion. Content Review 0.2 is the only interaction type currently described in the MAP sources. The other four entries below are proposed work, not adopted types or compatible implementations.

## What the Registry contains

The Registry is a catalogue of submitted interaction type definitions. Its main object is the type: its meaning, operations, versions, examples and maintenance history.

An implementer should be able to open a record and decide whether to use the definition, propose an amendment or contribute a different type. A client developer should be able to learn exactly what supporting that type entails.

Services and clients belong in a type's implementation section. Each support declaration refers to an exact type version and execution profile. A product name or logo does not constitute a submitted type.

## Recommended collection

Five entries would cover distinct work without turning every button or business noun into a new type. They need different maturity labels and complete records before appearing in the public collection.

| Entry                    | Work described                                                            | Recommended treatment                                                                                 |
| ------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Content Review           | Request changes or approve a particular revision of content.              | Retain the existing MAP semantic draft and develop its wire profile.                                  |
| Information Request      | Supply specified information in response to a request.                    | Develop a proposal with typed fields, validation and a recorded response.                             |
| Task Assignment          | Accept or decline an assigned task and report its progress or completion. | Evaluate a binding to existing task semantics before defining additional MAP behaviour.               |
| Event Response           | Respond to an invitation for a specified event or occurrence.             | Document reuse of calendar standards; define a MAP binding only if it adds a demonstrated capability. |
| Subscription Preferences | Change the email topics or frequency a service sends to a recipient.      | Develop a preference interaction proposal while preserving existing unsubscribe standards.            |

Content Review and Information Request are the first two candidates for MAP-specific implementation work. Task Assignment, Event Response and Subscription Preferences need a reuse assessment before a profile is selected. A useful collection can include binding proposals, provided it does not label them as implemented support.

## Content Review

**Summary:** Request changes or approve an exact revision of content.

**Target:** Service-owned content with a stable identifier and revision.

**Operations:** Request changes; approve.

**Inputs:** The target revision and, for a change request, review feedback.

**Result:** Feedback recorded or approval recorded, with the revision identified. Refused and stale requests are reported without changing the current review decision.

**Example:** A campaign's test email asks for review of revision 3. The reviewer asks the editor to add a timezone. The editor creates revision 4 and submits it for approval.

**Human participation:** A normal review page exposes the same draft and revision.

**Reuse:** Schema.org Actions is relevant to describing available operations. Its [ReviewAction](https://schema.org/ReviewAction) concerns producing an opinion about an object, so it should not be treated as an exact synonym for this approval workflow.

**Definition still needed:** Wire representation, common operation identifiers, revision reference format and retry behaviour.

**Collection status today:** Existing semantic draft, 0.2. The browser example is a simulation.

## Information Request

**Summary:** Respond to a request for specified information.

**Target:** A request identifier and the version of its requested fields.

**Operations under consideration:** Submit response; decline to provide the information. The proposal must decide whether a declined response is recorded by the service or remains a local client choice.

**Inputs:** Values for the requested fields, plus any explicitly supported attachments. Required fields, allowed values and validation rules belong in the definition.

**Result:** The service records the response or explains which values were rejected. Recording information does not approve an unrelated business operation.

**Example:** A directory asks a company to confirm its support address and website. An authorised representative supplies those fields. That response alone does not prove ownership of the company.

**Human participation:** A form with the same questions and validation rules.

**Reuse:** [AskAction](https://schema.org/AskAction) and [ReplyAction](https://schema.org/ReplyAction) provide related vocabulary. [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) is a candidate for describing and validating JSON inputs. None of these alone defines the complete proposed exchange.

**Definition still needed:** Field representation, partial responses, response replacement, attachments, deadlines and permission to disclose the requested information. A message requesting data cannot itself grant that permission.

**Collection status today:** Editorial proposal. No version or compatibility claim assigned.

## Task Assignment

**Summary:** Respond to an assigned task and report its state.

**Target:** A task identifier, assignment and applicable update version.

**Operations under consideration:** Accept, decline, report progress and report completion. Assignment and completion reports need separate meanings; a claimed completion may still require service-side verification.

**Example:** A service assigns an agent to check links in a documentation release and return a report. Accepting the task records participation. It does not provide permission to edit or publish the release.

**Human participation:** The service's task interface.

**Reuse:** iCalendar defines task data through VTODO. iTIP already covers task assignment responses and progress updates. Any proposed MAP definition should explain what remains missing for the intended client and service. [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545), [RFC 5546, section 3.4](https://www.rfc-editor.org/rfc/rfc5546#section-3.4).

**Definition still needed:** A justified mapping from the existing task model, completion evidence, cancellation and changes to an accepted assignment. Keep general agent orchestration outside the type.

**Collection status today:** Binding proposal to investigate. No claim that an iTIP implementation already supports MAP.

## Event Response

**Summary:** Tell an organiser whether the invitee expects to attend.

**Target:** The invitation's event identifier and, when relevant, its occurrence and update sequence.

**Operations under consideration:** Accept, decline and tentative response.

**Example:** An agent receives a workshop invitation and records a tentative response for its user, where the user's calendar permissions allow it.

**Human participation:** The ordinary invitation response in a calendar or service interface.

**Reuse:** iCalendar, iTIP and iMIP already supply calendar objects, scheduling exchanges and email carriage. Schema.org RsvpAction provides related vocabulary for an attendance response. A new MAP record should document a useful binding rather than replace those protocols. [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545), [RFC 5546](https://www.rfc-editor.org/rfc/rfc5546), [RFC 6047](https://www.rfc-editor.org/rfc/rfc6047), [RsvpAction](https://schema.org/RsvpAction).

**Definition still needed:** Whether a MAP binding adds value, its handling of updates and recurrence, and how to avoid submitting duplicate responses through different routes. Existing iMIP delivery cannot be presented as the current authenticated-HTTPS MAP profile.

**Collection status today:** Reuse assessment. An existing calendar standard and a proposed MAP binding have separate status.

## Subscription Preferences

**Summary:** Choose which emails a service sends and how often.

**Target:** A recipient's subscription with the specified service or list.

**Operations under consideration:** Update the offered topic and frequency settings. Unsubscribe follows the applicable existing email mechanism.

**Example:** A recipient changes product announcements from immediate delivery to a weekly digest. The service records the chosen settings and reports when they apply.

**Human participation:** The service's email preference page.

**Reuse:** RFC 8058 defines one-click unsubscribe. Its POST excludes cookies and HTTP authorization and requires recipient consent. Preserve that behaviour; do not require MAP credentials for an existing one-click route. The broader preference interaction needs its own permission model. [RFC 8058, sections 3.1 and 3.2](https://www.rfc-editor.org/rfc/rfc8058#section-3).

**Definition still needed:** Available settings, partial updates, immediate versus deferred effects, identity binding for preference changes and how the interface exposes the existing unsubscribe route.

**Collection status today:** Editorial proposal with existing-standard reuse. Preferences here means email delivery preferences, not paid subscription management.

## Candidates to defer

| Candidate                              | Reason                                                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approval Request                       | Overlaps Content Review until a concrete non-content decision has different required behaviour.                                                                                  |
| Invoice, purchase or payment approval  | Needs a transaction-specific lifecycle, amounts, expiry and clear separation between a decision and execution. An invoice's data schema alone does not define payment behaviour. |
| Booking or order change                | Needs availability, pricing, cancellation and confirmation semantics that should follow a real service integration.                                                              |
| Ownership or claim verification        | Needs a verification method and a precise account of what it proves. Content Review may approve a record's wording, but cannot establish who controls the organisation.          |
| Notification, receipt or status update | Often data carried by an existing vocabulary or a result of another interaction. Establish the additional client behaviour before creating a new MAP type.                       |
| Send, reply, forward or delete email   | Mailbox and sending APIs already expose these operations. A new type would need a specific interoperability gap.                                                                 |

## Record contents

A type detail page should contain:

1. **Identity:** name, summary, provisional or stable identifier, definition version, owner or maintainer, status and source link. Do not manufacture submitted dates or external contributors.
2. **Definition:** target, operations, inputs, results, permission requirements and human route.
3. **Examples:** one complete successful exchange and the failure cases needed to understand the type.
4. **Existing work:** the vocabulary or protocol reused, the mapping and any differences.
5. **Representation:** machine-readable schema and examples when available. A prose-only draft states that representation is pending.
6. **History:** proposed changes, review discussion, release history and any replacement or deprecation.
7. **Implementations:** optional links to exact supported type and profile versions, with evidence and the date it was checked.

Useful browsing controls are type name, category, definition status and relationship to existing standards. Counts should describe type records, not registered users.

## Status and submission

Keep the first process understandable:

- **Proposal:** a submitted definition with an identified contributor and open design questions.
- **Draft:** a maintained definition being developed and tested.
- **Stable:** a published version with a complete contract and the required implementation evidence.
- **Deprecated:** a retained definition with a reason and any replacement identified.

These are proposed MailSchema editorial statuses, not IETF stages. A submission being reviewed need not introduce another lifecycle system. Record its discussion and disposition with the type.

An editorial candidate in this review is not yet a submitted proposal. A public record should make that difference clear or wait for the actual submission.

The first submission mechanism can be a repository proposal reviewed by maintainers. Required fields are the proposed name, workflow, definition, example, existing-work comparison and contributor. A review should answer whether an existing type fits, whether the operations are sufficiently specified and what testing remains.

Choose contribution terms and a real submission destination before collecting proposals. The current website can offer a downloadable template and explain the review criteria.

Registry inclusion does not confer authority on a service or prove that an implementation works. Compatible clients should not need a live Registry request to execute a known type. The site can publish definitions and indexes as static resources; global service discovery is a separate capability.

## Site structure

- `/types/` explains what types are and how to use or propose them. It points to the Registry's collection.
- `/registry/` browses the type records.
- `/registry/content-review/` is the canonical catalogue record for Content Review, with versioned definition links. Treat this route as a documentation location until the type-identifier policy is selected.
- `/specification/content-review/` remains the MAP 0.1 normative-draft discussion, with an explicit link from the record. Avoid independently maintained copies of the same definition.
- `/types/content-review/` redirects to the canonical record so existing links continue to work.
- Remove the standalone `/registry/sourcey/` product record. If there is later actual Content Review support evidence, place it under that type's implementations.
- `/contribute/` explains type proposals, amendments and implementation evidence. The proposal template follows the same record structure.
- Header, footer, site search, Sourcey sidebar links and project documents all use the same definition of Registry.

The implementation should use one typed source of catalogue data for the index, detail pages, search and any downloadable index. Submitted material is reviewed data; author-supplied scripts or remote references are not automatically executed.

## Implementation order after review

1. Apply the accepted homepage voice and specification text.
2. Replace the product-directory model with the type record and one complete Content Review entry.
3. Agree which of the four proposed additions to develop. Write their definitions, examples and reuse mappings before presenting them as usable types.
4. Add the agreed records using their actual maturity status and connect the contribution flow.
5. Verify navigation, search, redirects, the review example, keyboard access and desktop/mobile layouts.

The public collection should grow from those complete records. The five-item recommendation sets a direction for the work; it is not a reason to display five equally mature cards.
