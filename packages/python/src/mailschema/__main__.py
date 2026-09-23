"""Local contribution checker; python -m mailschema or mailschema."""

import argparse
import json
import sys

from . import (
    get_content_review_schema,
    get_contribution_schema,
    get_map_schema,
    get_record_schema,
    validate_content_review_request,
    validate_contribution,
    validate_map_document,
    validate_record,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check MailSchema contribution structure locally.")
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("check", help="Check a local JSON file; no upload or mutation.")
    check.add_argument("file")
    check_format = check.add_mutually_exclusive_group()
    check_format.add_argument("--record", action="store_true")
    check_format.add_argument("--map", action="store_true")
    check_format.add_argument("--content-review", action="store_true")
    schema = commands.add_parser("schema", help="Print the bundled JSON Schema.")
    schema_format = schema.add_mutually_exclusive_group()
    schema_format.add_argument("--record", action="store_true")
    schema_format.add_argument("--map", action="store_true")
    schema_format.add_argument("--content-review", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "schema":
            selected = (
                get_content_review_schema()
                if args.content_review
                else get_map_schema()
                if args.map
                else get_record_schema()
                if args.record
                else get_contribution_schema()
            )
            print(json.dumps(selected, indent=2))
        else:
            with open(args.file, "rb") as file:
                raw = file.read(256 * 1024 + 1)
            if len(raw) > 256 * 1024:
                raise ValueError("JSON file exceeds 256 KiB.")
            value = json.loads(raw)
            validator, label = (
                (validate_content_review_request, "Content Review request")
                if args.content_review
                else (validate_map_document, "MAP document")
                if args.map
                else (validate_record, "type record")
                if args.record
                else (validate_contribution, "contribution")
            )
            validator(value)
            print(f"Valid MailSchema {label}.")
        return 0
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
