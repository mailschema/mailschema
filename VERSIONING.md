# Versioning

MailSchema has four independent version lines.

| Surface          | Version identifies                              | Compatibility rule                                                                      |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| MAP profile      | The description, request and result contract    | A breaking normative change creates a new profile identifier.                           |
| Interaction type | The semantics and operations of one interaction | A breaking semantic change creates a new type version and record digest.                |
| Registry record  | The exact accepted definition and history       | Every material record change creates a new immutable digest.                            |
| Tooling package  | A language-specific distribution                | Package versions may advance independently if they implement the same canonical schema. |

Draft `0.x` profiles may change. Implementations must use exact profile and type identifiers rather than treating all `0.x` revisions as compatible.

The website promotes an explicit verified package version for each registry. It never resolves a registry's mutable `latest` label during a build.
