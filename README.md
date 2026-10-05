# MailSchema

The public specification site for **MailSchema** and **Mail Action Protocol (MAP)**. A static Astro site with a Sourcey specification reader.

The dependency-ordered project plan is maintained in [docs/ROADMAP.md](docs/ROADMAP.md). Project governance, contribution terms, security reporting and versioning are documented at the repository root.

[MAP 0.3](specifications/map-0.3/README.md) is the current specification: Core, HTTP and experimental capability bindings, independent type contracts, conformance material, and a generated individual Internet-Draft. Development and production builds use the same sources. Published historical artifacts and package support retain their actual versions; presenting this draft does not release new packages or claim runtime conformance.

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

`verify` validates the Registry, the MAP 0.2 profile, fixtures and conformance manifest, checks the separate 0.3 draft artifacts and both draft projections, runs the existing conformance suite, type-checks, builds the site, and runs the Registry, release-evidence and worker tests with Vitest.

## Site structure

- `/specification`: Sourcey reader for Core, the bindings, type contracts, conformance and standards references.
- `/registry`, `/registry/<type>`: the type collection, current definitions, version history and listed service support. `/types` and its detail URLs redirect there for existing links. Contract identifiers remain `https://mailschema.org/types/<type>`; a browser redirect does not change their exact identity or digest.
- `/registry/map-0.3.json`: current draft catalogue, with canonical contract digests and source download URLs.
- `/artifacts/map-0.3/`: byte-for-byte downloads from the canonical draft files, generated at build time.
- `/interfaces`: searchable primary-source research across execution, descriptions, delivery, discovery, identity and domain workflows.
- `/examples`: the interface-family overview, worked MIME → MAP → service exchanges and an interactive exact-terms illustration. These are generated local examples, not live integrations.
- `/tools`: current schemas, contracts, examples and conformance material.
- `/contribute`: local contract and service-record checks and preview, followed by GitHub review. No additional submission service.
- `/search`, `/about`: current chapter/type search and project explanation.
- `/archive/map-0.1` and `/archive/map-0.2`: superseded profiles, type history and package documentation, unlisted in the current navigation. Published artifact bytes remain unchanged.

Sourcey owns the reader theme and its rendering. The same adapter reads the canonical Markdown in development and production. No preview copy or alternate production specification exists. Fonts and main navigation are shared with the Astro pages; there are no runtime account, analytics, AI, email or Registry services.

## Content and implementation boundaries

MAP describes actions carried by email. A trusted connector maps operations to the service's existing interface. The email names no execution endpoint and supplies no universal request/result envelope. The service establishes current authority and checks exact terms atomically with the decision. The capability binding is an experiment with narrower scope.

Type contracts define semantics independently of Core. The four initial types are Campaign Send Approval, Publication Approval, Email Address Confirmation and Account Security Response. Draft schemas and local illustrations do not establish an implementation or independent interoperability result.

## Keeping content in sync

| Source                                                                               | Owns                                                                  | Consumers                                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `specifications/map-0.3/core.md`, `http.md`, `registry.md`, `capability.md`          | Normative protocol text                                               | Sourcey reader, generated Internet-Draft                                                       |
| `specifications/map-0.3/contracts/<slug>-<version>.json`                             | Complete versioned type semantics, schemas and operations             | Generated contract chapter, selected I-D example, Registry, downloads and contribution checker |
| `specifications/map-0.3/registry.json`                                               | Category, maintainers, version status and current selection           | Current site projection                                                                        |
| `specifications/map-0.3/implementations/*.json`                                      | Exact service support declarations and reports                        | Registry type pages and catalogue                                                              |
| `specifications/map-0.3/examples/source.json`                                        | Illustrative instance values                                          | Generated digest-bound examples and local demonstration                                        |
| `specifications/map-0.3/examples/campaign.md`                                        | Campaign content and its generated digest                             | Shared homepage and Examples inbox walkthrough, content download                               |
| `specifications/map-0.3/bindings/publication.source.json`, `examples/publication.md` | Native API description and example content                            | Generated MIME, OpenAPI and MCP artifacts, primary walkthrough                                 |
| `docs/research/map-interfaces.json`                                                  | Public interface capabilities, source evidence and design assessments | Generated research report and landscape, research explorer, interface diagram and search       |
| `specifications/map-0.3/bindings.md`, `interfaces.md`                                | Informative implementation and reuse guidance                         | Sourcey reader                                                                                 |
| `src/data/types.ts`                                                                  | Validated projection, never a second authored definition              | Registry, About, search, contribution examples and download links                              |
| `docs/specification/navigation.ts`                                                   | Chapter order, source paths and descriptions                          | Reader, sitemap and search                                                                     |
| `src/data/navigation.ts`                                                             | Main navigation                                                       | Astro and Sourcey headers                                                                      |
| `docs/releases/current.json`                                                         | Verified package selections                                           | Historical package documentation                                                               |

Run `npm run spec:generate` after editing draft sources, then `npm run verify`. Generation validates contracts, binds example digests, runs shape vectors and refreshes the type chapter, research report and Internet-Draft. The draft uses one explicitly selected illustrative contract; Registry growth does not change its normative content. Verification rejects stale projections. New types require a versioned contract, Registry metadata and complete source example; all current surfaces discover that collection, without per-page lists. Repository review owns acceptance and contributor attribution.

The homepage and Examples use the same `ActionDemo` component and local decision model. The inbox reads its request from the current catalogue and its campaign content from the canonical Markdown; the build rejects a mismatched content digest. Approval queues one simulated send, decline queues none, and changed terms require a fresh review. The illustration makes no network request and is not runtime conformance evidence.

The prior Registry compiler, runtime and package checks remain compatibility maintenance. `src/data/legacy-types.ts` supplies historical record/snapshot URLs and `/registry/catalog.json`, whose existing format is retained for released clients and marked superseded with a link to the current catalogue. Those files never supply current pages. Published profile, schema and contract bytes remain unchanged. Adding a current type never triggers a package release.

## Design and provenance

- `PRODUCT.md`: audience, purpose, voice and boundaries.
- `DESIGN.md`: the selected identity and implemented design system.
- `brand/direction-03-selected.png`: original selected imagegen board.
- `brand/prompts.json`: exact initial fresh imagegen prompts.
- `docs/ARCHITECTURE.md`: selected names and scope record.

The strategy history is maintained separately from this standalone project. No portfolio application was modified to host the site.

The specification reader uses the exact public `sourcey@3.6.10` release. See `docs/SOURCEY.md` for ownership, release evidence, update steps and validation details.

## Published packages

Every package carries the MAP 0.2 core artifacts exactly as published, and none bundles a type contract. The Ruby package also processes MAP documents, and the JavaScript and Python packages check Registry files. Each is published from its maintained language repository. The exact releases currently recommended by the archive come only from [`docs/releases/current.json`](docs/releases/current.json) and appear in the [package archive](https://mailschema.org/archive/map-0.2/tools). Public readback verifies every artifact bundled in each selected release. The packages do not establish endpoint trust or grant authorization.

`npm run packages:prepare` builds distribution sources from the canonical schemas, shared validation code and [`packages/artifacts.json`](packages/artifacts.json). `npm run packages:test` checks the compiled JavaScript package and every selected artifact byte. See [package instructions](packages/README.md) for all language checks and `docs/releases/` for registry readback and artifact hashes. Packages are versioned snapshots of core tooling and compatibility assets; they are not mirrors of the Registry. Publishing or amending a Registry type does not require package releases unless a package API or one of its declared artifacts changes.

The package archive reads each advertised channel from `docs/releases/current.json`. That package-set manifest points to independently verified release evidence and may select different versions for different ecosystems. The site build refuses an unverified selection, a missing version, incorrect registry identity or any package built from different canonical schema bytes.

Publishing to a registry does not change the website. After an artifact is published, independent readback records its evidence under `docs/releases/`; promotion updates `current.json`; the normal verified site deployment then publishes the new installation command. This two-phase release prevents a partial or compromised registry publication from silently becoming the recommended version. Package versions may move independently, while the shared schema digest identifies the contribution format they implement. Package versions and MAP specification versions are also independent.

Run `npm run packages:promote -- --registry npm --version <version>` to verify a public artifact without changing the repository. Add `--promote` to write its immutable evidence and update the selected package set. npm, PyPI, crates.io, Go and RubyGems are supported. The reusable `Verify and promote a package` workflow can be dispatched manually or called by a publishing workflow. It performs public readback, runs the package and site verification suites and opens a pull request. Merging the promotion runs verification on `main` and deploys the exact verified build to Cloudflare. The site never reads a registry's mutable latest value at build time.

The master social cards are generated by `npm run social:generate` from the approved identity and stored under `public/og/`. Astro pages use the MailSchema card; Sourcey specification pages use the MAP card. Versioned filenames allow share-preview caches to be replaced deliberately when the artwork changes.

## Site publication

The production site is `https://mailschema.org`. Astro emits static files in `dist/`; Cloudflare Workers serves those assets through the configuration in `wrangler.jsonc`. The apex domain is canonical and `www.mailschema.org` redirects to it while retaining the path and query string. Canonical metadata, robots discovery and the sitemap use the production origin.

`npm run deploy:dry-run` builds and validates the Worker bundle without publishing. `npm run deploy` runs the complete site verification before publishing the Worker and both custom domains. Pushes to `main` use the already verified CI build and then publish it. CI requires the `CLOUDFLARE_ACCOUNT_ID` repository variable and `CLOUDFLARE_API_TOKEN` secret; no account token belongs in the repository. After publication, verify the apex domain, the `www` redirect, a specification page, a Registry JSON export, the 404 response and the sitemap from the public network.
