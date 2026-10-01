# MailSchema roadmap

Status date: 2 October 2026.

The [0.3 architecture baseline](MAP-0.3-DESIGN.md) governs new work. Its [specification bundle](../specifications/map-0.3/README.md) now contains Core, the HTTP and experimental capability bindings, four draft contracts, conformance skeletons, and the generated `-00` candidate. The published 0.2 site and package state below remain distinct from this staged work.

## Objective

Make MAP a useful open standard for service actions carried through email, with MailSchema as its specification, type Registry and implementation ecosystem. Prove it in products we control, record exact evidence, accept external contributions through reviewed Registry data, and state maturity and ownership exactly.

## Invariants

1. MailSchema is the project and ecosystem. Mail Action Protocol is the specification.
2. MAP layers typed action descriptions on email and Structured Email. For 0.3, a trusted implementation maps them to existing service operations; there is no universal execution endpoint or request/result envelope.
3. Receiving an email grants no authority except possession: a capability URL, issued to one recipient, for operations whose contract permits it and whose message passes DKIM and DMARC. Otherwise a client trusts the service endpoint independently and uses an existing credential.
4. Human-readable email and normal service interfaces remain available.
5. MAP introduces no mandatory global identity provider, custom DNS mechanism, central runtime lookup or universal policy language.
6. Registry records bind definitions, versions, operation IDs and implementation evidence. Registry presence does not grant runtime authority.
7. Draft maturity, ownership and implementation evidence are stated exactly. Common-ownership dogfood is not presented as independent adoption.
8. Credentials and private operational data stay outside public artifacts.

## Current state

| Surface                   | State                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site and Registry         | Live at [mailschema.org](https://mailschema.org), deployed from [`mailschema/mailschema`](https://github.com/mailschema/mailschema) after verification                                |
| MAP 0.2 profile           | Working draft: a type-agnostic core, with types published through the Registry and resolved by clients from its catalogue                                                             |
| Interaction types         | The initial [collection](TYPE-COLLECTION.md) of ten drafts, each with a digest-bound contract, request schema, chapter and fixtures                                                   |
| Reference and conformance | One contract-driven engine for every type; 100 executable cases mapped to 39 requirements, with shared vectors and a DKIM-signed message kit                                          |
| Ruby                      | `mailschema` `0.2.0` on RubyGems processes MAP 0.2, published from [`mailschema/ruby`](https://github.com/mailschema/ruby) through trusted publishing                                 |
| JavaScript                | `mailschema` `0.2.2` on npm processes MAP 0.2 from the same core the reference implementation and conformance suite run                                                               |
| Python, Rust, Go          | PyPI and crates.io `0.2.1` and Go `v0.2.0` carry the MAP 0.2 core artifacts and the Registry tooling, and no type contracts                                                           |
| Nitrosend                 | Content Review 0.3 on MAP 0.2 deployed in production, on the Ruby gem; the MAP 0.2 evidence run is pending                                                                            |
| Sourcey                   | `3.6.10` renders the specification                                                                                                                                                    |
| Internet-Draft            | The 0.3 `-00` candidate is generated from the new specification and contracts. The prior 0.2 candidate remains reproducible in `ietf/archive/`. No submission or adoption is claimed. |

## Repositories

- [`mailschema/mailschema`](https://github.com/mailschema/mailschema): specification, site, Registry, schemas, fixtures, conformance suite, package sources and Internet-Draft.
- [`mailschema/ruby`](https://github.com/mailschema/ruby), [`javascript`](https://github.com/mailschema/javascript), [`python`](https://github.com/mailschema/python), [`rust`](https://github.com/mailschema/rust) and [`go`](https://github.com/mailschema/go): one repository and release history per language.
- [`mailschema/.github`](https://github.com/mailschema/.github): the organization profile.
- Nitrosend and Sourcey stay in their product repositories. MailSchema records their supported versions and evidence rather than copying their code.

## Next

1. **Specification review.** Review the completed 0.3 text and contract semantics. Runtime conformance scenarios remain explicitly unimplemented; passing shape checks does not change that status.
2. **Dogfood.** Update the product examples and prove Campaign Send Approval through the existing service API, including authoritative readback and the exact-terms race. Follow the bundle's implementation handoff. Do not reinterpret old Content Review approvals as send or publication permission.
3. **IETF.** Incorporate feedback and prepare the individual `-00` for the 2 November 2026, 23:59 UTC cutoff. Consult SML on container/trust and DISPATCH on venue; neither consultation nor submission has occurred in this delivery.
4. **Second workflow and interoperability.** Prove Publication Approval in a real publishing service. Seek independent implementations; disclose common ownership and keep the capability binding experimental.
5. **Runtime and publication.** Implement the shared suite and review each package's compatibility before choosing versions. Publish the new profile and Registry artifacts deliberately, preserving historical identities. No package release follows merely from drafting a contract.

## Gates

- A change to a published profile, contract or schema is a new version; its artifacts are never edited in place.
- Every package release is verified against the canonical bytes by public readback before the site selects it.
- Every implementation claim links to reproducible evidence and states who operates the implementation.
