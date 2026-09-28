import copy
import json
import unittest
from pathlib import Path

from mailschema import (
    MAP_PROFILE,
    contribution_errors,
    get_contract_format_schema,
    get_contribution_schema,
    get_forms_schema,
    get_map_context,
    get_map_schema,
    get_record_schema,
    validate_contribution,
    validate_record,
)


class PackageTests(unittest.TestCase):
    def setUp(self):
        # The release preparation script supplies the same fixtures as the site.
        self.fixture = json.loads(Path("tests/new-type.json").read_text())
        self.record = json.loads(Path("tests/content-review.json").read_text())

    def test_map_core_artifacts(self):
        self.assertEqual(MAP_PROFILE, "https://mailschema.org/profiles/map/0.2")
        self.assertEqual(get_map_schema()["$id"], "https://mailschema.org/schemas/map-0.2.schema.json")
        self.assertEqual(get_map_context()["@context"]["MailAction"], "map:MailAction")
        self.assertEqual(
            get_contract_format_schema()["$id"], "https://mailschema.org/schemas/type-contract-0.2.schema.json"
        )
        self.assertEqual(get_forms_schema()["$id"], "https://mailschema.org/schemas/forms-0.1.schema.json")

    def test_valid_contribution_and_record(self):
        validate_contribution(self.fixture)
        validate_record(self.record)

    def test_invalid_inputs_are_rejected(self):
        for value in [None, [], 1, {"kind": []}, {"kind": "unknown"}, {**self.fixture, "verified": True}]:
            self.assertTrue(contribution_errors(value))
        invalid = copy.deepcopy(self.fixture)
        invalid["contributor"]["url"] = "javascript:alert(1)"
        with self.assertRaises(ValueError):
            validate_contribution(invalid)
        with self.assertRaises(ValueError):
            validate_record({**self.record, "version": None})

    def test_schema_copies_and_record_reference(self):
        schema = get_contribution_schema()
        schema["title"] = "mutated"
        self.assertNotEqual(get_contribution_schema()["title"], "mutated")
        self.assertEqual(get_record_schema()["$ref"], "#/$defs/record")


if __name__ == "__main__":
    unittest.main()
