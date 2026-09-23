# MailSchema for Rust

Embed the canonical Mail Action Protocol and MailSchema Registry schemas in a Rust application without runtime dependencies, filesystem access or network calls.

[Specification](https://mailschema.org/specification/) · [Registry](https://mailschema.org/registry/) · [Tools](https://mailschema.org/tools/) · [Source](https://github.com/mailschema/rust)

## Install

```toml
[dependencies]
mailschema = "0.1"
```

Rust 1.70 or newer is required.

## Use a schema

```rust
use mailschema::{Schema, MAP_0_1_SCHEMA};

assert_eq!(Schema::Map01.as_str(), MAP_0_1_SCHEMA);

let content_review = Schema::ContentReview01.as_str();
assert!(content_review.contains("Content Review"));
```

The crate exposes four Draft 2020-12 documents:

- `MAP_0_1_SCHEMA`
- `CONTENT_REVIEW_0_1_SCHEMA`
- `CONTRIBUTION_SCHEMA`
- `RECORD_SCHEMA`

Parse the strings with your JSON library and pass them to a Draft 2020-12 validator with format checking enabled. The crate deliberately does not select a validation engine for its consumers.

## Trust boundary

A valid document is structured input. Schema validation does not authenticate a service, grant authority, approve an action, check Registry references or establish product conformance. Implementations must apply their own endpoint trust, credentials, permissions and policy before executing a request.

Package versions and MAP profile versions advance independently. MIT licensed.
