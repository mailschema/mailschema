# MailSchema for Rust

[![crates.io](https://img.shields.io/crates/v/mailschema)](https://crates.io/crates/mailschema)
[![CI](https://github.com/mailschema/rust/actions/workflows/test.yml/badge.svg)](https://github.com/mailschema/rust/actions/workflows/test.yml)

The Mail Action Protocol 0.2 core artifacts and the MailSchema Registry schemas, embedded without runtime dependencies, filesystem access or network calls.

[Specification](https://mailschema.org/specification) · [Registry](https://mailschema.org/registry) · [Tools](https://mailschema.org/tools) · [Source](https://github.com/mailschema/rust)

## Install

```toml
[dependencies]
mailschema = "0.2"
```

Rust 1.70 or newer is required.

## Use an artifact

```rust
use mailschema::{Schema, MAP_CONTEXT, MAP_PROFILE, MAP_SCHEMA};

assert_eq!(Schema::Map.as_str(), MAP_SCHEMA);
assert!(MAP_CONTEXT.contains("MailAction"));
```

`MAP_SCHEMA`, `MAP_CONTEXT`, `CONTRACT_FORMAT_SCHEMA` and `FORMS_SCHEMA` are byte-identical to the files the [profile record](https://mailschema.org/profiles/map/0.2.json) binds by SHA-256. `CONTRIBUTION_SCHEMA` and `RECORD_SCHEMA` describe Registry files. Parse them with your JSON library and pass the schemas to a Draft 2020-12 validator; the crate does not choose a validation engine. Type contracts are not bundled: a client obtains them from the [Registry catalogue](https://mailschema.org/registry/catalog.json) by digest.

## Trust boundary

A valid document is structured input. Schema validation does not authenticate a service, grant authority or establish product conformance. Package versions and MAP profile versions advance independently. MIT licensed.
