# Release validation

24 September 2026. This record distinguishes the deployed specification and first-party product surfaces from published package versions and the remaining live interoperability work. Package releases remain unchanged until a changed artifact passes its own version and promotion decision.

## Protocol and Registry

- Registry validation passed with five types, no vendor contributions and no implementation declarations.
- MAP profile validation passed for six valid documents, two rejected fixtures and one complete multipart email.
- The conformance manifest verified 20 digest-bound artifacts, 29 executable cases and mappings for 16 normative requirements.
- The reference suite covers MIME and JSON-LD processing, completion, feedback acceptance, exact retry, lost-response recovery, changed-payload conflict, refusal, stale targets, expiry, unsupported types, approval requirements, pending work, authenticated principal and tenant binding, current authorization and exact endpoint trust.
- Thirteen readiness probes passed against the specification, profile, schemas, fixtures, reference boundary, conformance matrix, package promotion contract and Internet-Draft source.
- The Content Review record, schemas and fixtures agree on the stable operation IDs `request-changes` and `approve`.

## Packages

- JavaScript `0.1.3`, Python and Rust `0.1.2`, and Go `v0.1.0` were independently downloaded from their public registries. Their immutable evidence verifies the Registry contribution contract shipped at the time; it does not claim the revised MAP contract.
- Nine local distribution checks passed across declared versions, a full-contract preparation manifest, canonical schema copies, clean build output, maintained repository metadata, MAP and Content Review schemas, the canonical type contract, compiled validation, Registry reference checks and CLI behavior.
- The four maintained language repositories contain byte-exact projections of the revised MAP and Content Review schemas and pass their language tests. Their published versions remain unchanged while the release need is assessed; no bookkeeping-only version bump is required.
- A clean public npm invocation accepted the MAP description with `--map`.
- A fresh Python virtual environment installed `mailschema==0.1.2`, reported `0.1.2` and validated the MAP description.
- The Rust crate passed its unit test and publication dry run before release; crates.io public readback then verified the released archive.
- The Go module passed `go test ./...` in GitHub Actions and public Go proxy readback.
- npm `0.1.2` was not promoted because its CI build reformatted the embedded JSON and failed the byte-digest gate. JavaScript `0.1.3` preserves the canonical bytes during its build and passed public readback.
- `docs/releases/current.json` selects npm `0.1.3`, PyPI and crates.io `0.1.2`, and Go `v0.1.0`. The site build refuses a missing artifact, incorrect registry identity, unverified state, wrong version or mismatched schema digest.

## Site

- The public `sourcey@3.6.8` artifact and release were verified by registry readback. Its reader theme places the masthead, navigation and document content on one responsive frame and renders the complete “Docs by Sourcey” attribution as one link; MailSchema carries no local renderer override.
- Astro diagnostics reported zero errors, warnings and hints across 63 files.
- The static build completed and Sourcey generated seven specification pages, including the MAP 0.1 profile.
- The complete `.eml` and JSON fixtures are emitted directly from their canonical files under `/fixtures/map-0.1/`.
- All 27 Playwright checks passed. They cover every public route and internal destination, Registry compilation and ingestion, contribution previews, the browser-to-GitHub handoff and its large-file fallback, full-contract package evidence, four language tabs, clipboard fallbacks, mobile layout, no-JavaScript reading, search, exact review behavior and automated WCAG AA checks.
- The browser-local example still sends no email and makes no product-conformance claim.
- MailSchema's existing project and MAP social cards remain the share previews for Astro and Sourcey pages.
- Public readback returned 200 for the homepage, specification reader, Tools page, Registry pages, schemas, profile and context; canonical content types were preserved for JSON, JSON-LD and the complete email fixture.
- `www.mailschema.org` redirects permanently to the apex while preserving the path and query string.

## Product integration

- Nitrosend API pull request [#522](https://github.com/nitrosend/api/pull/522) passed RSpec, RuboCop, Brakeman and dependency-audit checks and was merged. The resulting `main` commit passed [CI](https://github.com/nitrosend/api/actions/runs/35862102718), passed the [production deployment](https://github.com/nitrosend/api/actions/runs/35863539893), returned a healthy production response and exposes `mail_action` in the live OpenAPI contract.
- This verifies deployed admission and contract support. An authenticated MAP-bearing test send and inspection of the received MIME message remain part of the end-to-end dogfood milestone.
- Nitrosend Node SDK pull request [#11](https://github.com/nitrosend/node-sdk/pull/11) was merged after the API contract.
- Nitrosend API pull request [#527](https://github.com/nitrosend/api/pull/527) merged as `c3419bfda880872e64bef555388a51ac91268907`. Its [main CI run](https://github.com/nitrosend/api/actions/runs/35969077603) passed the 13,591-example RSpec suite, RuboCop, Brakeman and dependency audit; its [production deployment](https://github.com/nitrosend/api/actions/runs/35970435081) then completed through the normal commit-gated workflow.
- Production returned a healthy response and its live OpenAPI document contains the exact-revision review and request-approval endpoints. The deployed boundary uses stable user principals, makes API-key approval a proposal requiring a signed-in person, rejects stale targets without changing the flow, retains correlated results, includes MAP in exact-revision flow test emails and extracts designated MAP descriptions from inbound messages without executing them.
- Nitrosend app pull request [#240](https://github.com/nitrosend/app/pull/240) merged as `e8a855bbe9b5a86b445f44e8c706b726633cd932` after the API deployment. All 2,241 app unit tests, lint and the production build passed locally; the [Vercel production deployment](https://vercel.com/nitrosend/nitrosend-app/ECyqzxLkn8xZhHtZz8iG8DUxbSLR) completed and the application plus deep review route return the production shell.
- These checks establish deployed first-party mechanics. No authenticated MAP-bearing provider send, preserved received-MIME artifact, independently configured client execution or external implementation has been recorded, so the Content Review Registry record still has no implementation declaration.
- Sourcey continues to render the specification from committed MailSchema sources. It is not an action service and no stateful Sourcey boundary is planned without a real product workflow that owns the relevant revision and review state.

## Internet-Draft

- `xml2rfc` 3.34.1 generated text and HTML from `ietf/draft-mailschema-mail-action-protocol-00.xml` without warnings.
- The draft requests no new media type, DNS record, well-known URI or other IANA registration.
- The implementation section identifies the reference suite and Nitrosend source without claiming IETF submission, an end-to-end product run or independent adoption. Community discussion and submission remain pending.

## Release boundary

The canonical contract repair merged at `e2f2cc6983173e5aba1da27f1f8bff37336efd77`; its Cloudflare deployment completed in [run 35964885603](https://github.com/mailschema/mailschema/actions/runs/35964885603). Public readback covered the homepage, profile reader, MAP and Content Review schemas, the canonical Content Review type contract, JSON-LD context, complete email fixture, Tools page, Registry exports, social metadata, sitemap and `www` redirect.
