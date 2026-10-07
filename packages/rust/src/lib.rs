//! The Mail Action Protocol 0.3 artifacts, byte for byte as mailschema.org publishes them: the
//! profile record, the JSON-LD context, and the core, type contract and implementation record
//! schemas. The profile record binds the context and the first two schemas by SHA-256.
//! Nothing here needs filesystem or network access.

/// The MAP profile these artifacts define.
pub const PROFILE: &str = "https://mailschema.org/profiles/map/0.3";

/// The JSON-LD context every MAP 0.3 description names.
pub const CONTEXT: &str = "https://mailschema.org/contexts/map-0.3.jsonld";

/// The profile record.
pub const PROFILE_RECORD: &str = include_str!("../artifacts/profile.json");

/// The JSON-LD context document.
pub const CONTEXT_DOCUMENT: &str = include_str!("../artifacts/context.jsonld");

/// The schema of a MAP 0.3 description.
pub const CORE_SCHEMA: &str = include_str!("../artifacts/core.schema.json");

/// The schema every type contract follows.
pub const CONTRACT_SCHEMA: &str = include_str!("../artifacts/contract.schema.json");

/// The schema of a Registry implementation record.
pub const IMPLEMENTATION_SCHEMA: &str = include_str!("../artifacts/implementation.schema.json");

#[cfg(test)]
mod tests {
    use super::*;
    use sha2::{Digest, Sha256};

    #[test]
    fn profile_record_binds_the_bundled_bytes() {
        let record: serde_json::Value = serde_json::from_str(PROFILE_RECORD).unwrap();
        assert_eq!(record["id"], PROFILE);
        assert_eq!(record["context"], CONTEXT);
        for (key, bytes) in [
            ("context", CONTEXT_DOCUMENT),
            ("schema", CORE_SCHEMA),
            ("contractFormat", CONTRACT_SCHEMA),
        ] {
            let digest = format!("{:x}", Sha256::digest(bytes.as_bytes()));
            assert_eq!(record["artifacts"][key]["sha256"], digest, "{key}");
        }
        serde_json::from_str::<serde_json::Value>(IMPLEMENTATION_SCHEMA).unwrap();
    }
}
