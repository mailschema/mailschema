import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import canonicalize from 'canonicalize';
import coreSchema from '../../public/schemas/map-0.2.schema.json' with { type: 'json' };

export const MAP_PROFILE = 'https://mailschema.org/profiles/map/0.2';
export const CORE_SCHEMA = 'https://mailschema.org/schemas/map-0.2.schema.json';
export const FORMS_SCHEMA = 'https://mailschema.org/schemas/forms-0.1.schema.json';
const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';
const LEGACY_PROFILE = 'https://mailschema.org/profiles/map/0.1';
/** Profiles withdrawn from use; their artifacts stay published unchanged. */
export const WITHDRAWN_PROFILES: ReadonlySet<string> = new Set([LEGACY_PROFILE]);
/** The profile URI of a MAP version. */
export const mapProfileUri = (version: string) => `https://mailschema.org/profiles/map/${version}`;
const PUBLIC_ORIGIN = 'https://mailschema.org';
const MAX_ARTIFACT_BYTES = 256 * 1024;

/** The format each profile's type contracts follow. */
export const CONTRACT_FORMATS: Record<string, string> = {
  [LEGACY_PROFILE]: `${PUBLIC_ORIGIN}/schemas/type-contract-0.1.schema.json`,
  [MAP_PROFILE]: `${PUBLIC_ORIGIN}/schemas/type-contract-0.2.schema.json`,
};

/** Reasons the core assigns: an approval's own ends, and a decision awaiting approval overtaken. */
export const APPROVAL_REASONS = ['declined', 'stale-target', 'expired', 'superseded'] as const;
const SUCCESS_STATES = ['accepted', 'completed'];
const EXCLUSIVE_CONSEQUENCES = ['refusal', 'protection'];

export type JsonObject = Record<string, unknown>;
export type Authority = 'credential' | 'possession';
export type ResultState = 'accepted' | 'completed' | 'failed' | 'pending' | 'approval-required';
export type Consequence =
  'refusal' | 'protection' | 'record' | 'disclosure' | 'commitment' | 'authorization' | 'assertion';

export interface SchemaReference {
  url: string;
  canonicalDigest: string;
}

export interface ContractOperation {
  id: string;
  effect: string;
  authority: Authority[];
  consequences: Consequence[];
  repeatable?: boolean;
  fieldBindings?: { input: string; fields: string }[];
  results: { state: ResultState; reasons?: string[]; outputSchema: JsonObject }[];
}

export interface TypeContract {
  kind: 'MapTypeContract';
  id: string;
  version: string;
  profile: string;
  target: string;
  dependencies?: SchemaReference[];
  detailsSchema?: JsonObject;
  requestSchema: SchemaReference;
  operations: ContractOperation[];
}

/** A contract with its compiled validators, ready for description and request processing. */
export interface LoadedContract {
  contract: TypeContract;
  slug: string;
  file: string;
  bytes: Buffer;
  contractDigest: string;
  requestSchema: { url: string; value: JsonObject; bytes: Buffer; canonicalDigest: string };
  validateDetails?: ValidateFunction;
  /** The whole request schema, for a contract on the current profile. */
  validateRequest?: ValidateFunction;
  /** The input schema of one operation's request branch. */
  validateInput(operation: string): ValidateFunction | undefined;
  operation(id: string): ContractOperation | undefined;
  validateOutput(operation: string, state: ResultState): ValidateFunction | undefined;
  /** Errors in the values of a form fields block, by the artifacts that loaded this contract. */
  fieldErrors(fields: JsonObject, values: unknown): ErrorObject[];
}

export function sha256(bytes: string | Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** SHA-256 over the RFC 8785 canonical form, as used for contract, schema and description digests. */
export function canonicalDigest(value: unknown) {
  const canonical = canonicalize(value);
  if (canonical === undefined) throw new Error('Value is not canonical JSON.');
  return `sha-256:${sha256(canonical)}`;
}

// The core date-time form. Date.parse reads every value of it, and other forms too,
// which must never count as a deadline.
const DATE_TIME = new RegExp(coreSchema.$defs.dateTime.pattern, 'u');

const UUID_URN = new RegExp(coreSchema.$defs.uuidUrn.pattern, 'u');

/** Whether a value is a request identifier: the core UUID URN form. */
export const isRequestId = (value: unknown) => typeof value === 'string' && UUID_URN.test(value);

/**
 * Whether a deadline has been reached. Anything but a core date-time counts as
 * reached, so a mistake fails closed.
 */
export function reached(now: Date, deadline: string, afterMs = 0) {
  return !(DATE_TIME.test(deadline) && now.getTime() < Date.parse(deadline) + afterMs);
}

/** The digest a request carries: RFC 8785 over the description exactly as parsed from the message. */
export const descriptionDigest = (description: unknown) => canonicalDigest(description);

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
// Unicode's noncharacters: U+FDD0 to U+FDEF, and the last two code points of every plane.
const NONCHARACTER = new RegExp(
  `[\\u{FDD0}-\\u{FDEF}${Array.from({ length: 17 }, (_, plane) => `\\u{${(plane * 0x10000 + 0xfffe).toString(16)}}\\u{${(plane * 0x10000 + 0xffff).toString(16)}}`).join('')}]`,
  'u',
);

/**
 * Parse a MAP document as I-JSON (RFC 7493) within the core limits: no duplicate
 * member names, no lone surrogates or noncharacters, no U+0000 in any string, every number within
 * ±(2^53−1), and arrays and objects nested at most 32 deep, the outermost counting as
 * one.
 */
export function parseMapJson(text: string, { maxBytes = 64 * 1024, maxDepth = 32 } = {}): unknown {
  if (Buffer.byteLength(text, 'utf8') > maxBytes)
    throw new Error(`MAP document exceeds ${maxBytes} bytes.`);
  let index = 0;
  const fail = (message: string): never => {
    throw new Error(`Invalid MAP JSON at offset ${index}: ${message}`);
  };
  const space = () => {
    while (' \t\n\r'.includes(text[index] ?? '-')) index += 1;
  };
  const string = () => {
    const start = index;
    index += 1;
    while (index < text.length && text[index] !== '"') index += text[index] === '\\' ? 2 : 1;
    if (text[index] !== '"') fail('unterminated string');
    index += 1;
    const value = JSON.parse(text.slice(start, index)) as string;
    if (LONE_SURROGATE.test(value)) fail('lone surrogate');
    if (value.includes('\u0000')) fail('U+0000 in a string');
    if (NONCHARACTER.test(value)) fail('a noncharacter in a string');
    return value;
  };
  // `depth` counts the arrays and objects enclosing the value.
  const value = (depth: number): unknown => {
    space();
    const next = text[index];
    if ((next === '{' || next === '[') && depth >= maxDepth)
      fail(`nesting deeper than ${maxDepth}`);
    if (next === '{') {
      index += 1;
      const result: JsonObject = {};
      const names = new Set<string>();
      space();
      if (text[index] === '}') {
        index += 1;
        return result;
      }
      for (;;) {
        space();
        if (text[index] !== '"') fail('expected a member name');
        const name = string();
        if (names.has(name)) fail(`duplicate member ${JSON.stringify(name)}`);
        names.add(name);
        space();
        if (text[index] !== ':') fail('expected ":"');
        index += 1;
        Object.defineProperty(result, name, {
          value: value(depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
        space();
        if (text[index] === ',') {
          index += 1;
          continue;
        }
        if (text[index] === '}') {
          index += 1;
          return result;
        }
        fail('expected "," or "}"');
      }
    }
    if (next === '[') {
      index += 1;
      const result: unknown[] = [];
      space();
      if (text[index] === ']') {
        index += 1;
        return result;
      }
      for (;;) {
        result.push(value(depth + 1));
        space();
        if (text[index] === ',') {
          index += 1;
          continue;
        }
        if (text[index] === ']') {
          index += 1;
          return result;
        }
        fail('expected "," or "]"');
      }
    }
    if (next === '"') return string();
    const literal =
      /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(
        text.slice(index),
      );
    if (!literal) fail('unexpected token');
    index += literal![0].length;
    const parsed = JSON.parse(literal![0]) as unknown;
    if (
      typeof parsed === 'number' &&
      (!Number.isFinite(parsed) || Math.abs(parsed) > Number.MAX_SAFE_INTEGER)
    )
      fail('number outside the I-JSON range');
    return parsed;
  };
  const result = value(0);
  space();
  if (index !== text.length) fail('trailing content');
  return result;
}

/**
 * Parse a MAP document from bytes: strict UTF-8, with a byte order mark kept so the
 * I-JSON parser refuses it, then parseMapJson.
 */
export function parseMapBytes(
  bytes: Uint8Array,
  limits?: { maxBytes?: number; maxDepth?: number },
) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  return parseMapJson(text, limits);
}

function readArtifact(path: string) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular file: ${path}`);
  if (stat.size > MAX_ARTIFACT_BYTES) throw new Error(`File exceeds 256 KiB: ${path}`);
  const bytes = readFileSync(path);
  try {
    return { bytes, value: JSON.parse(bytes.toString('utf8')) as JsonObject };
  } catch {
    throw new Error(`Could not parse JSON: ${path}`);
  }
}

function schemaPath(root: string, url: string) {
  const parsed = new URL(url);
  if (parsed.origin !== PUBLIC_ORIGIN || !parsed.pathname.startsWith('/schemas/'))
    throw new Error(`${url}: not a canonical MailSchema schema URL`);
  return resolve(root, 'public/schemas', basename(parsed.pathname));
}

function* walk(value: unknown, path = ''): Generator<[string, unknown]> {
  if (Array.isArray(value))
    for (const [index, item] of value.entries()) yield* walk(item, `${path}/${index}`);
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) {
      yield [`${path}/${key}`, item];
      yield* walk(item, `${path}/${key}`);
    }
}

// The JSON Schema 2020-12 keywords whose value is a schema, an array of schemas, or a
// map from names to schemas.
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
const SUBSCHEMA_LISTS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const SUBSCHEMA_MAPS = ['properties', 'patternProperties', '$defs', 'dependentSchemas'];

/** Every schema object within a schema, never the names of a map of schemas. */
function* schemaNodes(schema: unknown): Generator<JsonObject> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
  const node = schema as JsonObject;
  yield node;
  for (const keyword of SUBSCHEMA) yield* schemaNodes(node[keyword]);
  for (const keyword of SUBSCHEMA_LISTS)
    if (Array.isArray(node[keyword])) for (const item of node[keyword]) yield* schemaNodes(item);
  for (const keyword of SUBSCHEMA_MAPS)
    for (const item of Object.values((node[keyword] ?? {}) as JsonObject)) yield* schemaNodes(item);
}

const UNPINNED = ['$dynamicRef', '$recursiveRef', '$dynamicAnchor', '$recursiveAnchor', '$anchor'];

const refsOf = (value: unknown) =>
  [...walk(value)]
    .filter(([path, item]) => path.endsWith('/$ref') && typeof item === 'string')
    .map(([, item]) => item as string);

const constantsOf = (value: unknown) =>
  new Set(
    [...walk(value)]
      .filter(([path, item]) => path.endsWith('/const') && typeof item === 'string')
      .map(([, item]) => item as string),
  );

function decodePointer(pointer: string) {
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
}

/** Follow a JSON Pointer over data through an object schema's `properties`. */
function schemaAt(schema: unknown, pointer: string): JsonObject | undefined {
  let current = schema as JsonObject | undefined;
  for (const segment of decodePointer(pointer)) {
    const properties = current?.properties as JsonObject | undefined;
    current = properties?.[segment] as JsonObject | undefined;
  }
  return current;
}

// A reference fragment is a plain JSON Pointer: nothing percent-encoded, nothing to decode.
const PLAIN_POINTER = /^(?:\/[A-Za-z0-9._~!$&'()*+,;=:@-]*)*$/;

/** The value an RFC 6901 pointer names, through objects and arrays, or undefined. */
function resolvePointer(document: unknown, pointer: string): unknown {
  let current = document;
  for (const segment of decodePointer(pointer)) {
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(segment) || Number(segment) >= current.length) return;
      current = current[Number(segment)];
    } else if (current && typeof current === 'object' && Object.hasOwn(current, segment))
      current = (current as JsonObject)[segment];
    else return;
  }
  return current;
}

/**
 * Resolve a JSON Pointer over object members. The contract rules bind fields only
 * through object properties, so no binding indexes an array.
 */
export function valueAt(value: unknown, pointer: string): unknown {
  let current = value;
  for (const segment of decodePointer(pointer)) {
    if (
      !current ||
      typeof current !== 'object' ||
      Array.isArray(current) ||
      !Object.hasOwn(current, segment)
    )
      return undefined;
    current = (current as JsonObject)[segment];
  }
  return current;
}

/**
 * Rules of a form fields block that JSON Schema cannot state: every required field
 * exists, choices are distinct, and defaults are among the choices.
 */
export function formProblems(fields: JsonObject): string[] {
  const problems: string[] = [];
  const properties = (fields.properties ?? {}) as Record<string, JsonObject>;
  for (const name of (fields.required ?? []) as string[])
    if (!Object.hasOwn(properties, name)) problems.push(`required field ${name} is not defined`);
  for (const [name, field] of Object.entries(properties)) {
    const choices = (
      (field.oneOf ?? (field.items as JsonObject | undefined)?.anyOf ?? []) as JsonObject[]
    ).map((choice) => choice.const as string);
    if (new Set(choices).size !== choices.length) problems.push(`field ${name} repeats a choice`);
    const defaults = field.default === undefined ? [] : [field.default].flat();
    if (choices.length && defaults.some((value) => !choices.includes(value as string)))
      problems.push(`field ${name} defaults to a value it does not offer`);
  }
  return problems;
}

/** Form rule problems in the fields blocks a description's details carry. */
export function detailsProblems(contract: TypeContract, details: unknown): string[] {
  const blocks = new Set(
    contract.operations.flatMap((operation) =>
      (operation.fieldBindings ?? []).map((binding) => binding.fields),
    ),
  );
  return [...blocks].flatMap((pointer) => {
    const fields = valueAt(details, pointer) as JsonObject | undefined;
    return fields ? formProblems(fields).map((problem) => `${pointer}: ${problem}`) : [];
  });
}

function operationBranches(requestSchema: JsonObject) {
  const branches = (requestSchema.allOf as JsonObject[] | undefined) ?? [];
  const last = branches.at(-1) ?? {};
  return ((last.oneOf as JsonObject[] | undefined) ?? [last]).map((branch) => {
    const properties = branch.properties as JsonObject | undefined;
    return {
      operation: (properties?.operation as JsonObject | undefined)?.const as string | undefined,
      input: properties?.input,
    };
  });
}

// MAP states every lexical form as a pattern, so `format` stays an annotation: format
// checkers differ between validators, and a verdict must not depend on the validator.
function createAjv() {
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
  return ajv;
}

const SYNTAX_CHARACTERS = '^$\\.*+?()[]{}|/';
const CONTROL_ESCAPES: Record<string, number> = { t: 0x09, n: 0x0a, f: 0x0c, r: 0x0d };
const QUANTIFIERS = '*+?{';

/**
 * Why a pattern is not in the portable subset that ECMA-262 (with the u flag) and
 * other engines read alike, or undefined. The subset is printable ASCII text, with any
 * other code point written as \uXXXX. It has literal characters and escaped syntax
 * characters; \t, \n, \f and \r; non-empty classes of such members and ranges, with
 * a literal hyphen only first or last; (?: groups; alternation; ^ and $; and one *, +,
 * ?, {n}, {n,} or {n,m} after an atom. Class escapes such as \s and the dot match
 * different characters in different engines, and brackets, && or a stray brace inside
 * a class, or a quantifier on a quantifier, are read differently or refused by one of
 * them. ^ and $ are whole-value anchors, as in ECMA-262; an engine whose anchors also
 * match at line breaks, such as Ruby's or Python's, must read them as such.
 */
export function unportablePattern(pattern: string): string | undefined {
  if (!/^[\x20-\x7e]*$/.test(pattern)) return 'a character outside printable ASCII';
  let at = 0;

  // One escaped code point, or a problem.
  const escape = (inClass: boolean): number | string => {
    const next = pattern[at + 1];
    if (next === undefined) return 'a trailing backslash';
    if (next === 'u') {
      const digits = pattern.slice(at + 2, at + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(digits)) return 'a malformed \\u escape';
      const code = parseInt(digits, 16);
      if (code >= 0xd800 && code <= 0xdfff) return 'a surrogate \\u escape';
      at += 6;
      return code;
    }
    at += 2;
    if (Object.hasOwn(CONTROL_ESCAPES, next)) return CONTROL_ESCAPES[next];
    if (SYNTAX_CHARACTERS.includes(next) || (inClass && next === '-')) return next.charCodeAt(0);
    return `the escape \\${next}`;
  };

  const characterClass = (): string | undefined => {
    at += pattern[at + 1] === '^' ? 2 : 1;
    // Each member's code point, or null for an unescaped hyphen.
    const members: (number | null)[] = [];
    while (pattern[at] !== ']') {
      const char = pattern[at];
      if (char === undefined) return 'an unclosed character class';
      if (char === '[') return 'a bracket inside a class';
      if (char === '&' && pattern[at + 1] === '&') return '&& inside a class';
      if (char === '\\') {
        const code = escape(true);
        if (typeof code === 'string') return code;
        members.push(code);
      } else {
        members.push(char === '-' ? null : char.charCodeAt(0));
        at += 1;
      }
    }
    at += 1;
    if (!members.length) return 'an empty character class';
    for (let index = 0; index < members.length; index += 1) {
      const low = members[index];
      if (low === null) {
        if (index !== 0 && index !== members.length - 1) return 'an ambiguous hyphen in a class';
        continue;
      }
      if (members[index + 1] !== null || index + 2 >= members.length) continue;
      const high = members[index + 2];
      if (high === null) return 'an ambiguous hyphen in a class';
      if (high < low) return 'a class range out of order';
      index += 2;
      if (members[index + 1] === null && index + 1 !== members.length - 1)
        return 'an ambiguous hyphen in a class';
    }
  };

  const quantifier = (): string | undefined => {
    if (pattern[at] === '{') {
      const bounds = /^\{([0-9]{1,4})(?:(,)([0-9]{1,4})?)?\}/.exec(pattern.slice(at));
      if (!bounds) return 'a malformed {n,m} quantifier';
      if (bounds[3] !== undefined && Number(bounds[3]) < Number(bounds[1]))
        return 'a {n,m} quantifier with m below n';
      at += bounds[0].length;
    } else at += 1;
    const next = pattern[at];
    if (next !== undefined && QUANTIFIERS.includes(next)) return 'a quantifier on a quantifier';
  };

  const disjunction = (depth: number): string | undefined => {
    let quantifiable = false;
    while (at < pattern.length) {
      const char = pattern[at];
      if (char === '|') {
        at += 1;
        quantifiable = false;
      } else if (char === ')') {
        if (depth === 0) return 'an unmatched )';
        return;
      } else if (char === '^' || char === '$') {
        at += 1;
        quantifiable = false;
      } else if (QUANTIFIERS.includes(char)) {
        if (!quantifiable)
          return char === '{' ? 'an unescaped {' : 'a quantifier with nothing to repeat';
        const problem = quantifier();
        if (problem) return problem;
        quantifiable = false;
      } else if (char === '(') {
        if (!pattern.startsWith('(?:', at)) return 'a group other than (?:';
        at += 3;
        const problem = disjunction(depth + 1);
        if (problem) return problem;
        if (pattern[at] !== ')') return 'an unclosed group';
        at += 1;
        quantifiable = true;
      } else if (char === '[') {
        const problem = characterClass();
        if (problem) return problem;
        quantifiable = true;
      } else if (char === '\\') {
        const code = escape(false);
        if (typeof code === 'string') return code;
        quantifiable = true;
      } else if (char === '.') return 'an unescaped dot';
      else if (char === ']' || char === '}') return `an unescaped ${char}`;
      else {
        at += 1;
        quantifiable = true;
      }
    }
  };

  return disjunction(0);
}

/**
 * Why a schema is not portable, or undefined: every pattern, including the names of
 * patternProperties, is in the portable subset, and every multipleOf is an integer,
 * since validators round fractional divisors differently.
 */
export function unportableSchema(value: unknown): string | undefined {
  for (const [path, item] of walk(value)) {
    const patterns =
      path.endsWith('/pattern') && typeof item === 'string'
        ? [item]
        : path.endsWith('/patternProperties') && item && typeof item === 'object'
          ? Object.keys(item)
          : [];
    for (const pattern of patterns) {
      const problem = unportablePattern(pattern);
      if (problem) return `pattern ${JSON.stringify(pattern)} uses ${problem}`;
    }
    if (path.endsWith('/multipleOf') && typeof item === 'number' && !Number.isInteger(item))
      return `multipleOf ${JSON.stringify(item)} is not an integer`;
  }
}

function assertPortable(label: string, value: unknown) {
  const problem = unportableSchema(value);
  if (problem) throw new Error(`${label}: ${problem}`);
}

/** The core definitions that give a form text field's `format` its lexical form. */
const FIELD_FORMATS: Record<string, string> = {
  email: 'address',
  uri: 'identifier',
  date: 'date',
  'date-time': 'dateTime',
};

/** A form fields block as the schema its values must satisfy. */
function fieldsSchema(fields: JsonObject): JsonObject {
  const properties = Object.fromEntries(
    Object.entries((fields.properties ?? {}) as Record<string, JsonObject>).map(([name, field]) => {
      if (typeof field.format !== 'string') return [name, field];
      const { format, ...rest } = field;
      return [name, { ...rest, $ref: `${CORE_SCHEMA}#/$defs/${FIELD_FORMATS[format as string]}` }];
    }),
  );
  return { ...fields, properties, additionalProperties: false };
}

const FIELD_VALIDATORS = 128;

export function errorList(errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map(
    (error) =>
      `${error.instancePath || '/'} ${error.message}${error.keyword === 'required' ? `: ${error.params.missingProperty}` : ''}`,
  );
}

/**
 * The canonical MAP 0.2 artifacts and every type contract in the repository.
 * One loader serves the reference implementation, the conformance suite and the Registry catalogue.
 */
export class MapArtifacts {
  readonly root: string;
  readonly ajv = createAjv();
  readonly schemas = new Map<
    string,
    { bytes: Buffer; value: JsonObject; canonicalDigest: string }
  >();
  readonly contracts: LoadedContract[];
  readonly #validateDocument: ValidateFunction;
  readonly #definitions: Record<string, ValidateFunction>;
  readonly #validateFormat: Record<string, ValidateFunction>;
  readonly #fieldValidators = new Map<string, { schema: JsonObject; validate: ValidateFunction }>();

  constructor(root = process.cwd()) {
    this.root = root;
    for (const url of [CORE_SCHEMA, FORMS_SCHEMA]) {
      const { bytes, value } = readArtifact(schemaPath(root, url));
      if (value.$id !== url) throw new Error(`${url}: $id does not match its URL`);
      assertPortable(url, value);
      this.schemas.set(url, { bytes, value, canonicalDigest: canonicalDigest(value) });
      this.ajv.addSchema(value);
    }
    this.#validateDocument = this.ajv.getSchema(CORE_SCHEMA)!;
    this.#definitions = Object.fromEntries(
      ['description', 'request', 'result', 'problem'].map((name) => [
        name,
        this.ajv.getSchema(`${CORE_SCHEMA}#/$defs/${name}`)!,
      ]),
    );
    const format = (profile: string) =>
      readArtifact(resolve(root, `public/schemas/${basename(CONTRACT_FORMATS[profile])}`)).value;
    const current = format(MAP_PROFILE);
    assertPortable('type-contract-0.2', current);
    this.#validateFormat = {
      [LEGACY_PROFILE]: this.ajv.compile(format(LEGACY_PROFILE)),
      [MAP_PROFILE]: this.ajv.compile(current),
    };
    this.contracts = this.#loadContracts();
  }

  /** Validate a description, request, result or problem against the core schema. */
  documentErrors(value: unknown) {
    return this.#validateDocument(value) ? [] : errorList(this.#validateDocument.errors);
  }

  /** Validate a document against one core definition: description, request, result or problem. */
  definitionErrors(name: 'description' | 'request' | 'result' | 'problem', value: unknown) {
    const validate = this.#definitions[name];
    return validate(value) ? [] : errorList(validate.errors);
  }

  /** The exact contract a type reference names, or nothing when the digest differs. */
  contract(reference: { id: string; version: string; contractDigest: string }) {
    return this.contracts.find(
      (entry) =>
        entry.contract.profile === MAP_PROFILE &&
        entry.contract.id === reference.id &&
        entry.contract.version === reference.version &&
        entry.contractDigest === reference.contractDigest,
    );
  }

  contractFor(slug: string, version: string) {
    return this.contracts.find(
      (entry) => entry.slug === slug && entry.contract.version === version,
    );
  }

  /**
   * Validate values against a form fields block from a description's details. A text
   * field's `format` names the core lexical form its value takes.
   */
  fieldErrors(fields: JsonObject, values: unknown) {
    const key = canonicalDigest(fields);
    let entry = this.#fieldValidators.get(key);
    if (entry) this.#fieldValidators.delete(key);
    else {
      const schema = fieldsSchema(fields);
      entry = { schema, validate: this.ajv.compile(schema) };
    }
    // Least recently used blocks leave first, and Ajv drops its compiled copy with them,
    // so a long-running service stays bounded.
    this.#fieldValidators.set(key, entry);
    if (this.#fieldValidators.size > FIELD_VALIDATORS) {
      const [oldest, evicted] = this.#fieldValidators.entries().next().value!;
      this.#fieldValidators.delete(oldest);
      this.ajv.removeSchema(evicted.schema);
    }
    return entry.validate(values) ? [] : (entry.validate.errors ?? []);
  }

  #loadContracts() {
    const directory = resolve(this.root, 'public/contracts');
    if (!existsSync(directory)) throw new Error(`Missing type contracts: ${directory}`);
    const entries = readdirSync(directory)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map((file) => this.#loadContract(file, resolve(directory, file)));
    const keys = entries.map((entry) => `${entry.contract.id}@${entry.contract.version}`);
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate type contract version');
    const schemas = entries.map((entry) => entry.requestSchema.url);
    if (new Set(schemas).size !== schemas.length)
      throw new Error('Type contract versions must use distinct request schemas');
    return entries;
  }

  #loadContract(file: string, path: string): LoadedContract {
    const { bytes, value } = readArtifact(path);
    const contract = value as unknown as TypeContract;
    const validateFormat = this.#validateFormat[contract.profile];
    if (!validateFormat) throw new Error(`${file}: unknown profile ${String(contract.profile)}`);
    if (!validateFormat(contract))
      throw new Error(
        `${file}: invalid type contract:\n${errorList(validateFormat.errors).join('\n')}`,
      );
    const slug = new URL(contract.id).pathname.split('/').filter(Boolean).at(-1)!;
    if (file !== `${slug}-${contract.version}.json`)
      throw new Error(`${file}: filename must match type identifier and version`);
    const label = `${slug}@${contract.version}`;
    const ids = contract.operations.map((operation) => operation.id);
    if (new Set(ids).size !== ids.length)
      throw new Error(`${label}: duplicate operation identifiers`);
    for (const operation of contract.operations) {
      const states = operation.results.map((result) => result.state);
      if (new Set(states).size !== states.length)
        throw new Error(`${label}: duplicate ${operation.id} result states`);
    }

    const requestPath = schemaPath(this.root, contract.requestSchema.url);
    const request = readArtifact(requestPath);
    if (request.value.$id !== contract.requestSchema.url)
      throw new Error(`${label}: request schema $id does not match its contract URL`);
    const requestDigest = canonicalDigest(request.value);
    if (requestDigest !== contract.requestSchema.canonicalDigest)
      throw new Error(`${label}: request schema canonical digest does not match the contract`);
    const constants = constantsOf(request.value);
    for (const expected of [contract.id, contract.version, ...ids])
      if (!constants.has(expected))
        throw new Error(`${label}: request schema does not bind ${expected}`);

    const loaded: LoadedContract = {
      contract,
      slug,
      file,
      bytes,
      contractDigest: canonicalDigest(contract),
      requestSchema: {
        url: contract.requestSchema.url,
        value: request.value,
        bytes: request.bytes,
        canonicalDigest: requestDigest,
      },
      operation: (id) => contract.operations.find((operation) => operation.id === id),
      validateInput: () => undefined,
      validateOutput: () => undefined,
      fieldErrors: (fields, values) => this.fieldErrors(fields, values),
    };
    if (contract.profile !== MAP_PROFILE) return loaded;

    this.#lint(contract, label, request.value);
    const validateDetails = contract.detailsSchema
      ? this.ajv.compile(contract.detailsSchema)
      : undefined;
    const outputs = new Map<string, ValidateFunction>();
    for (const operation of contract.operations)
      for (const result of operation.results)
        outputs.set(`${operation.id}/${result.state}`, this.ajv.compile(result.outputSchema));
    const inputs = new Map(
      operationBranches(request.value).map((branch) => [
        branch.operation,
        this.ajv.compile(branch.input as JsonObject),
      ]),
    );
    return {
      ...loaded,
      validateDetails,
      validateRequest: this.ajv.compile(request.value),
      validateInput: (operation) => inputs.get(operation),
      validateOutput: (operation, state) => outputs.get(`${operation}/${state}`),
    };
  }

  /** The contract rules a JSON Schema cannot express. */
  #lint(contract: TypeContract, label: string, requestSchema: JsonObject) {
    assertPortable(label, contract);
    assertPortable(label, requestSchema);
    const dependencies = contract.dependencies ?? [];
    const pinned = new Set<string>();
    for (const dependency of dependencies) {
      const schema = this.schemas.get(dependency.url);
      if (!schema) throw new Error(`${label}: unknown dependency ${dependency.url}`);
      if (schema.canonicalDigest !== dependency.canonicalDigest)
        throw new Error(`${label}: dependency ${dependency.url} digest differs`);
      pinned.add(dependency.url);
    }
    if (!pinned.has(CORE_SCHEMA)) throw new Error(`${label}: the core schema must be pinned`);
    const inline = [
      contract.detailsSchema,
      ...contract.operations.flatMap((operation) =>
        operation.results.map((result) => result.outputSchema),
      ),
    ];
    // Keywords that resolve by scope, and a nested $id, would move where a reference
    // resolves away from its pinned address. A nested $schema would change the dialect
    // a validator reads that subschema in, and a type list is not one type.
    if (requestSchema.$schema !== JSON_SCHEMA_2020_12)
      throw new Error(`${label}: the request schema must declare JSON Schema 2020-12`);
    for (const node of [...inline, requestSchema].flatMap((root) => [...schemaNodes(root)])) {
      const keyword = UNPINNED.find((name) => name in node);
      if (keyword) throw new Error(`${label}: ${keyword} is not pinned by any digest`);
      if ('$id' in node && node !== requestSchema)
        throw new Error(`${label}: a nested $id would move references`);
      if ('$schema' in node && node !== requestSchema)
        throw new Error(`${label}: a nested $schema would change the dialect`);
      if (Array.isArray(node.type)) throw new Error(`${label}: type names one type, never a list`);
      // The form fields block's annotation, never a contract's own keyword.
      if ('autocomplete' in node)
        throw new Error(`${label}: autocomplete belongs to the form fields block`);
    }
    // Every reference names a schema inside a pinned dependency now, so none can fail,
    // or silently match anything, when a request arrives.
    for (const ref of [...refsOf(inline), ...refsOf(requestSchema)]) {
      const [url, fragment = ''] = ref.split('#');
      if (!pinned.has(url)) throw new Error(`${label}: ${ref} is not a pinned dependency`);
      if (fragment && !fragment.startsWith('/'))
        throw new Error(`${label}: ${ref} names an anchor, not a JSON Pointer`);
      if (!PLAIN_POINTER.test(fragment))
        throw new Error(`${label}: ${ref} is not a plain JSON Pointer`);
      const target = resolvePointer(this.schemas.get(url)!.value, fragment);
      if (
        typeof target !== 'boolean' &&
        !(target && typeof target === 'object' && !Array.isArray(target))
      )
        throw new Error(`${label}: ${ref} does not name a schema`);
    }

    const [core, binding, operations] = (requestSchema.allOf as JsonObject[] | undefined) ?? [];
    if (core?.$ref !== `${CORE_SCHEMA}#/$defs/request`)
      throw new Error(`${label}: the request schema must extend the core request`);
    const typeBinding = (binding?.properties as JsonObject | undefined)?.type as
      JsonObject | undefined;
    const bound = typeBinding?.properties as Record<string, JsonObject> | undefined;
    if (bound?.id?.const !== contract.id || bound?.version?.const !== contract.version)
      throw new Error(`${label}: the request schema must bind the type identifier and version`);
    if (!operations) throw new Error(`${label}: the request schema has no operation branches`);
    const branches = operationBranches(requestSchema);
    const declared = contract.operations.map((operation) => operation.id).sort();
    if (
      branches
        .map((branch) => branch.operation ?? '')
        .sort()
        .join('\n') !== declared.join('\n')
    )
      throw new Error(
        `${label}: the request schema branches must be exactly the contract operations`,
      );
    for (const [path] of [...walk(contract.detailsSchema)].filter(([path]) =>
      /\/properties\/[^/]+$/.test(path),
    ))
      if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(path.split('/').at(-1)!))
        throw new Error(`${label}: details member names are ASCII identifiers (${path})`);
    for (const operation of contract.operations) {
      const name = `${label} ${operation.id}`;
      const states = operation.results.map((result) => result.state);
      if (states.filter((state) => SUCCESS_STATES.includes(state)).length !== 1)
        throw new Error(`${name}: declare exactly one success state, accepted or completed`);
      for (const result of operation.results) {
        if ((result.state === 'failed') !== Boolean(result.reasons))
          throw new Error(`${name}: failure reasons belong to failed results, which need them`);
      }
      const reasons = operation.results.find((result) => result.state === 'failed')?.reasons ?? [];
      if (states.includes('pending') && !states.includes('failed'))
        throw new Error(`${name}: pending work declares how it fails`);
      const approval = states.includes('approval-required');
      if (approval && operation.authority.includes('possession'))
        throw new Error(`${name}: an approval cannot be decided by possession`);
      // An approval ends as declined, stale or expired, and a decision awaiting approval can
      // also be overtaken by another decision. Pending work holds the interaction instead.
      const owed: readonly string[] = APPROVAL_REASONS.filter((reason) =>
        reason === 'superseded' ? approval && !operation.repeatable : approval,
      );
      const missing = owed.filter((reason) => !reasons.includes(reason));
      if (missing.length) throw new Error(`${name}: declare failed with ${missing.join(', ')}`);
      const reserved = reasons.filter(
        (reason) =>
          (APPROVAL_REASONS as readonly string[]).includes(reason) && !owed.includes(reason),
      );
      if (reserved.length)
        throw new Error(`${name}: ${reserved.join(', ')} belongs to the core lifecycle`);
      if (
        operation.consequences.length > 1 &&
        operation.consequences.some((consequence) => EXCLUSIVE_CONSEQUENCES.includes(consequence))
      )
        throw new Error(`${name}: refusal and protection stand alone`);
      const branch = branches.find((candidate) => candidate.operation === operation.id);
      if (!branch) throw new Error(`${name}: the request schema has no branch for this operation`);
      for (const binding of operation.fieldBindings ?? []) {
        const fields = schemaAt(contract.detailsSchema, binding.fields)?.$ref;
        if (
          fields !== `${FORMS_SCHEMA}#/$defs/fields` &&
          fields !== `${FORMS_SCHEMA}#/$defs/choiceFields`
        )
          throw new Error(`${name}: ${binding.fields} is not a form fields block`);
        if (schemaAt(branch.input, binding.input)?.$ref !== `${FORMS_SCHEMA}#/$defs/fieldValues`)
          throw new Error(`${name}: ${binding.input} is not a field values input`);
      }
    }
  }
}
