# Homepage copy for review

Status: proposed. Section labels below identify positions on the existing page and are not all intended as visible headings.

## Hero

# Email agents can act on.

MailSchema is building an open standard for agents to work with services through email. Messages describe the available actions, so compatible agents and inboxes can take the next step.

Primary link: **Read the specification**

Secondary link: **Try a review**

Metadata below the buttons: **Mail Action Protocol · Working Draft 0.1**

Diagram caption: **How a MAP interaction works**

## Introduction

### There's work in your inbox.

A draft needs feedback. A service needs an answer before it can proceed. MAP gives those requests a structure that agents can recognise, alongside the email people already read.

**A request arrives**

The message identifies the work and the actions available. For a draft, that might mean requesting changes or approving a particular revision.

**Your agent responds**

A compatible agent submits the request to the service, using the permissions you have given it. You can also follow the link and handle the review yourself.

**The service confirms**

The result tells the agent what happened. Feedback might have been recorded, approval might still be needed, or the draft might have changed since the email arrived.

## MAP feature

Label: **Mail Action Protocol**

### Describe it once.

With a shared type, a review request has the same meaning across services. Agent and inbox developers can build support for that interaction while each service handles its own permissions and underlying work.

MAP defines how the message describes the action, how a client requests it and what the result means.

Link: **Read MAP 0.1**

## Example

Label: **Content Review**

### Take a draft through review.

A campaign test email arrives for review. Request a change, create the next revision and approve it. Try the exchange below to see what the person reads and what the agent receives.

Link: **Read the type definition**

### Example email and interaction text

Sender: **Example campaign service**

Subject: **September update: ready for review**

Introduction:

> Please review the opening for the September update. You can request changes or approve revision 3.

Draft at revision 3:

> Your weekly digest arrives every Friday at 9am.

Suggested feedback:

> Add the timezone.

Draft at revision 4:

> Your weekly digest arrives every Friday at 9am Sydney time.

Initial state: **Revision 3 is ready for review.**

Initial explanation: **You can request changes or approve this revision. The service checks your permission when you submit the request.**

Feedback state: **Feedback recorded.**

Feedback explanation: **The feedback applies to revision 3. An editor can now prepare the next revision.**

Approved state: **Revision 4 approved.**

Approved explanation: **The service has recorded approval of revision 4. Sending the campaign requires separate permission.**

Permission refusal: **You don't have permission to approve this draft. No decision was recorded.**

Stale request: **This request refers to revision 3. The current draft is revision 4, so no decision was recorded.**

Role label: **Act as**

Roles: **Reviewer**, **Editor**, **Read-only viewer**

Caption: **Interactive example. Runs in your browser; no email is sent.**

Editorial note: the example revision change is predetermined. Keep the existing role checks and label it as an example; do not imply that an agent has processed arbitrary feedback.

## Types and Registry

Label: **MailSchema Types**

### A type gives the request its meaning.

Content Review tells a client how to handle feedback and approval. Other types can describe other kinds of work. Each definition sets out the actions, the information they need and the results a client can expect.

**Understand types**

Learn how a type describes an interaction, how it relates to MAP and when an existing definition fits your workflow.

Link: **About interaction types**

**Browse the Registry**

Read type definitions and examples, follow their revisions and see the proposals under discussion. Implementation details belong with the type they support.

Link: **Browse type definitions**

Editorial note: the final collection of additional types will be decided separately. This section does not advertise unapproved types as available.

## Contribution

### Propose a type for your workflow.

If your service asks people to do something by email, describe the exchange. A useful proposal shows what a client needs to know and how the same interaction could work in another service.

Link: **Prepare a type proposal**

Destination: the contribution guide and downloadable template. Use a submission button only when a submission channel actually exists.

## Footer and metadata

Footer description: **Open standards for agents and services to work through email.**

Navigation: **Specification**, **Types**, **Registry**, **About**

Footer group labels: **Explore**, **Contribute**

Registry link label: **Type registry**

Page description: **MailSchema is building an open standard for agents to work with services through email. Read Mail Action Protocol and explore shared interaction types.**
