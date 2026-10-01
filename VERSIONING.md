# Versioning

MailSchema has five independent version lines.

| Surface          | Version identifies                                                   | Compatibility rule                                                                                     |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| MAP profile      | The core: descriptions, requests, results, authority and trust rules | A breaking normative change creates a new profile identifier. Adding a type never changes the profile. |
| Interaction type | The semantics, details and operations of one interaction             | A breaking change creates a new type version and contract digest.                                      |
| Shared block     | A schema component that contracts reuse, such as form fields         | Never edited. A changed block is a new file, pinned by the contracts that adopt it.                    |
| Registry record  | The exact accepted definition and history                            | Every material record change creates a new immutable digest.                                           |
| Tooling package  | A language-specific distribution                                     | Package versions advance independently when their code or bundled core artifacts change.               |

Once a profile, type version or shared block is published, its identifier, schema, contract and canonical digest are immutable. Later changes use a new identifier. Implementations match profile and type identifiers exactly rather than treating all `0.x` versions as compatible.

Published artifacts remain available at their canonical URLs after supersession. They may leave navigation, catalogues and current tooling, but their bytes do not change. Responses identify the deprecation date and successor through standard HTTP metadata. Retiring an implementation does not delete the artifacts that describe or test its published protocol version.

The profile record publishes digests for its JSON-LD context, core schema and contract format. Implementations pin and bundle those exact bytes; they do not resolve a context or schema named by a message. A type contract pins, by canonical digest, every schema it depends on. The conformance manifest binds the complete artifact set used by a suite revision.

Registry record digests use SHA-256 over RFC 8785 canonical bytes for the complete record. Implementation declarations and history bind to them. Wire compatibility follows the type contract digest, so Registry metadata can change without changing a compatible contract. A type changed by amendment keeps its earlier snapshot, so evidence recorded against it stays valid.

The website promotes an explicit verified package version for each registry. It never resolves a registry's mutable `latest` label during a build.

## Change classes

| Class                    | What changes                                                                                                                                                      | Effect                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Informative              | Explanations, examples, references and links.                                                                                                                     | No version change.                                       |
| Compatible clarification | A `SHOULD` or `MAY`, or the precise meaning of an existing requirement, where every valid document and exchange stays valid and no conforming client must change. | Same identifiers and digests, recorded in the log below. |
| Breaking                 | A schema, contract or digest, a required field, status mapping or outcome, or a new client obligation.                                                            | A new profile, type or block version.                    |

## Change log

- 2 October 2026, historical availability: the 1 October deletion ruling is replaced. Published MAP 0.1 artifacts and their conformance fixtures remain available as immutable, unlisted resources with MAP 0.2 identified as the successor. The retired MAP 0.1 runtime and package code remain removed.
- 28 September 2026, MAP 0.2, compatible clarification: a client may obtain a contract it has not bundled from a Registry catalogue it has configured, verifying every digest, so types added to the Registry are usable without a client release. The contract rules moved to the Type contracts chapter unchanged.
- 25 September 2026, MAP 0.2: a type-agnostic core.
  - Types define `details`, and requests bind the exact description by its RFC 8785 digest.
  - Operations declare credential or possession authority, their consequences and whether they repeat.
  - The core owns decisions and the approval lifecycle, including `approvalUrl`, failure reasons, `already-decided` and `superseded`.
  - The description names the RFC 9728 protected resource, results may name the actor, and input errors carry JSON Pointers.
  - Content Review 0.3 and nine new types are published on it, with the form fields block 0.1.
