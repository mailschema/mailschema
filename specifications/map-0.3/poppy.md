---
description: "Carry MAP reads and decisions over a Personal Agent Protocol (Poppy) 1.0 connection."
---

# MAP Poppy binding 0.3

## Poppy binding

This experimental binding carries Core's credentialed processing over [Personal Agent Protocol](https://personalagentprotocol.org/docs/1.0/spec) (Poppy) 1.0. Its identifier is `https://mailschema.org/specification/poppy`. It is a draft for implementation experience, not part of the MAP Internet-Draft, and changes to it do not change Core or any type contract.

Poppy and MAP cover different layers. Poppy says who the agent is, who the User is, how the agent signs in and where it calls. MAP says that a decision is waiting, what it means through an exact type contract, and what the service must enforce. Poppy has no channel for reaching an agent when no request is open; the email that carries a MAP description is one. This binding lets a Poppy Personal Agent act on that email through a tool on an MCP server the Company already lists in Poppy.

In this chapter the Personal Agent is the MAP consumer, host and connector; the Company is the MAP service; the User is the principal. Poppy terms (Company identifier, Session, sign-in, scope, operation) have their Poppy 1.0 meanings. The consumer and service MUST satisfy Core and the selected type contract in addition to this chapter. Where a request is HTTP, the origin and credential rules of the [HTTP binding](/specification/http#http-origin-and-credential-protection) also apply.

### Enablement

A Poppy sign-in grants account access. It does not install a MAP binding. The installed binding Core requires under [trusted service implementation](/specification/core#trusted-service-implementation) is an enablement record in the consumer, created by the User in the consumer's settings or setup interface, or by an administrator through host policy, using a control a language model cannot operate. It records:

1. the Company identifier (Poppy section 3.2) and the `organization.domain` shown when it was enabled (the domain, never `organization.name` alone);
2. the mailboxes it covers, and any sender domains other than the Company's own that the User accepted for its mail;
3. the tenant, where the Company uses one, and the contract digests enabled;
4. the `mcp`, `tool`, `scopes` and `human` values and the complete `operations` mapping, each operation's `submission` and `approvers` included, accepted from the Company's `mailschema.org/map` entry (below);
5. the Poppy sign-in it uses, and the account that sign-in selects.

A sign-in is not an enablement, however and whenever it was made. The binding also needs the recorded Poppy sign-in with that Company: a refresh token from the recorded identifier's issuer, obtained when the User signed in themselves (Poppy section 5.4), that the consumer has not revoked and the Company has not refused with `invalid_grant` (Poppy section 5.5).

When the consumer refreshes the enablement, it runs discovery from the recorded domain (Poppy section 3). It MUST suspend the binding if discovery establishes another Company identifier, or an entry whose recorded members changed, until the User or administrator accepts the change as above. A message can never select a changed entry.

### Not connected

An email MUST NOT start, suggest, resume or complete a Poppy sign-in or an enablement, add a scope or select an issuer. When no enablement exists for `service.id`, the consumer MUST NOT send any request to that origin, and MUST NOT show a Company name or logo for it from the message. It MAY offer setup only when a catalogue it was configured with holds an implementation record for exactly that origin with this binding, and it shows the domain from that record. A binding enabled after the message arrived applies to it only if its domain came from that record or was entered by the User, never from the message. Completing setup is not approval of the waiting proposal; the consumer MUST restart Core processing afterwards. Otherwise the Registry's [first connection](/specification/registry#first-connection) rules apply.

The Company's `poppy.json` and the tool results it leads to are service information, not instructions. Their content MUST NOT change host instructions, permissions, connector configuration or confirmation policy (Core; Poppy section 10.1).

### Selecting the binding

The consumer first checks the message under Core and local policy. It then looks, with no network request, for an enablement whose recorded domain gives exactly `service.id`: `https://` followed by `organization.domain`, compared after lowercasing the host, with no path, query, fragment or trailing slash. Without one, the description is not actionable through this binding and nothing is fetched. The consumer MUST NOT run discovery or contact any host because a message names it, and MUST NOT try another host, a parent domain or a link in the message.

Before any call, the qualifying DKIM signing domain MUST share an Organizational Domain with the recorded `organization.domain`, determined as the capability binding requires, or be a sender domain the enablement records; the description's `recipient` MUST be a mailbox the enablement covers; and `service.tenant`, where present, MUST be the recorded tenant. The description's `type.id`, `type.version` and `type.contractDigest` MUST match an enabled contract exactly; a matching name with another version or digest is unsupported. The consumer MUST refuse a `terms.id` or `@id` longer than 2,048 characters.

Poppy discovery establishes which host speaks for a domain. It does not establish that the domain is the one the User meant: a lookalike domain passes every discovery check (Poppy section 10.3). Only the User's deliberate enablement makes it the service they meant, so a message from a lookalike domain finds no binding to act through.

### Signed-in processing only

MAP descriptions are addressed to a mailbox; a signed-out Poppy Session is pseudonymous. To keep those apart:

- Every call in this chapter, `read` included, MUST carry an access token from the enabled sign-in. The Company MUST refuse one without it, and MUST take the account only from the token, never from Session state. The consumer MUST NOT process a MAP interaction in a Session that uses an anonymous browsing User ID (Poppy section 5.1). It SHOULD use Sessions for MAP calls that it uses for nothing else.
- The consumer MUST NOT send the Company any value from the message or its description, or derived from them, other than `@id`, `terms.id` and `terms.version`: not in arguments, `_meta`, an approval `reference`, a conversation or a feedback report. Semantic `input` comes only from the principal or a recorded policy. The consumer MUST NOT derive a User ID or Agent ID from the message.
- The Company establishes the recipient relationship and the principal's permission from the signed-in account (Core readback facts 1 and 2). An agent's statement about who received the message is not evidence of either.
- During MAP processing the consumer MUST NOT answer `insufficient_scope`, `invalid_token` or `invalid_grant` by signing in again, requesting new or broader scopes, or using credentials from another sign-in or account. It MAY refresh an expired access token with the enabled sign-in's refresh token, at the same issuer, for the same account and resource and within the scopes already granted (Poppy section 7). Otherwise it reports missing permission, or that the service is not connected.

### Tokens and calls

This revision defines calls through an MCP API only. The consumer MUST ignore an entry whose `mcp` is not exactly the `url` of an `apis` entry of type `mcp` in the same document. It requests a token for that `url` as Poppy section 7 requires, SHOULD request only the entry's `scopes`, uses the token only there, and sends the Poppy Session header, `Poppy-Version` and `Poppy-Extensions` on every call. It declares `mailschema.org/map` with the version it uses, and `operations` with version `3` when an operation it may submit uses Operations.

Before its first call, the consumer MUST confirm from the server's tool list that the named tool declares, under `_meta["mailschema.org/map"].contracts`, the same `id`, `version` and `contractDigest`, and that its input schema accepts exactly the arguments below. The tool name comes only from the accepted enablement entry's `tool`, never from the message. Connector code takes `interaction_id`, `terms_id` and `terms_version` from the description and `action` from the principal's decision; a language model MUST NOT choose any of them.

| Argument | Value |
| --- | --- |
| `action` | `read`, or the contract's operation identifier, such as `approve` |
| `interaction_id` | The description's `@id` |
| `terms_id` | The description's `terms.id` |
| `terms_version` | The description's `terms.version`; required for every action except `read` |
| `input` | The operation's semantic input, validated against its `inputSchema`; present exactly when the operation defines one |

`read` MUST have no effect. The interaction is looked up within the account the token selects, and within the tenants that account can act in. The Company MUST find an interaction only when both `interaction_id` and `terms_id` match it and it was offered to the principal; any other request, including one naming another service, account or tenant, MUST get the same result as an unknown interaction. When the result is unknown, the consumer MUST NOT repeat the lookup with another sign-in, account or tenant: the interaction is not actionable through this binding.

### Results

Every tool result carries its result in `structuredContent`. Exactly one of these shapes applies:

| Result | `isError` | `structuredContent` |
| --- | --- | --- |
| Read | `false` | `map`, `state`, `operations`, and `decision` and `content` where they apply (Readback) |
| Decision taken or recorded | `false` | `outcome`: an outcome the contract defines for the operation, such as `accepted`, `declined` or `changes-requested`; with `decision`, `state` and `map` |
| Approval needed | `true` | `operation`, as Operations section 4 defines for MCP |
| Approval declined | `true` | `error: "approval_declined"` with `operation_id`, `revision`, and optionally `reason` and `alternative` (Operations section 6) |
| Semantic condition | `true` | `outcome`: one of Core's [semantic conditions](/specification/core#semantic-conditions-and-updates) `already-decided`, `superseded`, `stale`, `expired` or `withdrawn`; with `state`, `map`, and `decision` where one is recorded |
| Not found or refused | `true` | `error`: `not_found`, `invalid_request` or another service error, with no proposal detail |

`state` is one of `pending`, `decided`, `expired`, `withdrawn`, `superseded` or `not-permitted` (the principal may inspect but not decide). When it is `decided`, `decision` names the recorded operation. An approval declined is not the outcome `declined`: the proposal stays pending, and the consumer reports that this route did not accept the decision. After a call that could take effect, an HTTP 503, a result in none of these shapes, a timeout or a lost result leaves the outcome unknown. Acceptance is not completion: `accepted` means the service accepted the exact decision.

### Readback

`action: read` returns:

- `map`: the current MAP description, rebuilt by the service from its own records. It MUST be valid for the exact contract, MUST state the current `@id`, terms identifier and version, MUST have the description's `service`, and MUST NOT contain a `capability`.
- `state`, `decision` and `operations`: the proposal's state, the recorded decision if any, and the operation identifiers the principal can submit now.
- `content`, where the contract's details reference content: the referenced content for the current terms version, in a representation the Company documents. The Company asserts, through the same authenticated read, that it is the content those terms bind.

The consumer MUST check Core's five readback facts against this result and the email. Copying a value from the email into the comparison is insufficient. The service MUST NOT return any detail to a principal who may not inspect the proposal.

A host whose policy depends on referenced content or audience membership MUST evaluate it over `content` and the typed details. When the read does not supply what the policy needs, the host MUST NOT treat the policy as satisfied: an identifier, digest, title or count is not evidence of what it refers to, and the User decides. Only `map.human.url` from readback, on an origin the enablement records under `human`, may be presented as the service's review route; the email's own link remains an ordinary link with its origin visible.

### Decisions

Each operation in the entry names its `submission`: `operations` or `direct`. An unknown `submission` makes the operation unsupported.

**Order.** For every operation, whatever its `submission`, the consumer MUST complete readback and reach its decision on the readback `map` and `content`, by a standing policy or from the User, before the first call. It MUST NOT send that call on message arrival or to fetch terms for display.

**Approvers.** `approver: "agent"` requires that the contract's `actors` and the entry's `approvers` both include `agent`, and a policy recorded in the host before the message arrived, evaluated by host code over the typed values and declared effects. Otherwise the consumer MUST obtain an explicit decision from the User through a trusted interface; for an `operations` operation it sends `approver: "user"` only when the entry's `approvers` include `user`, and otherwise uses the human route or reports the operation unsupported. A `direct` call carries no approver, and the entry lists none for it. The consumer MAY send a `direct` call on a policy only when the contract's `actors` include `agent` and a policy recorded in the host before the message arrived, evaluated by host code as above, permits it; otherwise it MUST obtain an explicit decision from the User through a trusted interface first. A language model MUST NOT evaluate that policy, supply the User's decision or operate the confirmation control, and a policy decision MUST NOT be sent as `user`. Text from the Company, the operation's `summary` included, is never the User's approval, and confirmation shows the typed values, declared effects, the Company's domain and the acting account rather than the summary alone. A `direct` operation whose `actors` exclude `agent` needs an explicit User decision.

**Operations.** An operation marked `operations` is submitted under the Poppy [Operations extension](https://personalagentprotocol.org/docs/1.0/extensions/operations) version 3. Before any of the steps below, the Company authenticates the call, confirms the token's current authorization for the interaction and, for a call carrying an approval, that the Session may approve it (Operations sections 3 and 6). A call that fails these gets an ordinary error, never a recorded result, `operation` or `approval_declined`. The Company then answers in this order, the first that applies:

1. A repeat of an approval it already performed, on the same revision, gets the original result or one that says the same (Operations section 7).
2. A `terms_version` that is not the current one, or a proposal that can no longer be decided, gets that semantic condition as `outcome`, and no operation.
3. A call without an approval, or with an approval of an earlier revision of the current terms, gets the current `operation` as Operations section 4 defines for MCP (`isError: true`, `structuredContent.operation`); never the revision the approval names (Operations section 6).
4. An approval whose approver, client or the Company's own rules it will not accept gets `approval_declined`.
5. Otherwise the Company performs the decision.

The `operation` MUST satisfy:

- `terms` has exactly the members `map` (the current description, member for member the one `read` returns), `operation` (the MAP operation identifier) and, for an operation with semantic input, `input` (the submitted input as the service validated it).
- `terms.map.terms.version` equals the call's `terms_version`, and `revision` changes whenever the MAP terms version, `expiresAt` or the input changes. Two such sets of terms never share a revision.
- `expires_at` is no later than the description's `expiresAt`.

The consumer sends the approval only if `operation.terms` has exactly these members and equals what it decided on: `map` member for member the readback `map`, `operation` the operation it requested, `input` the input it sent. Any difference makes the interaction non-actionable. It repeats the identical call with the approval in `_meta["personalagentprotocol.org/approval"]`. When an agent approval is answered with a new revision, the consumer MUST ask the User before approving it (Operations section 5).

The Company MUST check the account, recipient relationship, expiry, decision state, MAP terms version, input and Operations revision together and atomically with the decision, as Core's exact-terms rule requires. When the MAP terms version changed after the operation was returned, the answer to its approval is `stale`, not a new revision. A Company MUST NOT perform an operation it lists as `operations` on a call without a valid approval, including a call that does not declare the Operations extension; that call gets an ordinary tool error. A Company MAY accept only some `approver` values; it lists them in `approvers` and declines any other approval with `approval_declined`. It also declines, rather than fails, an approval that passes these checks and that its own rules refuse. A declined approval performs nothing and is not a failure.

A Company that accepts Operations approvals through this binding SHOULD verify the Poppy Session header (Poppy section 5.3) on every decision call and refuse a decision without a valid one, so that a copied access token alone decides nothing. This does not relax Operations sections 3 and 6: establishing that a Session can approve an operation still relies on verified Session claims or an equivalent binding of the approval to the Personal Agent, User and account. The Company SHOULD decline an approval from the client it recorded as initiating the proposal, which need not be the client reading it. It SHOULD make `@id` unpredictable from its other identifiers, so that a client knowing only those cannot address the interaction; this shows knowledge of the identifier, not possession of the message, which the consumer's own message and recipient checks establish.

A first call that reports a decision taken or recorded, or any other effect, is a binding fault. The consumer reports the stated outcome, does not present it as the User's decision, and suspends the binding for that Company until it is enabled again. An approval-needed result, a semantic condition, a not-found or other refusal, and a transport failure are not faults; they are handled as Results describes.

**Direct.** An operation marked `direct` takes effect on the call that carries `terms_version`. Operations whose only effects are refusal and state, such as a decline, SHOULD be `direct`: they need no approval round trip, and Core's atomic version check still applies.

### Retries

Repeating an Operations approval follows Poppy's at-most-once rules (Operations section 7). Repeating a `direct` decision with the same `terms_version` MUST NOT repeat its effect; the Company reports the recorded decision, with its `decision`, instead. Where the decision carried semantic input, the result also carries the recorded `input`, so the consumer can tell its own decision from another caller's. `stale` and `superseded` require a fresh read and a fresh decision; the consumer MUST NOT replace the version and retry. When the outcome is unknown, the consumer MAY repeat the identical call or read the current state, and MUST NOT submit a different operation until it knows.

## The mailschema.org/map extension

A Company lists support in `poppy.json` under `extensions`, as Poppy section 3.3 defines for extensions named with a domain:

```json
"extensions": {
  "operations": [{ "version": "3" }],
  "mailschema.org/map": [{
    "version": "1",
    "profile": "https://mailschema.org/profiles/map/0.3",
    "binding": "https://mailschema.org/specification/poppy",
    "mcp": "https://api.service.example/mcp",
    "human": ["https://app.service.example"],
    "contracts": [{
      "id": "https://mailschema.org/types/campaign-send-approval",
      "version": "0.1",
      "contractDigest": "sha-256:de3c88a0712adb1d0c6e82f437b825c83520d8e1c44c7b032a2cfcfe5ce55731",
      "tool": "example_send_approval",
      "scopes": ["send-approvals"],
      "operations": {
        "approve": { "submission": "operations", "approvers": ["user"] },
        "decline": { "submission": "direct" }
      }
    }]
  }]
}
```

Version `1` entries have these members. The [extension schema](/artifacts/map-0.3/schemas/poppy-extension.schema.json) validates their structure; the consumer checks the membership rules in the last column.

| Member | Required | Meaning |
| --- | --- | --- |
| `version` | Yes | `"1"`, this revision. |
| `profile` | Yes | Exactly `https://mailschema.org/profiles/map/0.3`. |
| `binding` | Yes | Exactly `https://mailschema.org/specification/poppy`. |
| `mcp` | Yes | An HTTPS URL without user information or fragment, equal to the `url` of an `apis` entry of type `mcp` in the same document. |
| `human` | No | HTTPS origins where `map.human.url` may lead. Without it, no review route is presented as the service's. |
| `contracts` | Yes | One entry per exact contract, each with `id`, `version` and `contractDigest`. No two entries name the same exact contract. |
| `contracts[].tool` | Yes | The tool on that server that carries `read` and every listed operation, and declares the contract in its `_meta`. |
| `contracts[].scopes` | No | Scopes that suffice for the tool, each described in the Company's scopes. A hint, not a grant. |
| `contracts[].operations` | Yes | Each supported operation identifier the contract defines, mapped to `submission` (`operations` or `direct`) and, for `operations`, the `approvers` the Company accepts. `read` is reserved for the read action and is never an operation. |

The consumer MUST ignore entries with an unsupported `version` and members it does not recognize. It MUST treat as unsupported a contract whose entry fails the schema or these membership rules, a contract named twice, two version `1` entries, and an operation the contract does not define. An operation absent from `operations` is unsupported through this binding even if the email offers it; the consumer MAY still show the human route under Readback's rule. A Company MUST NOT list an operation whose submission it cannot enforce as this chapter requires.

## Security and privacy

The binding inherits Poppy's identity guarantees and MAP's decision guarantees, and adds nothing that grants authority. The email remains a pointer: it selects among the Companies and contracts the User enabled, and cannot add a Company, server, tool, scope, sign-in or account.

An Operations approval, `approver: "user"` included, is the Personal Agent's statement (Operations section 8.1). Listing only some approvers decides which statements the Company accepts; it does not let the Company observe the User's decision. A Company that needs to see the User approve directly keeps its authenticated human route for that operation and does not list the operation here.

A read tells the Company that the signed-in account's agent holds a covered mailbox that received this interaction, and when. The enablement's mailbox and sender-domain rules bound who can cause that. Poppy's User IDs, Agent IDs, delegated keys and approval references stay pairwise, and this binding sends no value from which they could be derived; it does not hide a User from a Company that already knows their mailbox.

Implementations need the evidence Core and the [service bindings](/specification/bindings#evidence-before-a-reusable-binding) chapter call for: changed terms, revoked sign-in, a declined approval, a repeated approval, a binding fault and an indeterminate result. A listed extension is a support declaration, not an interoperability result.
