# MailSchema for Python

[![PyPI](https://img.shields.io/pypi/v/mailschema)](https://pypi.org/project/mailschema/)
[![CI](https://github.com/mailschema/python/actions/workflows/test.yml/badge.svg)](https://github.com/mailschema/python/actions/workflows/test.yml)

The Mail Action Protocol 0.2 core artifacts, and Draft 2020-12 validation of MailSchema Registry contributions, with no network requests.

[Specification](https://mailschema.org/specification) · [Registry](https://mailschema.org/registry) · [Tools](https://mailschema.org/tools) · [Source](https://github.com/mailschema/python)

## Install

```sh
pip install mailschema
```

Python 3.10 or newer is required.

## MAP 0.2 core artifacts

```python
from mailschema import MAP_PROFILE, get_contract_format_schema, get_forms_schema, get_map_context, get_map_schema
```

Each returns a fresh copy of the file the [profile record](https://mailschema.org/profiles/map/0.2.json) binds by SHA-256. Type contracts are not bundled: a client obtains them from the [Registry catalogue](https://mailschema.org/registry/catalog.json) by digest. Processing MAP messages is outside this package; see the [profile](https://mailschema.org/specification/profile).

## Registry data

```python
from mailschema import contribution_errors, validate_contribution

errors = contribution_errors(candidate)
validate_contribution(candidate)  # Raises ValueError for invalid input.
```

`validate_record`, `record_errors` and `get_record_schema` handle expanded Registry records.

```sh
python -m mailschema check contribution.json
python -m mailschema check record.json --record
python -m mailschema schema --map
```

## Trust boundary

A valid document is structured input. Validation does not authenticate a service, grant authority or establish product conformance. The CLI reads one local file of at most 256 KiB and does not upload or modify it. Package versions and MAP profile versions advance independently. MIT licensed.
