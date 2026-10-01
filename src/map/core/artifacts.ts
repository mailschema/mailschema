// The bundled core artifacts and the validators built from them.
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import { contractFormat, coreSchema, formsSchema } from './bundled.ts';
import type { JsonObject } from './types.ts';

export const MAP_PROFILE = 'https://mailschema.org/profiles/map/0.2';
export const CORE_SCHEMA = 'https://mailschema.org/schemas/map-0.2.schema.json';
export const FORMS_SCHEMA = 'https://mailschema.org/schemas/forms-0.1.schema.json';
export const CONTRACT_FORMAT = 'https://mailschema.org/schemas/type-contract-0.2.schema.json';
export const CONTEXT = 'https://mailschema.org/contexts/map-0.2.jsonld';
export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

/** The schemas a contract may depend on without supplying them itself. */
export const BUNDLED: ReadonlyMap<string, JsonObject> = new Map([
  [CORE_SCHEMA, coreSchema as JsonObject],
  [FORMS_SCHEMA, formsSchema as JsonObject],
]);

/**
 * JSON Schema 2020-12 as MAP reads it. Lexical forms are the core schema's patterns, so
 * `format` stays an annotation: format checkers differ between validators. References
 * resolve only against schemas already added, never over the network.
 * @internal
 */
export function createValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    validateFormats: false,
  });
  // HTML autofill field names label form fields; they are annotations, not assertions.
  ajv.addKeyword({ keyword: 'autocomplete', schemaType: 'string' });
  // Only JSON Schema 2020-12 vocabulary keywords. Ajv also reads OpenAPI's `nullable`,
  // which admits a null other validators refuse, and the earlier `dependencies` and
  // `definitions`; strict mode now refuses them as unknown.
  for (const keyword of ['nullable', 'dependencies', 'definitions']) ajv.removeKeyword(keyword);
  for (const schema of BUNDLED.values()) ajv.addSchema(schema);
  return ajv;
}

const core = createValidator();

/** A core or form fields definition by name, for the shared lexical vectors. */
export const definition = (schema: string, name: string): ValidateFunction =>
  core.getSchema(`${schema}#/$defs/${name}`)!;

/** Errors as `pointer message` lines, as the other MailSchema packages report them. */
export function errorList(errors: ErrorObject[] | null | undefined, prefix = '') {
  return (errors ?? [])
    .slice(0, 100)
    .map(
      (error) =>
        `${prefix + error.instancePath || '/'} ${error.message}${error.keyword === 'required' ? `: ${error.params.missingProperty}` : ''}`,
    );
}

const errorsOf = (validate: ValidateFunction, value: unknown) =>
  validate(value) ? [] : errorList(validate.errors);

const DOCUMENT = core.getSchema(CORE_SCHEMA)!;
const DEFINITIONS = Object.fromEntries(
  ['description', 'request', 'result', 'problem'].map((name) => [
    name,
    definition(CORE_SCHEMA, name),
  ]),
);
const DATE_TIME = new RegExp((coreSchema.$defs.dateTime as { pattern: string }).pattern, 'u');
const REQUEST_ID = definition(CORE_SCHEMA, 'uuidUrn');
const CONTRACT = core.compile(contractFormat);

/** Checks a type contract against the contract format. */
export const contractFormatErrors = (contract: unknown) => errorsOf(CONTRACT, contract);

/** Checks any MAP 0.2 description, request, result or problem against the core schema. */
export const mapErrors = (document: unknown) => errorsOf(DOCUMENT, document);

/**
 * Checks a description against the core description definition only. A description of a
 * type the caller has no contract for can be checked this far.
 */
export const descriptionErrors = (description: unknown) =>
  errorsOf(DEFINITIONS.description, description);

/** Checks a request against the core request definition. Its identifier stays free if it fails. */
export const requestErrors = (request: unknown) => errorsOf(DEFINITIONS.request, request);

/** Checks a result against the core result definition only. */
export const resultErrors = (result: unknown) => errorsOf(DEFINITIONS.result, result);

/** Checks a problem against the core problem definition, including its type, status and code. */
export const problemErrors = (problem: unknown) => errorsOf(DEFINITIONS.problem, problem);

/** Whether a value is a request identifier: the core UUID URN form. Only one names a result resource. */
export const isRequestId = (value: unknown) => REQUEST_ID(value);

/**
 * Whether a deadline, a core date-time plus `afterSeconds`, has been reached. Anything but
 * a core date-time counts as reached, so a mistake fails closed.
 */
export const reached = (now: Date, deadline: string, afterSeconds = 0) =>
  !(DATE_TIME.test(deadline) && now.getTime() < Date.parse(deadline) + afterSeconds * 1000);
