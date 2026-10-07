# Vendor contributions and ingestion

Historical MAP 0.2 intake design. For MAP 0.3 contributions, use the current
[contribution page](../src/pages/contribute.astro) and
[specification sources](../specifications/map-0.3/README.md). The paths and
contract rules below describe the earlier profile.

24 September 2026. Public source and pull-request intake are open at [mailschema/mailschema](https://github.com/mailschema/mailschema). The browser prepares and checks a contribution locally, then opens the exact file in GitHub for review.

## Channel decision

Use a website and Git workflow over the same contribution format. The website provides discovery, examples, validation and a preview. Git provides the reviewed source of record and change history. Agents and developers can use the CLI directly.

| Approach                   | Strength                                                             | Cost                                                            |
| -------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| GitHub only                | Familiar review, authorship and reproducible builds for implementers | More friction for a first-time contributor                      |
| Website with its own queue | Convenient entry point                                               | A second system for identity, moderation, revisions and history |
| Browser-to-Git handoff     | Accessible preparation with one source and one review history        | GitHub sign-in is required to finish the pull request           |

The selected path uses no submission service. After local validation, the website opens GitHub's new-file flow with `registry/contributions/<id>.json` prefilled. GitHub handles contributor identity, forks, branches and pull requests. The website never writes directly to the published collection and maintains no database of pending or accepted types.

## What a vendor contributes

1. **New type:** a definition, maintainers, operations, permissions, results, example and related work. The Registry shows its contributors and proposed maturity; Types, search and About update from the same data. An executable type also carries its contract and request schema in the same pull request, reviewed as exact bytes against the [contract rules](https://mailschema.org/specification/type-contracts) and published in the catalogue, where clients obtain it by digest.
2. **Amendment:** a replacement definition bound to the current record digest. The compiler retains the contributor, summary and submission identifier in history. It rejects stale or competing amendments rather than silently choosing one.
3. **Implementation:** a product's support declaration or test report, bound to a type, version, execution profile, exact record digest and named operations. It appears within that type's record. A declaration against an earlier draft remains labelled against that earlier record.

Vendor attribution does not give a vendor ownership of the general interaction. Maintainers are explicit in each definition. New generic types require review for reuse across services and overlap with existing standards. Product-specific details belong to the implementation declaration or an appropriate extension.

Contributor names and website links are supplied attribution. They do not establish verified organisation identity. A support declaration and a submitted test report are separate evidence categories; neither is an independent compatibility certification.

## Data and validation

- `registry/types/*.json`: base definitions, including the initial MailSchema collection.
- `registry/contributions/*.json`: submitted changes included in the checked-out branch.
- `public/schemas/contribution.schema.json`: the contribution and record contract, using [JSON Schema 2020-12](https://json-schema.org/draft/2020-12).
- `src/registry/`: shared schema/reference validation, deterministic projection, digests and generated examples.
- `src/data/types.ts`: the single consumer-facing projection used by page templates and search.

The submission format is Registry metadata. MAP's message and execution representation are defined separately by the MAP 0.2 profile and each type's contract. Record digests identify the sorted-key JSON representation used by this repository; clients can read the published digest rather than implementing a new signing or identity protocol.

Validation is shared between the website and CLI. Full repository validation additionally resolves amendment dependencies and checks conflicts across submissions. Checks cover required content, known statuses, identifiers, duplicate types and operations, HTTPS references, supported operations, matching profiles and exact version/digest bindings. JSON files are bounded to 256 KiB. Submitted text is rendered as text, and no submitted scripts or reproduction commands are executed.

## Prepare and preview

Use `/contribute` to load a file or start from an example. The checker validates its format and references against `/registry/catalog.json`, previews attribution and prepares the exact JSON for GitHub. Editing the file invalidates the previous result. An unavailable Registry cannot produce a successful reference check. The contribution remains in the browser until the contributor chooses to continue to GitHub. A checked download remains available for local review or command-line use.

The `/tools` page documents the MAP 0.2 packages with pinned installation commands and examples, and the command-line validators that check Registry records; the JavaScript API can also check references against a supplied catalogue. Local validation does not submit a contribution or replace review. Each Registry type page also offers a raw record download accepted by the validators' `--record` option.

In a checkout:

```sh
npm run registry:ingest -- contribution.json
npm run registry:ingest -- contribution.json --write
npm run verify
npm run dev -- --port 4325
```

The first command is read-only. The second creates `registry/contributions/<id>.json` after validating the complete resulting collection. Repeating the same import has no additional effect; reusing its identifier for different content is refused. Concurrent imports use an exclusive local lock. Import changes the local branch and preview, not a published site.

Generated examples use illustrative vendor names. They are preparation and test material, not actual contributors or implementations. The amendment and implementation examples take their digests from the current Registry automatically.

## Review and publication

A contribution file is proposed in a pull request. Contributors can start that pull request from the checked browser handoff or add the same file from a local checkout. The GitHub workflow runs `npm run verify` with a read-only repository token and does not deploy. Protected `main` requires the verification check before merge.

Review checks the interaction's scope, existing standards, contributor and maintainer attribution, requested maturity, exact changes and evidence claims. Schema validation is not editorial acceptance. A requested Draft status requires a version and maintained specification link; the cross-page tests check that the linked definition exists and agrees with the record's shared metadata and operation headings.

After review and merge, the normal site build publishes the collection from the accepted files. In a pull-request preview, records show the proposed change. Inclusion alone does not make a proposal a stable standard or prove a product's compatibility.

Registry publication is independent of language-package publication. Adding a type does not require npm, PyPI, crates.io or Go releases. Implementations consume the exact versioned schema and contract artifacts for the types they support and can vendor them for offline use. A package release is appropriate only when that package's code, API or deliberately bundled reference contracts change.

## Consumer exports

- `/registry/catalog.json`: current records, the snapshots an implementation declaration can bind, implementation declarations and every executable contract version with exact digests.
- `/registry/records/<type>.json`: a current record and digest.
- `/registry/records/<type>.record.json`: the raw current record, without an envelope, for validation and downloads.
- `/registry/snapshots/<digest>.json`: the exact record behind every digest the Registry has published.
- `/registry/contributions/<id>.json`: a submitted contribution retained with its history.

All exports are generated from the same validated files as the HTML. There is no additional database to synchronise. Registry presence grants no authority to execute an email action.
