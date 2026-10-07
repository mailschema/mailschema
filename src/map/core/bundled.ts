// The schemas the 0.3 profile record binds, by their canonical files. Package preparation
// points these three imports at the package's own copies; no other line differs between the
// repository and the npm package.
import coreSchema from '../../../specifications/map-0.3/schemas/core.schema.json' with { type: 'json' };
import contractSchema from '../../../specifications/map-0.3/schemas/contract.schema.json' with { type: 'json' };
import implementationSchema from '../../../specifications/map-0.3/schemas/implementation.schema.json' with { type: 'json' };

export { coreSchema, contractSchema, implementationSchema };
