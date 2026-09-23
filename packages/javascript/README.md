# MailSchema

JSON Schemas and validation tools for Mail Action Protocol 0.1 and the MailSchema Registry.

Validate MAP descriptions, requests, results and problems, or prepare a Registry contribution. The package is local and performs no network requests.

```sh
npm install mailschema
npx mailschema check contribution.json
npx mailschema schema > contribution.schema.json
npx mailschema check description.json --map
npx mailschema check request.json --content-review
```

Node.js 22 or newer. The JavaScript API is ESM; the CLI reads a local JSON file of at most 256 KiB and does not upload or modify it.

```js
import { assertContribution, contributionErrors, getContributionSchema } from 'mailschema';

const errors = contributionErrors(candidate);
if (errors.length) console.error(errors);
else assertContribution(candidate);

const schema = getContributionSchema(); // Independent copy, JSON Schema Draft 2020-12.
```

```js
import { assertMapDocument, assertContentReviewRequest, getMapSchema } from 'mailschema';

assertMapDocument(description);
assertContentReviewRequest(request);
const mapSchema = getMapSchema();
```

Use `assertTypeRecord(value)` or `mailschema check record.json --record` for expanded Registry records. `getRecordSchema()` returns the equivalent schema. The raw contribution schema is also exported as `mailschema/contribution.schema.json`.

For a structurally valid contribution, `referenceErrors(contribution, catalog)` checks references against a supplied catalogue: current amendment bases, existing type names, exact implementation records, versions, profiles and operations. The catalogue contains `types` and `snapshots` arrays of `{ record, digest }` entries. It is never fetched automatically.

`Contribution`, `TypeRecord`, `TypeDefinition`, `Implementation`, `Party` and `CatalogView` are exported TypeScript types. Successful validation does not verify a contributor's identity, establish product compatibility or accept a submission. Full repository review also checks competing amendments and contribution identifiers.

Raw schemas are exported as `mailschema/map-0.1.schema.json`, `mailschema/content-review-0.1.schema.json` and `mailschema/contribution.schema.json`. Package version `0.1.1` is independent of the MAP profile version. MIT licensed.
