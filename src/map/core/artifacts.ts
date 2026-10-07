// MAP 0.3's identifiers, limits and schema validation.
import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export { coreSchema, contractSchema, implementationSchema } from './bundled.ts';

export const PROFILE = 'https://mailschema.org/profiles/map/0.3';
export const CONTEXT = 'https://mailschema.org/contexts/map-0.3.jsonld';
/** The Content-Type of the MIME part that carries a description. */
export const DESCRIPTION_MEDIA_TYPE = `application/ld+json; profile="${PROFILE}"`;
export const DESCRIPTION_MAX_BYTES = 65536;
export const CONTRACT_MAX_BYTES = 262144;
/** The namespace of the initial effect vocabulary. */
export const EFFECTS = 'https://mailschema.org/effects/';
/** The formats MAP schemas may assert. Every implementation checks exactly these. */
export const FORMATS = ['date', 'date-time', 'email', 'uri'] as const;

/**
 * JSON Schema 2020-12 as MAP reads it: the listed formats asserted, and references resolved
 * only within the schema, never over the network. MAP's own rules decide which keywords and
 * formats a contract may use; the validator adds no checks of its own beyond the vocabulary.
 * @internal
 */
export function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv, [...FORMATS]);
  // Ajv also reads OpenAPI's `nullable` and the earlier `dependencies` and `definitions`.
  for (const keyword of ['nullable', 'dependencies', 'definitions']) ajv.removeKeyword(keyword);
  return ajv;
}

/** Each validation error as its JSON Pointer and message. @internal */
export const schemaErrors = (errors: ErrorObject[] | null | undefined, prefix = '') =>
  (errors ?? []).map((error) => `${prefix + error.instancePath || '/'}: ${error.message}`);
