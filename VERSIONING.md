# Versioning

MailSchema has four independent version lines.

| Surface          | Version identifies                              | Compatibility rule                                                                      |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| MAP profile      | The description, request and result contract    | A breaking normative change creates a new profile identifier.                           |
| Interaction type | The semantics and operations of one interaction | A breaking semantic change creates a new type version and contract digest.              |
| Registry record  | The exact accepted definition and history       | Every material record change creates a new immutable digest.                            |
| Tooling package  | A language-specific distribution                | Package versions may advance independently if they implement the same canonical schema. |

Draft `0.x` profiles may change before their first public snapshot. Once a profile or type version is published, its identifier, schema, contract and canonical digest are immutable. Later draft changes use a new profile or type version. Implementations must use exact profile and type identifiers rather than treating all `0.x` revisions as compatible.

The profile record publishes digests for its JSON-LD context and JSON Schema. Implementations pin and bundle those exact bytes; they do not resolve a context from an untrusted message at runtime. The conformance manifest binds the complete artifact set used by a suite revision.

Registry record digests use SHA-256 over RFC 8785 JSON Canonicalization Scheme bytes for the complete record. They identify the catalogue record that implementation declarations and history bind to. Wire compatibility follows the type contract digest, so Registry metadata can change without changing a compatible contract.

The website promotes an explicit verified package version for each registry. It never resolves a registry's mutable `latest` label during a build.

## Change classes

| Class                    | What changes                                                                                                                                                      | Effect                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Informative              | Explanations, examples, references and links.                                                                                                                     | No version change.                                       |
| Compatible clarification | A `SHOULD` or `MAY`, or the precise meaning of an existing requirement, where every valid document and exchange stays valid and no conforming client must change. | Same identifiers and digests, recorded in the log below. |
| Breaking                 | A schema, contract or digest, a required field, status mapping or outcome, or a new client obligation.                                                            | A new profile or type version.                           |

Breaking changes that are not yet needed are collected in the [roadmap](docs/ROADMAP.md#next-profile-version) and released together.

## Clarification log

- 25 September 2026, MAP 0.1:
  - Services should record the actor of each claimed request and human decision separately from the principal.
  - Clients may configure a service from RFC 9728 protected resource metadata through `map_services`; `authorization.audience` is that protected resource identifier.
  - A changed type contract is a new interaction, as a changed target revision or operation set already was.
  - A decision attempt the service's own rules do not permit returns `refused` and leaves the saved result unchanged.
- 25 September 2026, Content Review 0.2: decision-time content and sending rules leave the proposal `approval-required` until the reviewer declines it or it expires.
