"""Local contribution checker; python -m mailschema or mailschema."""

import argparse
import json
import sys

from . import get_contribution_schema, get_record_schema, validate_contribution, validate_record


def main() -> int:
    parser = argparse.ArgumentParser(description="Check MailSchema contribution structure locally.")
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("check", help="Check a local JSON file; no upload or mutation.")
    check.add_argument("file")
    check.add_argument("--record", action="store_true")
    schema = commands.add_parser("schema", help="Print the bundled JSON Schema.")
    schema.add_argument("--record", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "schema":
            print(json.dumps(get_record_schema() if args.record else get_contribution_schema(), indent=2))
        else:
            with open(args.file, "rb") as file:
                raw = file.read(256 * 1024 + 1)
            if len(raw) > 256 * 1024:
                raise ValueError("JSON file exceeds 256 KiB.")
            value = json.loads(raw)
            (validate_record if args.record else validate_contribution)(value)
            print("Valid MailSchema " + ("type record" if args.record else "contribution") + " structure.")
        return 0
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
