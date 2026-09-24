//! Bundled JSON Schemas for Mail Action Protocol and the MailSchema Registry.
//!
//! These Draft 2020-12 schemas describe contribution files and expanded type
//! records. Pass them to a JSON Schema validator with format checking enabled.
//! This crate does not implement email delivery, MAP authorization or Registry
//! reference checks. The embedded schemas need no filesystem or network access.

/// Schema for new types, amendments and implementation declarations.
pub const CONTRIBUTION_SCHEMA: &str = include_str!("../schemas/contribution.schema.json");

/// Schema for expanded Registry records, including attribution and history.
pub const RECORD_SCHEMA: &str = include_str!("../schemas/record.schema.json");

/// Schema for MAP 0.1 descriptions, requests, results and problems.
pub const MAP_0_1_SCHEMA: &str = include_str!("../schemas/map-0.1.schema.json");

/// Content Review 0.1 request binding.
pub const CONTENT_REVIEW_0_1_SCHEMA: &str =
    include_str!("../schemas/content-review-0.1.schema.json");

/// Canonical Content Review 0.1 type contract.
pub const CONTENT_REVIEW_0_1_CONTRACT: &str = include_str!("../contracts/content-review-0.1.json");

/// Supported local schema documents.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Schema {
    Contribution,
    Record,
    Map01,
    ContentReview01,
}

impl Schema {
    /// Return the embedded JSON text for this schema.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Contribution => CONTRIBUTION_SCHEMA,
            Self::Record => RECORD_SCHEMA,
            Self::Map01 => MAP_0_1_SCHEMA,
            Self::ContentReview01 => CONTENT_REVIEW_0_1_SCHEMA,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embeds_standalone_draft_2020_12_documents() {
        for schema in [
            Schema::Contribution,
            Schema::Record,
            Schema::Map01,
            Schema::ContentReview01,
        ] {
            let value: serde_json::Value = serde_json::from_str(schema.as_str()).unwrap();
            assert_eq!(
                value["$schema"],
                "https://json-schema.org/draft/2020-12/schema"
            );
        }
        let contribution: serde_json::Value = serde_json::from_str(CONTRIBUTION_SCHEMA).unwrap();
        assert!(contribution["$defs"]["record"].is_object());
        let map: serde_json::Value = serde_json::from_str(MAP_0_1_SCHEMA).unwrap();
        assert_eq!(
            map["$id"],
            "https://mailschema.org/schemas/map-0.1.schema.json"
        );
        let record: serde_json::Value = serde_json::from_str(RECORD_SCHEMA).unwrap();
        assert_eq!(record["$ref"], "#/$defs/record");
        let contract: serde_json::Value =
            serde_json::from_str(CONTENT_REVIEW_0_1_CONTRACT).unwrap();
        assert_eq!(
            contract["id"],
            "https://mailschema.org/types/content-review"
        );
    }
}
