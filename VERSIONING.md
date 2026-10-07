# Versioning

MAP Core, type contracts, service bindings and tooling packages advance independently. A new type alone changes none of the others.

| Surface | Version identifies | Change rule |
| --- | --- | --- |
| MAP profile | The common message shape, trust and authority rules | A change to wire or authority interpretation requires a new profile. Published profile artifacts retain their original bytes. |
| Type contract | The meaning, inputs, effects and requirements of one interaction | Every change to the canonical bytes of a published contract requires a new version and digest. |
| Service binding | How existing service operations satisfy Core and a contract | A changed published binding artifact receives a new revision; an integration names the exact versions it supports. |
| Tooling package | One language distribution | Package versions advance when their code or declared bundled artifacts change. Catalogue additions do not force a release. |

A contract owns its identifier, version and normative meaning. The Registry records category, maintainers, lifecycle status, the current selection and exact service support. Those metadata and page explanations may be updated without changing contract bytes. A service record names the exact contract ID, version and canonical JSON digest; a name or version range alone does not establish support. A declaration states the maintainer's claim, while a report records tested revisions and observations.

Published versioned artifact URLs retain their original bytes after supersession. Older versions may leave current navigation but remain available for interpreting past messages. A successor is a discovery hint; it does not alter an earlier decision or standing permission. Local, unpublished drafts can change during review. Publication fixes that revision, including one labelled Draft.

The public catalogue is a view of the canonical contracts, Registry metadata and service records. `catalogue.json` in the source bundle is a file inventory, not a second lifecycle record. Implementations pin exact contract bytes and configured bindings; a message does not choose an untrusted new source or install a connector. The website promotes package versions only after public readback from the relevant registry. It never resolves a mutable `latest` label during the build.

## Change classes

- **Explanatory page or example:** revise its own source, then regenerate affected projections. This does not alter a published contract's digest.
- **Published contract contents:** add a new contract version and retain the earlier file and URL, even when a wording change is believed to be compatible.
- **Common wire or authority semantics:** issue a new MAP profile. A new type or interface mapping alone does not require one.
- **Published binding artifact:** publish a new binding revision while retaining the earlier artifact.

## Change log

- 7 October 2026, packages 0.3.0: npm and RubyGems process MAP 0.3; PyPI, crates.io and Go carry its profile record, context and schemas. No package carries MAP 0.2.
- 7 October 2026, MAP 0.3 working draft: an email describes the action, and a trusted service binding maps each decision to the service's existing operations. There is no MAP execution endpoint or request and result envelope. The profile record binds the context, core schema and contract format by SHA-256. Four Draft contracts are published through the Registry; MAP 0.2 and its artifacts remain available.
- 2 October 2026, historical availability: the 1 October deletion ruling is replaced. Published MAP 0.1 artifacts and their conformance fixtures remain available as immutable, unlisted resources with MAP 0.2 identified as the successor. The retired MAP 0.1 runtime and package code remain removed.
- 28 September 2026, MAP 0.2, compatible clarification: a client may obtain a contract it has not bundled from a Registry catalogue it has configured, verifying every digest, so types added to the Registry are usable without a client release. The contract rules moved to the Type contracts chapter unchanged.
- 25 September 2026, MAP 0.2: a type-agnostic core.
  - Types define `details`, and requests bind the exact description by its RFC 8785 digest.
  - Operations declare credential or possession authority, their consequences and whether they repeat.
  - The core owns decisions and the approval lifecycle, including `approvalUrl`, failure reasons, `already-decided` and `superseded`.
  - The description names the RFC 9728 protected resource, results may name the actor, and input errors carry JSON Pointers.
  - Content Review 0.3 and nine new types are published on it, with the form fields block 0.1.
