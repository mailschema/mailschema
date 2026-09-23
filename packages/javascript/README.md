# MailSchema for JavaScript

Validate Mail Action Protocol documents and MailSchema Registry contributions without making a network request.

[Specification](https://mailschema.org/specification/) · [Registry](https://mailschema.org/registry/) · [Tools](https://mailschema.org/tools/) · [Source](https://github.com/mailschema/javascript)

## Install

```sh
npm install mailschema
```

Node.js 22 or newer is required. The package is ESM and includes TypeScript declarations.

## Validate MAP documents

```js
import { assertMapDocument, assertContentReviewRequest, getMapSchema } from 'mailschema';

assertMapDocument(description);
assertContentReviewRequest(request);
const mapSchema = getMapSchema();
```

The CLI performs the same checks against local JSON files:

```sh
npx mailschema check description.json --map
npx mailschema check request.json --content-review
```

## Work with Registry data

```js
import {
  assertContribution,
  contributionErrors,
  getContributionSchema,
  referenceErrors,
} from 'mailschema';

const errors = contributionErrors(candidate);
if (errors.length) console.error(errors);
else assertContribution(candidate);

const schema = getContributionSchema();
const referenceProblems = referenceErrors(candidate, catalog);
```

`assertTypeRecord`, `getRecordSchema` and `mailschema check record.json --record` handle expanded Registry records. Reference checks use a catalogue supplied by the caller; the package never fetches one automatically.

Raw Draft 2020-12 schemas are exported as:

- `mailschema/map-0.1.schema.json`
- `mailschema/content-review-0.1.schema.json`
- `mailschema/contribution.schema.json`

## Trust boundary

A valid document is structured input. Validation does not authenticate a service, grant authority, approve an action or establish product conformance. Implementations must apply their own endpoint trust, credentials, permissions and policy before executing a request.

The CLI reads one local file of at most 256 KiB and does not upload or modify it. Package versions and MAP profile versions advance independently. MIT licensed.
