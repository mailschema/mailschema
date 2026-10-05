# Contributing to MailSchema

MailSchema develops Mail Action Protocol (MAP), type contracts and the Registry in public. Start with the [0.3 contribution guide](https://mailschema.org/contribute) and check existing types and standards before proposing a new definition.

## What to submit

- **Protocol change:** open an issue with the concrete interoperability problem, existing standards considered and the common behavior needed.
- **New type:** add a versioned contract at `specifications/map-0.3/contracts/<slug>-<version>.json`, an example keyed by `<slug>` in `examples/source.json`, and category, maintainers, current version and lifecycle status in `registry.json`. The contract owns its identifier and meaning; the Registry record references it.
- **Contract revision:** preserve the published file and add a new versioned file. Update the current selection and status in `registry.json` only after reviewing the change. Earlier contract bytes and URLs remain available.
- **Service support:** add a record under `specifications/map-0.3/implementations/` naming the exact contract ID, version and digest, supported operations, binding, maintainer and source of the claim. Include artifact format and digest when distributing an installable integration. A declaration can describe built-in service support; a test report identifies observed behavior and how to reproduce it.
- **Code or documentation:** open a focused pull request with the relevant checks.

The browser checker at `https://mailschema.org/contribute/` uses the same contract and service-record parsers as the repository. It prepares JSON for GitHub; the reviewed repository is the source of accepted contributions. The older `registry:ingest` command maintains the MAP 0.2 archive and is not the 0.3 submission path.

```sh
npm ci
npm run spec:generate
npm run verify
```

A new type does not require another deployed service or a package release. A support declaration is not an interoperability result, and a Registry listing does not connect an account. Review considers meaning, overlap with existing standards, security, privacy, ownership, maintenance and the evidence actually claimed. New normative behavior needs a complete example and clear acceptance criteria. Stable status needs evidence under the published governance criteria.

## Rights and attribution

By submitting a contribution, you represent that you have the right to submit it and agree that it may be distributed under the applicable repository license:

- software and executable source under the MIT License;
- specification text, type definitions, Registry records and documentation under CC BY 4.0.

Contributors must disclose known patent claims that may be essential to implementing a proposed normative requirement. Internet-Draft submissions also follow the IETF contribution and disclosure rules that apply at submission time.

## Conduct

Participate in good faith. Discuss the technical behavior and evidence, avoid personal attacks, preserve contributor attribution and declare relevant commercial interests. Maintainers may restrict participation that repeatedly disrupts review or threatens other contributors.
