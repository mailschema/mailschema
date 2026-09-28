//! The Mail Action Protocol 0.2 core artifacts and the MailSchema Registry schemas.
//!
//! The MAP 0.2 core schema, JSON-LD context, type contract format and form fields
//! block are embedded exactly as the profile record binds them by SHA-256. Type
//! contracts are not bundled: clients obtain them from the Registry catalogue by
//! digest. The Registry schemas describe contribution files and expanded type
//! records; pass them to a JSON Schema validator with format checking enabled.
//! Nothing here needs filesystem or network access.

/// The MAP profile whose core artifacts this crate carries.
pub const MAP_PROFILE: &str = "https://mailschema.org/profiles/map/0.2";

/// The MAP 0.2 core schema: descriptions, requests, results and problems.
pub const MAP_SCHEMA: &str = include_str!("../schemas/map-0.2.schema.json");

/// The MAP 0.2 JSON-LD context.
pub const MAP_CONTEXT: &str = include_str!("../contexts/map-0.2.jsonld");

/// The type contract format every MAP 0.2 contract follows.
pub const CONTRACT_FORMAT_SCHEMA: &str = include_str!("../schemas/type-contract-0.2.schema.json");

/// The form fields block contracts pin.
pub const FORMS_SCHEMA: &str = include_str!("../schemas/forms-0.1.schema.json");

/// Schema for new types, amendments and implementation declarations.
pub const CONTRIBUTION_SCHEMA: &str = include_str!("../schemas/contribution.schema.json");

/// Schema for expanded Registry records, including attribution and history.
pub const RECORD_SCHEMA: &str = include_str!("../schemas/record.schema.json");

/// The embedded JSON Schema documents.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Schema {
    Map,
    ContractFormat,
    Forms,
    Contribution,
    Record,
}

impl Schema {
    /// Return the embedded JSON text for this schema.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Map => MAP_SCHEMA,
            Self::ContractFormat => CONTRACT_FORMAT_SCHEMA,
            Self::Forms => FORMS_SCHEMA,
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
        for schema in [
            Schema::Map,
            Schema::ContractFormat,
            Schema::Forms,
            Schema::Contribution,
            Schema::Record,
        ] {
            let value: serde_json::Value = serde_json::from_str(schema.as_str()).unwrap();
            assert_eq!(value["$schema"], "https://json-schema.org/draft/2020-12/schema");
        }
        let map: serde_json::Value = serde_json::from_str(MAP_SCHEMA).unwrap();
        assert_eq!(map["$id"], "https://mailschema.org/schemas/map-0.2.schema.json");
        let context: serde_json::Value = serde_json::from_str(MAP_CONTEXT).unwrap();
        assert_eq!(context["@context"]["MailAction"], "map:MailAction");
        let record: serde_json::Value = serde_json::from_str(RECORD_SCHEMA).unwrap();
        assert_eq!(record["$ref"], "#/$defs/record");
        assert_eq!(MAP_PROFILE, "https://mailschema.org/profiles/map/0.2");
    }
}
