// Type contracts an implementation vendors, verified by digest and compiled once.
import type { ErrorObject, ValidateFunction } from 'ajv/dist/2020.js';
import {
  BUNDLED,
  CORE_SCHEMA,
  JSON_SCHEMA_2020_12,
  MAP_PROFILE,
  contractFormatErrors,
  createValidator,
  descriptionErrors,
  errorList,
  reached,
  requestErrors,
  resultErrors,
} from './artifacts.ts';
import { capabilityProblems } from './binding.ts';
import { digest } from './document.ts';
import type { ProblemCode } from './documents.ts';
import { inputError } from './limits.ts';
import { escape, member } from './pointer.ts';
import { fieldValuesSchema, formProblems, referenceProblem, values } from './schemas.ts';
import type {
  InputError,
  JsonObject,
  MapDescription,
  MapRequest,
  MapResult,
  TypeContract,
  TypeReference,
} from './types.ts';

/** A type contract that fails its own checks or its pinned digest. */
export class InvalidContract extends Error {}

/** Reasons the core assigns to the approval lifecycle. */
export const APPROVAL_REASONS = ['declined', 'stale-target', 'expired', 'superseded'] as const;

/** A MAP problem a request earns before the service's own state is consulted. */
export type RequestProblem = { code: ProblemCode; title: string; detail: string };

const FIELD_VALIDATORS = 128;

function frozen<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (item: unknown) => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
  };
  freeze(copy);
  return copy;
}

/** Each operation's branch of a request schema, with its input schema. */
function branches(requestSchema: JsonObject) {
  const last = ((requestSchema.allOf as JsonObject[] | undefined) ?? []).at(-1) ?? {};
  return ((last.oneOf as JsonObject[] | undefined) ?? [last]).map((branch) => {
    const properties = (branch.properties ?? {}) as Record<string, JsonObject | undefined>;
    return {
      operation: properties.operation?.const as string | undefined,
      input: properties.input ?? {},
    };
  });
}

/** A JSON Pointer to the failing member, naming a missing or extra member itself. */
function pointerOf(error: ErrorObject) {
  const name = error.params.missingProperty ?? error.params.additionalProperty;
  return name === undefined ? error.instancePath : `${error.instancePath}/${escape(String(name))}`;
}

/** Input errors as a detail and a pointer, each within the core limits, the first 100 kept. */
function inputErrors(errors: ErrorObject[] | null | undefined, prefix = ''): InputError[] {
  const seen = new Set<string>();
  return (errors ?? [])
    .filter((error) => error.keyword !== 'if')
    .map((error) => inputError(error.message ?? 'invalid', `${prefix}${pointerOf(error)}`))
    .filter(({ detail, pointer }) => {
      const key = JSON.stringify([pointer, detail]);
      return !seen.has(key) && Boolean(seen.add(key));
    })
    .slice(0, 100);
}

/**
 * A type contract an implementation vendors, verified against the digest it was pinned by
 * and compiled once. It checks the descriptions, requests, inputs and results of that exact
 * type. The Registry has already applied the contract rules, such as portable patterns, to
 * the contract that digest names; loading refuses anything that would otherwise fail when a
 * request arrives.
 */
export class Contract {
  readonly document: TypeContract;
  readonly digest: string;
  readonly requestSchema: JsonObject;
  readonly #ajv = createValidator();
  readonly #details?: ValidateFunction;
  readonly #request: ValidateFunction;
  readonly #inputs = new Map<string, ValidateFunction>();
  readonly #outputs = new Map<string, ValidateFunction>();
  readonly #fields = new Map<string, { schema: JsonObject; validate: ValidateFunction }>();

  /**
   * `digest` is the contract digest the implementation pinned; `dependencies` supplies, by
   * URL, any pinned schema the package does not bundle.
   */
  constructor(
    contract: unknown,
    requestSchema: unknown,
    {
      digest: pinned,
      dependencies = {},
    }: { digest: string; dependencies?: Record<string, unknown> },
  ) {
    const errors = contractFormatErrors(contract);
    if (errors.length) throw new InvalidContract(`invalid type contract: ${errors.join('; ')}`);
    this.document = frozen(contract as TypeContract);
    if (this.document.profile !== MAP_PROFILE)
      throw new InvalidContract('the contract is for another MAP profile');
    this.digest = digest(this.document);
    if (this.digest !== pinned)
      throw new InvalidContract(`the contract digest is ${this.digest}, not the pinned ${pinned}`);
    this.requestSchema = frozen(requestSchema as JsonObject);
    const references = this.#pin(dependencies);
    const supplied = [...references]
      .filter(([url]) => !BUNDLED.has(url))
      .map(([, schema]) => schema);
    this.#verify(references, supplied);
    try {
      // Every schema compiles now, so a pattern or reference fails the contract, not a request.
      for (const schema of [...supplied, this.requestSchema]) this.#ajv.addSchema(schema);
      for (const schema of supplied) this.#ajv.getSchema(String(schema.$id));
      this.#request = this.#ajv.getSchema(String(this.requestSchema.$id))!;
      if (this.document.detailsSchema)
        this.#details = this.#ajv.compile(this.document.detailsSchema);
      for (const branch of branches(this.requestSchema))
        this.#inputs.set(branch.operation!, this.#ajv.compile(branch.input));
      for (const operation of this.document.operations)
        for (const result of operation.results)
          this.#outputs.set(
            `${operation.id}/${result.state}`,
            this.#ajv.compile(result.outputSchema),
          );
    } catch (error) {
      throw new InvalidContract(`a schema does not compile: ${(error as Error).message}`);
    }
  }

  get id() {
    return this.document.id;
  }

  get version() {
    return this.document.version;
  }

  /** The type reference a description and a request of this contract name exactly. */
  get typeReference(): TypeReference {
    return { id: this.id, version: this.version, contractDigest: this.digest };
  }

  operation(id: string) {
    return this.document.operations.find((operation) => operation.id === id);
  }

  /** Whether completing the operation decides the interaction. */
  isDecision(id: string) {
    const found = this.operation(id);
    if (!found) throw new TypeError(`${id} is not an operation of this type.`);
    return !found.repeatable;
  }

  /**
   * Every rule a description must satisfy beyond the core schema, for the service that issues
   * it and the client that receives it.
   */
  descriptionErrors(description: unknown): string[] {
    const errors = descriptionErrors(description);
    if (errors.length) return errors;
    const issued = description as MapDescription;
    if (!this.#names(issued.type)) return ['The description names another type contract.'];
    const problems = [...this.#detailsProblems(issued), ...this.#operationProblems(issued)];
    if (!(Date.parse(issued.describedAt) < Date.parse(issued.expiresAt)))
      problems.push('The interaction expires before it was described.');
    if (issued.service.authority === 'possession') problems.push(...capabilityProblems(issued));
    return problems;
  }

  /**
   * The checks a service makes on a request once it has resolved the description it issued,
   * compared the description digest and established the caller: the exact type, an offered
   * operation the authority permits, and expiry. Undefined when they pass. The service then
   * applies its own state (a decided interaction, a stale target) and `inputErrors`, in that
   * order, before any effect.
   */
  requestProblem(
    description: MapDescription,
    request: MapRequest,
    { now }: { now: Date },
  ): RequestProblem | undefined {
    if (!this.#names(request.type) || !this.#names(description.type))
      return {
        code: 'unsupported-type',
        title: 'Unsupported interaction type',
        detail: 'The service does not implement this exact interaction type contract.',
      };
    if (!this.#offered(description, request.operation))
      return {
        code: 'unsupported-operation',
        title: 'Unsupported operation',
        detail: 'The operation was not offered in this interaction.',
      };
    if (reached(now, description.expiresAt))
      return {
        code: 'expired-interaction',
        title: 'Interaction expired',
        detail: 'The interaction expired before the request was processed.',
      };
  }

  /**
   * Input problems for one request, each with a detail and a JSON Pointer into its input: the
   * operation's input schema, then its field bindings against the description's details. Type
   * rules a contract cannot express are the caller's.
   */
  inputErrors(description: MapDescription, request: MapRequest): InputError[] {
    const found = this.operation(request.operation);
    const validate = this.#inputs.get(request.operation);
    if (!found || !validate) return [inputError('The operation is not part of this type.', '')];
    if (!validate(request.input)) return inputErrors(validate.errors);
    return (found.fieldBindings ?? [])
      .flatMap((binding) => {
        const fields = member(description.details, binding.fields) as JsonObject | undefined;
        const supplied = member(request.input, binding.input);
        if (!fields)
          return supplied === undefined
            ? []
            : [inputError('This interaction defines no fields for these values.', binding.input)];
        if (supplied === undefined)
          return ((fields.required ?? []) as string[]).length
            ? [inputError('Values for the required fields are missing.', binding.input)]
            : [];
        const schema = this.#fieldValues(fields);
        return schema(supplied) ? [] : inputErrors(schema.errors, binding.input);
      })
      .slice(0, 100);
  }

  /** A request against the core request definition and this contract's request schema. */
  requestErrors(request: unknown): string[] {
    return [
      ...requestErrors(request),
      ...(this.#request(request) ? [] : errorList(this.#request.errors)),
    ];
  }

  /** The core result definition, then the output schema and reason the operation declares. */
  resultErrors(result: unknown): string[] {
    const errors = resultErrors(result);
    if (errors.length) return errors;
    const recorded = result as MapResult;
    if (!this.#names(recorded.type)) return ['The result names another type contract.'];
    const found = this.operation(recorded.operation);
    if (!found) return [`${recorded.operation} is not an operation of this type.`];
    const declared = found.results.find((entry) => entry.state === recorded.state);
    if (!declared) return [`${found.id} does not declare the state ${recorded.state}.`];
    const validate = this.#outputs.get(`${found.id}/${declared.state}`)!;
    const problems = validate(recorded.output) ? [] : errorList(validate.errors, '/output');
    if (recorded.state === 'failed' && !declared.reasons?.includes(recorded.reason!))
      problems.push(`${found.id} does not declare the reason ${recorded.reason}.`);
    return problems;
  }

  #names(type: TypeReference) {
    return (
      type.id === this.id && type.version === this.version && type.contractDigest === this.digest
    );
  }

  #offered(description: MapDescription, id: string) {
    return (
      description.operations.some((offered) => offered.id === id) &&
      Boolean(this.operation(id)?.authority.includes(description.service.authority))
    );
  }

  #operationProblems(description: MapDescription) {
    const ids = description.operations.map((offered) => offered.id);
    const authority = description.service.authority;
    return [
      ...(new Set(ids).size === ids.length ? [] : ['An operation is offered twice.']),
      ...ids
        .filter((id) => !this.operation(id)?.authority.includes(authority))
        .map((id) => `${id} is not a ${authority} operation of this type.`),
    ];
  }

  #detailsProblems(description: MapDescription) {
    const present = Object.hasOwn(description, 'details');
    const valid = this.#details ? present && this.#details(description.details) : !present;
    if (!valid) return ['The details do not satisfy the type contract.'];
    const blocks = new Set(
      this.document.operations.flatMap((operation) =>
        (operation.fieldBindings ?? []).map((binding) => binding.fields),
      ),
    );
    return [...blocks].flatMap((pointer) => {
      const fields = member(description.details, pointer) as JsonObject | undefined;
      return fields ? formProblems(fields).map((problem) => `${pointer}: ${problem}`) : [];
    });
  }

  /**
   * The compiled schema of a fields block's values. Least recently used blocks leave first,
   * with their compiled copies, so a long-running service stays bounded.
   */
  #fieldValues(fields: JsonObject) {
    const key = digest(fields);
    let entry = this.#fields.get(key);
    if (entry) this.#fields.delete(key);
    else {
      const schema = fieldValuesSchema(fields);
      entry = { schema, validate: this.#ajv.compile(schema) };
    }
    this.#fields.set(key, entry);
    if (this.#fields.size > FIELD_VALIDATORS) {
      const [oldest, evicted] = this.#fields.entries().next().value!;
      this.#fields.delete(oldest);
      this.#ajv.removeSchema(evicted.schema);
    }
    return entry.validate;
  }

  /** The pinned schemas by URL, bundled or supplied, each matching its pinned digest. */
  #pin(dependencies: Record<string, unknown>) {
    const references = new Map<string, JsonObject>();
    for (const dependency of this.document.dependencies ?? []) {
      const schema = (BUNDLED.get(dependency.url) ?? dependencies[dependency.url]) as
        JsonObject | undefined;
      if (!schema) throw new InvalidContract(`unknown dependency ${dependency.url}`);
      if (digest(schema) !== dependency.canonicalDigest)
        throw new InvalidContract(`the pinned digest of ${dependency.url} differs`);
      if (schema.$id !== dependency.url)
        throw new InvalidContract(`the schema pinned as ${dependency.url} has another $id`);
      references.set(dependency.url, BUNDLED.has(dependency.url) ? schema : frozen(schema));
    }
    if (!references.has(CORE_SCHEMA)) throw new InvalidContract('the core schema must be pinned');
    return references;
  }

  #verify(references: Map<string, JsonObject>, supplied: JsonObject[]) {
    const inline = [
      this.document.detailsSchema,
      ...this.document.operations.flatMap((operation) =>
        operation.results.map((result) => result.outputSchema),
      ),
    ].filter(Boolean);
    // Every schema is valid JSON Schema 2020-12, so no malformed keyword fails at request time.
    for (const schema of [...inline, this.requestSchema, ...supplied])
      if (!this.#ajv.validateSchema(schema as JsonObject))
        throw new InvalidContract(
          `a schema is not valid JSON Schema 2020-12: ${this.#ajv.errorsText(this.#ajv.errors)}`,
        );
    const reference = this.document.requestSchema;
    if (this.requestSchema.$schema !== JSON_SCHEMA_2020_12)
      throw new InvalidContract('the request schema must declare JSON Schema 2020-12');
    if (this.requestSchema.$id !== reference.url)
      throw new InvalidContract('the request schema $id differs from the contract');
    if (digest(this.requestSchema) !== reference.canonicalDigest)
      throw new InvalidContract('the request schema digest differs from the contract');
    const constants = new Set(values(this.requestSchema, 'const'));
    const ids = this.document.operations.map((operation) => operation.id);
    for (const expected of [this.id, this.version, ...ids])
      if (!constants.has(expected))
        throw new InvalidContract(`the request schema does not bind ${expected}`);
    if (new Set(ids).size !== ids.length)
      throw new InvalidContract('duplicate operation identifiers');
    for (const operation of this.document.operations) {
      const states = operation.results.map((result) => result.state);
      if (new Set(states).size !== states.length)
        throw new InvalidContract(`duplicate ${operation.id} result states`);
    }
    const problem = referenceProblem(inline, this.requestSchema, references, supplied);
    if (problem) throw new InvalidContract(problem);
  }
}
