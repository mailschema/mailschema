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
- Type contracts have their own versions and immutable canonical digests; Registry metadata has a separate lifecycle.
- Registry tooling packages have independent release versions.
- A newer specification or package does not silently change an older type record.

Published versioned artifacts remain available after supersession. Changes to common wire or authority interpretation require a new profile identifier.

## Implementations and conformance

An implementation declaration identifies what a product claims to support. Reproduced evidence records what a named test actually observed. Neither grants authority to execute actions or implies endorsement.

Implementation reports name the exact MAP profile, contract ID, version and digest, tested roles and operations, implementation revision, setup, observations and missing coverage. Draft profiles may publish results but do not use “certified” or “fully compliant” language. A support declaration is identified as a claim, not a reproduced test.

## Standards organizations

MailSchema may contribute implemented work to an established standards organization. An Internet-Draft is a contribution to the IETF process, not a claim of IETF adoption. Where an external standards process accepts responsibility for a protocol element, MailSchema will reference that work instead of maintaining a competing definition.
