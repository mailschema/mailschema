# MailSchema packages

The first release distributes the Registry contribution format to JavaScript, Python and Rust consumers. It does not announce a stable MAP protocol, implement email delivery or grant authority to execute an action.

| Distribution           | Contents                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| npm `mailschema`       | JSON Schema, TypeScript definitions, structural validation, supplied-catalogue reference checks and a local CLI |
| PyPI `mailschema`      | The same schema, structural validation through `jsonschema` and a local CLI                                     |
| crates.io `mailschema` | The same contribution schema and a standalone record schema, embedded without runtime dependencies              |

The initial releases are version `0.1.0`. Package versions are independent of the specification version and may advance separately between registries. Distribution code and included schema assets use the MIT license in this directory. This file does not assign a license to unrelated website assets or other project documents.

## One source

`public/schemas/contribution.schema.json` remains canonical. JavaScript model and validation code come directly from `src/registry/model.ts` and `src/registry/validation.ts`, which the website also uses. Python delegates JSON Schema interpretation to the established `jsonschema` library. Rust embeds schema documents for applications to use with their chosen validator.

`packages/versions.json` declares the source version for each registry. `npm run packages:prepare` creates distribution sources in `.release/packages/` and checks each source package against its own declared version. It does not require npm, PyPI and crates.io to move together. Generated copies are not separately maintained. No real vendor submissions or credentials are included in the packages.

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

After publishing one distribution, run `npm run packages:promote -- --registry <registry> --version <version>` to read its public registry metadata, download the artifact, check the registry digest where available and compare its embedded schema byte for byte with the canonical schema. Add `--promote` to write immutable evidence and update only that registry in `docs/releases/current.json`. A successful upload alone is not treated as verification.

JSR, RubyGems and NuGet remain pending account setup. The npm `@mailschema` organization scope is separate from the published unscoped package and has not been created by this release.
