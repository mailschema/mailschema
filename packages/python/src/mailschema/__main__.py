"""Local Registry checker; python -m mailschema or mailschema."""

import argparse
import json
import sys

from . import (
    get_contract_format_schema,
    get_contribution_schema,
    get_forms_schema,
    get_map_context,
    get_map_schema,
    get_record_schema,
    validate_contribution,
    validate_record,
)

SCHEMAS = {
    "record": get_record_schema,
    "map": get_map_schema,
    "context": get_map_context,
    "contract_format": get_contract_format_schema,
    "forms": get_forms_schema,
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check MailSchema Registry files and print bundled schemas locally.")
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("check", help="Check a local contribution or record; no upload or mutation.")
    check.add_argument("file")
    check.add_argument("--record", action="store_true")
    schema = commands.add_parser("schema", help="Print a bundled schema: the contribution schema by default.")
    chosen = schema.add_mutually_exclusive_group()
    for name in SCHEMAS:
        chosen.add_argument(f"--{name.replace('_', '-')}", dest=name, action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "schema":
            selected = next((SCHEMAS[name] for name in SCHEMAS if getattr(args, name)), get_contribution_schema)
            print(json.dumps(selected(), indent=2))
        else:
            with open(args.file, "rb") as file:
                raw = file.read(256 * 1024 + 1)
            if len(raw) > 256 * 1024:
                raise ValueError("JSON file exceeds 256 KiB.")
            value = json.loads(raw)
            (validate_record if args.record else validate_contribution)(value)
            print(f"Valid MailSchema {'type record' if args.record else 'contribution'}.")
        return 0
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
