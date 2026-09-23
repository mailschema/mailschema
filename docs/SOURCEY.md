# MailSchema on Sourcey

The specification is rendered by Sourcey's built-in `reader` theme. The Astro host serves the homepage, Types, Registry, example and site search; `sourcey/astro` owns `/specification/`. There is no second Astro Markdown reader, iframe, prebuild script or committed generated docs tree.

## Ownership

- Sourcey OSS: the generic theme contract, layout, styles, client controls, Markdown, navigation, URL handling and indexes.
- MailSchema: six authored chapters, navigation order, brand assets, document metadata, sidebar links and notes, right-aside links, pagination edges and footer content in `docs/specification/`.
- Astro/Cloudflare: host routing and static-asset delivery. The Sourcey integration consumes Astro's client output directory and base prefix.

The reusable theme contains no MailSchema or MAP names. Optional project-content areas are host-authored arrays and disappear when they are not configured. Sourcey's own “Docs by Sourcey” attribution remains part of the renderer. The host's `brand.css` contains brand tokens only. Fonts are self-hosted through the same public asset as the rest of the site.

The MailSchema Registry contains type definitions. Sourcey's earlier candidate product entry has been removed. Sourcey is credited as the specification renderer, with no claim of MAP implementation. Registry and contribution links in the reader sidebar are MailSchema-authored configuration, not Sourcey defaults.

## Package handoff

`package.json` and `package-lock.json` pin the exact public `sourcey@3.6.6` release. The npm tarball has SHA-256 `f451ebecf67120d003049706731d15fa7b10f9af163df268bd1b4a5289fe0f47` and npm shasum `89b7d9e5a2a3ac669ebf08469f7841ca41b2e2b7`; both match the verified release artifact. A clean consumer install imported Sourcey and contained the packaged reader theme before MailSchema adopted it.

Sourcey is maintained in [`sourcey/sourcey`](https://github.com/sourcey/sourcey). Updating MailSchema requires an intentional exact-version change, public registry readback, a clean install and the complete build, browser and visual checks. MailSchema does not track a mutable npm tag or a local Sourcey checkout.

## Verification

All six chapters are compared at 1440 × 1000 and 390 × 844 in `tests/visual-reference/`. The current baseline reflects the approved language pass and sidebar changes. The preceding references and comparison report are retained in `tests/visual-reference/pre-language-pass/`. Refreshing the content baseline is not a new claim of renderer migration parity. `npm run test:visual` checks full-page dimensions and requires zero raw RGBA pixel differences in the recorded Chromium environment. Pixelmatch additionally produces human-readable diff images; its threshold does not relax the raw-pixel acceptance condition.

Sourcey's existing default, minimal and API-first layouts were compared against a clean checkout of their prior source, on Markdown and OpenAPI pages at desktop and mobile sizes. All 12 comparisons had zero visible differences. Sourcey's full test suite, type checking and lint passed. The artifact also contains a test proving every registered theme's compiled assets are packaged.

Cloudflare validation used the existing Astro 7.2.9 / @astrojs/cloudflare 14.2.0 combination and local Wrangler 4.131.2. Static output and server output with `/project` as the host base both built; the local Worker returned 200 for the no-slash alias, slash index, nested chapter and theme assets. Copy controls initialized with no browser errors. Astro development was also tested over HTTP, including its HTML content type. The alias base-prefix regression is covered in Sourcey's Astro integration tests. No Cloudflare deployment occurred during that earlier Sourcey package validation. MailSchema's later static production deployment is recorded in `VALIDATION.md` and does not change Sourcey's package ownership.
