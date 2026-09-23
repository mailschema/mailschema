# MailSchema governance

MailSchema is an open technical project. The `mailschema` GitHub organization holds the canonical repositories, and `mailschema.org` publishes accepted specifications and Registry records.

## Responsibilities

Maintainers:

- steward protocol scope and compatibility;
- review security, privacy and existing-standard reuse;
- preserve contributor attribution and decision history;
- keep type status separate from implementation evidence;
- publish versioned artifacts from protected branches;
- disclose conflicts that could affect a decision.

Maintainers do not certify a product merely by accepting its implementation declaration.

## Decisions

Routine corrections use normal pull-request review. Normative protocol changes, type maturity changes and Registry policy changes require a public rationale in the pull request. When evidence is incomplete, the proposal remains a draft or proposal.

The maintainers aim for rough consensus grounded in interoperable behavior. The project lead resolves an impasse and records the reason. Decisions can be revisited when implementation evidence changes.

## Versions

- Specification profiles use explicit versioned identifiers.
- Type definitions have their own versions and immutable record digests.
- Registry tooling packages have independent release versions.
- A newer specification or package does not silently change an older type record.

Deprecated profiles remain documented long enough for implementations to migrate. Breaking normative changes require a new profile identifier.

## Implementations and conformance

An implementation declaration identifies what a product claims to support. Reproduced evidence records what a named test actually observed. Neither grants authority to execute actions or implies endorsement.

Conformance claims must name the exact MAP profile, type version, operations and conformance-suite version. Draft profiles may publish test results but do not use “certified” or “fully compliant” language.

## Standards organizations

MailSchema may contribute implemented work to an established standards organization. An Internet-Draft is a contribution to the IETF process, not a claim of IETF adoption. Where an external standards process accepts responsibility for a protocol element, MailSchema will reference that work instead of maintaining a competing definition.
