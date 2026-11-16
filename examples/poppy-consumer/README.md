# Local Poppy / MAP reference consumer

One Campaign Send Approval, one explicitly enabled mailbox and tenant. This is
an operator-run implementation example, not an always-on mail agent or a claim
that existing personal agents support MAP. It uses published `mailschema@0.3.3`
for original-message extraction, contract checks and RFC 8785 digests. Mailauth
verifies the original message against published DKIM keys.

The service is independent: the consumer imports no Nitrosend code, reads no
Nitrosend database and makes no privileged approval call. OAuth, current terms,
decision and retry all use public discovery and the advertised MCP tool.

## Run

Install with `npm ci` in this directory. Put configuration and evidence outside
the checkout in a temporary directory with mode 0700. Example `consumer.json`:

```json
{
  "origin": "https://api.nitrosend.com",
  "clientOrigin": "https://your-temporary-public-metadata-host.example",
  "mailbox": "your-controlled-dogfood-mailbox@example.net",
  "tenant": "urn:nitrosend:brand:123",
  "senderDomains": ["nitrosend.com"],
  "messagePath": "/absolute/private/path/received.eml",
  "deliveryPath": "/absolute/private/path/delivery.json",
  "evidencePath": "/absolute/private/path/decision.json"
}
```

Run `node serve.mjs /absolute/private/path/consumer.json`. A temporary HTTPS
tunnel may forward to port 4341 for client metadata. Only `/client.json` and
`/jwks.json` exist on that listener. Controls and the OAuth callback are on the
separate, unforwarded port 4340 and require the literal loopback Host. The
code/PKCE exchange and tokens never use the
tunnel. Keys, tokens and account access remain only in process memory. Do not
expose the local control page, use a personal credential store, or sign in to a
customer account for qualification.

Open `http://127.0.0.1:4340`. The person clicks **Enable and connect Nitrosend**,
then completes Nitrosend's own consent and selects the configured tenant. A
language model or automation must not operate enablement, approval or disconnect
controls. Setup records the exact discovered MAP entry. A changed entry
suspends processing; an email cannot initiate sign-in or broaden access.

Export the raw original from that mailbox through its authenticated provider,
not from the service's outgoing copy. The operator's trusted export adapter
writes `delivery.json` containing `mailbox`, `providerMessageId`,
`receivedDirectly: true` and `rawDigest`, calculated with
`digest(raw.toString('base64'))`. These are provider/export facts, never copied
from To or the MAP part. Only direct delivery to the enabled mailbox is
supported; forwarding and unconfigured aliases are not proof of control.

**Read received request** is safe to operate for inspection. It verifies the
MIME, recipient, full-body DKIM and covered headers, contract and expiry; checks
the advertised tool; then reads and validates current exact terms and content.
It also refreshes the same scoped sign-in before asking for a decision. The
email preview is sandboxed, with scripts, external resources and navigation
disabled. It is never used to interpret instructions or choose tool arguments.

Only the person's click on **Approve once and check safe retry** starts a
decision. The first call must return the exact operation, not perform it; the
consumer checks it and sends the same call with the person's approval. It then
repeats that exact approval and records the service's reply. A lost result or
binding fault never restores the approval control. Independently verify one
actual delivery and the service's recorded single release before claiming a
full round trip. Do not equate `accepted` with delivered.

Disconnect revokes this sign-in only. Stop the process and tunnel when finished.
This intentionally has no background ingestion loop, standing policies,
automatic decisions, model prompts, account creation or recovery subsystem.

## Checks

`npm test` checks real signed MIME, partial-body and missing-header refusals,
tampered content, recipient control, tenant/contract/expiry and stale readback,
exact Operations terms and issuer/state/PKCE restrictions. These tests do not
claim production interoperability or human confirmation.
