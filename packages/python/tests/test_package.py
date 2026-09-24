import copy
import json
import unittest
from pathlib import Path

from mailschema import (
    contribution_errors,
    get_contribution_schema,
    get_content_review_contract,
    get_record_schema,
    get_map_schema,
    validate_contribution,
    validate_record,
    validate_map_document,
    validate_content_review_request,
)


class PackageTests(unittest.TestCase):
    def setUp(self):
        # The release preparation script supplies the same fixture as the site.
        self.fixture = json.loads(Path("tests/new-type.json").read_text())
        self.record = json.loads(Path("tests/content-review.json").read_text())
        self.description = json.loads(Path("tests/map-description.json").read_text())
        self.request = json.loads(Path("tests/map-request.json").read_text())
        self.result = json.loads(Path("tests/map-result.json").read_text())

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
        self.assertEqual(get_map_schema()["$id"], "https://mailschema.org/schemas/map-0.1.schema.json")
        self.assertEqual(get_content_review_contract()["id"], "https://mailschema.org/types/content-review")

    def test_map_documents(self):
        validate_map_document(self.description)
        validate_map_document(self.request)
        validate_map_document(self.result)
        self.assertEqual(self.result["type"], self.request["type"])
        validate_content_review_request(self.request)
        invalid = copy.deepcopy(self.request)
        invalid["operation"] = "publish"
        with self.assertRaises(ValueError):
            validate_content_review_request(invalid)


if __name__ == "__main__":
    unittest.main()
