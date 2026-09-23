# Release validation

23 September 2026. This record covers the live MAP 0.1 profile, Content Review 0.1, conformance kit, developer packages, public website and the first deployed product contract.

## Protocol and Registry

- Registry validation passed with five types, no vendor contributions and no implementation declarations.
- MAP profile validation passed for six valid documents, two rejected fixtures and one complete multipart email.
- The conformance manifest verified 12 digest-bound artifacts and 12 normative cases.
- Six deterministic reference test files passed, covering completion, feedback acceptance, exact retry, lost-response recovery, changed-payload conflict, refusal, stale targets, expiry, unsupported types, approval requirements, pending work and endpoint trust.
- The Content Review record, schemas and fixtures agree on the stable operation IDs `request-changes` and `approve`.

## Packages

- JavaScript, Python and Rust `0.1.1` and Go `v0.1.0` were independently downloaded from their public registries. Every artifact contained the current canonical contribution schema bytes.
- Six distribution checks passed across declared versions, canonical schema copies, MAP and Content Review schemas, compiled validation, Registry reference checks and CLI behavior.
- A clean public npm invocation accepted the MAP description with `--map`.
- A fresh Python virtual environment installed `mailschema==0.1.1`, reported `0.1.1` and validated the MAP description.
- The Rust crate passed its unit test and publication dry run before release; crates.io public readback then verified the released archive.
- The Go module passed `go test ./...` in GitHub Actions and public Go proxy readback.
- `docs/releases/current.json` selects npm, PyPI and crates.io `0.1.1` plus Go `v0.1.0`. The site build refuses a missing artifact, incorrect registry identity, unverified state, wrong version or mismatched schema digest.

## Site

- Astro diagnostics reported zero errors, warnings and hints across 61 files.
- The static build completed and Sourcey generated seven specification pages, including the MAP 0.1 profile.
- The complete `.eml` and JSON fixtures are emitted directly from their canonical files under `/fixtures/map-0.1/`.
- All 26 Playwright checks passed. They cover every public route and internal destination, Registry compilation and ingestion, contribution previews, package evidence, four language tabs, clipboard fallbacks, mobile layout, no-JavaScript reading, search, exact review behavior and automated WCAG AA checks.
- The browser-local example still sends no email and makes no product-conformance claim.
- MailSchema's existing project and MAP social cards remain the share previews for Astro and Sourcey pages.
- Public readback returned 200 for the homepage, specification reader, Tools page, Registry pages, schemas, profile and context; canonical content types were preserved for JSON, JSON-LD and the complete email fixture.
- `www.mailschema.org` redirects permanently to the apex while preserving the path and query string.

## Product integration

- Nitrosend API pull request [#522](https://github.com/nitrosend/api/pull/522) passed RSpec, RuboCop, Brakeman and dependency-audit checks and was merged. The resulting `main` commit passed [CI](https://github.com/nitrosend/api/actions/runs/35862102718), passed the [production deployment](https://github.com/nitrosend/api/actions/runs/35863539893), returned a healthy production response and exposes `mail_action` in the live OpenAPI contract.
- This verifies deployed admission and contract support. An authenticated MAP-bearing test send and inspection of the received MIME message remain part of the end-to-end dogfood milestone.
- Nitrosend Node SDK pull request [#11](https://github.com/nitrosend/node-sdk/pull/11) was merged after the API contract.
- Sourcey continues to render the specification. A Sourcey Content Review execution service and recorded end-to-end dogfood run remain later milestones; no implementation declaration is published before that evidence exists.

## Internet-Draft

- `xml2rfc` 3.34.1 generated text and HTML from `ietf/draft-mailschema-mail-action-protocol-00.xml` without warnings.
- The draft requests no new media type, DNS record, well-known URI or other IANA registration.
- The implementation section identifies the reference suite and Nitrosend source without claiming IETF submission, an end-to-end product run or independent adoption.

## Release boundary

The protected release pull request merged at `5025b1cfdbcb1d1db3f033f6beefee6dfda331d5`; its Cloudflare deployment completed in [run 35862753362](https://github.com/mailschema/mailschema/actions/runs/35862753362). Public readback covered the homepage, profile reader, MAP schema, profile record, JSON-LD context, complete email fixture, Tools page, Registry exports, social metadata, sitemap and `www` redirect.
