# Package names and distribution

Initial availability check: 23 September 2026 (Australia/Sydney). The observations below predate publication. The user subsequently authorized publishing with existing credentials; release evidence is maintained in `docs/releases/` and package instructions in `packages/README.md`.

`mailschema` version `0.1.3` is published on npm; version `0.1.2` is published on PyPI and crates.io. `github.com/mailschema/go` version `v0.1.0` is published through the Go module proxy. Public artifacts are promoted to the website only after byte-for-byte schema readback. JSR, RubyGems and NuGet remain pending account setup; no empty packages are published merely to reserve names.

## Observed names

Public API absence is a candidate-availability signal, not proof that registration or publication will be accepted. Registries may reserve names or apply additional checks. Scope ownership and an unscoped package name are separate.

| Registry         | Candidate      | Live observation                                                                                                                                                           |
| ---------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm              | `mailschema`   | [Package endpoint](https://registry.npmjs.org/mailschema) returned 404, `Not found`.                                                                                       |
| npm organization | `@mailschema`  | Organization and user pages returned an HTTP 403 browser challenge. Availability remains unconfirmed. Absence of `@mailschema/core` does not establish scope availability. |
| JSR              | `@mailschema`  | [Scope endpoint](https://api.jsr.io/scopes/mailschema) returned 404, `scopeNotFound`.                                                                                      |
| PyPI             | `mailschema`   | [Project endpoint](https://pypi.org/pypi/mailschema/json) returned 404.                                                                                                    |
| crates.io        | `mailschema`   | [Crate endpoint](https://crates.io/api/v1/crates/mailschema) returned 404, crate does not exist.                                                                           |
| RubyGems         | `mailschema`   | [Gem endpoint](https://rubygems.org/api/v1/gems/mailschema.json) returned 404.                                                                                             |
| NuGet            | `MailSchema`   | [Package index](https://api.nuget.org/v3-flatcontainer/mailschema/index.json) returned 404. This does not check reserved-prefix ownership or prove upload eligibility.     |
| Packagist        | `mailschema/*` | [Vendor package list](https://packagist.org/packages/list.json?vendor=mailschema) returned an empty list. No conclusion about vendor ownership.                            |
| GitHub           | `mailschema`   | [Identity endpoint](https://api.github.com/users/mailschema) returned 404. Registration eligibility remains unconfirmed.                                                   |

## Expansion rule

Add another ecosystem when it serves a real implementation or contribution workflow. A new package must expose useful schema or validation behavior, preserve the canonical bytes and join the same public readback gate. JSR, RubyGems, NuGet and Packagist remain candidates, not launch requirements.

The packages cover MAP 0.1 and Registry contributions. They do not imply runtime authorization, product conformance or IETF adoption. A package release number is separate from a specification version.

Owning the npm organization does not claim the bare `mailschema` package. It controls the `@mailschema/*` family. Avoid creating numerous empty packages merely to hold names.

## Registry rules and account readiness

- [npm's name policy](https://docs.npmjs.com/policies/disputes/) requires active use, treats packages without genuine functionality as squatting, and expects organizations to publish packages within a reasonable time.
- [npm organizations](https://docs.npmjs.com/creating-an-organization/) offer a free public-package plan. The organization name becomes its scope.
- [JSR scopes](https://jsr.io/docs/scopes) can be created independently of publishing a version. All JSR packages are scoped.
- [PyPI name retention](https://docs.pypi.org/project-management/name-retention/) treats empty or nonfunctional name-squatting projects as invalid.

Publishing credentials remain in existing local or hosted credential stores. No credentials are printed, committed or added to package artifacts. JSR, RubyGems and NuGet credentials are not configured yet.
