# MailSchema

The public specification site for **MailSchema** and **Mail Action Protocol (MAP)**. A standalone static Astro project using the selected charcoal, yellow and blue Direction 03 identity.

The dependency-ordered project plan is maintained in [docs/ROADMAP.md](docs/ROADMAP.md). Project governance, contribution terms, security reporting and versioning are documented at the repository root.

## Run locally

Use Node.js 24 or later.

```sh
npm ci
npm run dev -- --port 4325
```

Open http://127.0.0.1:4325. Astro 7 may start the development server in the background in an agent environment; `npm run dev -- stop` stops that project's server.

```sh
npm run verify
```

`verify` runs type checking, the production build and all browser/content consistency tests. Browser tests serve the production build on a dedicated loopback port, 49327. They require Playwright Chromium (`npx playwright install chromium` if absent). When run separately, `npm test` assumes `npm run build` has completed.

## Site structure

- `/`: identity, protocol explanation and local review demonstration.
- `/specification/`: MAP 0.1 draft reader, including the exact MIME and authenticated HTTPS profile.
- `/types/`: the complete interaction collection, with operations, examples, maturity labels and guidance on using or proposing a type.
- `/registry/`: five type records, searchable by name and description and filterable by category and status.
- `/registry/<type>/`: definition brief, operations, example, existing standards, open questions and implementation evidence.
- `/examples/`: interactive local Content Review simulation.
- `/tools/`: verified JavaScript, Python, Rust and Go releases, installation, runnable examples and API reference.
- `/about/`, `/contribute/`, `/search/`: project, browser contribution intake and guide, and local search.
- `/registry/catalog.json`, `/registry/records/<type>.json`, `/registry/snapshots/<digest>.json`: generated Registry data and exact record snapshots.
- `/registry/records/<type>.record.json`: a raw record accepted directly by the package validators; used by each type page's download link.

Specification content and Sourcey configuration live in `docs/specification/`. Sourcey owns the reader theme, rendering, chapter navigation and machine-readable specification output. `sourcey/astro` mounts it at `/specification/` in development and production. The rest of the site uses Astro components and small native TypeScript modules. Shared chapter metadata is authored once in `docs/specification/navigation.ts`. Fonts are self-hosted and shared across the Astro and Sourcey surfaces. There are no runtime account, analytics, AI, email or registry services.

## Content and implementation boundaries

MAP 0.1 defines the JSON-LD documents, Structured Email MIME part and authenticated HTTPS execution profile required for an implementation. Nitrosend exposes the first deployed Content Review boundary: an agent can propose approval of an exact flow revision, a signed-in person can decide it and both paths resolve through the same retained result. A provider-delivered inbox round trip and an independently operated implementation remain outstanding, so the project does not claim end-to-end interoperability or IETF adoption. Content Review is a draft; Information Request and Subscription Preferences are proposals; Task Assignment and Event Response are reuse assessments. These are MailSchema-authored records, not external submissions or claims of implemented support.

The Registry centres on submitted types. Product support belongs to a type version and execution profile, with evidence. Types helps readers choose an interaction; the Registry holds its maintained record. The previous `/types/content-review/` address redirects to its Registry record.

The example runs in the browser and never sends email. It illustrates revision binding, feedback acceptance, a predetermined edit, separate approval, permission refusal and stale requests. Sourcey renders the documentation; it is not presented as a MAP implementation.

The contribution page validates and previews new types, amendments and implementation declarations locally in the browser, then opens the checked file in GitHub for repository review. GitHub owns contributor identity, forks, branches and pull requests; MailSchema does not maintain a second submission queue. The CLI imports the same JSON format into a local checkout. See [Contributions](docs/CONTRIBUTIONS.md) for the format and operating process.

## Keeping content in sync

| Source                             | Owns                                                              | Used by                                                                               |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `registry/types/*.json`            | Base type definitions, contributors and maintainers               | Registry compiler                                                                     |
| `registry/contributions/*.json`    | Vendor type proposals, amendments and implementation declarations | Registry compiler, history and evidence sections                                      |
| `src/data/types.ts`                | Validated projection of the Registry files                        | Types, Registry, detail pages, site search, About and linked type navigation metadata |
| `docs/specification/*.md`          | Authored protocol and type semantics                              | Sourcey's specification reader and specification indexes                              |
| `docs/specification/navigation.ts` | Chapter order and grouping                                        | Sourcey navigation and site search                                                    |
| `src/data/navigation.ts`           | Main site navigation                                              | Astro header and MailSchema's Sourcey configuration                                   |
| `packages/versions.json`           | Source version for each package registry                          | Distribution preparation and package checks                                           |
| `docs/releases/*.json`             | Verified package versions, registry links and artifact hashes     | Selected release in `src/data/tooling.ts`, Tools, Contribute and site search          |
| `src/data/review.ts`               | The example email and predetermined edit                          | Static demonstration and browser interaction                                          |

Contribute data files rather than editing application TypeScript. `npm run registry:ingest -- contribution.json` validates without writing; add `--write` to create a contribution under `registry/contributions/`. The importer never overwrites another payload with the same identifier. Amendments reference the current record digest and are applied in dependency order; conflicting or stale changes fail. Counts, groups, routes and views are derived. Keep type identifiers stable when changing display names. Registry JSON edits restart the development server so all projections reload together.

`tests/catalog.spec.ts` compares the rendered collection, status/version labels, operations and examples across pages. It also checks linked specification titles, summaries and operation headings against the record. `npm run verify` must pass after a content change. A change to the meaning of an operation still requires reviewing its Markdown definition, record and demonstration together; matching metadata cannot prove semantic agreement.

`tests/registry.spec.ts` exercises schema validation, references, amendments, CLI imports, browser previews and an isolated production build with illustrative vendor contributions. Example files are generated with current record digests and are not included in the public collection. GitHub Actions runs verification and saves the build artifact on pull requests before protected `main` deploys it to Cloudflare.

## Design and provenance

- `PRODUCT.md`: audience, purpose, voice and boundaries.
- `DESIGN.md`: the selected identity and implemented design system.
- `brand/direction-03-selected.png`: original selected imagegen board.
- `brand/prompts.json`: exact initial fresh imagegen prompts.
- `docs/ARCHITECTURE.md`: selected names and scope record.
- `docs/screenshots/`: browser captures of the built site.

The strategy history is maintained separately from this standalone project. No portfolio application was modified to host the site.

## Reader theme verification

`npm run test:visual` compares all six Sourcey chapters against the saved current-content reader baseline at desktop and mobile sizes. It targets the production preview at `http://127.0.0.1:49328`; override `READER_BASE_URL` to use another origin. Results and diff images are written to ignored `test-results/reader-comparison/`. Earlier language-pass and pre-Tools references are retained separately; see `tests/visual-reference/README.md` for provenance.

The specification reader uses the exact public `sourcey@3.6.8` release. See `docs/SOURCEY.md` for ownership, release evidence, update steps and validation details.

## Published packages

[JavaScript `0.1.3`](https://www.npmjs.com/package/mailschema/v/0.1.3), [Python `0.1.2`](https://pypi.org/project/mailschema/0.1.2/), [Rust `0.1.2`](https://crates.io/crates/mailschema/0.1.2) and [Go `v0.1.0`](https://pkg.go.dev/github.com/mailschema/go@v0.1.0) are published snapshots from maintained language repositories. Their current evidence verifies the Registry contract shipped in those releases. Revised MAP and Content Review sources are promoted only after a changed package is released and every distributed contract passes public readback. The packages do not establish endpoint trust or grant authorization.

`npm run packages:prepare` builds distribution sources from the canonical schemas and JavaScript validation code. `npm run packages:test` checks the compiled JavaScript package and matching schema bytes. See [package instructions](packages/README.md) for all language checks and `docs/releases/` for registry readback and artifact hashes. Packages are versioned snapshots. A contract change requires a compatibility and distribution assessment; only packages whose distributed contract or API changed need a release before promotion.

The Tools page reads each advertised channel from `docs/releases/current.json`. That package-set manifest points to independently verified release evidence and may select different versions for different ecosystems. The site build refuses an unverified selection, a missing version, incorrect registry identity or any package built from different canonical schema bytes.

Publishing to a registry does not change the website. After an artifact is published, independent readback records its evidence under `docs/releases/`; promotion updates `current.json`; the normal verified site deployment then publishes the new installation command. This two-phase release prevents a partial or compromised registry publication from silently becoming the recommended version. Package versions may move independently, while the shared schema digest identifies the contribution format they implement. Package versions and MAP specification versions are also independent.

Run `npm run packages:promote -- --registry npm --version 0.1.3` to verify a public artifact without changing the repository. Add `--promote` to write its immutable evidence and update the selected package set. npm, PyPI, crates.io and Go are supported. The reusable `Verify and promote a package` workflow can be dispatched manually or called by a publishing workflow. It performs public readback, runs the package and site verification suites and opens a pull request. Merging the promotion runs verification on `main` and deploys the exact verified build to Cloudflare. The site never reads a registry's mutable latest value at build time.

The master social cards are generated by `npm run social:generate` from the approved identity and stored under `public/og/`. Astro pages use the MailSchema card; Sourcey specification pages use the MAP card. Versioned filenames allow share-preview caches to be replaced deliberately when the artwork changes.

## Site publication

The production site is `https://mailschema.org`. Astro emits static files in `dist/`; Cloudflare Workers serves those assets through the configuration in `wrangler.jsonc`. The apex domain is canonical and `www.mailschema.org` redirects to it while retaining the path and query string. Canonical metadata, robots discovery and the sitemap use the production origin.

`npm run deploy:dry-run` builds and validates the Worker bundle without publishing. `npm run deploy` runs the complete site verification before publishing the Worker and both custom domains. Pushes to `main` use the already verified CI build and then publish it. CI requires the `CLOUDFLARE_ACCOUNT_ID` repository variable and `CLOUDFLARE_API_TOKEN` secret; no account token belongs in the repository. After publication, verify the apex domain, the `www` redirect, a specification page, a Registry JSON export, the 404 response and the sitemap from the public network.
