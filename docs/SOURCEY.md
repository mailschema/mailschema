# MailSchema on Sourcey

The specification is rendered by Sourcey's built-in `reader` theme. The Astro host serves the homepage, Types, Registry, example and site search; `sourcey/astro` owns `/specification`. There is no second Astro Markdown reader, iframe, prebuild script or committed generated docs tree.

## Ownership

- Sourcey OSS: the generic theme contract, layout, styles, client controls, Markdown, navigation, URL handling and indexes.
- MailSchema: sixteen authored chapters, navigation order, brand assets, document metadata, sidebar links and notes, right-aside links, pagination edges and footer content in `docs/specification/`.
- Astro/Cloudflare: host routing and static-asset delivery. The Sourcey integration consumes Astro's client output directory and base prefix.

The reusable theme contains no MailSchema or MAP names. Optional project-content areas are host-authored arrays and disappear when they are not configured. Sourcey's own “Docs by Sourcey” attribution remains part of the renderer. The host's `brand.css` contains brand tokens only. Fonts are self-hosted through the same public asset as the rest of the site.

The MailSchema Registry contains type definitions. Sourcey's earlier candidate product entry has been removed. Sourcey is credited as the specification renderer, with no claim of MAP implementation. Registry and contribution links in the reader sidebar are MailSchema-authored configuration, not Sourcey defaults.

## Package handoff

`package.json` and `package-lock.json` pin the exact public `sourcey@3.6.10` release. The npm tarball has SHA-256 `f6a91124a06a25efb9be989dc022a61a6bed4e9c22a132f4b08b7392b3dee486` and npm shasum `3faee44b60f812f149b41eb691afe4feacea6e38`; both match the public registry artifact. A clean consumer install imported Sourcey and contained the packaged reader theme before MailSchema adopted it.

Sourcey is maintained in [`sourcey/sourcey`](https://github.com/sourcey/sourcey). Updating MailSchema requires an intentional exact-version change, public registry readback, a clean install and the complete build, browser and visual checks. MailSchema does not track a mutable npm tag or a local Sourcey checkout.

## Verification

Rendering regressions are Sourcey's to test, in its own suite. MailSchema checks that the site builds with the pinned release; its earlier pixel references are in the repository history.

Sourcey's existing default, minimal and API-first layouts were compared against a clean checkout of their prior source, on Markdown and OpenAPI pages at desktop and mobile sizes. All 12 comparisons had zero visible differences. Sourcey's full test suite, type checking and lint passed. The artifact also contains a test proving every registered theme's compiled assets are packaged.

Cloudflare validation used the existing Astro 7.2.9 / @astrojs/cloudflare 14.2.0 combination and local Wrangler 4.131.2. Static output and server output with `/project` as the host base both built; the local Worker returned 200 for the no-slash alias, slash index, nested chapter and theme assets. Copy controls initialized with no browser errors. Astro development was also tested over HTTP, including its HTML content type. The alias base-prefix regression is covered in Sourcey's Astro integration tests. No Cloudflare deployment occurred during that earlier Sourcey package validation. MailSchema's later static production deployment is recorded in `VALIDATION.md` and does not change Sourcey's package ownership.
