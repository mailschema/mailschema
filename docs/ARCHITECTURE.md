# MailSchema and Mail Action Protocol (MAP)

MailSchema is the open project for agent interactions through email. Its first specification is **Mail Action Protocol (MAP)**, which defines how agents discover and complete service actions offered through email, with people retaining control.

**Status: selected foundational architecture, 22 September 2026.** The project name, specification name and acronym are settled. Direction 03 is the selected yellow-and-blue identity; the technical specification remains a working draft.

## Names and hierarchy

- **Project / publishing home:** MailSchema.
- **Specification:** Mail Action Protocol.
- **Acronym:** MAP.
- **Initial document:** Mail Action Protocol (MAP) 0.1 — Draft.
- **Shared definitions:** MailSchema Types.
- **Type-definition registry:** MailSchema Registry.
- **First interaction type:** Content Review.
- **Initial product proof:** One reproducible Content Review exchange through Nitrosend.
- **Independent adoption milestone:** A separately operated implementation reproduces a core Content Review case.
- **Project site:** [mailschema.org](https://mailschema.org), published through Cloudflare Workers.

Mail Agent Protocol, Model Email Protocol, A-Mail and MailSchema Interactions are historical candidates. MAP must expand to Mail Action Protocol in all active plans, summaries and new brand work. “Agent” belongs in the opening explanation. The name decision is not to be reopened based solely on earlier ratings or acronym reservations.

## Positioning to use now

**Project category:** Open standards for agent interactions through email.

**Public headline:** Email agents can act on.

**Project summary:** MailSchema is building an open standard for agents to work with services through email. It publishes Mail Action Protocol (MAP) and shared interaction types. The Registry collects submitted type definitions, versions, examples and review history, with implementation evidence attached to the relevant type.

**Protocol summary:** Mail Action Protocol (MAP) is an open specification for agents to discover and complete service actions offered through email. People can use the same underlying operations through readable email and normal service interfaces.

**Technical summary:** MAP specifies typed action descriptions, target/revision binding, authorized requests and truthful results, using existing email formats, suitable action vocabulary and service authorization.

The human path and receiver control remain in scope. Agent-first positioning does not require every participant to be an AI model or remove conventional applications.

## Foundational boundaries

MailSchema is the open project and home for related specifications. MAP is a specification it publishes. Types define interaction semantics; the Registry collects their submitted definitions and maintains their versions, examples and review history. Implementation declarations and evidence are associated with a type and version. These are responsibilities within one ecosystem, without a required central runtime.

The Registry is organised around submitted types. Services and clients are supporting records within a type version. The website follows that model, with one validated collection supplying the Registry, detail pages and site search.

Core requirements stay inside the first MAP document. Split a common-requirements document only when multiple real profiles need it. Do not invent another brand or launch workstream merely to fill a family diagram.

The first product proof begins with a campaign-email review workflow in Nitrosend. Compatibility cannot require a MailSchema or Nitrosend account: other services and clients can implement the published contracts without a central runtime or mandatory registry lookup. The Registry begins with maintained type definitions and examples. A type's editorial status and a product's compatibility evidence are distinct.

Adopt suitable existing standards, including competitor work. No new identity system, generic transport, compulsory DNS scheme or universal policy runtime is required by this architecture. Expand the type collection through defined interactions and documented reuse. A name in a proposed collection is not an implemented type.

## First specification and implementation proof

MAP 0.1 begins with **Content Review**. A structured email describes the review and its available operations. The initial execution profile uses authenticated HTTPS and the service's existing authorization.

An email service sends a test, a reviewer requests changes, a permitted agent revises the draft, and an authorized person approves the exact new revision. Stale approval fails. Approval records a decision; sending the campaign remains a separate authorized operation.

The specification must define enough shared request/result behavior for the same type-specific consumer logic to work with a second service. The second service must come from a real product workflow that already owns authenticated revisions and durable review state. Sourcey's renderer is not made stateful to manufacture that proof. Common ownership is disclosed, and independent adoption remains a separate later claim.

Use the requirement-selection rule in the current charter: interoperability needs, correct and authorized effects with truthful outcomes, or a dependency's conformance requirement. Broader A-Mail machinery stays deferred unless it earns its place.

## Brand architecture

One MailSchema identity supports the project, Types and Registry. A related **MAP / Mail Action Protocol** treatment identifies the technical specification. MAP is the selected acronym and can be visually prominent; introduce its full expansion in the first technical reference.

Develop all new visual directions from the chosen architecture and fresh creative briefs. Do not adapt the old A-Mail wordmarks, symbols, boards or prompt concepts. The new boards should show the homepage, specification reader, Types, Registry and a real review interaction together.

The identity brief lives in [brand/IDENTITY.md](../brand/IDENTITY.md). Direction 03 uses charcoal, acid yellow-lime and blue-violet. The Astro site is published at `https://mailschema.org` with a homepage, specification reader, Types, Registry and a browser-local Content Review example.

## Source of truth

1. This document controls selected naming, hierarchy and opening positioning.
2. The project charter controls scope, reuse, authority and the first proof.
3. The implementation and demo brief records the product workflow and known gaps.
4. Older naming and strategy documents remain dated research. Their provisional names do not override this decision.

Publication of the project site, exact profile and Registry tooling does not claim IETF adoption, a reproduced end-to-end product run or an independent implementation of the specification.

The [24 September scope audit](SCOPE-AUDIT.md) records the baseline defects and their current resolution state. Its findings and the [execution plan](ROADMAP.md) govern the remaining product, release and adoption evidence; they do not reopen the selected names or expand the protocol's scope.

## Specification renderer

The approved reader is a reusable Sourcey OSS `reader` theme. MailSchema configures and serves it through `sourcey/astro` at `/specification/`, keeping all other routes in the Astro host. Authored specifications live in `docs/specification/`; Sourcey emits their HTML, search and machine-readable indexes. See `SOURCEY.md` for ownership and validation.

## Language and collection review

The applied review packet is in [editorial-review/README.md](editorial-review/README.md). It covers the homepage, supporting pages, all six specification chapters and a five-entry collection. Content Review remains the only semantic type draft. Information Request and Subscription Preferences are proposals. Task Assignment and Event Response are assessments of how existing standards could be reused. Publishing these records on the project site does not expand the implemented protocol or establish compatibility.

Registry records have canonical `/registry/<type>/` addresses. The old Content Review address redirects to its record; the former Sourcey product listing has been removed. Each record documents operations, examples, references, version status and open questions. Implementation evidence will be attached to the relevant type version and profile, rather than listed as a separate directory of products.

## Content ownership

The Types page presents every record as a guide to choosing an interaction, including its operations and a concrete example. The Registry presents the same collection as maintained records. Both views, individual records, site search and About's collection list use the validated projection in `src/data/types.ts`. Authored data lives in `registry/types/` and `registry/contributions/`; vendors contribute JSON rather than application TypeScript. Status groups and counts are computed from those records. A separately curated one-type list on the Types page is no longer permitted.

Full specification prose remains authored Markdown rendered by Sourcey. Linked type navigation metadata uses the shared record. Cross-page tests check collection coverage, names, summaries, maturity labels, versions, operations and examples; linked specification metadata and operation headings are checked against the type record. `npm run verify` runs the check, build and browser test sequence. Meaningful changes to behaviour still require reviewing the definition, record and demonstration together.

## Vendor intake

The selected implementation combines browser intake with Git-based review. One contribution format covers new types, amendments and implementation declarations. Contributors and maintainers are record data; declarations belong to the exact type version, profile and record digest. The website, CLI, page renderer and JSON exports share the validation and projection pipeline. See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for the operating process.

The browser checks a contribution against the current Registry, previews it and opens the exact checked JSON in GitHub's new-file flow. GitHub handles sign-in, a fork or branch and the pull request. Accepted Registry state still comes only from reviewed files merged into this repository. No GitHub App, submission database, private account system or second moderation queue is required. There are no real vendor submissions in the current collection; examples stay separate from it.

## Package documentation

The approved integration places package installation, examples and API reference at `/tools/` within the MailSchema site. Tools is linked from the main navigation, search, contribution guide, type record downloads and the specification reader's resource links. The packages validate or expose MAP 0.1, Content Review 0.2 and Registry contracts. They do not send email, establish endpoint trust or grant authorization. Normative MAP requirements remain in the specification.

This repository is the sole normative source for the profile, context, JSON Schemas, type records, fixtures and conformance requirements. Language repositories own their language APIs, CI, tags and publication. Their schema files are vendored projections of the canonical bytes and do not define MAP. Published package versions are independent of specification versions and may differ between language ecosystems. `packages/versions.json` records the current release declarations without requiring synchronized releases. `docs/releases/current.json` is the explicit package set promoted to the website. Each channel points to immutable release evidence; `src/data/tooling.ts` supplies the selected versions, registry links and commands. Legacy evidence is labelled as contribution-schema-only. New release evidence verifies every contract distributed by the package.

Registry publication and website promotion are separate phases. Publishing an artifact does not mutate the static site or make it recommended. Independent registry readback first records evidence; changing the package-set manifest then becomes a reviewable source change and deploy. Once repository automation exists, it may prepare that promotion after every successful verified release, but it must retain the evidence gate rather than scrape “latest” versions during a site build.

The reusable promotion workflow is deliberately pull-request based. It can be started manually or called by a package-publishing workflow. Given one registry and exact version, it downloads the public artifact, verifies published integrity where available, extracts every distributed contract and compares its exact bytes with the canonical source. It then writes additive immutable evidence, changes only that registry's selected version, runs the complete verification suite and opens a promotion pull request. Other language packages keep their existing versions. After merge, the `main` workflow verifies the repository again and deploys that exact build to Cloudflare.

Type pages offer raw record downloads that work directly with package validators. Existing digest-envelope exports remain available for consumers. The contribution flow distinguishes structural validation, checks against Registry references and review. The Rust package embeds schemas; JavaScript and Python provide validation; Go provides typed documents, strict decoding and core reference checks. Public artifact readback for the next changed release binds every distributed contract to the exact canonical bytes.

The main navigation is shared between Astro and MailSchema's Sourcey configuration. The reader's additional resource link is project configuration; the Sourcey package and generic reader theme are unchanged.

## Share previews

MailSchema owns two 1200 × 630 social cards generated from the approved identity: a project card for Astro pages and a MAP card for Sourcey specification pages. Both use self-hosted type, the MailSchema mark and the describe/request/resolve structure. Their versioned public filenames are stable cache keys. Page titles, descriptions and canonical URLs remain specific to the shared page even when several pages use the same master artwork.

## Production hosting

The Astro site is generated statically and served by the `mailschema` Cloudflare Worker. `mailschema.org` is the canonical custom domain; `www.mailschema.org` redirects permanently to the same path and query on the apex. The Worker adds baseline security headers and uses Cloudflare's static asset binding for HTML, JSON, schemas, fonts and Sourcey output. The production origin drives canonical metadata and both Astro and Sourcey sitemap entries.

The project owns `wrangler.jsonc`, the small request wrapper in `worker.js` and the deployment scripts. `npm run deploy` must complete Registry validation, Astro diagnostics, a production build and browser tests before publication. Cloudflare credentials remain outside the repository. The final configuration disables the `workers.dev` and version-preview origins so the custom domain is the only public site origin.
