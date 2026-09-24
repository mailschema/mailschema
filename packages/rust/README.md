# MailSchema for Rust

[![crates.io](https://img.shields.io/crates/v/mailschema)](https://crates.io/crates/mailschema)
[![CI](https://github.com/mailschema/rust/actions/workflows/test.yml/badge.svg)](https://github.com/mailschema/rust/actions/workflows/test.yml)

Embed the canonical Mail Action Protocol and MailSchema Registry schemas in a Rust application without runtime dependencies, filesystem access or network calls.

[Specification](https://mailschema.org/specification) · [Registry](https://mailschema.org/registry) · [Tools](https://mailschema.org/tools) · [Source](https://github.com/mailschema/rust)

## Install

```toml
[dependencies]
mailschema = "0.1"
```

Rust 1.70 or newer is required.

## Use a schema

```rust
use mailschema::{Schema, CONTENT_REVIEW_0_2_CONTRACT, MAP_0_1_SCHEMA};

assert_eq!(Schema::Map01.as_str(), MAP_0_1_SCHEMA);

let content_review = Schema::ContentReview02.as_str();
assert!(content_review.contains("Content Review"));
assert!(CONTENT_REVIEW_0_2_CONTRACT.contains("MapTypeContract"));
```

The crate exposes five Draft 2020-12 documents:

- `MAP_0_1_SCHEMA`
- `CONTENT_REVIEW_0_1_SCHEMA`
- `CONTENT_REVIEW_0_2_SCHEMA`
- `CONTRIBUTION_SCHEMA`
- `RECORD_SCHEMA`

Parse the strings with your JSON library and pass them to a Draft 2020-12 validator with format checking enabled. The crate deliberately does not select a validation engine for its consumers.

`CONTENT_REVIEW_0_1_CONTRACT` and `CONTENT_REVIEW_0_2_CONTRACT` expose the immutable canonical type contracts used by MAP wire messages. New integrations should use 0.2.

## Trust boundary

A valid document is structured input. Schema validation does not authenticate a service, grant authority, approve an action, check Registry references or establish product conformance. Implementations must apply their own endpoint trust, credentials, permissions and policy before executing a request.

Package versions and MAP profile versions advance independently. MIT licensed.
