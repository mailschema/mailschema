# Package names and distribution

Initial availability check: 23 September 2026 (Australia/Sydney). The observations below predate publication. The user subsequently authorized publishing with existing credentials; release evidence is maintained in `docs/releases/` and package instructions in `packages/README.md`.

`mailschema` version `0.1.0` is now published and independently verified on npm, PyPI and crates.io. The bare package names are held by those releases. JSR, RubyGems and NuGet remain pending account setup; no npm organization scope was created.

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

## Recommended order

1. Establish the official npm organization and GitHub organization for active project use, subject to registration checks.
2. Publish a useful `mailschema` npm package containing the existing contribution schema, TypeScript definitions and validation API. A small contribution-check command is a natural companion. Extract and test this as a separate distributable; the private Astro website is not the release package.
3. Establish the JSR scope for the same project. A compatible `@mailschema/registry` distribution can expose the same schema and validator without duplicating their implementation.
4. Add Python support when a useful Python consumer or validator is ready. Rust, Ruby and .NET can follow actual implementation demand.

The initial package concerns Registry contributions. It must not imply that the MAP wire format, runtime authorization or conformance certification is already implemented. A package release number is also separate from a specification version.

Owning the npm organization does not claim the bare `mailschema` package. It controls the `@mailschema/*` family. Avoid creating numerous empty packages merely to hold names.

## Registry rules and account readiness

- [npm's name policy](https://docs.npmjs.com/policies/disputes/) requires active use, treats packages without genuine functionality as squatting, and expects organizations to publish packages within a reasonable time.
- [npm organizations](https://docs.npmjs.com/creating-an-organization/) offer a free public-package plan. The organization name becomes its scope.
- [JSR scopes](https://jsr.io/docs/scopes) can be created independently of publishing a version. All JSR packages are scoped.
- [PyPI name retention](https://docs.pypi.org/project-management/name-retention/) treats empty or nonfunctional name-squatting projects as invalid.

The initial default `npm whoami` check returned HTTP 401. The existing `NPM_TOKEN` subsequently authenticated successfully as `auscaster` when explicitly selected, so a new login was unnecessary. Existing PyPI and Cargo publishing credentials were also located. The user confirmed that JSR, RubyGems and NuGet credentials are not set up yet. No credentials were printed or added to package artifacts.
