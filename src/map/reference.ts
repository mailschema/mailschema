import canonicalize from 'canonicalize';
import {
  APPROVAL_REASONS,
  MAP_PROFILE,
  MapArtifacts,
  canonicalDigest,
  descriptionDigest,
  detailsProblems,
  errorList,
  isRequestId,
  parseMapJson,
  reached,
  valueAt,
  type Authority,
  type ContractOperation,
  type JsonObject,
  type LoadedContract,
  type ResultState,
} from './artifacts.ts';
import { serviceBehaviour, type ServiceBehaviour } from './behaviours.ts';

export { MAP_PROFILE, descriptionDigest };

export type Target = { id: string; revision: string; digest: string; title?: string };
export type TypeReference = { id: string; version: string; contractDigest: string };
export interface MapDescription {
  '@context': string;
  '@type': 'MailAction';
  '@id': string;
  profile: string;
  type: TypeReference;
  describedAt: string;
  expiresAt: string;
  service: {
    id: string;
    name: string;
    authority: Authority;
    resource?: string;
    execution: { url: string; resultUrlTemplate: string; resultRetentionSeconds: number };
    humanUrl: string;
  };
  recipient?: string;
  target: Target;
  details?: JsonObject;
  operations: { id: string; name: string; description: string }[];
}
export interface MapRequest {
  kind: 'MapRequest';
  profile: string;
  requestId: string;
  interactionId: string;
  descriptionDigest: string;
  type: TypeReference;
  operation: string;
  input: JsonObject;
}
export interface Response {
  status: number;
  mediaType: 'application/json' | 'application/problem+json';
  location?: string;
  retryAfter?: number;
  allow?: string;
  body: JsonObject;
}
export type InputError = { detail: string; pointer: string };

/** Established by server-side authentication, never taken from the MAP body. */
export type CredentialContext = { principal: string; tenant: string; actor?: string };
/** The capability presented in the execution or result URL of a possession interaction. */
export type PossessionContext = { capability: string };
export type RequestContext = CredentialContext | PossessionContext;

/** Who a claimed request and its human decision are attributed to. */
export interface Attribution {
  principal: string;
  actor?: string;
  decision?: { principal: string; actor?: string };
}

export interface ReferenceServiceOptions {
  now?: () => Date;
  /** Credential mode: current permission to execute or to read a saved result. */
  authorize?: (
    request: MapRequest,
    context: CredentialContext,
    access: 'execute' | 'read-result',
  ) => boolean;
  /** The service's current state of the target. A difference makes the interaction stale. */
  currentTarget?: () => Target;
  requireApproval?: (request: MapRequest, context: CredentialContext) => boolean;
  authorizeDecision?: (
    request: MapRequest,
    proposer: CredentialContext,
    decider: CredentialContext,
  ) => boolean;
  /** The service's own rules at decision time, such as content or sending checks. */
  permitsApproval?: (request: MapRequest) => boolean;
  /** Overrides of the type's reference behaviour, such as slot availability. */
  behaviour?: Partial<ServiceBehaviour>;
}

type RecordedResponse = {
  fingerprint: string;
  attribution: Attribution;
  tenant: string;
  request: MapRequest;
  response: Response;
  claimedAt: Date;
  retainUntil: Date;
};

const artifactsCache = new Map<string, MapArtifacts>();
export function mapArtifacts(root = process.cwd()) {
  let artifacts = artifactsCache.get(root);
  if (!artifacts) artifactsCache.set(root, (artifacts = new MapArtifacts(root)));
  return artifacts;
}

const isPossession = (context: RequestContext): context is PossessionContext =>
  'capability' in context;
const sameTarget = (left: Target, right: Target) =>
  left.id === right.id && left.revision === right.revision && left.digest === right.digest;
const resultUrl = (template: string, requestId: string) =>
  template.replace('{requestId}', encodeURIComponent(requestId));

function fingerprint(request: MapRequest) {
  const bytes = canonicalize(request);
  if (bytes === undefined) throw new Error('MAP requests must contain JSON values.');
  return bytes;
}

/** The path of an absolute URL exactly as written, with no dot segments removed and nothing decoded. */
function writtenPath(url: string) {
  return /^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/.exec(url)?.[1] ?? '';
}

/** The capability a possession interaction issued: the last path segment of its execution URL, as written. */
export function capabilityOf(description: MapDescription) {
  return writtenPath(description.service.execution.url).split('/').at(-1) ?? '';
}

/** Every result a contract declares whose output is fully determined by constants. */
function constantOutput(schema: JsonObject): JsonObject | undefined {
  const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
  const required = (schema.required ?? []) as string[];
  if (required.some((name) => !('const' in (properties[name] ?? {})))) return undefined;
  return Object.fromEntries(required.map((name) => [name, properties[name].const]));
}

const CAPABILITY = /^[A-Za-z0-9_-]{22,}$/;

/**
 * Every rule a description must satisfy beyond the core schema, shared by the
 * service that issues it and the client that receives it.
 */
export function describeProblems(description: MapDescription, artifacts = mapArtifacts()) {
  const errors = artifacts.definitionErrors('description', description);
  if (errors.length) return { errors };
  const contract = artifacts.contract(description.type);
  if (!contract) return { errors: ['The type contract is not bundled or its digest differs.'] };
  const problems: string[] = [];
  if (
    contract.validateDetails
      ? !contract.validateDetails(description.details)
      : description.details !== undefined
  )
    problems.push('The details do not satisfy the type contract.');
  else
    problems.push(
      ...detailsProblems(contract.contract, description.details),
      ...(serviceBehaviour(contract.contract.id).descriptionProblems?.(description) ?? []),
    );
  const ids = description.operations.map((operation) => operation.id);
  if (new Set(ids).size !== ids.length) problems.push('An operation is offered twice.');
  for (const id of ids) {
    const operation = contract.operation(id);
    if (!operation?.authority.includes(description.service.authority))
      problems.push(`${id} is not a ${description.service.authority} operation of this type.`);
  }
  if (!(Date.parse(description.describedAt) < Date.parse(description.expiresAt)))
    problems.push('The interaction expires before it was described.');
  if (description.service.authority === 'possession') {
    const { url, resultUrlTemplate } = description.service.execution;
    const capability = capabilityOf(description);
    if (!CAPABILITY.test(capability))
      problems.push('The capability is too short to be unguessable.');
    if ([url, resultUrlTemplate].some((value) => dotSegment(writtenPath(value))))
      problems.push('A capability URL must not contain dot segments.');
    if (!resultUrlTemplate.startsWith(`${url}/`))
      problems.push('The result template must extend the execution URL and its capability.');
    if (description.service.humanUrl.includes(capability))
      problems.push('The human route must not carry the capability.');
  }
  return { contract, errors: problems };
}

const dotSegment = (path: string) =>
  path.split('/').some((segment) => /^(?:\.|%2e){1,2}$/i.test(segment));

/** A JSON Pointer to the failing member, naming a missing or extra member itself. */
function pointerOf(error: {
  instancePath: string;
  keyword: string;
  params: Record<string, unknown>;
}) {
  const member = error.params.missingProperty ?? error.params.additionalProperty;
  if (member === undefined) return error.instancePath;
  return `${error.instancePath}/${String(member).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

/**
 * Input problems for one request, as JSON Pointers into its input: the operation's
 * schema, field bindings against the description's details, and the type's rules.
 */
const POINTER_LIMIT = 1000;
const DETAIL_LIMIT = 2000;

/**
 * Input errors within the core problem's limits. A pointer too long to report names
 * its nearest ancestor that fits, with a detail that says so, and a detail too long is
 * cut at a code point.
 */
// Lengths as JSON Schema counts them: in code points, not UTF-16 code units.
const codePoints = (text: string) => [...text].length;

function withinLimits(errors: InputError[]): InputError[] {
  const seen = new Set<string>();
  return errors
    .flatMap(({ detail, pointer }) => {
      if (codePoints(pointer) > POINTER_LIMIT) {
        const segments = pointer.split('/');
        while (codePoints(segments.join('/')) > POINTER_LIMIT) segments.pop();
        pointer = segments.join('/');
        detail = 'A member within this value does not satisfy the contract.';
      }
      if (codePoints(detail) > DETAIL_LIMIT)
        detail = `${[...detail].slice(0, DETAIL_LIMIT - 1).join('')}…`;
      const key = JSON.stringify([pointer, detail]);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ detail, pointer }];
    })
    .slice(0, 100);
}

const DOCUMENT_LIMIT = 64 * 1024;

/** A problem with as many of its errors, in order, as fit within the document limit. */
function withinDocument(problem: JsonObject, errors: InputError[]): JsonObject {
  const kept = [...errors];
  const size = () => Buffer.byteLength(JSON.stringify({ ...problem, errors: kept }), 'utf8');
  while (kept.length > 1 && size() > DOCUMENT_LIMIT) kept.pop();
  return { ...problem, errors: kept };
}

export function inputErrors(
  contract: LoadedContract,
  description: MapDescription,
  request: MapRequest,
  now: Date,
  behaviour: ServiceBehaviour = serviceBehaviour(contract.contract.id),
): InputError[] {
  const operation = contract.operation(request.operation);
  const validate = contract.validateInput(request.operation);
  if (!operation || !validate)
    return [{ detail: 'The operation is not part of this type.', pointer: '' }];
  if (!validate(request.input))
    return withinLimits(
      (validate.errors ?? [])
        .filter((error) => error.keyword !== 'if')
        .map((error) => ({ detail: error.message ?? 'invalid', pointer: pointerOf(error) })),
    );
  const errors: InputError[] = [];
  for (const binding of operation.fieldBindings ?? []) {
    const fields = valueAt(description.details, binding.fields) as JsonObject | undefined;
    const values = valueAt(request.input, binding.input);
    if (!fields) {
      if (values !== undefined)
        errors.push({
          detail: 'This interaction defines no fields for these values.',
          pointer: binding.input,
        });
      continue;
    }
    if (values === undefined) {
      if (((fields.required as string[] | undefined) ?? []).length)
        errors.push({
          detail: 'Values for the required fields are missing.',
          pointer: binding.input,
        });
      continue;
    }
    for (const error of contract.fieldErrors(fields, values))
      errors.push({
        detail: error.message ?? 'invalid',
        pointer: `${binding.input}${pointerOf(error)}`,
      });
  }
  errors.push(...(behaviour.check?.(request, description, now) ?? []));
  return withinLimits(errors);
}

/**
 * Deterministic MAP 0.2 service for the conformance suite. It runs any type from
 * its contract; the only type-specific code is the small behaviour in behaviours.ts.
 */
export class ReferenceMapService {
  readonly #description: MapDescription;
  readonly #digest: string;
  readonly #contract: LoadedContract;
  readonly #options: ReferenceServiceOptions;
  readonly #behaviour: ServiceBehaviour;
  readonly #responses = new Map<string, RecordedResponse>();
  readonly #artifacts: MapArtifacts;
  #decided = false;
  #effectCount = 0;

  constructor(
    description: MapDescription,
    options: ReferenceServiceOptions = {},
    artifacts = mapArtifacts(),
  ) {
    const { contract, errors } = describeProblems(description, artifacts);
    if (!contract || errors.length)
      throw new Error(`The service must not issue this description: ${errors.join('; ')}`);
    this.#artifacts = artifacts;
    this.#behaviour = { ...serviceBehaviour(contract.contract.id), ...options.behaviour };
    this.#behaviour.describe?.(description);
    this.#description = structuredClone(description);
    this.#digest = descriptionDigest(description);
    this.#contract = contract;
    this.#options = options;
  }

  get effectCount() {
    return this.#effectCount;
  }

  describe(): MapDescription {
    return structuredClone(this.#description);
  }

  #now() {
    return this.#options.now?.() ?? new Date();
  }

  #principal(context: RequestContext) {
    return isPossession(context)
      ? {
          principal: `capability:${context.capability}`,
          tenant: `capability:${context.capability}`,
        }
      : context;
  }

  #key(context: RequestContext, requestId: string) {
    return `${this.#principal(context).tenant}\n${requestId}`;
  }

  #authorized(request: MapRequest, context: RequestContext, access: 'execute' | 'read-result') {
    if (isPossession(context)) return true;
    return this.#options.authorize?.(request, context, access) ?? true;
  }

  #assertContext(context: RequestContext) {
    if (this.#description.service.authority === 'possession') {
      if (!isPossession(context))
        throw new Error('A possession interaction takes a capability context.');
      return;
    }
    if (isPossession(context) || !context.principal?.trim() || !context.tenant?.trim())
      throw new Error('Authenticated principal and tenant context are required.');
  }

  /**
   * The plain HTTP answer to a possession request that names another capability, or
   * one that has lapsed, before anything reads its body; nothing otherwise.
   */
  capabilityProblem(context: RequestContext): Response | undefined {
    if (!isPossession(context)) return undefined;
    if (context.capability !== capabilityOf(this.#description))
      return {
        status: 404,
        mediaType: 'application/problem+json',
        body: { type: 'about:blank', title: 'Not Found', status: 404 },
      };
    // A capability lapses once the interaction and its retention have ended, and no
    // result of a request claimed before expiry is still retained. Refusals recorded
    // after expiry never extend it, so holding the message cannot keep it alive.
    const retention = this.#description.service.execution.resultRetentionSeconds * 1000;
    const now = this.#now();
    const expiresAt = new Date(this.#description.expiresAt);
    const retained = [...this.#responses.values()].some(
      (recorded) => recorded.claimedAt < expiresAt && now < recorded.retainUntil,
    );
    if (reached(now, this.#description.expiresAt, retention) && !retained)
      return {
        status: 410,
        mediaType: 'application/problem+json',
        body: { type: 'about:blank', title: 'Gone', status: 410 },
      };
    return undefined;
  }

  submit(request: MapRequest, context: RequestContext): Response {
    this.#assertContext(context);
    const lapsed = this.capabilityProblem(context);
    if (lapsed) return lapsed;
    if (
      this.#artifacts.documentErrors(request).length ||
      (request as { kind?: string }).kind !== 'MapRequest'
    )
      return this.#problem(
        request,
        'invalid-request',
        400,
        'Invalid MAP request',
        'The request does not satisfy the MAP document contract.',
        { correlated: false },
      );
    if (request.interactionId !== this.#description['@id'])
      return this.#problem(
        request,
        'invalid-request',
        400,
        'Unknown interaction',
        'The request does not identify this interaction.',
        { correlated: false },
      );
    if (request.descriptionDigest !== this.#digest)
      return this.#problem(
        request,
        'invalid-request',
        400,
        'Unknown description',
        'The request does not match the description this service issued.',
        { correlated: false },
      );

    const key = this.#key(context, request.requestId);
    const principal = this.#principal(context);
    const previous = this.#responses.get(key);
    if (previous) {
      this.#settle(previous);
      // Refusing access to a claimed request says nothing about what happened to it,
      // so the refusal is not correlated with the request.
      if (previous.attribution.principal !== principal.principal)
        return this.#problem(
          request,
          'refused',
          403,
          'Operation refused',
          'The request identifier belongs to another caller.',
          { correlated: false },
        );
      if (!this.#authorized(previous.request, context, 'execute'))
        return this.#problem(
          request,
          'refused',
          403,
          'Operation refused',
          'The caller is not permitted to access this request.',
          { correlated: false },
        );
      if (previous.fingerprint !== fingerprint(request))
        return this.#problem(
          request,
          'idempotency-conflict',
          409,
          'Request identifier already used',
          'The request identifier was previously used with a different request body.',
        );
      if (this.#now() >= previous.retainUntil)
        return this.#problem(
          request,
          'expired-interaction',
          410,
          'Interaction and retained result expired',
          'The request will not be applied again. Its retained result is no longer available.',
        );
      return structuredClone(previous.response);
    }

    const response = this.#evaluate(request, context);
    this.#record(key, request, context, response);
    return structuredClone(response);
  }

  #evaluate(request: MapRequest, context: RequestContext): Response {
    const operation = this.#contract.operation(request.operation);
    const actor = isPossession(context) ? undefined : context.actor;
    if (!this.#authorized(request, context, 'execute'))
      return this.#problem(
        request,
        'refused',
        403,
        'Operation refused',
        'The caller is not permitted to perform this operation.',
      );
    if (canonicalDigest(request.type) !== canonicalDigest(this.#description.type))
      return this.#problem(
        request,
        'unsupported-type',
        422,
        'Unsupported interaction type',
        'The service does not implement this exact interaction type contract.',
      );
    if (
      !operation ||
      !this.#description.operations.some((offered) => offered.id === request.operation)
    )
      return this.#problem(
        request,
        'unsupported-operation',
        422,
        'Unsupported operation',
        'The operation was not offered in this interaction.',
      );
    if (reached(this.#now(), this.#description.expiresAt))
      return this.#problem(
        request,
        'expired-interaction',
        410,
        'Interaction expired',
        'The interaction expired before the request was processed.',
      );
    if (!operation.repeatable && this.#decided)
      return this.#problem(
        request,
        'already-decided',
        409,
        'Interaction already decided',
        'Another request has already decided this interaction.',
      );
    const current = this.#options.currentTarget?.() ?? this.#description.target;
    if (!sameTarget(current, this.#description.target))
      return this.#problem(
        request,
        'stale-target',
        409,
        'The target revision is stale',
        'The target has changed since this interaction was described. No effect was applied.',
        { target: current },
      );
    const errors = inputErrors(
      this.#contract,
      this.#description,
      request,
      this.#now(),
      this.#behaviour,
    );
    if (errors.length)
      return this.#problem(
        request,
        'invalid-request',
        400,
        'Invalid request input',
        'The input does not satisfy the operation contract.',
        { errors },
      );
    if (
      !isPossession(context) &&
      operation.results.some((result) => result.state === 'approval-required') &&
      this.#options.requireApproval?.(request, context)
    )
      return this.#result(
        request,
        'approval-required',
        {},
        {
          actor,
          approvalUrl: `${new URL(this.#description.service.execution.url).origin}/approvals/${encodeURIComponent(request.requestId)}`,
        },
      );
    return this.#perform(request, operation, actor);
  }

  #perform(request: MapRequest, operation: ContractOperation, actor?: string): Response {
    const success = operation.results.find((result) =>
      ['accepted', 'completed'].includes(result.state),
    )!;
    const outcome =
      this.#behaviour.perform?.(request, this.#description, this.#now()) ??
      ({ output: constantOutput(success.outputSchema) } as { output?: JsonObject });
    if ('reason' in outcome)
      return this.#result(request, 'failed', {}, { actor, reason: outcome.reason });
    if (!outcome.output)
      throw new Error(`${request.operation}: the reference needs a behaviour for this output.`);
    this.#effectCount += 1;
    if (!operation.repeatable) this.#decide();
    return this.#result(request, success.state, outcome.output, { actor });
  }

  /** A decision ends every other decision awaiting approval; approvals of repeatable work stand. */
  #decide() {
    this.#decided = true;
    for (const recorded of this.#responses.values())
      if (
        recorded.response.body.state === 'approval-required' &&
        !this.#contract.operation(recorded.request.operation)!.repeatable
      )
        this.#transition(
          recorded,
          this.#result(
            recorded.request,
            'failed',
            {},
            { actor: recorded.attribution.actor, reason: 'superseded' },
          ),
        );
  }

  #record(key: string, request: MapRequest, context: RequestContext, response: Response) {
    const principal = this.#principal(context);
    const attribution: Attribution =
      !isPossession(context) && context.actor
        ? { principal: principal.principal, actor: context.actor }
        : { principal: principal.principal };
    this.#responses.set(key, {
      fingerprint: fingerprint(request),
      attribution,
      tenant: principal.tenant,
      request: structuredClone(request),
      response,
      claimedAt: this.#now(),
      retainUntil: this.#retention(this.#now()),
    });
  }

  /** Retention runs from the latest recorded state and never ends before the interaction expires. */
  #retention(recordedAt: Date) {
    return new Date(
      Math.max(
        new Date(this.#description.expiresAt).getTime(),
        recordedAt.getTime() + this.#description.service.execution.resultRetentionSeconds * 1000,
      ),
    );
  }

  #transition(recorded: RecordedResponse, response: Response, at = this.#now()) {
    recorded.response = response;
    recorded.retainUntil = this.#retention(at);
  }

  /** An undecided approval ends as expired at the interaction's expiry, whether or not anyone looks. */
  #settle(recorded: RecordedResponse) {
    const expiresAt = new Date(this.#description.expiresAt);
    if (
      recorded.response.body.state === 'approval-required' &&
      reached(this.#now(), this.#description.expiresAt)
    )
      this.#transition(
        recorded,
        this.#result(
          recorded.request,
          'failed',
          {},
          { actor: recorded.attribution.actor, reason: 'expired' },
          expiresAt,
        ),
        expiresAt,
      );
  }

  /** Record an authorized human decision for an approval-required request. */
  decideApproval(
    requestId: string,
    context: CredentialContext,
    decision: 'approve' | 'decline',
  ): Response | undefined {
    this.#assertContext(context);
    const recorded = this.#responses.get(this.#key(context, requestId));
    if (!recorded) return undefined;
    this.#settle(recorded);
    const proposer = { ...recorded.attribution, tenant: recorded.tenant };
    const authorized = this.#options.authorizeDecision
      ? this.#options.authorizeDecision(recorded.request, proposer, context)
      : recorded.attribution.principal === context.principal &&
        this.#authorized(recorded.request, context, 'execute');
    if (!authorized)
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Operation refused',
        'The caller is not permitted to decide this approval.',
        { correlated: false },
      );
    if (recorded.response.body.state !== 'approval-required')
      return structuredClone(recorded.response);

    const current = this.#options.currentTarget?.() ?? this.#description.target;
    const actor = recorded.attribution.actor;
    if (decision === 'decline')
      this.#transition(
        recorded,
        this.#result(recorded.request, 'failed', {}, { actor, reason: 'declined' }),
      );
    else if (!sameTarget(current, this.#description.target))
      this.#transition(
        recorded,
        this.#result(recorded.request, 'failed', {}, { actor, reason: 'stale-target' }),
      );
    // A rule refusal answers this attempt only; the proposal can still be declined or expire.
    else if (this.#options.permitsApproval?.(recorded.request) === false)
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Approval refused',
        'The service rules do not permit this approval.',
        { correlated: false },
      );
    else {
      const operation = this.#contract.operation(recorded.request.operation)!;
      recorded.response = this.#perform(recorded.request, operation, actor);
      recorded.retainUntil = this.#retention(this.#now());
    }
    recorded.attribution.decision = context.actor
      ? { principal: context.principal, actor: context.actor }
      : { principal: context.principal };
    return structuredClone(recorded.response);
  }

  /**
   * The service ends a pending proposal for a reason its type declares, such as
   * Action Approval's `withdrawn`. The core's own reasons are applied by the lifecycle.
   */
  endProposal(requestId: string, context: CredentialContext, reason: string) {
    const recorded = this.#responses.get(this.#key(context, requestId));
    if (!recorded || recorded.response.body.state !== 'approval-required') return undefined;
    const operation = this.#contract.operation(recorded.request.operation)!;
    const declared = operation.results.find((result) => result.state === 'failed')?.reasons ?? [];
    if (!declared.includes(reason) || (APPROVAL_REASONS as readonly string[]).includes(reason))
      throw new Error(`${operation.id} does not declare ${reason} as a type reason.`);
    this.#transition(
      recorded,
      this.#result(recorded.request, 'failed', {}, { actor: recorded.attribution.actor, reason }),
    );
    return structuredClone(recorded.response);
  }

  /** The principal and actor recorded for a claimed request and its decision. */
  attribution(requestId: string, context: RequestContext): Attribution | undefined {
    const recorded = this.#responses.get(this.#key(context, requestId));
    return recorded && structuredClone(recorded.attribution);
  }

  recover(requestId: string, context: RequestContext): Response {
    this.#assertContext(context);
    const lapsed = this.capabilityProblem(context);
    if (lapsed) return lapsed;
    // Only a request identifier names a result resource; anything else is not MAP's.
    if (!isRequestId(requestId))
      return {
        status: 404,
        mediaType: 'application/problem+json',
        body: { type: 'about:blank', title: 'Not Found', status: 404 },
      };
    const recorded = this.#responses.get(this.#key(context, requestId));
    if (!recorded) return this.#notFound(requestId);
    this.#settle(recorded);
    if (recorded.attribution.principal !== this.#principal(context).principal)
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Result access refused',
        'The request identifier belongs to another caller.',
        { correlated: false },
      );
    if (!this.#authorized(recorded.request, context, 'read-result'))
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Result access refused',
        'The caller is not permitted to retrieve this result.',
        { correlated: false },
      );
    if (this.#now() >= recorded.retainUntil) return this.#notFound(requestId);
    return structuredClone(recorded.response);
  }

  #result(
    request: MapRequest,
    state: ResultState,
    output: JsonObject,
    extra: { approvalUrl?: string; reason?: string; actor?: string } = {},
    recordedAt = this.#now(),
  ): Response {
    const validateOutput = this.#contract.validateOutput(request.operation, state);
    if (!validateOutput)
      throw new Error(`The contract does not declare ${request.operation}/${state}.`);
    if (!validateOutput(output)) throw new Error(`Invalid ${request.operation}/${state} output.`);
    const declared = this.#contract
      .operation(request.operation)!
      .results.find((result) => result.state === state)!;
    if (extra.reason && !declared.reasons?.includes(extra.reason))
      throw new Error(`${request.operation} does not declare the reason ${extra.reason}.`);
    const location = resultUrl(
      this.#description.service.execution.resultUrlTemplate,
      request.requestId,
    );
    const body = {
      kind: 'MapResult',
      profile: MAP_PROFILE,
      requestId: request.requestId,
      interactionId: request.interactionId,
      descriptionDigest: request.descriptionDigest,
      type: request.type,
      operation: request.operation,
      state,
      target: this.#description.target,
      recordedAt: recordedAt.toISOString(),
      resultUrl: location,
      ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined)),
      output,
    };
    const errors = this.#artifacts.documentErrors(body);
    if (errors.length)
      throw new Error(`The reference produced an invalid result: ${errors.join('; ')}`);
    const pending = state === 'pending' || state === 'approval-required';
    return {
      status: pending ? 202 : 200,
      mediaType: 'application/json',
      location,
      ...(pending ? { retryAfter: 60 } : {}),
      body,
    };
  }

  #problem(
    request: MapRequest,
    code: string,
    status: number,
    title: string,
    detail: string,
    {
      correlated = true,
      target,
      errors,
    }: { correlated?: boolean; target?: Target; errors?: InputError[] } = {},
  ): Response {
    const location = correlated
      ? resultUrl(this.#description.service.execution.resultUrlTemplate, request.requestId)
      : undefined;
    const body: JsonObject = {
      type: `https://mailschema.org/problems/${code}`,
      title,
      status,
      detail,
      ...(correlated
        ? {
            instance: location,
            profile: MAP_PROFILE,
            requestId: request.requestId,
            interactionId: request.interactionId,
            code,
          }
        : {}),
      ...(target ? { target } : {}),
    };
    return {
      status,
      mediaType: 'application/problem+json',
      ...(location ? { location } : {}),
      body: errors ? withinDocument(body, errors) : body,
    };
  }

  #notFound(requestId: string): Response {
    const location = resultUrl(this.#description.service.execution.resultUrlTemplate, requestId);
    return {
      status: 404,
      mediaType: 'application/problem+json',
      location,
      body: {
        type: 'https://mailschema.org/problems/result-not-found',
        title: 'Result not found',
        status: 404,
        detail: 'No retained result exists for this request identifier.',
        instance: location,
        profile: MAP_PROFILE,
        requestId,
        code: 'result-not-found',
      },
    };
  }
}

/** Minimal deterministic client state for redelivery, retries and verification. */
export class ReferenceMapClient {
  readonly #requestId: () => string;
  readonly #requests = new Map<string, MapRequest>();
  readonly #artifacts: MapArtifacts;

  constructor(requestId: () => string, artifacts = mapArtifacts()) {
    this.#requestId = requestId;
    this.#artifacts = artifacts;
  }

  /** Check a description against the core, its bundled contract and the offered authority. */
  verify(description: MapDescription, now = new Date()): LoadedContract {
    if (description.profile !== MAP_PROFILE) throw new Error('The MAP profile is not supported.');
    const { contract, errors } = describeProblems(description, this.#artifacts);
    if (!contract || errors.length)
      throw new Error(`Invalid MAP description: ${errors.join('; ')}`);
    if (reached(now, description.expiresAt)) throw new Error('The description has expired.');
    return contract;
  }

  /**
   * Prepare the request that carries out one instruction of the principal, checked
   * against the contract, or return the one already prepared for it, as when the
   * message is delivered again. A later instruction on the same interaction, such as
   * accepting again after declining, is a new request with its own identifier.
   */
  prepare(
    description: MapDescription,
    operation: string,
    input: JsonObject,
    { instruction, now = new Date() }: { instruction: string; now?: Date },
  ): MapRequest {
    const contract = this.verify(description, now);
    const digest = descriptionDigest(description);
    const key = `${digest}\n${instruction}`;
    const existing = this.#requests.get(key);
    if (existing) {
      if (
        existing.operation !== operation ||
        canonicalDigest(existing.input) !== canonicalDigest(input)
      )
        throw new Error('An instruction always carries out the same request.');
      return structuredClone(existing);
    }
    const request: MapRequest = {
      kind: 'MapRequest',
      profile: description.profile,
      requestId: this.#requestId(),
      interactionId: description['@id'],
      descriptionDigest: digest,
      type: structuredClone(description.type),
      operation,
      input: structuredClone(input),
    };
    if (!description.operations.some((offered) => offered.id === operation))
      throw new Error(`${operation} is not offered by this interaction.`);
    const errors = inputErrors(contract, description, request, now);
    if (errors.length)
      throw new Error(
        `The input does not satisfy the contract: ${errors.map((error) => `${error.pointer || '/'} ${error.detail}`).join('; ')}`,
      );
    // The rest of the request, such as its identifier, against the core and the contract.
    const validateRequest = contract.validateRequest!;
    const refused = [
      ...this.#artifacts.definitionErrors('request', request),
      ...(validateRequest(request) ? [] : errorList(validateRequest.errors)),
    ];
    if (refused.length)
      throw new Error(
        `The request does not satisfy the core and its request schema: ${refused.join('; ')}`,
      );
    this.#requests.set(key, request);
    return structuredClone(request);
  }

  /**
   * The HTTP request to send. Credential mode carries the credential only in the
   * Authorization header; possession mode carries none. Redirects are failures.
   */
  httpRequest(description: MapDescription, request: MapRequest, authorization?: string) {
    const credential = description.service.authority === 'credential';
    if (credential && !authorization)
      throw new Error('Credential mode needs a configured credential.');
    return {
      method: 'POST',
      url: description.service.execution.url,
      headers: {
        'content-type': 'application/json',
        ...(credential ? { authorization: authorization! } : {}),
      },
      body: JSON.stringify(request),
      redirect: 'error' as const,
      credentials: 'omit' as const,
    };
  }
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Whether a request body is declared as JSON: the media type application/json, compared
 * case-insensitively, with no parameter other than a UTF-8 charset. Only HTTP's
 * optional whitespace, spaces and tabs, may surround each part.
 */
export function isJsonRequest(contentType: string | undefined) {
  const [type, ...parameters] = (contentType ?? '')
    .split(';')
    .map((part) => part.replace(/^[ \t]+|[ \t]+$/g, '').toLowerCase());
  return (
    type === 'application/json' &&
    // RFC 9110 permits empty parameter slots, as in `application/json;`.
    parameters.every(
      (parameter) => parameter === '' || /^charset=(?:utf-8|"utf-8")$/.test(parameter),
    )
  );
}

/**
 * A minimal HTTP binding of the reference service: the routes, methods, media type
 * and authentication the profile fixes, in front of submit and recover.
 */
export function serveHttp(
  service: ReferenceMapService,
  request: HttpRequest,
  authenticate: (authorization: string) => CredentialContext | undefined = () => undefined,
): Response {
  const description = service.describe();
  const plain = (status: number, title: string, allow?: string): Response => ({
    status,
    mediaType: 'application/problem+json',
    ...(allow ? { allow } : {}),
    body: { type: 'about:blank', title, status },
  });
  // Problems before a request is correlated carry no MAP correlation members.
  const uncorrelated = (code: string, status: number, title: string, detail: string): Response => ({
    status,
    mediaType: 'application/problem+json',
    body: { type: `https://mailschema.org/problems/${code}`, title, status, detail },
  });
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const possession = description.service.authority === 'possession';
  const execution = description.service.execution;
  const capabilityIndex = writtenPath(execution.url).split('/').length - 1;
  const context = (): RequestContext | Response => {
    if (possession)
      return { capability: writtenPath(request.url).split('/')[capabilityIndex] ?? '' };
    const credential = headers.authorization && authenticate(headers.authorization);
    return (
      credential ||
      uncorrelated(
        'authentication-required',
        401,
        'Authentication required',
        'Send a credential for this service in the Authorization header.',
      )
    );
  };
  // The template holds {requestId} once: a result URL is its prefix and suffix around one
  // encoded identifier. HTTP never sends a fragment, so the suffix is matched without one.
  const [resultPrefix, templateSuffix] = execution.resultUrlTemplate.split('{requestId}');
  const resultSuffix = templateSuffix.split('#')[0];
  if (request.url === execution.url) {
    if (request.method !== 'POST') return plain(405, 'Method Not Allowed', 'POST');
    if (!isJsonRequest(headers['content-type'])) return plain(415, 'Unsupported Media Type');
    const caller = context();
    if ('status' in caller) return caller;
    // An unknown or lapsed capability is answered before the body is read.
    const refused = service.capabilityProblem(caller);
    if (refused) return refused;
    let body: MapRequest;
    try {
      body = parseMapJson(request.body ?? '') as unknown as MapRequest;
    } catch {
      return uncorrelated(
        'invalid-request',
        400,
        'Invalid MAP request',
        'The body is not I-JSON within the MAP limits.',
      );
    }
    return service.submit(body, caller);
  }
  if (
    request.method === 'GET' &&
    request.url.length > resultPrefix.length + resultSuffix.length &&
    request.url.startsWith(resultPrefix) &&
    request.url.endsWith(resultSuffix)
  ) {
    // Anything but a request identifier is no result resource, whatever the credential.
    let requestId: string;
    try {
      requestId = decodeURIComponent(
        request.url.slice(resultPrefix.length, request.url.length - resultSuffix.length),
      );
    } catch {
      return plain(404, 'Not Found');
    }
    if (!isRequestId(requestId)) return plain(404, 'Not Found');
    const caller = context();
    if ('status' in caller) return caller;
    return service.recover(requestId, caller);
  }
  return plain(404, 'Not Found');
}

export interface TrustedService {
  serviceId: string;
  executionUrls: string[];
  resultUrlTemplates: string[];
  resources: string[];
}

function checkedHttpsOrigin(value: string, label: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS.`);
  if (url.username || url.password) throw new Error(`${label} must not contain URL credentials.`);
  return url.origin;
}

/**
 * Service configuration from RFC 9728 protected resource metadata that the
 * client retrieved for a resource identifier it already trusts. The metadata
 * cannot extend trust beyond that resource's HTTPS origin.
 */
export function trustedServicesFromMetadata(resource: string, metadata: JsonObject) {
  const origin = checkedHttpsOrigin(resource, 'The protected resource');
  if (metadata.resource !== resource)
    throw new Error('The metadata describes a different protected resource.');
  if (!Array.isArray(metadata.map_services) || metadata.map_services.length === 0)
    throw new Error('The metadata publishes no MAP services.');
  const endpoint = (url: unknown, label: string) => {
    if (typeof url !== 'string' || checkedHttpsOrigin(url, label) !== origin)
      throw new Error(`${label} is outside the protected resource origin.`);
    return url;
  };
  return metadata.map_services.map((entry): TrustedService => {
    const service = entry as JsonObject;
    if (typeof service.id !== 'string')
      throw new Error('A published MAP service has no identifier.');
    if (!Array.isArray(service.profiles) || !service.profiles.includes(MAP_PROFILE))
      throw new Error('A published MAP service does not implement this profile.');
    return {
      serviceId: service.id,
      executionUrls: [endpoint(service.execution_url, 'The action endpoint')],
      resultUrlTemplates: [endpoint(service.result_url_template, 'The result endpoint')],
      resources: [resource],
    };
  });
}

/**
 * Credential mode: email content never establishes trust in an endpoint. The
 * human link must sit under the configured resource's organizational domain.
 */
export function assertTrustedExecution(
  description: MapDescription,
  trusted: TrustedService,
  organizationalDomain: (host: string) => string,
) {
  if (description.service.authority !== 'credential')
    throw new Error('The interaction is not credential mode.');
  if (description.service.id !== trusted.serviceId)
    throw new Error('The message names an unconfigured service identity.');
  if (description.profile !== MAP_PROFILE) throw new Error('The MAP profile is not supported.');
  checkedHttpsOrigin(description.service.execution.url, 'The action endpoint');
  checkedHttpsOrigin(description.service.execution.resultUrlTemplate, 'The result endpoint');
  checkedHttpsOrigin(description.service.humanUrl, 'The human route');
  if (!trusted.executionUrls.includes(description.service.execution.url))
    throw new Error('The action endpoint is not configured for this service.');
  if (!trusted.resultUrlTemplates.includes(description.service.execution.resultUrlTemplate))
    throw new Error('The result endpoint is not configured for this service.');
  if (!description.service.resource || !trusted.resources.includes(description.service.resource))
    throw new Error('The message names an unconfigured resource.');
  const expected = organizationalDomain(new URL(description.service.resource).hostname);
  const human = new URL(description.service.humanUrl).hostname;
  if (human !== expected && !human.endsWith(`.${expected}`))
    throw new Error('The human route is outside the service organization.');
}
