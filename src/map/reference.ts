import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import mapSchema from '../../public/schemas/map-0.1.schema.json' with { type: 'json' };
import contentReviewSchema from '../../public/schemas/content-review-0.2.schema.json' with { type: 'json' };
import contentReviewContract from '../../public/contracts/content-review-0.2.json' with { type: 'json' };

export const MAP_PROFILE = 'https://mailschema.org/profiles/map/0.1';
export const CONTENT_REVIEW_TYPE = 'https://mailschema.org/types/content-review';

type JsonObject = Record<string, unknown>;
type Target = { id: string; revision: string; digest: string; title?: string };
type TypeReference = { id: string; version: string; contractDigest: string };
type MapRequest = {
  kind: 'MapRequest';
  profile: string;
  requestId: string;
  interactionId: string;
  type: TypeReference;
  operation: string;
  target: Target;
  input: JsonObject;
};
type MapDescription = {
  '@id': string;
  profile: string;
  type: TypeReference;
  describedAt: string;
  expiresAt: string;
  service: {
    id: string;
    execution: { url: string; resultUrlTemplate: string; resultRetentionSeconds: number };
    humanUrl: string;
    authorization: { kind: string; schemes: string[]; audience?: string };
  };
  target: Target;
  operations: { id: string }[];
};
type Response = {
  status: number;
  mediaType: 'application/json' | 'application/problem+json';
  location?: string;
  body: JsonObject;
};
type ResultState = 'accepted' | 'completed' | 'failed' | 'pending' | 'approval-required';

export interface RequestContext {
  principal: string;
  tenant: string;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addSchema(mapSchema);
const validateMap = ajv.getSchema(mapSchema.$id)!;
const validateContentReview = ajv.compile(contentReviewSchema);

function fingerprint(request: MapRequest) {
  const bytes = canonicalize(request);
  if (bytes === undefined) throw new Error('MAP requests must contain JSON values.');
  return createHash('sha256').update(bytes).digest('hex');
}

function sameTarget(left: Target, right: Target) {
  return left.id === right.id && left.revision === right.revision && left.digest === right.digest;
}

function resultUrl(template: string, requestId: string) {
  return template.replace('{requestId}', encodeURIComponent(requestId));
}

function requestKey(context: RequestContext, requestId: string) {
  return `${context.tenant}\n${requestId}`;
}

function assertContext(context: RequestContext) {
  if (!context?.principal?.trim() || !context?.tenant?.trim())
    throw new Error('Authenticated principal and tenant context are required.');
}

export interface ReferenceServiceOptions {
  now?: () => Date;
  authorize: (
    request: MapRequest,
    context: RequestContext,
    access: 'execute' | 'read-result',
  ) => boolean;
  currentTarget?: () => Target;
  requireApproval?: (request: MapRequest, context: RequestContext) => boolean;
  authorizeDecision?: (
    request: MapRequest,
    proposer: RequestContext,
    decider: RequestContext,
  ) => boolean;
}

type RecordedResponse = {
  fingerprint: string;
  principal: string;
  tenant: string;
  request: MapRequest;
  response: Response;
  retainUntil: Date;
};

/**
 * Deterministic Content Review service for conformance tests.
 *
 * Callers supply the principal and tenant established by server-side
 * authentication. Neither value is accepted from the MAP request body.
 */
export class ReferenceMapService {
  readonly #description: MapDescription;
  readonly #options: ReferenceServiceOptions;
  readonly #responses = new Map<string, RecordedResponse>();
  #effectCount = 0;

  constructor(description: MapDescription, options: ReferenceServiceOptions) {
    if (!validateMap(description))
      throw new Error('Reference description is not a valid MAP document.');
    this.#description = structuredClone(description);
    this.#options = options;
  }

  get effectCount() {
    return this.#effectCount;
  }

  describe(): MapDescription {
    return structuredClone(this.#description);
  }

  submit(request: MapRequest, context: RequestContext): Response {
    assertContext(context);
    if (!validateMap(request))
      return this.#problem(
        request,
        'invalid-request',
        400,
        'Invalid MAP request',
        'The request does not satisfy the MAP document contract.',
        undefined,
        false,
      );
    if (request.interactionId !== this.#description['@id'])
      return this.#problem(
        request,
        'invalid-request',
        400,
        'Unknown interaction',
        'The request does not identify this interaction.',
        undefined,
        false,
      );

    const digest = fingerprint(request);
    const key = requestKey(context, request.requestId);
    const previous = this.#responses.get(key);
    if (previous) {
      if (previous.principal !== context.principal)
        return this.#problem(
          request,
          'refused',
          403,
          'Operation refused',
          'The request identifier belongs to another authenticated caller.',
        );
      if (!this.#options.authorize(previous.request, context, 'execute'))
        return this.#problem(
          request,
          'refused',
          403,
          'Operation refused',
          'The authenticated caller is not permitted to access this request.',
        );
      if (previous.fingerprint === digest) {
        if ((this.#options.now?.() ?? new Date()) >= previous.retainUntil)
          return this.#problem(
            request,
            'expired-interaction',
            410,
            'Interaction and retained result expired',
            'The request will not be applied again. Its retained result is no longer available.',
          );
        return structuredClone(previous.response);
      }
      return this.#problem(
        request,
        'idempotency-conflict',
        409,
        'Request identifier already used',
        'The request identifier was previously used with a different request body.',
      );
    }

    let response: Response;
    if (!this.#options.authorize(request, context, 'execute'))
      response = this.#problem(
        request,
        'refused',
        403,
        'Operation refused',
        'The authenticated caller is not permitted to perform this operation.',
      );
    else if (request.profile !== MAP_PROFILE || request.profile !== this.#description.profile)
      response = this.#problem(
        request,
        'unsupported-profile',
        422,
        'Unsupported MAP profile',
        'The service does not implement the requested MAP profile.',
      );
    else if (
      request.type.id !== this.#description.type.id ||
      request.type.version !== this.#description.type.version ||
      request.type.contractDigest !== this.#description.type.contractDigest
    )
      response = this.#problem(
        request,
        'unsupported-type',
        422,
        'Unsupported interaction type',
        'The service does not implement this exact interaction type contract.',
      );
    else if (!this.#description.operations.some((operation) => operation.id === request.operation))
      response = this.#problem(
        request,
        'unsupported-operation',
        422,
        'Unsupported operation',
        'The operation was not offered in this interaction.',
      );
    else if ((this.#options.now?.() ?? new Date()) >= new Date(this.#description.expiresAt))
      response = this.#problem(
        request,
        'expired-interaction',
        410,
        'Interaction expired',
        'The interaction expired before the request was processed.',
      );
    else if (
      !sameTarget(request.target, this.#options.currentTarget?.() ?? this.#description.target)
    )
      response = this.#problem(
        request,
        'stale-target',
        409,
        'The target revision is stale',
        'The request does not refer to the current target revision. No effect was applied.',
        request.target,
      );
    else if (!validateContentReview(request))
      response = this.#problem(
        request,
        'invalid-request',
        400,
        'Invalid Content Review request',
        'The request does not satisfy the selected operation input contract.',
      );
    else if (this.#options.requireApproval?.(request, context))
      response = this.#result(request, 'approval-required', {
        approvalUrl: `${new URL(this.#description.service.execution.url).origin}/approvals/${encodeURIComponent(request.requestId)}`,
      });
    else {
      this.#effectCount += 1;
      response = this.#result(
        request,
        request.operation === 'request-changes' ? 'accepted' : 'completed',
        request.operation === 'request-changes'
          ? { feedbackRecorded: true }
          : { decision: 'approved' },
      );
    }

    const recordedAt = this.#options.now?.() ?? new Date();
    const retainUntil = new Date(
      Math.max(
        new Date(this.#description.expiresAt).getTime(),
        recordedAt.getTime() + this.#description.service.execution.resultRetentionSeconds * 1000,
      ),
    );
    this.#responses.set(key, {
      fingerprint: digest,
      principal: context.principal,
      tenant: context.tenant,
      request: structuredClone(request),
      response,
      retainUntil,
    });
    return structuredClone(response);
  }

  /** Record an authorized human decision for an approval-required request. */
  decideApproval(
    requestId: string,
    context: RequestContext,
    decision: 'approve' | 'decline',
  ): Response | undefined {
    assertContext(context);
    const recorded = this.#responses.get(requestKey(context, requestId));
    if (!recorded) return undefined;
    const proposer = { principal: recorded.principal, tenant: recorded.tenant };
    const authorized = this.#options.authorizeDecision
      ? this.#options.authorizeDecision(recorded.request, proposer, context)
      : recorded.principal === context.principal &&
        this.#options.authorize(recorded.request, context, 'execute');
    if (!authorized)
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Operation refused',
        'The authenticated caller is not permitted to decide this approval.',
      );
    if (recorded.response.body.state !== 'approval-required')
      throw new Error('Only an approval-required result can receive a human decision.');

    if (decision === 'decline')
      recorded.response = this.#result(recorded.request, 'failed', { reason: 'declined' });
    else if ((this.#options.now?.() ?? new Date()) >= new Date(this.#description.expiresAt))
      recorded.response = this.#result(recorded.request, 'failed', { reason: 'expired' });
    else if (
      !sameTarget(
        recorded.request.target,
        this.#options.currentTarget?.() ?? this.#description.target,
      )
    )
      recorded.response = this.#result(recorded.request, 'failed', { reason: 'stale-target' });
    else {
      recorded.response = this.#result(recorded.request, 'completed', { decision: 'approved' });
      this.#effectCount += 1;
    }
    return structuredClone(recorded.response);
  }

  recover(requestId: string, context: RequestContext): Response {
    assertContext(context);
    const recorded = this.#responses.get(requestKey(context, requestId));
    if (!recorded) return this.#notFound(requestId);
    if (recorded.principal !== context.principal)
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Result access refused',
        'The request identifier belongs to another authenticated caller.',
        undefined,
        false,
      );
    if (!this.#options.authorize(recorded.request, context, 'read-result'))
      return this.#problem(
        recorded.request,
        'refused',
        403,
        'Result access refused',
        'The authenticated caller is not permitted to retrieve this result.',
        undefined,
        false,
      );
    if ((this.#options.now?.() ?? new Date()) >= recorded.retainUntil)
      return this.#notFound(requestId);
    return structuredClone(recorded.response);
  }

  #result(request: MapRequest, state: ResultState, output: JsonObject): Response {
    const declared = contentReviewContract.operations
      .find((operation) => operation.id === request.operation)
      ?.results.find((result) => result.state === state);
    if (!declared)
      throw new Error(`Content Review does not declare ${request.operation}/${state}.`);
    const validateOutput = ajv.compile(declared.outputSchema);
    if (!validateOutput(output))
      throw new Error(`Invalid Content Review ${request.operation}/${state} output.`);
    const location = resultUrl(
      this.#description.service.execution.resultUrlTemplate,
      request.requestId,
    );
    return {
      status: state === 'pending' || state === 'approval-required' ? 202 : 200,
      mediaType: 'application/json',
      location,
      body: {
        kind: 'MapResult',
        profile: MAP_PROFILE,
        requestId: request.requestId,
        interactionId: request.interactionId,
        type: request.type,
        operation: request.operation,
        state,
        target: request.target,
        recordedAt: (this.#options.now?.() ?? new Date()).toISOString(),
        resultUrl: location,
        output,
      },
    };
  }

  #problem(
    request: MapRequest,
    code: string,
    status: number,
    title: string,
    detail: string,
    target?: Target,
    correlated = true,
  ): Response {
    const location = correlated
      ? resultUrl(this.#description.service.execution.resultUrlTemplate, request.requestId)
      : undefined;
    return {
      status,
      mediaType: 'application/problem+json',
      ...(location ? { location } : {}),
      body: {
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
      },
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

/** Minimal deterministic client state for duplicate message delivery and retries. */
export class ReferenceMapClient {
  readonly #requestId: () => string;
  readonly #requests = new Map<string, MapRequest>();

  constructor(requestId: () => string) {
    this.#requestId = requestId;
  }

  prepare(description: MapDescription, operation: string, input: JsonObject): MapRequest {
    const intent = canonicalize({
      interactionId: description['@id'],
      type: description.type,
      operation,
      target: description.target,
      input,
    });
    if (intent === undefined) throw new Error('MAP request intent must contain JSON values.');
    const existing = this.#requests.get(intent);
    if (existing) return structuredClone(existing);
    const request: MapRequest = {
      kind: 'MapRequest',
      profile: description.profile,
      requestId: this.#requestId(),
      interactionId: description['@id'],
      type: structuredClone(description.type),
      operation,
      target: structuredClone(description.target),
      input: structuredClone(input),
    };
    this.#requests.set(intent, request);
    return structuredClone(request);
  }
}

export interface TrustedService {
  serviceId: string;
  executionUrls: string[];
  resultUrlTemplates: string[];
  audiences?: string[];
}

function checkedHttpsOrigin(value: string, label: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS.`);
  if (url.username || url.password) throw new Error(`${label} must not contain URL credentials.`);
  return url.origin;
}

/** Email content never establishes trust in an action or result endpoint by itself. */
export function assertTrustedExecution(description: MapDescription, trusted: TrustedService) {
  if (description.service.id !== trusted.serviceId)
    throw new Error('The message names an unconfigured service identity.');
  if (description.profile !== MAP_PROFILE) throw new Error('The MAP profile is not supported.');
  checkedHttpsOrigin(description.service.execution.url, 'The action endpoint');
  checkedHttpsOrigin(description.service.execution.resultUrlTemplate, 'The result endpoint');
  if (!trusted.executionUrls.includes(description.service.execution.url))
    throw new Error('The action endpoint is not configured for this service.');
  if (!trusted.resultUrlTemplates.includes(description.service.execution.resultUrlTemplate))
    throw new Error('The result endpoint is not configured for this service.');
  if (
    description.service.authorization.audience &&
    !trusted.audiences?.includes(description.service.authorization.audience)
  )
    throw new Error('The message names an unconfigured credential audience.');
}
