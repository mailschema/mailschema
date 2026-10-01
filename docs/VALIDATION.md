# Release validation

1 October 2026. This record separates what the repository verifies from published package versions and from the live interoperability work that remains.

## Protocol and Registry

- Registry validation passed with ten types on MAP 0.2, five contributions, no implementation declarations and 15 served record snapshots.
- MAP 0.2 profile validation passed for 11 type contracts, Content Review 0.3 and 0.4 among them, 64 published fixture documents and a profile record bound to its schema, context and contract format.
- The conformance manifest verified 149 digest-bound artifacts, 100 executable cases and mappings for 39 normative requirements. The cases run on `src/map/core`, the MAP core the npm package ships.
- The suite covers every operation of every type, description binding and forged descriptions, credential and possession authority, the DKIM-signed message kit, decisions and the approval lifecycle, recovery and retention, the HTTP binding, and the shared RFC 8785, I-JSON, lexical and media type vectors.
- The Ruby package passed the same shared vectors and every published JSON fixture document: 53 tests and 13,204 assertions, with no RuboCop offenses.

## Packages

- `docs/releases/current.json` selects npm `0.2.2`, RubyGems `0.2.0`, PyPI and crates.io `0.2.1`, and Go `v0.2.0`, all on MAP 0.2. Every one carries the MAP 0.2 core artifacts, and none bundles a type contract. The npm and RubyGems packages also process MAP 0.2. Their immutable evidence binds every artifact each ships and was verified by public readback at promotion. The site build refuses a missing artifact, incorrect registry identity, unverified state, wrong version or mismatched digest.
- The nine local distribution checks passed: declared versions, the preparation manifest, maintained repository metadata, removal of earlier build output, the npm package's MAP core matching the repository's, exact artifact bytes for every registry, compiled validation, Registry reference checks and CLI behavior.
- The npm package `0.2.2` passed its six tests against the packed build, including the shared RFC 8785, I-JSON, lexical and media type vectors and every contract's published documents, and a strict NodeNext consumer typechecks it with library checks on.

## Site

- Sourcey `3.6.10` renders the specification with its own reader theme; MailSchema carries no local renderer override.
- Astro diagnostics reported no errors or warnings across 81 files, with three hints.
- The static build completed, and Sourcey generated 17 specification pages, including the MAP 0.2 profile, the type contracts chapter and every type chapter.
- The complete `.eml` and JSON fixtures are emitted directly from their canonical files under `/fixtures/map-0.2/`.
- The 12 Vitest checks passed: Registry discovery, contributions, amendments, implementation evidence, every published record digest still served, ingestion refusals and the CLI; the selected releases and their full-contract evidence; and the worker's redirects and security headers.
- The browser-local example sends no email and makes no product-conformance claim.

## Product integration

- Nitrosend runs Content Review 0.3 on MAP 0.2 in production through the `mailschema` gem, from API pull request [#538](https://github.com/nitrosend/api/pull/538) and app pull request [#243](https://github.com/nitrosend/app/pull/243).
- Its provider-delivered MAP 0.2 run is pending, so the Registry records no implementation declaration. Nitrosend is operated by the MailSchema maintainers, so its declaration will be first-party evidence, not independent interoperability.
- No independently configured client execution or external implementation has been recorded.

## Internet-Draft

- The draft's rule sections are generated from the profile and the contract rules by `npm run draft`; verification fails if the committed draft differs.
- The draft requests no new media type, DNS record or well-known URI. Its only IANA request registers the `map_services` parameter in the existing OAuth Protected Resource Metadata registry.
- The implementation section identifies the reference suite, the Ruby implementation that passes its vectors, and Nitrosend's first-party production implementation, without claiming IETF submission or independent adoption. Community discussion and submission remain pending.
