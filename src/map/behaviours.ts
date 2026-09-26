import {
  reached,
  sha256,
  type ContractOperation,
  type JsonObject,
  type Authority,
} from './artifacts.ts';
import type { InputError, MapDescription, MapRequest } from './reference.ts';

/**
 * The only type-specific code in the reference implementation. Everything a
 * contract can express is generic; these cover service state and the rules a
 * JSON Schema cannot state.
 */
export interface ServiceBehaviour {
  /** Reject a description the service must not issue. */
  describe?(description: MapDescription): void;
  /** Type rules on a description, for the service that issues it and the client that receives it. */
  descriptionProblems?(description: MapDescription): string[];
  /** Input rules beyond the schemas, as JSON Pointers into the request input. */
  check?(request: MapRequest, description: MapDescription, now: Date): InputError[];
  /** The outcome of a permitted effect; undefined when the contract's constants determine it. */
  perform?(
    request: MapRequest,
    description: MapDescription,
    now: Date,
  ): { output: JsonObject } | { reason: string } | undefined;
  /** Meeting Scheduling: whether a time is still free. */
  isAvailable?(slot: string): boolean;
}

const type = (slug: string) => `https://mailschema.org/types/${slug}`;

/** Calendar types use the iCalendar SEQUENCE as the target revision. */
const sequenceRevision: ServiceBehaviour = {
  describe(description) {
    if (!/^(?:0|[1-9][0-9]{0,9})$/.test(description.target.revision))
      throw new Error('The target revision must be the iCalendar SEQUENCE.');
  },
};

type Slot = { id: string; start: string; end: string };

function meetingScheduling(): ServiceBehaviour {
  const taken = new Set<string>();
  return {
    isAvailable: (slot) => !taken.has(slot),
    descriptionProblems(description) {
      const slots = (description.details?.slots ?? []) as Slot[];
      const ids = slots.map((slot) => slot.id);
      return [
        ...(new Set(ids).size === ids.length ? [] : ['A slot identifier repeats.']),
        ...slots
          .filter((slot) => !(Date.parse(slot.start) < Date.parse(slot.end)))
          .map((slot) => `Slot ${slot.id} does not end after it starts.`),
      ];
    },
    check(request, description) {
      if (request.operation !== 'book') return [];
      const offered = (description.details?.slots as Slot[]).some(
        (slot) => slot.id === request.input.slot,
      );
      return offered ? [] : [{ detail: 'The time was not offered.', pointer: '/slot' }];
    },
    perform(request, description) {
      if (request.operation !== 'book') return undefined;
      const slot = (description.details!.slots as Slot[]).find(
        (candidate) => candidate.id === request.input.slot,
      )!;
      if (!this.isAvailable!(slot.id)) return { reason: 'unavailable' };
      taken.add(slot.id);
      const host = new URL(description.service.id).hostname;
      return {
        output: {
          uid: `${slot.id}.${description['@id'].slice(9)}@${host}`,
          start: slot.start,
          end: slot.end,
        },
      };
    },
  };
}

const behaviours: Record<string, () => ServiceBehaviour> = {
  [type('content-review')]: () => ({
    perform(request) {
      if (request.operation !== 'request-changes') return undefined;
      return {
        output: {
          feedbackRecorded: true,
          feedbackId: `feedback-${sha256(request.requestId).slice(0, 16)}`,
        },
      };
    },
  }),
  [type('event-response')]: () => sequenceRevision,
  [type('task-assignment')]: () => sequenceRevision,
  [type('meeting-scheduling')]: meetingScheduling,
  [type('subscription-preferences')]: () => ({
    perform: (_request, _description, now) => ({ output: { effectiveAt: now.toISOString() } }),
  }),
  [type('payment-request')]: () => ({
    check(request, description) {
      if (request.operation !== 'accept') return [];
      return String(request.input.paymentDate) > String(description.details?.dueDate)
        ? [{ detail: 'The payment date is after the due date.', pointer: '/paymentDate' }]
        : [];
    },
    perform(request) {
      if (request.operation !== 'accept') return undefined;
      return { output: { decision: 'accepted', paymentDate: request.input.paymentDate } };
    },
  }),
};

export function serviceBehaviour(typeId: string): ServiceBehaviour {
  return behaviours[typeId]?.() ?? {};
}

const NEUTRAL = ['refusal', 'protection', 'record'];

/**
 * Core client rule. Under possession authority, an operation that discloses,
 * commits, authorizes or asserts needs a prior relationship with the sending
 * organization or the principal's decision; and a client without the type's own
 * rule never asserts on the principal's behalf.
 */
export function needsPrincipalDecision(
  operation: ContractOperation,
  authority: Authority,
  { priorRelationship = false, typeRule = false } = {},
) {
  if (operation.consequences.includes('assertion') && !typeRule) return true;
  return (
    authority === 'possession' &&
    !priorRelationship &&
    operation.consequences.some((consequence) => !NEUTRAL.includes(consequence))
  );
}

export interface RecordedConfirmation {
  origin: string;
  address: string;
  purpose: string;
  recordedAt: string;
  /** The address was created for this one request, such as a per-request subaddress. */
  uniqueAddress: boolean;
}

/**
 * Email Confirmation client rule: confirm automatically only on exactly one
 * matching request the client recorded before the message was sent.
 */
export function mayConfirmEmail(
  description: MapDescription,
  records: RecordedConfirmation[],
  {
    messageDate,
    fromOrganizationalDomain,
    now,
    otpToken = false,
  }: { messageDate: Date; fromOrganizationalDomain: string; now: Date; otpToken?: boolean },
) {
  // A message that carries a code offers the code, never confirmation as well.
  if (otpToken) return false;
  const details = description.details as { origin: string; address: string; purpose: string };
  const host = new URL(details.origin).hostname;
  if (host !== fromOrganizationalDomain && !host.endsWith(`.${fromOrganizationalDomain}`))
    return false;
  if (reached(now, description.expiresAt)) return false;
  const matches = records.filter(
    (record) =>
      record.origin === details.origin &&
      record.address === details.address &&
      record.purpose === details.purpose &&
      new Date(record.recordedAt) < messageDate,
  );
  if (matches.length !== 1) return false;
  return !['sign-in', 'address-change'].includes(details.purpose) || matches[0].uniqueAddress;
}

export interface RecordedActivity {
  eventType?: string;
  at: string;
  ip?: string;
}

/** Account Activity client rule: confirm only one recorded activity that matches. */
export function mayConfirmActivity(
  description: MapDescription,
  records: RecordedActivity[],
  { windowSeconds = 300 } = {},
) {
  const details = description.details as {
    eventType?: string;
    occurredAt: string;
    observedFrom?: { ip?: string };
  };
  // Without an event type there is nothing to match a recorded activity against.
  if (!details.eventType) return false;
  const occurred = new Date(details.occurredAt).getTime();
  const matches = records.filter(
    (record) =>
      record.eventType === details.eventType &&
      Math.abs(new Date(record.at).getTime() - occurred) <= windowSeconds * 1000 &&
      (!details.observedFrom?.ip || record.ip === details.observedFrom.ip),
  );
  return matches.length === 1;
}

/** Action Approval client rule: never approve terms of a kind the client does not understand. */
export function mayApproveAutomatically(description: MapDescription, understoodTypes: string[]) {
  const terms = (description.details?.authorizationDetails ?? []) as { type: string }[];
  return terms.every((term) => understoodTypes.includes(term.type));
}

/**
 * Account Activity client rule: a report is sent only on the principal's statement,
 * because it can end the principal's own sessions. A client never reports by itself.
 */
export const mayReportActivity = () => false;

export interface PayeeOnRecord {
  creditorName: string;
  creditorAccount: { iban?: string; identification?: string };
}

/**
 * Payment Request client rule: never accept automatically unless the payee and its
 * exact account are already on record. A changed account goes to a person.
 */
export function mayAcceptPayment(description: MapDescription, payees: PayeeOnRecord[]) {
  const details = description.details as unknown as PayeeOnRecord;
  return payees.some(
    (payee) =>
      payee.creditorName === details.creditorName &&
      payee.creditorAccount.iban === details.creditorAccount.iban &&
      payee.creditorAccount.identification === details.creditorAccount.identification,
  );
}
