//! Bundled JSON Schemas for the MailSchema Registry.
//!
//! These Draft 2020-12 schemas describe contribution files and expanded type
//! records. Pass them to a JSON Schema validator with format checking enabled.
//! This crate does not implement email delivery, MAP authorization or Registry
//! reference checks. The embedded schemas need no filesystem or network access.

/// Schema for new types, amendments and implementation declarations.
pub const CONTRIBUTION_SCHEMA: &str = include_str!("../schemas/contribution.schema.json");

/// Schema for expanded Registry records, including attribution and history.
pub const RECORD_SCHEMA: &str = include_str!("../schemas/record.schema.json");

/// Supported local schema documents.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Schema {
    Contribution,
    Record,
}

impl Schema {
    /// Return the embedded JSON text for this schema.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Contribution => CONTRIBUTION_SCHEMA,
            Self::Record => RECORD_SCHEMA,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embeds_standalone_draft_2020_12_documents() {
        for schema in [Schema::Contribution, Schema::Record] {
            let value: serde_json::Value = serde_json::from_str(schema.as_str()).unwrap();
            assert_eq!(value["$schema"], "https://json-schema.org/draft/2020-12/schema");
            assert!(value["$defs"]["record"].is_object());
        }
        let record: serde_json::Value = serde_json::from_str(RECORD_SCHEMA).unwrap();
        assert_eq!(record["$ref"], "#/$defs/record");
    }
}
