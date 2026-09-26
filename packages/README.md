# MailSchema packages

MailSchema packages provide MAP and Registry tooling. The published npm, PyPI, crates.io and Go releases implement MAP 0.1 and retain Content Review compatibility helpers. The Ruby gem is prepared for MAP 0.2 and not yet published. They validate or expose contracts; they do not establish endpoint trust, grant authority or send email.

| Distribution                                                      | Contents                                                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [npm `mailschema`](https://github.com/mailschema/javascript)      | MAP and Registry schemas, runtime validation, TypeScript definitions, Registry reference checks and a local CLI |
| [PyPI `mailschema`](https://github.com/mailschema/python)         | MAP and Registry schemas, validation through `jsonschema` and a local CLI                                       |
| [crates.io `mailschema`](https://github.com/mailschema/rust)      | MAP, Content Review and Registry schemas embedded without runtime dependencies                                  |
| [Go `github.com/mailschema/go`](https://github.com/mailschema/go) | Typed MAP documents, strict decoding, core reference validation and the canonical schemas                       |
| [RubyGems `mailschema`](https://github.com/mailschema/ruby)       | MAP 0.2 parsing, RFC 8785 digests, contract verification, validation, and result and problem documents          |

[`docs/releases/current.json`](../docs/releases/current.json) is the only selected package set. Public artifact evidence verifies every bundled contract in each selected release. Package versions are independent of the MAP profile and Registry type versions, and advance only when that package's code, API or bundled assets change. Distribution code and included schema assets use the MIT license in this directory. This file does not assign a license to unrelated website assets or other project documents.

## One source

The files under `public/schemas/` and `public/contracts/` are canonical. JavaScript model and validation code come from the same sources used by the website. Python delegates JSON Schema interpretation to the established `jsonschema` library. Rust embeds schema documents for applications to use with their chosen validator. The Go module is maintained in [`mailschema/go`](https://github.com/mailschema/go) and embeds byte-identical schema files. Ruby delegates JSON Schema interpretation to `json_schemer` with ECMA-262 regular expressions, and carries its own RFC 8785 implementation, tested against ECMAScript's number formatting.

The Registry and the packages have separate release lifecycles. A new or amended type is published as versioned Registry data and immutable contract/schema artifacts. Implementations select the exact type versions they support and vendor those bytes by URI, version and digest. They do not need a live Registry lookup at execution time. A Registry contribution does not trigger a language release; a package release is needed only when that package itself changes. Content Review remains in the current packages for compatibility with their first public APIs. Future Registry types do not enter packages automatically.

`packages/artifacts.json` is the one list of files deliberately distributed by each ecosystem. Package preparation, archive readback, website release checks and tests all consume that manifest. `packages/versions.json` declares the source version for every ecosystem. `npm run packages:prepare` creates npm, Python, Rust and Ruby release sources in `.release/packages/` and checks each package against its declared version. A tested copy of each release source is committed to its language repository, where CI, tags and registry publication are owned. The generated schema and shared validation files remain canonical here rather than being edited independently in multiple repositories. The Go implementation is maintained and released from its own repository. No vendor credentials or private operational data are included.

## Prepare and check

```sh
npm run packages:prepare
npm run packages:test
```

Build the npm archive from `.release/packages/npm/` with `npm pack --ignore-scripts --pack-destination ../../`. Build Python wheel and source archives from `.release/packages/python/` with `python -m build --outdir ../../python-dist`, using an isolated environment with `build`, `twine` and the package dependencies installed. Run `twine check` and test the installed wheel rather than importing the source checkout.

The Python test fixtures are generated into that distribution's `tests/` directory. Run `python -m unittest discover -s tests -v` from `.release/packages/python/` after installing the wheel. Run `cargo test` and `cargo publish --dry-run --allow-dirty` against `.release/packages/rust/Cargo.toml`. The Ruby tests run against fixtures copied from `public/fixtures/map-0.2`, the MAP 0.2 contracts and ECMAScript number vectors, with the dependencies `packages/ruby/Gemfile.lock` locks: run `bundle install` and `bundle exec rake` from `.release/packages/ruby/` on each supported Ruby, then `bundle exec rake build` and inspect the archive in `pkg/`.

The JavaScript archive is checked with a clean installation outside the repository. All archives are inspected before release. The website remains a private Astro package; it is not published to a package registry.

## Publish and verify

Publication runs from the tagged language repository after its native CI passes. Registry credentials use repository secrets or trusted publishing and must not appear in arguments, package files or release records.

After publishing one distribution, run `npm run packages:promote -- --registry <registry> --version <version>` to read public registry metadata, download the artifact, check registry integrity where available and compare every contract it distributes byte for byte with the canonical files. Supported registry names are `npm`, `PyPI`, `crates.io`, `Go` and `RubyGems`. Add `--promote` to write immutable evidence and update only that registry in `docs/releases/current.json`. A successful upload alone is not treated as verification.

The versions in `packages/versions.json` remain the currently published versions until a release is deliberately prepared. Contract work can advance on branches without changing those package versions. Do not publish a rebuilt artifact under an existing version; the release change must choose the next version explicitly and then pass public readback before website promotion.

JSR and NuGet remain pending account setup. The Ruby gem publishes from the `mailschema/ruby` repository through RubyGems trusted publishing, with no stored API key. `npm run packages:ruby-upstream -- <commit> <output>` prepares the gem from a clean checkout of one commit and writes the `UPSTREAM.md` that records it. The npm `@mailschema` organization scope is separate from the published unscoped package and has not been created by this release.
