// Building MAP results and problems, and the lifecycle rules every service applies.
import { MAP_PROFILE, problemErrors, reached, resultErrors } from './artifacts.ts';
import { problemMembers, withinDocument } from './limits.ts';
import type {
  InputError,
  JsonObject,
  MapDescription,
  MapProblem,
  MapRequest,
  MapResult,
  ResultState,
  Target,
} from './types.ts';

/** The HTTP status of every MAP problem code, as the core schema fixes it. */
export const PROBLEM_STATUS = {
  'invalid-request': 400,
  'authentication-required': 401,
  refused: 403,
  'result-not-found': 404,
  'stale-target': 409,
  'idempotency-conflict': 409,
  'request-in-progress': 409,
  'already-decided': 409,
  'expired-interaction': 410,
  'unsupported-type': 422,
  'unsupported-operation': 422,
} as const;
export type ProblemCode = keyof typeof PROBLEM_STATUS;

const PROBLEM_TYPES = 'https://mailschema.org/problems/';
const NON_TERMINAL: readonly ResultState[] = ['pending', 'approval-required'];

/** The document, once the core definition `check` names accepts it. */
function built<T>(document: JsonObject, check: (value: unknown) => string[]): T {
  const refused = check(document);
  if (refused.length)
    throw new TypeError(`The core refuses this document: ${refused.slice(0, 3).join('; ')}`);
  return document as T;
}

const defined = (document: JsonObject) =>
  Object.fromEntries(Object.entries(document).filter(([, value]) => value !== undefined));

/** A result with its members in one order, whichever builder made it, checked by the core. */
const resultDocument = (members: Omit<MapResult, 'kind' | 'profile'>): MapResult =>
  built(
    defined({
      kind: 'MapResult',
      profile: MAP_PROFILE,
      requestId: members.requestId,
      interactionId: members.interactionId,
      descriptionDigest: members.descriptionDigest,
      type: members.type,
      operation: members.operation,
      state: members.state,
      target: members.target,
      recordedAt: members.recordedAt,
      resultUrl: members.resultUrl,
      actor: members.actor,
      approvalUrl: members.approvalUrl,
      reason: members.reason,
      output: members.output,
    }),
    resultErrors,
  );

/**
 * A result for a request, with every correlation member. `approvalUrl` is given exactly for
 * approval-required and `reason` exactly for failed. Like every builder here, it throws
 * rather than return a document the core refuses.
 */
export function result(
  request: MapRequest,
  {
    state,
    target,
    resultUrl,
    recordedAt,
    output = {},
    reason,
    approvalUrl,
    actor,
  }: {
    state: ResultState;
    target: Target;
    resultUrl: string;
    recordedAt: Date;
    output?: JsonObject;
    reason?: string;
    approvalUrl?: string;
    actor?: string;
  },
): MapResult {
  if ((state === 'approval-required') !== (approvalUrl !== undefined))
    throw new TypeError('approvalUrl is given exactly when the state is approval-required.');
  if ((state === 'failed') !== (reason !== undefined))
    throw new TypeError('reason is given exactly when the state is failed.');
  return resultDocument({
    requestId: request.requestId,
    interactionId: request.interactionId,
    descriptionDigest: request.descriptionDigest,
    type: request.type,
    operation: request.operation,
    state,
    target,
    recordedAt: recordedAt.toISOString(),
    resultUrl,
    actor,
    approvalUrl,
    reason,
    output,
  });
}

/**
 * The next state of a pending or approval-required result. Every correlation member and the
 * actor stay; the state, reason, output and recording time change.
 */
export function transition(
  previous: MapResult,
  {
    state,
    recordedAt,
    reason,
    output = {},
  }: { state: ResultState; recordedAt: Date; reason?: string; output?: JsonObject },
): MapResult {
  if (!NON_TERMINAL.includes(previous.state))
    throw new TypeError(`A ${previous.state} result is terminal.`);
  if (NON_TERMINAL.includes(state)) throw new TypeError('A transition ends pending work.');
  if ((state === 'failed') !== (reason !== undefined))
    throw new TypeError('reason is given exactly when the state is failed.');
  return resultDocument({
    ...previous,
    approvalUrl: undefined,
    state,
    reason,
    output,
    recordedAt: recordedAt.toISOString(),
  });
}

/**
 * A problem. With `requestId` it is correlated and carries `instance`, `profile`,
 * `requestId`, `interactionId` and `code`; without, it is plain RFC 9457. It stays within
 * the core limits: a long detail is cut, each input error is bounded, and only as many of
 * the first 100 errors as fit within 64 KiB are kept.
 */
export function problem(
  code: ProblemCode,
  {
    title,
    detail,
    requestId,
    interactionId,
    resultUrl,
    target,
    errors,
  }: {
    title: string;
    detail: string;
    requestId?: string;
    interactionId?: string;
    resultUrl?: string;
    target?: Target;
    errors?: InputError[];
  },
): MapProblem {
  const members = problemMembers(title, detail, errors);
  if (interactionId && !requestId)
    throw new TypeError('An interaction is named only with its request.');
  if (requestId && code === 'authentication-required')
    throw new TypeError('authentication-required is never correlated.');
  if (members.errors && !(requestId && code === 'invalid-request'))
    throw new TypeError('Errors belong to a correlated invalid-request.');
  let correlation: JsonObject = {};
  if (requestId) {
    if (!resultUrl) throw new TypeError('A correlated problem names its result URL.');
    if (!interactionId && code !== 'result-not-found')
      throw new TypeError('A correlated problem names its interaction.');
    if (code === 'stale-target' && !target)
      throw new TypeError('A stale-target problem carries the current target.');
    correlation = { instance: resultUrl, profile: MAP_PROFILE, requestId, interactionId, code };
  }
  return built(
    withinDocument(
      defined({
        type: `${PROBLEM_TYPES}${code}`,
        title: members.title,
        status: PROBLEM_STATUS[code],
        detail: members.detail,
        ...correlation,
        target,
        errors: members.errors,
      }),
    ),
    problemErrors,
  );
}

/** The HTTP status of a result: 202 while work is pending, otherwise 200. */
export const resultStatus = (document: MapResult) =>
  NON_TERMINAL.includes(document.state) ? 202 : 200;

/**
 * Results stay retrievable until the later of the interaction's expiry and the retention
 * interval measured from the latest recorded state.
 */
export const retainUntil = (description: MapDescription, recordedAt: Date) =>
  new Date(
    Math.max(
      Date.parse(description.expiresAt),
      recordedAt.getTime() + description.service.execution.resultRetentionSeconds * 1000,
    ),
  );

/**
 * An undecided approval ends as failed, with reason expired, at the interaction's expiry,
 * whether or not anyone looks. The settled result, or undefined when nothing changes.
 */
export function settle(document: MapResult, description: MapDescription, now: Date) {
  if (document.state !== 'approval-required' || !reached(now, description.expiresAt)) return;
  return transition(document, {
    state: 'failed',
    reason: 'expired',
    recordedAt: new Date(description.expiresAt),
  });
}
