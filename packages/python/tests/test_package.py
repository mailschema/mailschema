import hashlib
import json
import unittest

import mailschema


class ArtifactTest(unittest.TestCase):
    def test_profile_record_binds_the_bundled_bytes(self):
        record = json.loads(mailschema.artifact("profile.json"))
        self.assertEqual(record["id"], mailschema.PROFILE)
        self.assertEqual(record["context"], mailschema.CONTEXT)
        for key, name in {
            "context": "context.jsonld",
            "schema": "core.schema.json",
            "contractFormat": "contract.schema.json",
        }.items():
            digest = hashlib.sha256(mailschema.artifact(name)).hexdigest()
            self.assertEqual(digest, record["artifacts"][key]["sha256"], name)

    def test_every_artifact_is_json(self):
        for name in mailschema.ARTIFACTS:
            self.assertIsInstance(json.loads(mailschema.artifact(name)), dict, name)

    def test_refuses_an_unknown_artifact(self):
        with self.assertRaises(KeyError):
            mailschema.artifact("../pyproject.toml")


if __name__ == "__main__":
    unittest.main()
