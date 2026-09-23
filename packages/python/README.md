# MailSchema

JSON Schemas and validation tools for MailSchema Registry contributions.

```sh
pip install mailschema
python -m mailschema check contribution.json
python -m mailschema schema > contribution.schema.json
```

```python
from mailschema import contribution_errors, validate_contribution, get_contribution_schema

errors = contribution_errors(candidate)
validate_contribution(candidate)  # Raises ValueError for invalid input.
schema = get_contribution_schema()  # Independent copy, JSON Schema Draft 2020-12.
```

`validate_record`, `record_errors` and `get_record_schema` handle expanded Registry records. Pass `--record` to either CLI command for the corresponding record format. The CLI accepts files up to 256 KiB and never uploads or changes them. Python 3.10 or newer is required.

The package validates structure, required fields and URI formats using the established `jsonschema` library. It does not check a live Registry, resolve amendment history, verify contributor identity or certify implementations. Submit valid files through the project's contribution review process.

These are Registry contribution tools. They do not implement email delivery, authorization or the draft Mail Action Protocol wire format. Package version `0.1.0` is independent of any specification version. MIT licensed.
