"""Mail Action Protocol 0.3 artifacts, byte for byte as mailschema.org publishes them.

The profile record, the JSON-LD context, and the core, type contract and implementation record
schemas. The profile record binds the context and the first two schemas by SHA-256.
"""

from importlib.resources import files

__version__ = "0.3.0"

PROFILE = "https://mailschema.org/profiles/map/0.3"
"""The MAP profile these artifacts define."""

CONTEXT = "https://mailschema.org/contexts/map-0.3.jsonld"
"""The JSON-LD context every MAP 0.3 description names."""

ARTIFACTS = (
    "profile.json",
    "context.jsonld",
    "core.schema.json",
    "contract.schema.json",
    "implementation.schema.json",
)
"""The bundled files, by name."""


def artifact(name: str) -> bytes:
    """Return the exact bytes of a bundled artifact."""
    if name not in ARTIFACTS:
        raise KeyError(f"mailschema: unknown artifact {name!r}")
    return files(__package__).joinpath(name).read_bytes()
