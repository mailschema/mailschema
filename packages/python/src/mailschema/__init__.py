"""JSON Schema validation for MAP documents and MailSchema Registry contributions."""

import json
from importlib.resources import files
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

__version__ = "0.1.1"


def _bundled(name: str) -> dict[str, Any]:
    return json.loads(files(__package__).joinpath(name).read_text(encoding="utf-8"))


def get_contribution_schema() -> dict[str, Any]:
    """Return a fresh copy of the bundled contribution schema."""
    return _bundled("contribution.schema.json")


def get_map_schema() -> dict[str, Any]:
    """Return a fresh copy of the MAP 0.1 schema."""
    return _bundled("map-0.1.schema.json")


def get_content_review_schema() -> dict[str, Any]:
    """Return a fresh copy of the Content Review 0.1 request schema."""
    return _bundled("content-review-0.1.schema.json")


def get_record_schema() -> dict[str, Any]:
    """Return the schema for expanded Registry records."""
    schema = get_contribution_schema()
    return {"$schema": schema["$schema"], "$defs": schema["$defs"], "$ref": "#/$defs/record"}


_schema = get_contribution_schema()
_validator = Draft202012Validator(_schema, format_checker=FormatChecker())
_variants = {
    variant["properties"]["kind"]["const"]: Draft202012Validator(
        {"$schema": _schema["$schema"], "$defs": _schema["$defs"], **variant},
        format_checker=FormatChecker(),
    )
    for variant in _schema["oneOf"]
}
_record_validator = Draft202012Validator(get_record_schema(), format_checker=FormatChecker())
_map_schema = get_map_schema()
_map_validator = Draft202012Validator(_map_schema, format_checker=FormatChecker())
_content_review_validator = Draft202012Validator(
    get_content_review_schema(),
    registry=Registry().with_resource(_map_schema["$id"], Resource.from_contents(_map_schema)),
    format_checker=FormatChecker(),
)


def _errors(validator: Draft202012Validator, value: Any) -> list[str]:
    result = []
    for error in validator.iter_errors(value):
        path = "/" + "/".join(str(part).replace("~", "~0").replace("/", "~1") for part in error.absolute_path)
        result.append(f"{path} {error.message}")
    return result


def contribution_errors(value: Any) -> list[str]:
    """Return structural errors; an empty list means the schema checks passed."""
    kind = value.get("kind") if isinstance(value, dict) else None
    validator = _variants.get(kind, _validator) if isinstance(kind, str) else _validator
    return _errors(validator, value)


def record_errors(value: Any) -> list[str]:
    """Return structural errors for a Registry record."""
    return _errors(_record_validator, value)


def map_errors(value: Any) -> list[str]:
    """Return structural errors for a MAP 0.1 description, request, result or problem."""
    return _errors(_map_validator, value)


def content_review_request_errors(value: Any) -> list[str]:
    """Return errors for a Content Review 0.1 MAP request."""
    return _errors(_content_review_validator, value)


def validate_contribution(value: Any) -> None:
    """Raise ValueError if a contribution does not match the schema."""
    errors = contribution_errors(value)
    if errors:
        raise ValueError("Invalid contribution:\n" + "\n".join(errors))


def validate_record(value: Any) -> None:
    """Raise ValueError if a Registry record does not match the schema."""
    errors = record_errors(value)
    if errors:
        raise ValueError("Invalid type record:\n" + "\n".join(errors))


def validate_map_document(value: Any) -> None:
    """Raise ValueError if a value is not a MAP 0.1 document."""
    errors = map_errors(value)
    if errors:
        raise ValueError("Invalid MAP 0.1 document:\n" + "\n".join(errors))


def validate_content_review_request(value: Any) -> None:
    """Raise ValueError if a value is not a Content Review 0.1 request."""
    errors = content_review_request_errors(value)
    if errors:
        raise ValueError("Invalid Content Review 0.1 request:\n" + "\n".join(errors))
