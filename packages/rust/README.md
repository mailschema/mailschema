# MailSchema

Embedded JSON Schemas for Mail Action Protocol 0.1 and the MailSchema Registry. No runtime dependencies, filesystem access or network calls.

```toml
[dependencies]
mailschema = "0.2"
```

```rust
use mailschema::{Schema, MAP_0_1_SCHEMA};

assert_eq!(Schema::Map01.as_str(), MAP_0_1_SCHEMA);
let content_review = Schema::ContentReview01.as_str();
assert!(content_review.contains("Content Review"));
```

Parse the strings with your JSON library and pass them to a JSON Schema Draft 2020-12 validator with format checking enabled. `MAP_0_1_SCHEMA` and `CONTENT_REVIEW_0_1_SCHEMA` cover the protocol documents. `CONTRIBUTION_SCHEMA` and `RECORD_SCHEMA` cover Registry data.

The crate supplies schemas, not a validation engine. Validation does not establish endpoint trust, grant service authorization, check Registry references or certify product compatibility. Package and specification versions are independent.

MIT licensed.
