# Release validation

24 September 2026. This record distinguishes the currently deployed site and packages from the revised MAP 0.1 working tree. The revised contract is not presented as deployed or released until its exact artifacts pass the normal promotion gates.

## Protocol and Registry

- Registry validation passed with five types, no vendor contributions and no implementation declarations.
- MAP profile validation passed for six valid documents, two rejected fixtures and one complete multipart email.
- The conformance manifest verified 19 digest-bound artifacts, 25 executable cases and mappings for 14 normative requirements.
- The reference suite covers MIME and JSON-LD processing, completion, feedback acceptance, exact retry, lost-response recovery, changed-payload conflict, refusal, stale targets, expiry, unsupported types, approval requirements, pending work, authenticated principal and tenant binding, current authorization and exact endpoint trust.
- Eleven readiness probes passed against the specification, profile, schemas, fixtures, reference boundary, conformance matrix, package promotion contract and Internet-Draft source.
- The Content Review record, schemas and fixtures agree on the stable operation IDs `request-changes` and `approve`.

## Packages

- JavaScript `0.1.3`, Python and Rust `0.1.2`, and Go `v0.1.0` were independently downloaded from their public registries. Their immutable evidence verifies the Registry contribution contract shipped at the time; it does not claim the revised MAP contract.
- Nine local distribution checks passed across declared versions, a full-contract preparation manifest, canonical schema copies, clean build output, maintained repository metadata, MAP and Content Review schemas, compiled validation, Registry reference checks and CLI behavior.
- The four maintained language repositories contain byte-exact projections of the revised MAP and Content Review schemas and pass their language tests. Their published versions remain unchanged while the release need is assessed; no bookkeeping-only version bump is required.
- A clean public npm invocation accepted the MAP description with `--map`.
- A fresh Python virtual environment installed `mailschema==0.1.2`, reported `0.1.2` and validated the MAP description.
- The Rust crate passed its unit test and publication dry run before release; crates.io public readback then verified the released archive.
- The Go module passed `go test ./...` in GitHub Actions and public Go proxy readback.
- npm `0.1.2` was not promoted because its CI build reformatted the embedded JSON and failed the byte-digest gate. JavaScript `0.1.3` preserves the canonical bytes during its build and passed public readback.
- `docs/releases/current.json` selects npm `0.1.3`, PyPI and crates.io `0.1.2`, and Go `v0.1.0`. The site build refuses a missing artifact, incorrect registry identity, unverified state, wrong version or mismatched schema digest.

## Site

- Astro diagnostics reported zero errors, warnings and hints across 61 files.
- The static build completed and Sourcey generated seven specification pages, including the MAP 0.1 profile.
- The complete `.eml` and JSON fixtures are emitted directly from their canonical files under `/fixtures/map-0.1/`.
- All 27 Playwright checks passed. They cover every public route and internal destination, Registry compilation and ingestion, contribution previews, full-contract package evidence, four language tabs, clipboard fallbacks, mobile layout, no-JavaScript reading, search, exact review behavior and automated WCAG AA checks.
- The browser-local example still sends no email and makes no product-conformance claim.
- MailSchema's existing project and MAP social cards remain the share previews for Astro and Sourcey pages.
- Public readback returned 200 for the homepage, specification reader, Tools page, Registry pages, schemas, profile and context; canonical content types were preserved for JSON, JSON-LD and the complete email fixture.
- `www.mailschema.org` redirects permanently to the apex while preserving the path and query string.

## Product integration

- Nitrosend API pull request [#522](https://github.com/nitrosend/api/pull/522) passed RSpec, RuboCop, Brakeman and dependency-audit checks and was merged. The resulting `main` commit passed [CI](https://github.com/nitrosend/api/actions/runs/35862102718), passed the [production deployment](https://github.com/nitrosend/api/actions/runs/35863539893), returned a healthy production response and exposes `mail_action` in the live OpenAPI contract.
- This verifies deployed admission and contract support. An authenticated MAP-bearing test send and inspection of the received MIME message remain part of the end-to-end dogfood milestone.
- Nitrosend Node SDK pull request [#11](https://github.com/nitrosend/node-sdk/pull/11) was merged after the API contract.
- A Nitrosend working branch implements authenticated Content Review description, execution and result recovery against immutable flow revisions, plus inbound MAP extraction and corrected Structured Email MIME. Focused request and service tests, OpenAPI validation and Rails eager loading pass locally. It remains undeployed and has no Registry implementation declaration.
- Sourcey continues to render the specification from committed MailSchema sources. It is not an action service and no stateful Sourcey boundary is planned without a real product workflow that owns the relevant revision and review state.

## Internet-Draft

- `xml2rfc` 3.34.1 generated text and HTML from `ietf/draft-mailschema-mail-action-protocol-00.xml` without warnings.
- The draft requests no new media type, DNS record, well-known URI or other IANA registration.
- The implementation section identifies the reference suite and Nitrosend source without claiming IETF submission, an end-to-end product run or independent adoption. Community discussion and submission remain pending.

## Release boundary

The protected release pull request merged at `5025b1cfdbcb1d1db3f033f6beefee6dfda331d5`; its Cloudflare deployment completed in [run 35862753362](https://github.com/mailschema/mailschema/actions/runs/35862753362). Public readback covered the homepage, profile reader, MAP schema, profile record, JSON-LD context, complete email fixture, Tools page, Registry exports, social metadata, sitemap and `www` redirect.
