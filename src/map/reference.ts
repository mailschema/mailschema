import { MapArtifacts, type LoadedContract } from './artifacts.ts';
import { serviceBehaviour, type ServiceBehaviour } from './behaviours.ts';
import {
  MAP_PROFILE,
  APPROVAL_REASONS,
  InvalidDocument,
  canonicalize,
  capability,
  descriptionErrors,
  digest,
  isJsonRequest,
  isRequestId,
  parse,
  problem,
  reached,
  requestErrors,
  result,
  resultStatus,
  resultUrl,
  retainUntil,
  settle,
  transition,
  writtenPath,
  type ContractOperation,
  type InputError,
  type JsonObject,
  type MapDescription,
  type MapRequest,
  type MapResult,
  type ProblemCode,
  type ResultState,
  type Target,
  type TypeContract,
  type TypeReference,
} from './core/index.ts';

export interface Response {
  status: number;
  mediaType: 'application/json' | 'application/problem+json';
  location?: string;
  retryAfter?: number;
  allow?: string;
  body: JsonObject;
}

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

/** Every result a contract declares whose output is fully determined by constants. */
function constantOutput(schema: JsonObject): JsonObject | undefined {
  const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
  const required = (schema.required ?? []) as string[];
  if (required.some((name) => !('const' in (properties[name] ?? {})))) return undefined;
  return Object.fromEntries(required.map((name) => [name, properties[name].const]));
}

/**
 * Every rule a description must satisfy beyond the core schema, shared by the service that
 * issues it and the client that receives it: its contract's, then its type's own.
 */
export function describeProblems(description: MapDescription, artifacts = mapArtifacts()) {
  const errors = descriptionErrors(description);
  if (errors.length) return { errors };
  const contract = artifacts.contract(description.type);
  if (!contract) return { errors: ['The type contract is not bundled or its digest differs.'] };
  const problems = contract.core.descriptionErrors(description);
  return {
    contract,
    errors: problems.length
      ? problems
      : (serviceBehaviour(contract.contract.id).descriptionProblems?.(description) ?? []),
  };
}

/**
 * Input problems for one request, as JSON Pointers into its input: the contract's, then the
 * type's own rules once the input satisfies the contract.
 */
export function inputErrors(
  contract: LoadedContract,
  description: MapDescription,
  request: MapRequest,
  now: Date,
  behaviour: ServiceBehaviour = serviceBehaviour(contract.contract.id),
): InputError[] {
  const errors = contract.core.inputErrors(description, request);
  return errors.length ? errors : (behaviour.check?.(request, description, now) ?? []);
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
    this.#behaviour = { ...serviceBehaviour(contract.contract.id), ...options.behaviour };
    this.#behaviour.describe?.(description);
    this.#description = structuredClone(description);
    this.#digest = digest(description);
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
    if (context.capability !== capability(this.#description))
      return {
        status: 404,
        mediaType: 'application/problem+json',
        body: { type: 'about:blank', title: 'Not Found', status: 404 },
      };
    // A capability lapses once the interaction and its retention have ended, and no
    // result of a request claimed before expiry is still retained. Refusals recorded
    // after expiry never extend it, so holding the message cannot keep it alive.
    const retention = this.#description.service.execution.resultRetentionSeconds;
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
    if (requestErrors(request).length)
      return this.#problem(
        request,
        'invalid-request',
        'Invalid MAP request',
        'The request does not satisfy the MAP document contract.',
        { correlated: false },
      );
    if (request.interactionId !== this.#description['@id'])
      return this.#problem(
        request,
        'invalid-request',
        'Unknown interaction',
        'The request does not identify this interaction.',
        { correlated: false },
      );
    if (request.descriptionDigest !== this.#digest)
      return this.#problem(
        request,
        'invalid-request',
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
          'Operation refused',
          'The request identifier belongs to another caller.',
          { correlated: false },
        );
      if (!this.#authorized(previous.request, context, 'execute'))
        return this.#problem(
          request,
          'refused',
          'Operation refused',
          'The caller is not permitted to access this request.',
          { correlated: false },
        );
      if (previous.fingerprint !== canonicalize(request))
        return this.#problem(
          request,
          'idempotency-conflict',
          'Request identifier already used',
          'The request identifier was previously used with a different request body.',
        );
      if (this.#now() >= previous.retainUntil)
        return this.#problem(
          request,
          'expired-interaction',
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
    const actor = isPossession(context) ? undefined : context.actor;
    if (!this.#authorized(request, context, 'execute'))
      return this.#problem(
        request,
        'refused',
        'Operation refused',
        'The caller is not permitted to perform this operation.',
      );
    const refused = this.#contract.core.requestProblem(this.#description, request, {
      now: this.#now(),
    });
    if (refused) return this.#problem(request, refused.code, refused.title, refused.detail);
    const operation = this.#contract.core.operation(request.operation)!;
    if (!operation.repeatable && this.#decided)
      return this.#problem(
        request,
        'already-decided',
        'Interaction already decided',
        'Another request has already decided this interaction.',
      );
    const current = this.#options.currentTarget?.() ?? this.#description.target;
    if (!sameTarget(current, this.#description.target))
      return this.#problem(
        request,
        'stale-target',
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
        this.#contract.core.isDecision(recorded.request.operation)
      )
        this.#end(recorded, 'superseded');
  }

  #record(key: string, request: MapRequest, context: RequestContext, response: Response) {
    const principal = this.#principal(context);
    const attribution: Attribution =
      !isPossession(context) && context.actor
        ? { principal: principal.principal, actor: context.actor }
        : { principal: principal.principal };
    this.#responses.set(key, {
      fingerprint: canonicalize(request),
      attribution,
      tenant: principal.tenant,
      request: structuredClone(request),
      response,
      claimedAt: this.#now(),
      retainUntil: retainUntil(this.#description, this.#now()),
    });
  }

  /** The recorded result moves to its next state; retention runs from that state. */
  #transition(recorded: RecordedResponse, next: MapResult) {
    recorded.response = this.#response(next);
    recorded.retainUntil = retainUntil(this.#description, new Date(next.recordedAt));
  }

  /** A proposal awaiting approval ends as failed for the reason given. */
  #end(recorded: RecordedResponse, reason: string) {
    this.#transition(
      recorded,
      transition(recorded.response.body as MapResult, {
        state: 'failed',
        reason,
        recordedAt: this.#now(),
      }),
    );
  }

  /** An undecided approval ends as expired at the interaction's expiry, whether or not anyone looks. */
  #settle(recorded: RecordedResponse) {
    const settled = settle(recorded.response.body as MapResult, this.#description, this.#now());
    if (settled) this.#transition(recorded, settled);
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
        'Operation refused',
        'The caller is not permitted to decide this approval.',
        { correlated: false },
      );
    if (recorded.response.body.state !== 'approval-required')
      return structuredClone(recorded.response);

    const current = this.#options.currentTarget?.() ?? this.#description.target;
    const actor = recorded.attribution.actor;
    if (decision === 'decline') this.#end(recorded, 'declined');
    else if (!sameTarget(current, this.#description.target)) this.#end(recorded, 'stale-target');
    // A rule refusal answers this attempt only; the proposal can still be declined or expire.
    else if (this.#options.permitsApproval?.(recorded.request) === false)
      return this.#problem(
        recorded.request,
        'refused',
        'Approval refused',
        'The service rules do not permit this approval.',
        { correlated: false },
      );
    else {
      const operation = this.#contract.core.operation(recorded.request.operation)!;
      recorded.response = this.#perform(recorded.request, operation, actor);
      recorded.retainUntil = retainUntil(this.#description, this.#now());
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
    const operation = this.#contract.core.operation(recorded.request.operation)!;
    const declared = operation.results.find((result) => result.state === 'failed')?.reasons ?? [];
    if (!declared.includes(reason) || (APPROVAL_REASONS as readonly string[]).includes(reason))
      throw new Error(`${operation.id} does not declare ${reason} as a type reason.`);
    this.#end(recorded, reason);
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
        'Result access refused',
        'The request identifier belongs to another caller.',
        { correlated: false },
      );
    if (!this.#authorized(recorded.request, context, 'read-result'))
      return this.#problem(
        recorded.request,
        'refused',
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
  ): Response {
    const body = result(request, {
      state,
      target: this.#description.target,
      resultUrl: resultUrl(this.#description, request.requestId),
      recordedAt: this.#now(),
      output,
      ...extra,
    });
    return this.#response(body);
  }

  /** A result the contract accepts, with its HTTP status and headers. */
  #response(body: MapResult): Response {
    const errors = this.#contract.core.resultErrors(body);
    if (errors.length)
      throw new Error(`The reference produced an invalid result: ${errors.join('; ')}`);
    const status = resultStatus(body);
    return {
      status,
      mediaType: 'application/json',
      location: body.resultUrl,
      ...(status === 202 ? { retryAfter: 60 } : {}),
      body,
    };
  }

  #problem(
    request: MapRequest,
    code: ProblemCode,
    title: string,
    detail: string,
    {
      correlated = true,
      target,
      errors,
    }: { correlated?: boolean; target?: Target; errors?: InputError[] } = {},
  ): Response {
    const location = correlated ? resultUrl(this.#description, request.requestId) : undefined;
    const body = problem(code, {
      title,
      detail,
      ...(correlated
        ? {
            requestId: request.requestId,
            interactionId: request.interactionId,
            resultUrl: location,
          }
        : {}),
      target,
      errors,
    });
    return {
      status: body.status,
      mediaType: 'application/problem+json',
      ...(location ? { location } : {}),
      body,
    };
  }

  #notFound(requestId: string): Response {
    const location = resultUrl(this.#description, requestId);
    return {
      status: 404,
      mediaType: 'application/problem+json',
      location,
      body: problem('result-not-found', {
        title: 'Result not found',
        detail: 'No retained result exists for this request identifier.',
        requestId,
        resultUrl: location,
      }),
    };
  }
}

/** One executable contract as a Registry catalogue lists it. */
export type CatalogueContract = {
  id: string;
  version: string;
  contract: { url: string; canonicalDigest: string };
  requestSchema: { url: string; canonicalDigest: string };
};

/**
 * Obtain a contract the client has not bundled from a Registry catalogue it has configured.
 * The catalogue must list the exact type, version and contract digest the description names,
 * and the contract, its request schema and every schema it pins must match their digests.
 * Returns the verified documents by URL, for the client's contract store. Nothing is fetched
 * from a location a message names.
 */
export async function obtainContract(
  catalogue: { contracts: CatalogueContract[] },
  type: TypeReference,
  fetchDocument: (url: string) => Promise<unknown>,
): Promise<Map<string, JsonObject>> {
  const entry = catalogue.contracts.find(
    (candidate) =>
      candidate.id === type.id &&
      candidate.version === type.version &&
      candidate.contract.canonicalDigest === type.contractDigest,
  );
  if (!entry)
    throw new Error(`The catalogue does not list ${type.id} ${type.version} with that digest.`);
  const documents = new Map<string, JsonObject>();
  const verified = async (url: string, pinned: string) => {
    const value = (await fetchDocument(url)) as JsonObject;
    if (digest(value) !== pinned) throw new Error(`${url} does not match its digest.`);
    documents.set(url, value);
    return value;
  };
  const contract = (await verified(
    entry.contract.url,
    entry.contract.canonicalDigest,
  )) as unknown as TypeContract;
  if (contract.requestSchema.canonicalDigest !== entry.requestSchema.canonicalDigest)
    throw new Error('The contract pins another request schema than the catalogue lists.');
  await verified(contract.requestSchema.url, contract.requestSchema.canonicalDigest);
  for (const dependency of contract.dependencies ?? [])
    await verified(dependency.url, dependency.canonicalDigest);
  return documents;
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
    const descriptionDigest = digest(description);
    const key = `${descriptionDigest}\n${instruction}`;
    const existing = this.#requests.get(key);
    if (existing) {
      if (existing.operation !== operation || canonicalize(existing.input) !== canonicalize(input))
        throw new Error('An instruction always carries out the same request.');
      return structuredClone(existing);
    }
    const request: MapRequest = {
      kind: 'MapRequest',
      profile: description.profile,
      requestId: this.#requestId(),
      interactionId: description['@id'],
      descriptionDigest,
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
    const refused = contract.core.requestErrors(request);
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
  const uncorrelated = (code: ProblemCode, title: string, detail: string): Response => {
    const body = problem(code, { title, detail });
    return { status: body.status, mediaType: 'application/problem+json', body };
  };
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
      body = parse(request.body ?? '') as MapRequest;
    } catch (error) {
      if (!(error instanceof InvalidDocument)) throw error;
      return uncorrelated(
        'invalid-request',
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
