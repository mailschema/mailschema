# MailSchema

JSON Schemas, TypeScript definitions and validation tools for the MailSchema Registry.

Prepare a new interaction type, amend an existing definition, or declare an implementation's supported operations. This package checks the Registry contribution format. It does not implement email delivery, authorization or the draft Mail Action Protocol wire format.

```sh
npm install mailschema
npx mailschema check contribution.json
npx mailschema schema > contribution.schema.json
```

Node.js 22 or newer. The JavaScript API is ESM; the CLI reads a local JSON file of at most 256 KiB and does not upload or modify it.

```js
import { assertContribution, contributionErrors, getContributionSchema } from 'mailschema';

const errors = contributionErrors(candidate);
if (errors.length) console.error(errors);
else assertContribution(candidate);

const schema = getContributionSchema(); // Independent copy, JSON Schema Draft 2020-12.
```

Use `assertTypeRecord(value)` or `mailschema check record.json --record` for expanded Registry records. `getRecordSchema()` returns the equivalent schema. The raw contribution schema is also exported as `mailschema/contribution.schema.json`.

For a structurally valid contribution, `referenceErrors(contribution, catalog)` checks references against a supplied catalogue: current amendment bases, existing type names, exact implementation records, versions, profiles and operations. The catalogue contains `types` and `snapshots` arrays of `{ record, digest }` entries. It is never fetched automatically.

`Contribution`, `TypeRecord`, `TypeDefinition`, `Implementation`, `Party` and `CatalogView` are exported TypeScript types. Successful validation does not verify a contributor's identity, establish product compatibility or accept a submission. Full repository review also checks competing amendments and contribution identifiers.

Package version `0.1.0` is independent of any specification version. MIT licensed.
