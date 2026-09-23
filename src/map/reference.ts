import { createHash } from 'node:crypto';

export const MAP_PROFILE = 'https://mailschema.org/profiles/map/0.1';
export const CONTENT_REVIEW_TYPE = 'https://mailschema.org/types/content-review';

type JsonObject = Record<string, unknown>;
type Target = { id: string; revision: string; digest: string; title?: string };
type MapRequest = {
  kind: 'MapRequest';
  profile: string;
  requestId: string;
  interactionId: string;
  requestedAt: string;
  type: { id: string; version: string; recordDigest: string };
  operation: string;
  target: Target;
  input: JsonObject;
};
type MapDescription = {
  '@id': string;
  profile: string;
  type: MapRequest['type'];
  expiresAt: string;
  service: {
    id: string;
    execution: { url: string; resultUrlTemplate: string };
  };
  target: Target;
  operations: { id: string }[];
};
type Response = {
  status: number;
  mediaType: 'application/json' | 'application/problem+json';
  location: string;
  body: JsonObject;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function fingerprint(request: MapRequest) {
  return createHash('sha256').update(canonical(request)).digest('hex');
}

function sameTarget(left: Target, right: Target) {
  return left.id === right.id && left.revision === right.revision && left.digest === right.digest;
}

function resultUrl(template: string, requestId: string) {
  return template.replace('{requestId}', encodeURIComponent(requestId));
}

export interface ReferenceServiceOptions {
  now?: () => Date;
  authorize?: (request: MapRequest) => boolean;
  requireApproval?: (request: MapRequest) => boolean;
  leavePending?: (request: MapRequest) => boolean;
}

/** Deterministic example service used by the MAP conformance fixtures. */
export class ReferenceMapService {
  readonly #description: MapDescription;
  readonly #options: ReferenceServiceOptions;
  readonly #responses = new Map<string, { fingerprint: string; response: Response }>();

  constructor(description: MapDescription, options: ReferenceServiceOptions = {}) {
    this.#description = structuredClone(description);
    this.#options = options;
  }

  submit(request: MapRequest): Response {
    const digest = fingerprint(request);
    const previous = this.#responses.get(request.requestId);
    if (previous) {
      if (previous.fingerprint === digest) return structuredClone(previous.response);
      return this.#problem(
        request,
        'idempotency-conflict',
        409,
        'Request identifier already used',
        'The request identifier was previously used with a different request body.',
      );
    }

    let response: Response;
    if (request.profile !== MAP_PROFILE || request.profile !== this.#description.profile)
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
      request.type.recordDigest !== this.#description.type.recordDigest
    )
      response = this.#problem(
        request,
        'unsupported-type',
        422,
        'Unsupported interaction type',
        'The service does not implement this exact interaction type record.',
      );
    else if (!this.#description.operations.some((operation) => operation.id === request.operation))
      response = this.#problem(
        request,
        'unsupported-operation',
        422,
        'Unsupported operation',
        'The operation was not offered in this interaction.',
      );
    else if ((this.#options.now?.() ?? new Date()) > new Date(this.#description.expiresAt))
      response = this.#problem(
        request,
        'expired-interaction',
        410,
        'Interaction expired',
        'The interaction expired before the request was processed.',
      );
    else if (!sameTarget(request.target, this.#description.target))
      response = this.#problem(
        request,
        'stale-target',
        409,
        'The target revision is stale',
        'The request does not refer to the current target revision. No effect was applied.',
        request.target,
      );
    else if (this.#options.authorize && !this.#options.authorize(request))
      response = this.#problem(
        request,
        'refused',
        403,
        'Operation refused',
        'The authenticated caller is not permitted to perform this operation.',
      );
    else if (
      request.operation === 'request-changes' &&
      (typeof request.input.feedback !== 'string' || !request.input.feedback.trim())
    )
      response = this.#problem(
        request,
        'invalid-request',
        400,
        'Invalid request',
        'The request-changes operation requires non-empty feedback.',
      );
    else if (this.#options.requireApproval?.(request))
      response = this.#result(request, 'approval-required', {
        approvalUrl: `${new URL(this.#description.service.execution.url).origin}/approvals/${encodeURIComponent(request.requestId)}`,
      });
    else if (this.#options.leavePending?.(request)) response = this.#result(request, 'pending', {});
    else
      response = this.#result(
        request,
        request.operation === 'request-changes' ? 'accepted' : 'completed',
        request.operation === 'request-changes'
          ? { feedbackRecorded: true }
          : { decision: 'approved' },
      );

    this.#responses.set(request.requestId, { fingerprint: digest, response });
    return structuredClone(response);
  }

  recover(requestId: string): Response | undefined {
    const response = this.#responses.get(requestId)?.response;
    return response ? structuredClone(response) : undefined;
  }

  #result(request: MapRequest, state: string, output: JsonObject): Response {
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
  ): Response {
    const location = resultUrl(
      this.#description.service.execution.resultUrlTemplate,
      request.requestId,
    );
    return {
      status,
      mediaType: 'application/problem+json',
      location,
      body: {
        type: `https://mailschema.org/problems/${code}`,
        title,
        status,
        detail,
        instance: location,
        profile: MAP_PROFILE,
        requestId: request.requestId,
        interactionId: request.interactionId,
        code,
        ...(target ? { target } : {}),
      },
    };
  }
}

export interface TrustedService {
  serviceId: string;
  executionOrigins: string[];
}

/** Email content never establishes trust in an action endpoint by itself. */
export function assertTrustedExecution(description: MapDescription, trusted: TrustedService) {
  if (description.service.id !== trusted.serviceId)
    throw new Error('The message names an unconfigured service identity.');
  const origin = new URL(description.service.execution.url).origin;
  if (!trusted.executionOrigins.includes(origin))
    throw new Error('The action endpoint is outside the configured service origins.');
  if (description.profile !== MAP_PROFILE) throw new Error('The MAP profile is not supported.');
}
