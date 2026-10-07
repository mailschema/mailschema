# MailSchema packages

Each package carries the MAP 0.3 artifacts byte for byte: the profile record, the JSON-LD context, and the core, type contract and implementation record schemas. The JavaScript and Ruby packages also process MAP 0.3. They parse descriptions as MAP JSON, check descriptions, type contracts and implementation records, compute RFC 8785 digests, and check a description against the contract it names. No package bundles a type contract; an implementation obtains the contracts it supports from a catalogue it configures and pins them by digest.

| Distribution | Contents |
| --- | --- |
| [npm `mailschema`](https://github.com/mailschema/javascript) | MAP 0.3 processing, TypeScript definitions, the artifacts and a local CLI |
| [RubyGems `mailschema`](https://github.com/mailschema/ruby) | MAP 0.3 processing, the artifacts, and email helpers: finding and building the description part, and the qualifying-signature checks over a DKIM verifier's results |
| [PyPI `mailschema`](https://github.com/mailschema/python) | The artifacts |
| [crates.io `mailschema`](https://github.com/mailschema/rust) | The artifacts, embedded |
| [Go `github.com/mailschema/go`](https://github.com/mailschema/go) | The artifacts, embedded |

[`docs/releases/current.json`](../docs/releases/current.json) selects the releases the website presents, each verified by public registry readback. Package versions are independent of the MAP profile and of Registry type versions; a new type in the Registry triggers no package release. Distribution code and included artifacts use the MIT license in this directory.

## One source

The npm package is the repository's MAP core in `src/map/core`, unchanged except that its three schema imports point at the package's own copies; the website, the specification checks and the package run the same code. The Ruby gem ports that core rule for rule and passes the same vectors. Both refuse any schema keyword, format or pattern in a contract that not every implementation can enforce alike.

`packages/artifacts.json` lists the distributed artifacts and where each package keeps them; preparation, readback, the website and the tests all read it. `packages/versions.json` declares every package's version. `npm run packages:prepare` assembles each package in `.release/packages/` with its artifacts and the shared conformance fixtures, and checks each source against its declared version. A tested copy is committed to its language repository, where CI, tags and registry publication are owned.

## Prepare and check

```sh
npm run packages:prepare
npm run packages:test
```

Then, in `.release/packages/`:

- npm: `npm install && npm test`, then `npm pack --ignore-scripts`.
- Ruby: `bundle install && bundle exec rake`, then `bundle exec rake build`.
- Python: build with `python -m build`, check with `twine check`, and run `python -m unittest discover -s tests` against the installed wheel.
- Rust: `cargo test`, then `cargo publish --dry-run --allow-dirty`.
- Go: `go test ./...` and `go vet ./...`.

## Publish and verify

Publication runs from the tagged language repository after its CI passes. Registry credentials use repository secrets or trusted publishing and never appear in arguments, package files or release records.

After a release, `npm run packages:promote -- --registry <registry> --version <version>` reads the public registry metadata, downloads the package, checks registry integrity where published and compares every artifact byte for byte with the canonical files. Add `--promote` to write the evidence and select that release in `docs/releases/current.json`. An upload alone is not verification.
