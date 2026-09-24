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

Registry record digests use SHA-256 over RFC 8785 JSON Canonicalization Scheme bytes for the complete record. A changed digest always requires explicit implementation support, even when review concludes that the changed record remains semantically compatible.

The website promotes an explicit verified package version for each registry. It never resolves a registry's mutable `latest` label during a build.
