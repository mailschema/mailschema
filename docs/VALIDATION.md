# Release validation

26 September 2026. This record distinguishes the deployed specification and first-party product surfaces from published package versions and the remaining live interoperability work. Package releases remain unchanged until a changed artifact passes its own version and promotion decision.

## Protocol and Registry

- Registry validation passed with ten types on MAP 0.2, one implementation declaration, Nitrosend's first-party Content Review test report made against the MAP 0.1 snapshot, and 22 served snapshots, among them the seven records edited in place before amendments existed, so every record digest ever published resolves.
- MAP 0.2 profile validation passed for ten type contracts, every published fixture document and a profile record bound to its schema, context and contract format.
- The conformance manifest verified 134 digest-bound artifacts, 99 executable cases and mappings for 38 normative requirements.
- The suite covers every operation of every type, description binding and forged descriptions, credential and possession authority, the DKIM-signed message kit, decisions and the approval lifecycle, recovery and retention, the HTTP binding, and the shared RFC 8785, I-JSON, lexical and media type vectors.
- The Ruby package passed the same shared vectors and every published JSON fixture document, with its locked dependencies and at the floor of json 2.21 and json_schemer 2.5.0.

## Packages

- `docs/releases/current.json` selects RubyGems `0.2.0` on MAP 0.2, and npm `0.1.4`, PyPI and crates.io `0.1.3`, and Go `v0.1.1`: the Content Review 0.2 releases, on MAP 0.1. Their immutable evidence binds every contract each ships and was verified by public readback at promotion. The site build refuses a missing artifact, incorrect registry identity, unverified state, wrong version or mismatched contract digest.
- Eight local distribution checks passed: declared versions, the preparation manifest, maintained repository metadata, removal of earlier build output, exact artifact bytes for every registry, compiled validation, Registry reference checks and CLI behavior.
- The Ruby gem `0.2.0` passed its 53 tests and 13,204 assertions, RuboCop and `rbs validate` on Ruby 3.3, 3.4 and 4.0, and built. It was published from [`mailschema/ruby`](https://github.com/mailschema/ruby) through RubyGems trusted publishing, with no stored key, and joined the selected set after public readback. MAP 0.2 releases of the other packages follow the cutover.

## Site

- Sourcey `3.6.10` renders the specification with its own reader theme and the complete “Docs by Sourcey” attribution; MailSchema carries no local renderer override.
- Astro diagnostics reported no errors or warnings across 74 files, with three hints.
- The static build completed, and Sourcey generated 16 specification pages, including the MAP 0.2 profile and every type chapter.
- The complete `.eml` and JSON fixtures are emitted directly from their canonical files under `/fixtures/map-0.2/`.
- The 12 Vitest checks passed: Registry discovery, contributions, amendments, implementation evidence, every published record digest still served, ingestion refusals and the CLI; the selected releases and their full-contract evidence; and the worker's redirects and security headers.
- The browser-local example still sends no email and makes no product-conformance claim.
- MailSchema's existing project and MAP social cards remain the share previews for Astro and Sourcey pages.
- Public readback of the deployment before this cutover returned 200 for the homepage, specification reader, Tools page, Registry pages, schemas, profile and context; canonical content types were preserved for JSON, JSON-LD and the complete email fixture. After the MAP 0.2 deployment, the same readback returned 200 with the same content types, and the served core schema, context and profile record matched their pinned SHA-256 digests.
- `www.mailschema.org` redirects permanently to the apex while preserving the path and query string.

## Product integration

- Nitrosend API pull request [#522](https://github.com/nitrosend/api/pull/522) passed RSpec, RuboCop, Brakeman and dependency-audit checks and was merged. The resulting `main` commit passed [CI](https://github.com/nitrosend/api/actions/runs/35862102718), passed the [production deployment](https://github.com/nitrosend/api/actions/runs/35863539893), returned a healthy production response and exposes `mail_action` in the live OpenAPI contract.
- This verifies deployed admission and contract support. The provider-delivered run below adds the authenticated MAP-bearing send and the received MIME message.
- Nitrosend Node SDK pull request [#11](https://github.com/nitrosend/node-sdk/pull/11) was merged after the API contract.
- Nitrosend API pull request [#527](https://github.com/nitrosend/api/pull/527) merged as `c3419bfda880872e64bef555388a51ac91268907`. Its [main CI run](https://github.com/nitrosend/api/actions/runs/35969077603) passed the 13,591-example RSpec suite, RuboCop, Brakeman and dependency audit; its [production deployment](https://github.com/nitrosend/api/actions/runs/35970435081) then completed through the normal commit-gated workflow.
- Production returned a healthy response and its live OpenAPI document contains the exact-revision review and request-approval endpoints. The deployed boundary uses stable user principals, makes API-key approval a proposal requiring a signed-in person, rejects stale targets without changing the flow, retains correlated results, includes MAP in exact-revision flow test emails and extracts designated MAP descriptions from inbound messages without executing them.
- Nitrosend app pull request [#240](https://github.com/nitrosend/app/pull/240) merged as `e8a855bbe9b5a86b445f44e8c706b726633cd932` after the API deployment. All 2,241 app unit tests, lint and the production build passed locally; the [Vercel production deployment](https://vercel.com/nitrosend/nitrosend-app/ECyqzxLkn8xZhHtZz8iG8DUxbSLR) completed and the application plus deep review route return the production shell.
- These checks establish deployed first-party mechanics. No independently configured client execution or external implementation has been recorded.

## Provider-delivered run

This run used MAP 0.1 and Content Review 0.2, both since withdrawn in favour of MAP 0.2. Its evidence remains true for those versions; a MAP 0.2 run follows the cutover.

- Nitrosend's production dogfood run `map-content-review-2026-09-25T00-33-55-634Z` passed against deployed revision `5b8ac80aaf2314a43fc28e645bdd24bd7920a730`. Its receipt is [docs/evidence/nitrosend-map-content-review-2026-09-25.json](evidence/nitrosend-map-content-review-2026-09-25.json) (`sha-256:3425f109e69555807d6815369d6be936cf2a85adfeb642b47c840f8ce03c9d26`); it holds identifiers, digests and outcomes only.
- A real review email from Nitrosend reached an independent mailbox. Its raw copy was preserved, its designated JSON-LD part matched the issued description and the pinned MAP 0.1 artifacts, and the sender's aligned DKIM signature verified over the received bytes.
- The run covered every Content Review path: `request-changes` accepted, duplicate delivery replayed without a second effect, a changed request under a used identifier refused, a lost response recovered, a superseded revision refused as stale, an agent's approval held for a person, the agent refused its own decision, a person's approval completed, the sending rules refusing a person's approval without ending the proposal, and the proposal declined. A read-only production audit bound every received copy to the message Nitrosend sent.
- The run is recorded in the Registry as Nitrosend's implementation declaration for Content Review 0.2. Nitrosend is operated by the MailSchema maintainers, so it is first-party evidence, not independent interoperability.
- Sourcey continues to render the specification from committed MailSchema sources. It is not an action service and no stateful Sourcey boundary is planned without a real product workflow that owns the relevant revision and review state.

## Internet-Draft

- `xml2rfc` 3.34.1 generated text and HTML from `ietf/draft-mailschema-mail-action-protocol-00.xml` without warnings.
- The draft requests no new media type, DNS record or well-known URI. Its only IANA request registers the `map_services` parameter in the existing OAuth Protected Resource Metadata registry.
- The implementation section identifies the reference suite, the Ruby implementation that passes its vectors, and Nitrosend's first-party provider-delivered run on MAP 0.1, without claiming IETF submission or independent adoption. Community discussion and submission remain pending.

## Release boundary

The canonical contract repair merged at `e2f2cc6983173e5aba1da27f1f8bff37336efd77`; its Cloudflare deployment completed in [run 35964885603](https://github.com/mailschema/mailschema/actions/runs/35964885603). Public readback covered the homepage, profile reader, MAP and Content Review schemas, the canonical Content Review type contract, JSON-LD context, complete email fixture, Tools page, Registry exports, social metadata, sitemap and `www` redirect.
