# Supporting pages and shared language

Status: proposed copy. Apply with the reviewed homepage and agreed Registry model.

## Types

Page title: **Interaction types**

Introduction:

> A type describes a kind of work an agent can handle through email. It defines the actions available, the information they need and what each result means.

### Using a type

> Start with the Registry. Read the definition and examples, check the version, and identify which operations your service or client will support. The execution profile supplies the rules for exchanging requests and results.

### Content Review

> Content Review is the first MAP type under development. It covers requesting changes and approving a specific revision of content, such as a campaign draft or a company listing.

Link: **View Content Review**

### Proposing a type

> A new type should describe an interaction that more than one service could use. Check whether an existing type or standard covers the work, then document any additional behaviour your proposal needs.

Links: **Browse the Registry**, **Prepare a type proposal**

Metadata: **How MailSchema interaction types define shared actions, inputs and results for agents and services.**

## Registry

Page title: **Type registry**

Introduction:

> Browse interaction definitions, examples and proposals. Each record identifies its version, maintainers and review status, with implementation details where available.

Search placeholder: **Find a type**

Filters: **Category**, **Status**

Index fields: **Type**, **Description**, **Version**, **Status**

For a version that has not been assigned, use **Not assigned**. Do not give editorial candidates a release number to fill the column.

Empty result:

> No types match these filters.

Action: **Clear filters**

Contribution link: **Prepare a type proposal**

Type-record sections: **Overview**, **Operations**, **Inputs and results**, **Examples**, **Existing standards**, **Versions**, **Implementations**.

When a record has no implementation evidence:

> No implementation evidence has been published for this version.

When a schema is pending:

> The behaviour is described below. A machine-readable representation has not yet been selected.

Use that note where someone would otherwise expect a schema download, rather than repeating draft warnings in every paragraph.

Metadata: **Submitted interaction types for agents and services, with definitions, examples, versions and review status.**

## Content Review record

Title: **Content Review**

Summary:

> Request changes or approve a specific revision of content.

State: **Draft · 0.1**

Overview:

> A service sends content for review. The recipient can submit feedback or record approval of the revision they received. Editing the draft and sending or publishing it remain separate service operations.

The operations and results should be rendered from the maintained definition or linked to it. Do not maintain another prose contract in an Astro component.

Links: **Read the definition**, **Try the review example**

## About

Page title: **About MailSchema**

Introduction:

> MailSchema is building an open standard for agents to work with services through email.

### Why email

> Reviews, requests and decisions already arrive in the inbox. A message often contains the context an agent needs, but each service describes the next step in its own way.
>
> MailSchema provides a place to define those interactions together. The aim is for a service to describe an action in a form that different agents and inboxes can understand.

### The project

> Mail Action Protocol defines the common exchange between service and client. Interaction types describe particular kinds of work. The Registry collects submitted definitions and their history.
>
> Services retain their own permissions and business operations. People can continue to read the email and use the service directly.

### Current work

> MAP 0.1 is a working draft. Content Review is the first type under development, with a browser example showing feedback, revisions and approval. The request format and compatibility tests are still being specified.

### Existing standards

> MailSchema should adopt existing formats and protocols where they fit. Each type proposal identifies related work and explains what it adds. The interoperability chapter records the specifications under consideration.

Links: **Read the draft**, **Browse types**, **Contribute a proposal**

## Examples

Page title: **Try Content Review**

Introduction:

> Review a draft from the inbox. Switch between the email and the structured interaction to see what a person reads and what an agent needs to know.

### Try the exchange

> Request a change and submit the suggested feedback. Switch to the editor to create the example's next revision, then return to the reviewer to approve it. The example uses a predetermined edit so you can follow the whole review.

### Check the permissions

> The reviewer can record a decision. The editor can create a revision. A read-only viewer can do neither. You can also submit an approval for an old revision to see how the service responds.

Caption:

> This example runs in your browser. It does not connect to a service or send email.

Link: **Read the Content Review definition**

## Contribution guide

Page title: **Contribute a type**

Introduction:

> Describe an email workflow that other services could use. Start with the request a person receives and the actions an agent would need to understand.

### Before proposing a type

> Check the Registry and related standards. If an existing definition covers the interaction, propose an example, implementation or amendment to that definition.

### Write the proposal

> Include the target, available actions, required inputs, permissions and results. Show one complete exchange and the failure cases that explain its boundaries. Identify the existing formats or protocols it uses.

### Review

> Type review considers whether the definition is useful across services, whether its operations are clear and whether it duplicates existing work. Open questions and changes stay with the proposal so implementers can follow its development.

Editorial note: this paragraph describes the proposed process. Establish the maintainer role and contribution terms before presenting it as an operating submission service.

### Implementation evidence

> Evidence belongs to a type version and execution profile. Include the client and service used, the operations exercised and reproduction instructions. A support declaration and a reproduced test are recorded separately.

### Prepare a submission

> The public submission channel and contribution terms are being prepared. Download the template to write a proposal locally.

Link: **Download the type proposal template**

## Proposal template

Title: **MailSchema type proposal**

Fields:

- Proposed name and summary.
- Contributor and maintainer contact.
- Real workflow and intended clients or services.
- Existing type or standard considered, with the additional behaviour explained.
- Target and applicable revision rules.
- Available operations and required inputs.
- Permission checks and human participation.
- Results, errors, retries and incomplete exchanges.
- Successful example and relevant failure cases.
- Proposed representation or an explicit statement that it is undecided.
- Open questions.
- Supporting implementations and evidence, if available.

## Search and navigation

Keep search records specific to their destination:

- **Mail Action Protocol:** How services describe actions, clients request them and services report results.
- **Interaction types:** How to use and propose a shared interaction definition.
- **Type registry:** Browse submitted definitions, versions and examples.
- **Content Review:** Request changes or approve a specific content revision.
- **Try Content Review:** A browser example of feedback, editing and approval.
- **Contribute a type:** Prepare a proposal or amendment with a complete example.

Apply the same names in the header, footer, Sourcey sidebar, page descriptions and search groups. Remove product-directory search results when the Registry model changes.
