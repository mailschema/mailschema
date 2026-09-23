# MailSchema

Embedded JSON Schemas for MailSchema Registry contributions and records. No runtime dependencies, filesystem access or network calls.

```toml
[dependencies]
mailschema = "0.1"
```

```rust
use mailschema::{Schema, CONTRIBUTION_SCHEMA};

assert_eq!(Schema::Contribution.as_str(), CONTRIBUTION_SCHEMA);
let record_schema = Schema::Record.as_str();
assert!(record_schema.contains("$defs"));
```

Parse either string with your JSON library and pass it to a JSON Schema Draft 2020-12 validator with format checking enabled. `CONTRIBUTION_SCHEMA` covers new types, amendments and implementation declarations. `RECORD_SCHEMA` covers expanded records with contributor and maintenance history.

The crate supplies schemas, not a validation engine. Schema validation does not check Registry references, establish contributor identity or certify product compatibility. These are contribution formats, not the draft Mail Action Protocol wire format. Package and specification versions are independent.

MIT licensed.
