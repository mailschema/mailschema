# MailSchema for JavaScript

[![npm](https://img.shields.io/npm/v/mailschema)](https://www.npmjs.com/package/mailschema)
[![CI](https://github.com/mailschema/javascript/actions/workflows/test.yml/badge.svg)](https://github.com/mailschema/javascript/actions/workflows/test.yml)

The Mail Action Protocol 0.2 core artifacts, and local validation of MailSchema Registry contributions, with no network requests.

[Specification](https://mailschema.org/specification) · [Registry](https://mailschema.org/registry) · [Tools](https://mailschema.org/tools) · [Source](https://github.com/mailschema/javascript)

## Install

```sh
npm install mailschema
```

Node.js 22 or newer is required. The package is ESM and includes TypeScript declarations.

## MAP 0.2 core artifacts

```js
import {
  MAP_PROFILE,
  getContractFormatSchema,
  getFormsSchema,
  getMapContext,
  getMapSchema,
} from 'mailschema';
```

Each is byte-identical to the file the [profile record](https://mailschema.org/profiles/map/0.2.json) binds by SHA-256, and is also exported raw as `mailschema/map-0.2.schema.json`, `mailschema/map-0.2.jsonld`, `mailschema/type-contract-0.2.schema.json` and `mailschema/forms-0.1.schema.json`. Type contracts are not bundled: a client obtains them from the [Registry catalogue](https://mailschema.org/registry/catalog.json) by digest. Processing MAP messages is outside this package; see the [profile](https://mailschema.org/specification/profile).

## Registry data

```js
import { assertContribution, contributionErrors, referenceErrors } from 'mailschema';

const errors = contributionErrors(candidate);
if (errors.length) console.error(errors);
else assertContribution(candidate);

const referenceProblems = referenceErrors(candidate, catalog);
```

`assertTypeRecord` and `getRecordSchema` handle expanded Registry records. Reference checks use a catalogue supplied by the caller; the package never fetches one.

```sh
npx mailschema check contribution.json
npx mailschema check record.json --record
npx mailschema schema --map
```

## Trust boundary

A valid document is structured input. Validation does not authenticate a service, grant authority or establish product conformance. The CLI reads one local file of at most 256 KiB and does not upload or modify it. Package versions and MAP profile versions advance independently. MIT licensed.
