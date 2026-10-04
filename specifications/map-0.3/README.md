# MAP 0.3 specification sources

Working draft. Start with [the overview](overview.md), then [Core](core.md). The same Markdown and JSON documents supply the Sourcey reader, site, Registry, downloads and generated Internet-Draft.

## Documents

- [Core](core.md): description, contracts, trust, permission and exact terms.
- [HTTP binding](http.md): existing service APIs, credentials and native outcomes.
- [Service bindings](bindings.md): informative guidance for native descriptions and existing integrations.
- [Service interfaces](interfaces.md): the wider architecture and sourced research.
- [Capability binding](capability.md): an optional experiment for narrowly limited bearer actions.
- [Type contracts](contracts.md): generated from the four complete contracts in `contracts/`.
- [Registry and discovery](registry.md): types, implementations, setup and version lifecycle.
- [Conformance](../../conformance/map-0.3/README.md): executable shape vectors and unimplemented runtime scenarios.
- [Standards references](SOURCES.md): primary sources and their roles.

## Source ownership

Edit the Markdown chapters for common requirements. Edit `contracts/*.json` for type semantics, schemas and operations. All normative type requirements belong inside the digest-bound contract. The contract chapter and Internet-Draft appendix are generated projections.

`examples/source.json` supplies instance values. `examples/publication.md` supplies the actual example content; generation computes its digest. `bindings/publication.source.json` supplies the native OpenAPI description. Generation derives the full MAP description, MIME email, OpenAPI read response and MCP exchange from those sources. The website imports those outputs; it does not maintain a second set of example values.

`registry.json` owns category, maintainers and evidence. Contract identity, names, schemas and semantics come from the contract. New types require those three source records: contract, metadata and example. They do not require a Core or package release.

`schemas/` and `context.jsonld` are companion artifacts. Schema validity does not establish authenticity, authority or atomic service behaviour. `catalogue.json` is the generated source inventory, not a published profile record. Its hashes cover exact file bytes; contract identities use canonical JSON digests as specified.

`docs/research/map-interfaces.json` owns the interface assessments and primary-source evidence. Its readable report and the interface chapter’s landscape table are generated with the other draft artifacts; the research explorer and interface diagram read the same catalogue. The binding guide is informative and is not included in the Internet-Draft. No universal declarative mapping language is selected.

## Generate and preview

```sh
npm run spec:generate
npm run dev -- --port 4325
```

Open `http://127.0.0.1:4325/specification/overview` or `/examples`. Generated files are committed with their sources. `npm run spec:check` and `npm run draft:check` detect stale outputs; `npm run verify` is the repository's broader pre-publication check.

The MIME example is unsigned, its endpoints are inert, and the interactive views make no network calls. The MCP exchange is illustrative; no normative MAP MCP binding or runtime interoperability is claimed. Existing published artifacts remain available with their original bytes and actual supported versions.

## Delivery order

Nitrosend's first-party sender and inbox have exercised a controlled request through signed receipt, an owner decision and SES campaign delivery. Reconcile those findings with the canonical text before publishing the 0.3 working draft, and state the limits of that proof. Independent interoperability, full runtime conformance, private financial dogfood and language-package releases remain separate milestones. Product code and evidence stay in their owning repositories. The publication gate is owned by [the project plan](../../docs/ROADMAP.md#next). A schema example does not establish a running implementation.

The [generated individual Internet-Draft candidate](../../ietf/draft-mailschema-mail-action-protocol-00.xml) is not an IETF submission or an adopted standard. Before submission, confirm author details, document date, durable artifact URLs and venue, incorporate review, and render with `xml2rfc`. The source text and generated candidate remain one document. See [the project plan](../../docs/ROADMAP.md) for the wider delivery queue.
