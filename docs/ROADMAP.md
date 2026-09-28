# MailSchema roadmap

Status date: 28 September 2026.

## Objective

Make MAP a useful open standard for service actions carried through email, with MailSchema as its specification, type Registry and implementation ecosystem. Prove it in products we control, record exact evidence, accept external contributions through reviewed Registry data, and state maturity and ownership exactly.

## Invariants

1. MailSchema is the project and ecosystem. Mail Action Protocol is the specification.
2. MAP layers typed action descriptions and authenticated HTTPS execution on existing email and IETF Structured Email work.
3. Receiving an email grants no authority except possession: a capability URL, issued to one recipient, for operations whose contract permits it and whose message passes DKIM and DMARC. Otherwise a client trusts the service endpoint independently and uses an existing credential.
4. Human-readable email and normal service interfaces remain available.
5. MAP introduces no mandatory global identity provider, custom DNS mechanism, central runtime lookup or universal policy language.
6. Registry records bind definitions, versions, operation IDs and implementation evidence. Registry presence does not grant runtime authority.
7. Draft maturity, ownership and implementation evidence are stated exactly. Common-ownership dogfood is not presented as independent adoption.
8. Credentials and private operational data stay outside public artifacts.

## Current state

| Surface                      | State                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site and Registry            | Live at [mailschema.org](https://mailschema.org), deployed from [`mailschema/mailschema`](https://github.com/mailschema/mailschema) after verification      |
| MAP 0.2 profile              | Working draft: a type-agnostic core, with types published through the Registry and resolved by clients from its catalogue                                   |
| Interaction types            | The initial [collection](TYPE-COLLECTION.md) of ten drafts, each with a digest-bound contract, request schema, chapter and fixtures                         |
| Reference and conformance    | One contract-driven engine for every type; 100 executable cases mapped to 39 requirements, with shared vectors and a DKIM-signed message kit                |
| Ruby                         | `mailschema` `0.2.0` on RubyGems, published from [`mailschema/ruby`](https://github.com/mailschema/ruby) through trusted publishing                         |
| JavaScript, Python, Rust, Go | npm, PyPI and crates.io `0.2.1` and Go `v0.2.0` carry the MAP 0.2 core artifacts and the Registry tooling, and no type contracts                            |
| Nitrosend                    | Content Review 0.3 on MAP 0.2 deployed in production, on the Ruby gem; the MAP 0.2 evidence run is pending                                                  |
| Sourcey                      | `3.6.10` renders the specification                                                                                                                          |
| Internet-Draft               | Generated from the profile and the contract rules by `npm run draft`, and checked against them in verification; discussion and submission have not occurred |

## Repositories

- [`mailschema/mailschema`](https://github.com/mailschema/mailschema): specification, site, Registry, schemas, fixtures, conformance suite, package sources and Internet-Draft.
- [`mailschema/ruby`](https://github.com/mailschema/ruby), [`javascript`](https://github.com/mailschema/javascript), [`python`](https://github.com/mailschema/python), [`rust`](https://github.com/mailschema/rust) and [`go`](https://github.com/mailschema/go): one repository and release history per language.
- [`mailschema/.github`](https://github.com/mailschema/.github): the organization profile.
- Nitrosend and Sourcey stay in their product repositories. MailSchema records their supported versions and evidence rather than copying their code.

## Next

1. **Nitrosend evidence.** Rerun the MAP 0.2 Content Review journey and record its implementation declaration against the Content Review 0.3 record, disclosing common ownership.
2. **An independent implementation.** Seek one implementation outside the common-ownership group that reproduces a core case, before claiming interoperability.
3. **IETF.** Seek early feedback on the generated draft and submit it as an individual draft.

## Gates

- A change to a published profile, contract or schema is a new version; its artifacts are never edited in place.
- Every package release is verified against the canonical bytes by public readback before the site selects it.
- Every implementation claim links to reproducible evidence and states who operates the implementation.
- The cutover reviews and the September scope audit are kept in [`history/`](history/).
