# MAP 0.3 specification sources

Working draft. Start with [the overview](overview.md), then [Core](core.md). The same Markdown and JSON documents supply the Sourcey reader, site, Registry, downloads and generated Internet-Draft.

## Documents

- [Core](core.md): description, contracts, trust, permission and exact terms.
- [HTTP binding](http.md): existing service APIs, credentials and native outcomes.
- [Service bindings](bindings.md): informative guidance for native descriptions and existing integrations.
- [Service interfaces](interfaces.md): the wider architecture and sourced research.
- [Capability binding](capability.md): an optional experiment for narrowly limited bearer actions.
- [Type contracts](contracts.md): generated from the current collection of versioned contracts in `contracts/`.
- [Registry and discovery](registry.md): types, implementations, setup and version lifecycle.
- [Conformance](../../conformance/map-0.3/README.md): executable shape vectors and unimplemented runtime scenarios.
- [Standards references](SOURCES.md): primary sources and their roles.

## Source ownership

Edit the Markdown chapters for common requirements. Edit `contracts/<slug>-<version>.json` for type semantics, schemas and operations. All normative type requirements belong inside the digest-bound contract. Published versions keep their original bytes; a change creates a new version. The contract chapter is a generated projection. The Internet-Draft uses one selected illustrative contract revision so new Registry types do not rewrite the protocol document.

`examples/source.json` supplies instance values. `examples/publication.md` and `examples/campaign.md` supply the actual content; generation computes their digests. `bindings/publication.source.json` supplies the native OpenAPI description. Generation derives the publication's full MAP description, MIME email, OpenAPI read response and MCP exchange from those sources. The homepage and Examples share one inbox walkthrough built from the campaign description and content. The website imports these sources and outputs; it does not maintain a second set of example values.

`registry.json` owns category, maintainers, per-version status and the current selection. Contract identity, names, schemas and semantics come from the contract. `implementations/*.json` contains exact service support records; declarations and observed reports remain distinct. New types require three source records: contract, metadata and example. They do not require a Core or package release.

`schemas/` and `context.jsonld` are companion artifacts. Schema validity does not establish authenticity, authority or atomic service behaviour. `catalogue.json` is the generated source inventory, not a published profile or service catalogue. Its hashes cover exact file bytes; contract identities use canonical JSON digests as specified.

`docs/research/map-interfaces.json` owns the interface assessments and primary-source evidence. Its readable report and the interface chapter’s landscape table are generated with the other draft artifacts; the research explorer and interface diagram read the same catalogue. The binding guide is informative and is not included in the Internet-Draft. No universal declarative mapping language is selected.

## Generate and preview

```sh
npm run spec:generate
npm run dev -- --port 4325
```

Open `http://127.0.0.1:4325/specification/overview` or `/examples`. Generated files are committed with their sources. `npm run spec:check` and `npm run draft:check` detect stale outputs; `npm run verify` is the repository's broader pre-publication check.

The MIME example is unsigned, its endpoints are inert, and the interactive views make no network calls. The MCP exchange is illustrative; no normative MAP MCP binding or runtime interoperability is claimed. Existing published artifacts remain available with their original bytes and actual supported versions.

## Delivery order

Nitrosend's first-party sender and inbox have exercised a controlled request through signed receipt, an owner decision and SES campaign delivery. The working-draft candidate records those findings and their limits. Independent interoperability, full runtime conformance, private financial dogfood and language-package releases remain separate milestones. Product code and evidence stay in their owning repositories. The release status is in [the project roadmap](../../docs/ROADMAP.md#next). A schema example does not establish a running implementation.

The [generated individual Internet-Draft candidate](../../ietf/draft-mailschema-mail-action-protocol-00.xml) is not an IETF submission or an adopted standard. Before submission, confirm author details, document date, durable artifact URLs and venue, incorporate review, and render with `xml2rfc`. The source text and generated candidate remain one document. See [the project plan](../../docs/ROADMAP.md) for the wider delivery queue.
