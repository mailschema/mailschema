# MAP 0.3 architecture decision

Status: working rationale. The [specification bundle](../specifications/map-0.3/README.md) and its digest-bound contracts define the draft. This note explains the choice of boundaries; it does not add protocol requirements. The [roadmap](ROADMAP.md) owns implementation evidence and the release gate.

## Decision

MAP describes a service decision carried by email. It identifies the proposal, intended recipient, exact terms and available choices. A type contract gives those choices a shared meaning. A host uses an integration it has independently enabled to read the current proposal and, if authorized, invoke the service's existing operation. The service checks permission, state and exact terms when it records the decision.

The email does not select an endpoint, tool, credential destination or executable mapping. MAP defines no general action API, request/result envelope or workflow engine. People can still follow a safe link to the service's own review page. Agents can act only within the principal's policy and an installed service connection.

## The four boundaries

1. **Message.** The signed email contains a readable request and one MAP description. Its typed fields are claims for preview and correlation. Message arrival grants no service authority.
2. **Contract.** An immutable, digest-bound type defines the meaning, inputs, effects and obligations of each operation. A client chooses exact contract bytes from a configured catalogue; the email cannot install a new definition.
3. **Binding.** An installed integration associates that contract with the service's own read and decision operations. It may be code or a declarative mapping that the host already supports. MAP 0.3 does not require a universal mapping manifest or a new discovery endpoint.
4. **Service.** The service supplies current facts and enforces the decision. It binds the recipient, principal, tenant, operation and action-relevant terms to one version, rejects a stale or unauthorized decision, and preserves accepted terms for later work.

This separation lets a service keep an HTTP API, MCP tools, a GraphQL or gRPC interface, or a brokered operation. The [service binding guide](../specifications/map-0.3/bindings.md) explains the evidence each integration needs. The [interface research](research/MAP-INTERFACES.md) records prior art and limits; research entries are not claims of working support.

## Why exact terms and readback matter

An authentic email can become stale, be forwarded or be replayed. Its signature establishes domain responsibility for the signed message, not the recipient's current permission or the correctness of its claims. The host therefore checks trusted delivery and recipient control, selects its own connection, reads the current service proposal, and evaluates the actual content and effects under policy. The service repeats the authority and version checks at the commit boundary. A changed audience or article revision cannot inherit the earlier approval.

An API read, tool result or queue acknowledgement can establish different stages of progress. The host distinguishes a recorded decision, accepted work, completed effect and uncertain outcome. A timeout is not proof that nothing happened. The [Core specification](../specifications/map-0.3/core.md) is authoritative for these rules; the [HTTP binding](../specifications/map-0.3/http.md) applies them to existing HTTPS APIs.

## Human and limited bearer paths

Every request has an ordinary review link. Opening it is safe; applying a choice needs explicit confirmation and a current service check. A MAP-aware inbox may replace the visual control with native review, but it must preserve a usable ordinary route when it cannot present a supported action.

The separate [experimental capability binding](../specifications/map-0.3/capability.md) permits only narrowly limited refusal, protective reporting or confirmation of a request the principal initiated. Its bearer URL is transferable. It cannot authorize publication, sending, payment or a permission change, and it is not an RFC 8058 unsubscribe mechanism. This experiment is not a dependency of credentialed processing.

## Types, Registry and evolution

Core defines how a contract is selected and enforced; it does not ship a closed list of work. MailSchema's Registry publishes exact contract versions, maintainers, lifecycle status and implementation evidence. Other organizations can maintain types under their own identifiers. A Registry listing neither installs a binding nor grants account access. A new type alone does not require every language package to release.

The initial contracts are authored once in [canonical JSON](../specifications/map-0.3/README.md); their normative requirements belong in those documents. The reader and examples reuse those sources. Existing standards retain their own jobs; calendar replies use iTIP/iMIP and one-click unsubscribe uses RFC 8058. Published 0.1 and 0.2 identifiers and historical contracts remain available with their original meaning.

## Delivery and standards path

Nitrosend supplies the first local reference sender and inbox. A controlled campaign request has passed through the product sender, signed receipt, native review and service decision, followed by SES campaign delivery. The [roadmap](ROADMAP.md) records that observation and its limits. This supports a first working draft, not a claim of full runtime conformance or independent interoperability. A second service, broader runtime coverage and the private financial workflow remain follow-on work. Their implementation needs may justify later changes; they do not add requirements to Core by inference.

The generated Internet-Draft is an individual candidate. [Structured Email](https://datatracker.ietf.org/doc/draft-ietf-sml-structured-email/) supplies the email container and update mechanism. The [SML charter](https://datatracker.ietf.org/group/sml/about/) does not assign the use of extracted data by recipient systems to that group. The plan is to seek SML review of the container and trust assumptions and DISPATCH guidance on the action-processing venue. No consultation, submission, working-group adoption or IETF endorsement is claimed.
