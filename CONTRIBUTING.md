# Contributing to MailSchema

MailSchema develops Mail Action Protocol, shared interaction types and the Registry in public. Contributions should improve interoperability between independently configured clients and services.

## Start with the right contribution

- **Protocol change:** open an issue describing the interoperability problem, existing standards considered and the behavior two implementations need to share.
- **New type:** use `registry/examples/new-type.json` and include operations, permission boundaries, results, a complete example and related work.
- **Amendment:** bind the change to the current record digest so concurrent or stale changes are visible.
- **Implementation evidence:** identify the exact type version, execution profile, record digest, supported operations and reproducible evidence.
- **Code or documentation:** open a focused pull request with the relevant checks.

The browser checker at `https://mailschema.org/contribute/` prepares and validates contribution files locally. The repository importer can validate the same file:

```sh
npm run registry:ingest -- contribution.json
npm run registry:ingest -- contribution.json --write
npm run verify
```

## Review

Passing validation establishes that a contribution has the required structure and consistent references. It does not establish acceptance, compatibility or conformance. Review considers scope, overlap with existing standards, security and privacy, attribution, maintenance and implementation evidence.

Normative behavior requires at least one complete example and testable acceptance criteria. Stable status requires evidence from interoperable implementations; two services under common ownership are useful implementation evidence but are not independent adoption.

## Rights and attribution

By submitting a contribution, you represent that you have the right to submit it and agree that it may be distributed under the applicable repository license:

- software and executable source under the MIT License;
- specification text, type definitions, Registry records and documentation under CC BY 4.0.

Contributors must disclose known patent claims that may be essential to implementing a proposed normative requirement. Internet-Draft submissions also follow the IETF contribution and disclosure rules that apply at submission time.

## Conduct

Participate in good faith. Discuss the technical behavior and evidence, avoid personal attacks, preserve contributor attribution and declare relevant commercial interests. Maintainers may restrict participation that repeatedly disrupts review or threatens other contributors.
