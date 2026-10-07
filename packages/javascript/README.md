# mailschema

[Mail Action Protocol](https://mailschema.org) 0.3 for JavaScript. It parses and checks MAP descriptions, type contracts and Registry implementation records, and computes the RFC 8785 digests that identify contracts. The same code runs the MailSchema specification's own checks. It has no Node.js-only dependencies, so it also runs in browsers and workers.

```sh
npm install mailschema@0.3.1
```

## Check a description against its contract

```js
import { readFile } from 'node:fs/promises';
import { Contract, parseDescription } from 'mailschema';

const contract = Contract.parse(await readFile('campaign-send-approval-0.1.json'));
const description = parseDescription(await readFile('description.json'));
const errors = contract.descriptionErrors(description);
if (errors.length) throw new Error(errors.join('\n'));
```

`parseDescription` reads the bytes as MAP JSON (strict I-JSON within 64 KiB) and checks the core rules, or throws `InvalidDocument` with every reason. Obtain contracts from a catalogue you configure and pin them by digest; a message never chooses one.

## API

- `parse(input, maxBytes)`, `canonicalize(value)`, `digest(value)`: MAP JSON and RFC 8785 digests.
- `descriptionErrors(value)`, `parseDescription(input)`: the core description rules.
- `new Contract(value)`, `Contract.parse(input)`: a checked contract with `digest`, `operation(id)`, `detailsErrors(details)`, `inputErrors(operationId, input)` and `descriptionErrors(description)`.
- `contractErrors(value)`: why a value is not a contract, including schema keywords, formats and patterns every implementation can enforce alike.
- `implementationErrors(value)`, `parseImplementation(input)`: Registry implementation records.
- `PROFILE`, `CONTEXT`, `DESCRIPTION_MEDIA_TYPE`, `EFFECTS`, `CAPABILITY_KINDS` and the size limits.

The profile record, context and schemas are exported byte for byte: `mailschema/profile.json`, `mailschema/context.jsonld`, `mailschema/core.schema.json`, `mailschema/contract.schema.json` and `mailschema/implementation.schema.json`.

## Command line

```sh
npx mailschema@0.3.1 contract campaign-send-approval-0.1.json
npx mailschema@0.3.1 description description.json --contract campaign-send-approval-0.1.json
npx mailschema@0.3.1 implementation record.json
```

Each command first prints a line naming what it checked. `contract` prints `Valid type contract <id> <version>` and, on the second line, the contract's digest. `description` prints `Valid MAP 0.3 description <@id>` and, on the second line, the description's digest; with `--contract`, it first checks that the description uses that contract as it allows. `implementation` prints `Valid implementation record for <service>`. A digest is `sha-256:` and the SHA-256 of the document's RFC 8785 canonical JSON, the value `digest()` returns; the description's digest is not the contract digest it names. An invalid file prints every reason on standard error and exits with status 1. Nothing is uploaded or changed.

Checking does not authenticate a message, establish a service's authority or perform an action. Those belong to the implementation, under the [specification](https://mailschema.org/specification/core).

Source: [mailschema/javascript](https://github.com/mailschema/javascript). License: MIT.
