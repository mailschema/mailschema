# MailSchema for Python

Validate Mail Action Protocol documents and MailSchema Registry contributions with Draft 2020-12 JSON Schema checks.

[Specification](https://mailschema.org/specification/) · [Registry](https://mailschema.org/registry/) · [Tools](https://mailschema.org/tools/) · [Source](https://github.com/mailschema/python)

## Install

```sh
pip install mailschema
```

Python 3.10 or newer is required.

## Validate MAP documents

```python
from mailschema import validate_map_document, validate_content_review_request

validate_map_document(description)
validate_content_review_request(request)
```

The CLI performs the same checks against local JSON files:

```sh
python -m mailschema check description.json --map
python -m mailschema check request.json --content-review
```

## Work with Registry data

```python
from mailschema import contribution_errors, get_contribution_schema, validate_contribution

errors = contribution_errors(candidate)
validate_contribution(candidate)  # Raises ValueError for invalid input.
schema = get_contribution_schema()
```

`validate_record`, `record_errors` and `get_record_schema` handle expanded Registry records. Pass `--record` to the CLI for the corresponding record format.

The package bundles the MAP 0.1, Content Review 0.1 and Registry schemas. It uses the established `jsonschema` and `referencing` libraries for validation and performs no network requests.

## Trust boundary

A valid document is structured input. Validation does not authenticate a service, grant authority, approve an action, resolve Registry history or establish product conformance. Implementations must apply their own endpoint trust, credentials, permissions and policy before executing a request.

The CLI reads one local file of at most 256 KiB and does not upload or modify it. Package versions and MAP profile versions advance independently. MIT licensed.
