# mailschema

The [Mail Action Protocol](https://mailschema.org) 0.3 artifacts for Rust, embedded byte for byte as mailschema.org publishes them: the profile record, the JSON-LD context, and the core, type contract and implementation record schemas. The profile record binds the context and the first two schemas by SHA-256. No runtime dependencies, filesystem access or network calls.

```toml
[dependencies]
mailschema = "0.3"
```

```rust
let schema: serde_json::Value = serde_json::from_str(mailschema::CORE_SCHEMA)?;
```

The constants are `PROFILE_RECORD`, `CONTEXT_DOCUMENT`, `CORE_SCHEMA`, `CONTRACT_SCHEMA` and `IMPLEMENTATION_SCHEMA`, with `PROFILE` and `CONTEXT` naming the profile and context. Schema validation alone does not establish a valid description; see the [specification](https://mailschema.org/specification/core).

Source: [mailschema/rust](https://github.com/mailschema/rust). License: MIT.
