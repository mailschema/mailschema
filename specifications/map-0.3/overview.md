---
description: "Email describes the action. Your client checks it. The service carries it out."
---

# Mail Action Protocol

## What MAP does

An email asks you to approve an article for publication. You can open the publisher's website and decide there. Your agent should be able to handle the same request, with your permission, without guessing what an “Approve” button will do.

Mail Action Protocol gives that request a shared structure. It identifies the service, the article, the exact revision and the available decisions. A type contract defines what each decision means. A configured binding maps those decisions to the service's existing interface.

The email is a description of the work. For an account-backed decision, permission comes from your account and policy. The service checks both the permission and the revision when it records the decision. The optional capability binding covers only narrow responses without a service sign-in; possession of its URL is bearer authority.

## Follow one action

1. **The service sends a proposal.** The email contains readable text, a link to the service's page and a MAP description of the same proposal.
2. **The client checks the message.** It verifies the sender's signature and intended recipient, then identifies the type and a trusted service binding. A valid signature alone does not authorize an action.
3. **The connector reads the current proposal.** It uses the service connection you have enabled. The service establishes which account can act, which operations remain available and the exact terms.
4. **The host applies your policy.** It checks the operation and the actual content or destinations that matter. When policy does not authorize the action, it asks you to confirm those terms.
5. **The service records the decision.** It checks permission and the terms version together. Changed terms stop the action. Work accepted for later execution keeps the approved snapshot.

If the article changes after you approve revision 4, that approval cannot publish revision 5. If publication is queued, the client reports it as queued until the service establishes what happened.

[Explore the service interfaces](/interfaces), then follow the proposal through the [worked exchanges](/examples).

## The three pieces

| Piece | What it supplies | Where it belongs |
| --- | --- | --- |
| Description | This proposal, its recipient, exact terms and offered actions | In the email |
| Type contract | The meaning, inputs and effects of those actions | In a versioned, digest-bound definition |
| Service binding | How to read and act on the proposal using existing service operations | In trusted client configuration |

A Publication Approval contract can be implemented by several publishing services. Each implementation supplies a binding to its existing operations. Clients can reuse the contract's meaning without requiring those services to adopt another approval API.

[Service bindings](/specification/bindings) connect contracts to native APIs, tools, agent interfaces and messaging systems. Their existing descriptions, identity and result mechanisms remain useful. MAP does not make an API safe by describing it: the service must support the required permission and exact-terms checks. The [interface research](/interfaces) examines the available building blocks and the gaps each leaves.

## Connecting a service

A client may recognise a type before it has a connection to the service. It can explain the request and show the email's ordinary review link with its actual origin, without presenting that link as a verified service route. It can also offer a separate connection step using an integration found through the client's configured catalogue.

The user or administrator chooses whether to enable that integration and authorize an account. The client then checks the proposal again. An email cannot install code, choose a credential destination or consent to its own execution.

The [Registry and discovery rules](/specification/registry) explain how type definitions and service implementations are published and selected. MailSchema's public Registry is one catalogue; deployments can maintain their own.

## What can be described

The current [type collection](/types) covers sending a campaign, publishing an article, confirming an address and reporting unfamiliar account activity. A type defines a specific effect: approving a review does not also authorize publishing or sending it.

Types can also define operations that collect input, such as a response to an information request. A new type needs precise terms, permissions and service behaviour, not a change to Core. Existing standards should be used where they already describe the interaction.

Money needs more than an Approve button. A future type for a purchase or paid service would have to name the amount, currency, payee, funding route and what the payment buys. The service would still check account authority and those terms when it charges or reserves funds. No financial type is in the current Registry.

A service can keep a longer workflow behind its API. MAP describes a decision within that workflow; it does not schedule every step or prescribe a job protocol. Shared mailboxes require an explicit relationship between the mailbox and the acting account. Multiple approvers require a contract that defines each decision and the service's quorum rules.

## Read and implement

- [Core](/specification/core) defines the common description and processing rules.
- [HTTP binding](/specification/http) maps operations to existing APIs. The [service binding guide](/specification/bindings) covers other interfaces and reuse.
- [Other interfaces](/specification/interfaces) explains the MCP example and how additional bindings fit.
- [Capability binding](/specification/capability) is an optional experiment for narrowly limited actions without an account connection.
- [Type contracts](/specification/contracts) define the initial interactions.
- [Registry and discovery](/specification/registry) covers publication, connection and version changes.
- [Conformance](/specification/conformance) identifies the evidence an implementation must provide.

MAP 0.3 is a working draft. The specification, schemas and examples are available for implementation; runtime interoperability has not yet been demonstrated.
