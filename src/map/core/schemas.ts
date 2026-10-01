// The schema objects within a schema, the form fields block and the references a contract's
// schemas make.
import { CORE_SCHEMA } from './artifacts.ts';
import { resolve } from './pointer.ts';
import type { JsonObject } from './types.ts';

// The keywords whose value is a schema, a list of schemas, or a map from names to schemas.
// A name in a map is never a keyword, whatever it is called.
const SUBSCHEMA = [
  'additionalProperties',
  'propertyNames',
  'items',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'unevaluatedItems',
  'unevaluatedProperties',
  'contentSchema',
];
const LISTS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const MAPS = ['properties', 'patternProperties', '$defs', 'dependentSchemas'];

/** Every schema object within a schema, the schema itself first. */
export function* nodes(schema: unknown): Generator<JsonObject> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
  const node = schema as JsonObject;
  yield node;
  for (const keyword of SUBSCHEMA) yield* nodes(node[keyword]);
  for (const keyword of LISTS)
    if (Array.isArray(node[keyword])) for (const item of node[keyword]) yield* nodes(item);
  for (const keyword of MAPS) {
    const map = node[keyword];
    if (map && typeof map === 'object' && !Array.isArray(map))
      for (const item of Object.values(map)) yield* nodes(item);
  }
}

/** Every value a keyword has in the schema objects within a schema. */
export const values = (schema: unknown, keyword: string) =>
  [...nodes(schema)].filter((node) => Object.hasOwn(node, keyword)).map((node) => node[keyword]);

// The core definitions that give a text field's `format` its lexical form.
const FORMATS: Record<string, string> = {
  email: 'address',
  uri: 'identifier',
  date: 'date',
  'date-time': 'dateTime',
};

/** Rules of a form fields block that JSON Schema cannot state. */
export function formProblems(fields: JsonObject): string[] {
  const properties = (fields.properties ?? {}) as Record<string, JsonObject>;
  const problems = ((fields.required ?? []) as string[])
    .filter((name) => !Object.hasOwn(properties, name))
    .map((name) => `required field ${name} is not defined`);
  for (const [name, field] of Object.entries(properties)) {
    const choices = (
      (field.oneOf ?? (field.items as JsonObject | undefined)?.anyOf ?? []) as JsonObject[]
    ).map((choice) => choice.const);
    if (new Set(choices).size !== choices.length) problems.push(`field ${name} repeats a choice`);
    const defaults = field.default === undefined ? [] : [field.default].flat();
    if (choices.length && defaults.some((value) => !choices.includes(value)))
      problems.push(`field ${name} defaults to a value it does not offer`);
  }
  return problems;
}

/**
 * The schema the values of a fields block satisfy: only its fields, each with a text
 * field's `format` read as the core lexical form of that name.
 */
export function fieldValuesSchema(fields: JsonObject): JsonObject {
  const properties = Object.fromEntries(
    Object.entries((fields.properties ?? {}) as Record<string, JsonObject>).map(([name, field]) => {
      if (typeof field.format !== 'string') return [name, field];
      const { format, ...rest } = field;
      return [name, { ...rest, $ref: `${CORE_SCHEMA}#/$defs/${FORMATS[format as string]}` }];
    }),
  );
  return { ...fields, properties, additionalProperties: false };
}

// A plain JSON Pointer fragment: nothing percent-encoded, nothing to decode.
const FRAGMENT = /^(?:\/[A-Za-z0-9._~!$&'()*+,;=:@-]*)*$/;
// Keywords that resolve by scope rather than by a pinned address.
const UNPINNED = ['$dynamicRef', '$recursiveRef', '$dynamicAnchor', '$recursiveAnchor', '$anchor'];

/**
 * Why a contract's schemas would resolve anything but a pinned schema, or undefined. No
 * keyword resolves by scope, in the contract's schemas or the pinned ones it supplies. In
 * the contract's own schemas, no $id or $schema appears but at the request schema's root,
 * since it would move references or change the dialect a subschema is read in; no type is
 * a list; autocomplete, the form fields block's annotation, is absent; and every
 * reference is a string naming a schema in the pinned documents, by URL.
 */
export function referenceProblem(
  inline: unknown[],
  requestSchema: JsonObject,
  pinned: ReadonlyMap<string, JsonObject>,
  supplied: JsonObject[],
): string | undefined {
  for (const schema of [...inline, requestSchema, ...supplied]) {
    const found = UNPINNED.find((keyword) => values(schema, keyword).length);
    if (found) return `${found} is not pinned by any digest`;
  }
  for (const schema of [...inline, requestSchema]) {
    const all = [...nodes(schema)];
    const nested = schema === requestSchema ? all.slice(1) : all;
    if (nested.some((node) => '$id' in node)) return 'a nested $id would move references';
    if (nested.some((node) => '$schema' in node))
      return 'a nested $schema would change the dialect';
    if (all.some((node) => Array.isArray(node.type))) return 'type names one type, never a list';
    if (all.some((node) => 'autocomplete' in node))
      return 'autocomplete belongs to the form fields block';
    for (const ref of values(schema, '$ref')) {
      if (typeof ref !== 'string') return 'a $ref is not a string';
      const [base, fragment = ''] = ref.split(/#(.*)/s);
      const document = pinned.get(base);
      if (!document) return `${ref} is not a pinned dependency`;
      if (fragment && !fragment.startsWith('/'))
        return `${ref} names an anchor, not a JSON Pointer`;
      if (!FRAGMENT.test(fragment)) return `${ref} is not a plain JSON Pointer`;
      const target = resolve(document, fragment);
      if (
        typeof target !== 'boolean' &&
        !(target && typeof target === 'object' && !Array.isArray(target))
      )
        return `${ref} does not name a schema`;
    }
  }
}
