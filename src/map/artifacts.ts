import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { BUNDLED, CORE_SCHEMA, FORMS_SCHEMA } from './core/artifacts.ts';
import { APPROVAL_REASONS, Contract, InvalidContract } from './core/contract.ts';
import { digest } from './core/document.ts';
import { nodes } from './core/schemas.ts';
import type { JsonObject, TypeContract } from './core/types.ts';

const PUBLIC_ORIGIN = 'https://mailschema.org';
const MAX_ARTIFACT_BYTES = 256 * 1024;
const SUCCESS_STATES = ['accepted', 'completed'];
const EXCLUSIVE_CONSEQUENCES = ['refusal', 'protection'];

/** A repository contract: its files, its exact bytes and the core contract built from them. */
export interface LoadedContract {
  contract: TypeContract;
  slug: string;
  file: string;
  bytes: Buffer;
  contractDigest: string;
  requestSchema: { url: string; value: JsonObject; bytes: Buffer; canonicalDigest: string };
  core: Contract;
}

/** The SHA-256 of exact bytes, as artifact evidence records them. */
export function sha256(bytes: string | Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
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

/** Follow a JSON Pointer over data through an object schema's `properties`. */
function schemaAt(schema: unknown, pointer: string): JsonObject | undefined {
  let current = schema as JsonObject | undefined;
  for (const segment of pointer.split('/').slice(1)) {
    const properties = current?.properties as JsonObject | undefined;
    current = properties?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')] as
      JsonObject | undefined;
  }
  return current;
}

function operationBranches(requestSchema: JsonObject) {
  const last = ((requestSchema.allOf as JsonObject[] | undefined) ?? []).at(-1) ?? {};
  return ((last.oneOf as JsonObject[] | undefined) ?? [last]).map((branch) => {
    const properties = branch.properties as JsonObject | undefined;
    return {
      operation: (properties?.operation as JsonObject | undefined)?.const as string | undefined,
      input: properties?.input,
    };
  });
}

const SYNTAX_CHARACTERS = '^$\\.*+?()[]{}|/';
const CONTROL_ESCAPES: Record<string, number> = { t: 0x09, n: 0x0a, f: 0x0c, r: 0x0d };
const QUANTIFIERS = '*+?{';

/**
 * Why a pattern is not in the portable subset that ECMA-262 (with the u flag) and other
 * engines read alike, or undefined. The subset is printable ASCII text, with any other code
 * point written as \uXXXX. It has literal characters and escaped syntax characters; \t, \n,
 * \f and \r; non-empty classes of such members and ranges, with a literal hyphen only first
 * or last; (?: groups; alternation; ^ and $; and one *, +, ?, {n}, {n,} or {n,m} after an
 * atom. Class escapes such as \s and the dot match different characters in different
 * engines, and brackets, && or a stray brace inside a class, or a quantifier on a
 * quantifier, are read differently or refused by one of them. ^ and $ are whole-value
 * anchors, as in ECMA-262; an engine whose anchors also match at line breaks, such as
 * Ruby's or Python's, must read them as such.
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
 * patternProperties, is in the portable subset, and every multipleOf is an integer, since
 * validators round fractional divisors differently.
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

/**
 * The repository's type contracts, compiled by the Registry. Each is loaded as an
 * implementation would vendor it, as a core contract pinned by its digest, and must also meet
 * the contract rules the Registry applies before it publishes one. One loader serves the
 * reference implementation, the conformance suite and the Registry catalogue.
 */
export class MapArtifacts {
  readonly root: string;
  readonly contracts: LoadedContract[];

  constructor(root = process.cwd()) {
    this.root = root;
    for (const [url, schema] of BUNDLED) assertPortable(url, schema);
    this.contracts = this.#loadContracts();
  }

  /** The exact contract a type reference names, or nothing when the digest differs. */
  contract(reference: { id: string; version: string; contractDigest: string }) {
    return this.contracts.find(
      (entry) =>
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
    const slug =
      typeof contract.id === 'string'
        ? new URL(contract.id).pathname.split('/').filter(Boolean).at(-1)!
        : '';
    if (file !== `${slug}-${contract.version}.json`)
      throw new Error(`${file}: filename must match type identifier and version`);
    const label = `${slug}@${contract.version}`;
    const request = readArtifact(schemaPath(this.root, contract.requestSchema.url));
    // Patterns must be portable before any validator reads them.
    assertPortable(label, contract);
    assertPortable(label, request.value);
    const contractDigest = digest(contract);
    let core: Contract;
    try {
      core = new Contract(contract, request.value, { digest: contractDigest });
    } catch (error) {
      if (error instanceof InvalidContract) throw new Error(`${label}: ${error.message}`);
      throw error;
    }
    this.#lint(core.document, label, core.requestSchema);
    return {
      contract: core.document,
      slug,
      file,
      bytes,
      contractDigest,
      requestSchema: {
        url: contract.requestSchema.url,
        value: core.requestSchema,
        bytes: request.bytes,
        canonicalDigest: digest(request.value),
      },
      core,
    };
  }

  /**
   * The contract rules the Registry applies before it publishes a contract, beyond what an
   * implementation checks when it loads one.
   */
  #lint(contract: TypeContract, label: string, requestSchema: JsonObject) {
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
    for (const node of nodes(contract.detailsSchema))
      for (const name of Object.keys((node.properties ?? {}) as JsonObject))
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name))
          throw new Error(`${label}: details member names are ASCII identifiers (${name})`);
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
      const branch = branches.find((candidate) => candidate.operation === operation.id)!;
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
