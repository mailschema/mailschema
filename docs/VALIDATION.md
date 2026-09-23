# Site validation

23 September 2026. Content, contribution pipeline, package documentation and production deployment update. The site is published at `https://mailschema.org`; no product integration is claimed.

- Astro type check: zero errors, warnings and hints.
- Static production build: 19 public pages, plus a legacy type redirect, the 404 page and generated Registry JSON exports.
- Playwright: twenty-six focused checks passed, covering the production site, Registry compiler, importer, package documentation and an isolated contributed-site build.
- Content consistency: Types, Registry, individual records, About and search agree with the shared type collection. Linked specification titles, summaries and operation headings agree with their type records. Duplicate type identifiers/names and draft records lacking a version or maintained definition fail verification.
- Every public route and internal page/anchor destination resolves.
- Content Review: accepted feedback, separate edit, new revision, exact approval, stale refusal, permission refusal, cancellation, repeated revisions and reset.
- Keyboard interaction tabs, mobile menu, Escape dismissal and chapter navigation.
- Search with URL queries, empty results and clearing. Type Registry search combines with category and status filters, restores URL state on reload and supports clearing. Five records link to individual type pages; the previous Content Review URL redirects, and the former Sourcey product-directory record returns 404.
- No JavaScript: specification, all five type records and all three package language sections remain readable; example controls are disabled, explanatory fallback is visible, and inactive copy controls are hidden.
- Axe WCAG 2/2.1 AA checks: no automated violations on the homepage, specification overview, Types, Registry, Content Review record, Subscription Preferences proposal, contribution checker, Tools, example and search.
- Browser captures reviewed at 1440 px and 390 px; narrow layouts checked at 320 px, including Types, the contribution checker and Tools. Tools was also reviewed at 820 px, with terminal commands wrapping and API samples scrolling within their code blocks.
- Contributions: schema checks, attribution, maintainers, amendment history and dependency order, stale/conflicting amendments, exact implementation references and rejection of unsupported operations or verification claims.
- Importer: read-only preparation, validated writes, repeat-import behaviour and refusal of identifier collisions, exercised in temporary Registry directories.
- Browser checker: all three generated examples, checked downloads, invalidation after edits, stale references, unavailable catalogue and safe rendering of submitted text.
- Isolated production build: illustrative new type, amendment and implementation files produce the expected real pages and JSON exports, including attribution, history, support declarations and an earlier-record notice. Fixtures are removed after the check and are not added to the actual Registry.
- Development preview: changing a Registry JSON file reloads its dependent site data. The actual collection still contains five types, zero vendor contributions and zero implementation declarations.
- Tools: language deep links, keyboard tabs, exact copied code, denied-clipboard selection fallback, search results and contribution/reader links pass. All five raw record downloads validate and match the existing digest-envelope exports.
- Release guard: schema mismatch, unverified metadata, nonexistent selected versions and incorrect registry hosts are rejected. Channel versions are selected explicitly and may differ, but every selected artifact must match the canonical schema digest. An isolated build with an altered contribution schema fails before it can advertise mismatched packages.
- Release promotion: npm, PyPI and crates.io 0.1.0 were independently fetched through the new promotion command. Registry hashes matched where supplied, and each published archive contained the canonical schema bytes. A temporary promotion changed only the selected npm channel and an idempotent rerun preserved its immutable evidence.
- Displayed examples: the actual built-page JavaScript, Python and Rust snippets executed successfully against published package 0.1.0. The downloaded Content Review record passed both published CLIs; the Rust example wrote the canonical contribution schema byte for byte.
- Share previews: the approved identity produces separate 1200 × 630 MailSchema and MAP PNG cards. Both surfaces use absolute HTTPS image URLs, large-card Twitter metadata, explicit dimensions and PNG type; Astro also publishes descriptive alternative text.

Automated accessibility checks are bounded evidence, not complete certification. Browser tests do not assert MAP product conformance. The example intentionally operates only on local browser state.

Screenshots are saved under `docs/screenshots/`. The selected original imagegen board and exact initial fresh prompts are in `brand/`.

The reader baseline was first refreshed for the approved six-chapter language pass, navigation and date changes; those earlier snapshots and reports remain in `tests/visual-reference/pre-language-pass/`. Adding Tools then changed exactly 3,141 raw pixels per desktop chapter, all within the header and sidebar navigation. Page dimensions, article pixels and all six mobile screenshots remained identical. These preceding references and comparisons are preserved in `tests/visual-reference/pre-tools/`. The current 12 desktop/mobile comparisons pass with identical dimensions and zero raw pixel differences after the intentional navigation baseline refresh. This is a content regression baseline, not new independent renderer-parity evidence.

The Sourcey package was unchanged. Earlier validation of its default, minimal and API-first layouts, 233 OSS tests and Astro/Cloudflare local Worker remains recorded in `SOURCEY.md`; those package checks were not rerun for this MailSchema update.

The GitHub verification and package-promotion workflows are prepared but have not run remotely. A future repository needs the Cloudflare account variable, deployment token secret and permission for Actions to create pull requests before the automated path can operate. Public contribution terms and an authenticated website-to-pull-request connection are not configured. The published website checks files locally in the visitor's browser without accepting submissions.

## Production deployment

- Cloudflare Worker `mailschema` serves 91 generated assets through the active `mailschema.org` zone in the Auscaster account. The initial verified production version was `b5ce910d-a3a3-4148-b7cc-78dad8955d87`; the current share-preview and package-set configuration is version `2b030984-d641-4ac1-ab63-ad8187006aa8`.
- `mailschema.org` and `www.mailschema.org` are attached as Worker custom domains. The apex is canonical; `www` returns 308 to the same HTTPS path and query string. Cloudflare's zone-level Always Use HTTPS setting is enabled. The `workers.dev` and version-preview origins are disabled in the final configuration.
- Public readback returned 200 for the homepage, specification, Tools, Registry catalogue, robots file and sitemap; a missing route returned the branded 404. HTML, JSON, XML and text content types were correct. Security headers included HSTS, `nosniff`, frame denial, a restrictive permissions policy and a strict-origin referrer policy.
- Chromium loaded the homepage, specification, Registry and Tools from the public domain with their canonical URLs, no console or page errors, and no horizontal overflow at 1440 px or 390 px. The sitemap includes the homepage, Tools and all specification chapters.
- The final deployment ran type checking with zero errors, warnings or hints, a production build, and all 26 Playwright checks before Cloudflare accepted the Worker and custom-domain triggers.

## Package release 0.1.0

- npm, PyPI and crates.io publication succeeded using existing publisher credentials. Public registry metadata and independent downloads matched the prepared archives byte for byte; hashes and locations are in `releases/0.1.0.json`.
- Five package checks passed, covering independent source versions, canonical schema bytes across distributions, compiled validation and reference checks, and the CLI. The npm archive installed outside the repository before publication; a fresh registry installation and CLI check passed after publication.
- Python wheel and source archive passed `twine check`. Three tests passed against the installed wheel, including invalid input and record handling; both CLI modes passed. A fresh download and installation from PyPI passed valid/invalid payload and canonical-schema checks.
- The Rust crate passed its unit test, packaging verification and publication dry run. A new consumer project subsequently fetched the released crate from crates.io and compiled and ran against its public API.
- Site type checking reported zero errors, warnings or hints. The production build and all twenty-six site/Registry checks passed after adding package preparation and website integration.
- JSR, RubyGems and NuGet have not been published because their accounts are not configured. The unscoped npm package does not claim the separate `@mailschema` organization.
