# MailSchema packages

MailSchema distributes the exact MAP 0.1, Content Review 0.1 and Registry schemas for use at implementation boundaries. The packages validate or expose the contract; they do not establish endpoint trust, grant authority or send email.

| Distribution                  | Contents                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| npm `mailschema`              | MAP and Registry schemas, runtime validation, TypeScript definitions, Registry reference checks and a local CLI |
| PyPI `mailschema`             | MAP and Registry schemas, validation through `jsonschema` and a local CLI                                       |
| crates.io `mailschema`        | MAP, Content Review and Registry schemas embedded without runtime dependencies                                  |
| Go `github.com/mailschema/go` | Typed MAP documents, strict decoding, core reference validation and the canonical schemas                       |

The JavaScript, Python and Rust packages are at `0.1.1`; the Go module is at `0.1.0`. Package versions are independent of the MAP profile version and may advance separately. Distribution code and included schema assets use the MIT license in this directory. This file does not assign a license to unrelated website assets or other project documents.

## One source

`public/schemas/map-0.1.schema.json`, `public/schemas/content-review-0.1.schema.json` and `public/schemas/contribution.schema.json` are canonical. JavaScript model and validation code come from the same sources used by the website. Python delegates JSON Schema interpretation to the established `jsonschema` library. Rust embeds schema documents for applications to use with their chosen validator. The Go module is maintained in [`mailschema/go`](https://github.com/mailschema/go) and embeds byte-identical schema files.

`packages/versions.json` declares the source version for every ecosystem. `npm run packages:prepare` creates npm, Python and Rust distribution sources in `.release/packages/` and checks each package against its declared version. The Go module is released from its own repository. Generated copies are not separately maintained. No vendor credentials or private operational data are included.

## Prepare and check

```sh
npm run packages:prepare
npm run packages:test
```

Build the npm archive from `.release/packages/npm/` with `npm pack --ignore-scripts --pack-destination ../../`. Build Python wheel and source archives from `.release/packages/python/` with `python -m build --outdir ../../python-dist`, using an isolated environment with `build`, `twine` and the package dependencies installed. Run `twine check` and test the installed wheel rather than importing the source checkout.

The Python test fixtures are generated into that distribution's `tests/` directory. Run `python -m unittest discover -s tests -v` from `.release/packages/python/` after installing the wheel. Run `cargo test` and `cargo publish --dry-run --allow-dirty` against `.release/packages/rust/Cargo.toml`.

The JavaScript archive is checked with a clean installation outside the repository. All archives are inspected before release. The website remains a private Astro package; it is not published to a package registry.

## Publish and verify

Publication requires explicit release authorization and the relevant publisher credentials. Use the prepared npm archive, both Python archives and the generated Rust crate. Credentials must stay in environment variables or existing local CLI credential stores; do not put tokens in arguments, package files or release records.

After publishing one distribution, run `npm run packages:promote -- --registry <registry> --version <version>` to read public registry metadata, download the artifact, check the registry digest where available and compare its embedded contribution schema byte for byte with the canonical file. Supported registry names are `npm`, `PyPI`, `crates.io` and `Go`. Add `--promote` to write immutable evidence and update only that registry in `docs/releases/current.json`. A successful upload alone is not treated as verification.

JSR, RubyGems and NuGet remain pending account setup. The npm `@mailschema` organization scope is separate from the published unscoped package and has not been created by this release.
