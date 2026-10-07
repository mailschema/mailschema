# mailschema

The [Mail Action Protocol](https://mailschema.org) 0.3 artifacts for Python, byte for byte as mailschema.org publishes them: the profile record, the JSON-LD context, and the core, type contract and implementation record schemas. The profile record binds the context and the first two schemas by SHA-256. The package has no dependencies.

```sh
pip install mailschema==0.3.0
```

```python
import json
import mailschema

core_schema = json.loads(mailschema.artifact("core.schema.json"))
```

`mailschema.ARTIFACTS` lists the bundled files and `mailschema.PROFILE` names the profile. To parse and check descriptions and contracts, use the JavaScript or Ruby package, or implement the [specification](https://mailschema.org/specification/core); schema validation alone does not establish a valid description.

Source: [mailschema/python](https://github.com/mailschema/python). License: MIT.
