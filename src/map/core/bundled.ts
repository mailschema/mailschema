// The core artifacts, by their canonical files. Package preparation points these three
// imports at the package's own copies; no other line differs between the repository and
// the npm package.
import coreSchema from '../../../public/schemas/map-0.2.schema.json' with { type: 'json' };
import formsSchema from '../../../public/schemas/forms-0.1.schema.json' with { type: 'json' };
import contractFormat from '../../../public/schemas/type-contract-0.2.schema.json' with { type: 'json' };

export { coreSchema, formsSchema, contractFormat };
