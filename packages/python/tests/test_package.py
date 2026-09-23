import copy
import json
import unittest
from pathlib import Path

from mailschema import contribution_errors, get_contribution_schema, get_record_schema, validate_contribution, validate_record


class PackageTests(unittest.TestCase):
    def setUp(self):
        # The release preparation script supplies the same fixture as the site.
        self.fixture = json.loads(Path("tests/new-type.json").read_text())
        self.record = json.loads(Path("tests/content-review.json").read_text())

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
