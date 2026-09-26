import { createPublicKey } from 'node:crypto';
import { domainToASCII } from 'node:url';
import { simpleParser } from 'mailparser';
import { dkimVerify } from 'mailauth/lib/dkim/verify.js';
import { parseHeaders } from 'mailauth/lib/tools.js';
import { MAP_PROFILE, parseMapBytes, sha256, type JsonObject } from './artifacts.ts';
import type { MapDescription } from './reference.ts';

/** Resolves DNS TXT records as `dns.promises.resolveTxt` does. */
export type TxtResolver = (name: string) => Promise<string[][]>;

type Header = { name: string; value: string };
type Part = { headers: Header[]; body: Buffer };

export interface DeliveredMessage {
  description: MapDescription;
  from: { address: string; domain: string };
  recipients: string[];
  date: Date;
  /** Every header, by lowercase name, in message order. */
  headers: Map<string, string[]>;
  /** Every text/calendar part, decoded, at any depth outside an attached message. */
  calendarParts: Buffer[];
}

/** Headers a message may carry at most once; DKIM signs only one instance of each. */
const SINGLETONS = [
  'from',
  'to',
  'cc',
  'date',
  'message-id',
  'subject',
  'content-type',
  'mime-version',
  'list-id',
  'otp-token',
];
const lower = (value: string) => value.trim().toLowerCase();
const ascii = (domain: string) => domainToASCII(lower(domain).replace(/\.$/, ''));

/**
 * Split an entity at the first empty line, as mailauth's DKIM verifier does, and read
 * its header fields with the parser that verifier uses, so every header decides
 * structure under the same reading it was signed under. That parser appends any
 * line that does not start a field to the field above; such a field is refused.
 */
function splitEntity(bytes: Buffer): Part {
  const text = bytes.toString('latin1');
  const match = /\r?\n\r?\n/.exec(text);
  const block = Buffer.from(match ? text.slice(0, match.index) : text, 'latin1');
  const body = match ? bytes.subarray(match.index + match[0].length) : Buffer.alloc(0);
  const headers = parseHeaders(block).parsed.map(({ line }) => {
    // Field names are printable ASCII without ":"; RFC 5322 obsolete syntax allows space before it.
    const field = /^([!-9;-~]+)[ \t]*:((?:[^\r\n]|\r?\n[ \t])*)$/.exec(line.toString('latin1'));
    if (!field) throw new Error('The message has a malformed header.');
    return { name: field[1].toLowerCase(), value: field[2].replace(/\r?\n[ \t]/g, ' ').trim() };
  });
  return { headers, body };
}

// RFC 5234 string literals are case-insensitive.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * An RFC 5322 section 3.3 date-time, read strictly: no obsolete forms, a numeric zone,
 * a year from 1900, and only spaces and tabs between parts. A value that is not one is
 * refused rather than replaced, since type rules compare it with recorded requests.
 */
function messageDate(value: string | undefined): Date | undefined {
  const match =
    /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),[ \t]*)?([0-9]{1,2})[ \t]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[ \t]+([0-9]{4,})[ \t]+([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?[ \t]+([+-])([0-9]{2})([0-9]{2})(?:[ \t]*\([^()]*\))?$/i.exec(
      value?.replace(/^[ \t]+|[ \t]+$/g, '') ?? '',
    );
  if (!match) return undefined;
  const [
    ,
    weekday,
    day,
    monthName,
    year,
    hour,
    minute,
    second = '0',
    sign,
    zoneHours,
    zoneMinutes,
  ] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (Number(year) < 1900 || Number(zoneMinutes) > 59) return undefined;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 60) return undefined;
  const offset = (sign === '-' ? -1 : 1) * (Number(zoneHours) * 60 + Number(zoneMinutes));
  const local = Date.UTC(
    Number(year),
    month,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const calendar = new Date(Date.UTC(Number(year), month, Number(day)));
  if (calendar.getUTCMonth() !== month || calendar.getUTCDate() !== Number(day)) return undefined;
  if (weekday && DAYS.indexOf(weekday.toLowerCase()) !== calendar.getUTCDay()) return undefined;
  return new Date(local - offset * 60_000);
}

const header = (part: Part, name: string) =>
  part.headers.find((entry) => entry.name === name)?.value;

function contentType(part: Part) {
  const value = header(part, 'content-type') ?? 'text/plain';
  const [type, ...parameters] = value.split(';');
  const params = Object.fromEntries(
    parameters
      .map((parameter) => /^\s*([^=\s]+)\s*=\s*"?([^"]*)"?\s*$/.exec(parameter))
      .filter((match): match is RegExpExecArray => Boolean(match))
      .map((match) => [match[1].toLowerCase(), match[2]]),
  );
  return { type: lower(type), params };
}

function children(part: Part): Part[] {
  const { params } = contentType(part);
  if (!params.boundary) throw new Error('The multipart body has no boundary.');
  const delimiter = `--${params.boundary}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const segments = part.body.toString('latin1').split(new RegExp(`(?:^|\\r?\\n)${delimiter}`));
  const closing = segments.findIndex((segment, index) => index > 0 && segment.startsWith('--'));
  if (closing < 1) throw new Error('The multipart body is not closed.');
  return segments
    .slice(1, closing)
    .map((segment) => splitEntity(Buffer.from(segment.replace(/^[ \t]*\r?\n/, ''), 'latin1')));
}

/** Every part of an entity with its parent, at any depth, never entering an attached message. */
function descendants(entity: Part): { part: Part; parent: Part }[] {
  return contentType(entity).type.startsWith('multipart/')
    ? children(entity).flatMap((part) => [{ part, parent: entity }, ...descendants(part)])
    : [];
}

/** A Structured Email part designated machine-readable and labelled with the MAP profile. */
function isMapPart(part: Part) {
  const { type, params } = contentType(part);
  return (
    type === 'application/ld+json' &&
    lower(header(part, 'content-purpose') ?? '') === 'machine-readable' &&
    (params.profile ?? '').split(/[ \t]+/).includes(MAP_PROFILE)
  );
}

const isReadable = (part: Part) =>
  /^(?:multipart\/alternative|text\/(?:plain|html))$/.test(contentType(part).type);

function decoded(part: Part): Buffer {
  const encoding = lower(header(part, 'content-transfer-encoding') ?? '7bit');
  if (encoding === 'base64')
    return Buffer.from(part.body.toString('latin1').replace(/\s+/g, ''), 'base64');
  if (encoding === 'quoted-printable')
    return Buffer.from(
      part.body
        .toString('latin1')
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))),
      'latin1',
    );
  return part.body;
}

/**
 * An address as MAP compares it: ASCII letters in lowercase and every other character of
 * the local part exactly, since RFC 6531 defines no folding for it, with the domain as A-labels.
 */
function comparableAddress(address: string) {
  const at = address.lastIndexOf('@');
  const local = (at < 0 ? address : address.slice(0, at))
    .trim()
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
  return at < 0 ? local : `${local}@${ascii(address.slice(at + 1))}`;
}

function addresses(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.flatMap((entry) =>
    ((entry as { value?: { address?: string; group?: unknown }[] }).value ?? []).flatMap((item) =>
      item.group
        ? addresses({ value: item.group })
        : item.address
          ? [comparableAddress(item.address)]
          : [],
    ),
  );
}

/**
 * Read the one MAP description of a delivered message: the designated part labelled
 * with the profile, at any depth outside an attached message, in a multipart/related
 * entity beside readable content. Every other structured part, including a description
 * labelled with another profile, is ignored.
 */
export async function readDeliveredMessage(raw: Buffer): Promise<DeliveredMessage> {
  const message = splitEntity(raw);
  const headers = new Map<string, string[]>();
  for (const { name, value } of message.headers)
    headers.set(name, [...(headers.get(name) ?? []), value]);
  for (const name of SINGLETONS)
    if ((headers.get(name)?.length ?? 0) > 1)
      throw new Error(`The message repeats the ${name} header.`);
  if (headers.get('from')?.length !== 1)
    throw new Error('The message must have exactly one From header.');

  const entities = descendants(message);
  const labelled = entities.filter(({ part }) => isMapPart(part));
  if (labelled.length === 0)
    throw new Error(`The message carries no MAP description labelled ${MAP_PROFILE}.`);
  if (labelled.length > 1)
    throw new Error(`The message carries more than one MAP description labelled ${MAP_PROFILE}.`);
  const [{ part, parent }] = labelled;
  if (contentType(parent).type !== 'multipart/related' || !children(parent).some(isReadable))
    throw new Error('The MAP part is not in a multipart/related entity with readable content.');
  if (
    !['base64', 'quoted-printable'].includes(lower(header(part, 'content-transfer-encoding') ?? ''))
  )
    throw new Error('The MAP part must use base64 or quoted-printable encoding.');
  const description = parseMapBytes(decoded(part)) as JsonObject;
  if (description['@type'] !== 'MailAction')
    throw new Error('The designated part is not a MAP description.');

  const email = await simpleParser(raw, {
    skipHtmlToText: true,
    skipTextToHtml: true,
    skipTextLinks: true,
  });
  const fromEntries = (email.from?.value ?? []) as { address?: string; group?: unknown }[];
  if (fromEntries.length !== 1 || fromEntries[0].group || !fromEntries[0].address)
    throw new Error('The From header must name exactly one mailbox.');
  const from = lower(fromEntries[0].address);
  const date = messageDate(headers.get('date')?.[0]);
  if (!date) throw new Error('The message has no valid Date.');
  return {
    description: description as unknown as MapDescription,
    from: { address: from, domain: ascii(from.split('@').pop()!) },
    recipients: [...addresses(email.to), ...addresses(email.cc)],
    date,
    headers,
    // The one calendar part a calendar type binds may sit anywhere in the message, as
    // iMIP places it inside multipart/alternative, but never in an attached message.
    calendarParts: entities
      .map(({ part: entity }) => entity)
      .filter((entity) => contentType(entity).type === 'text/calendar')
      .map(decoded),
  };
}

type DmarcRecord = { domain: string; psd?: 'y' | 'n'; adkim: 'r' | 's' };
const ABSENT = new Set(['ENOTFOUND', 'ENODATA']);

async function dmarcRecord(
  domain: string,
  resolveTxt: TxtResolver,
): Promise<DmarcRecord | undefined> {
  let records: string[];
  try {
    records = (await resolveTxt(`_dmarc.${domain}`)).map((chunks) => chunks.join(''));
  } catch (error) {
    // Only a definite absence counts as no record; any other DNS failure fails closed.
    if (ABSENT.has((error as { code?: string }).code ?? '')) return undefined;
    throw new Error(`DMARC lookup for ${domain} failed.`, { cause: error });
  }
  // RFC 9989: the tag name is case-insensitive, its value exactly DMARC1.
  const valid = records.filter((record) => /^[Vv][ \t]*=[ \t]*DMARC1[ \t]*(?:;|$)/.test(record));
  if (valid.length !== 1) return undefined;
  const tags = Object.fromEntries(
    valid[0]
      .split(';')
      .map((tag) => tag.split('=').map((part) => part.trim()))
      .filter(([name, value]) => name && value !== undefined)
      .map(([name, value]) => [name.toLowerCase(), value.toLowerCase()]),
  );
  return {
    domain,
    psd: tags.psd === 'y' || tags.psd === 'n' ? tags.psd : undefined,
    adkim: tags.adkim === 's' ? 's' : 'r',
  };
}

/** The DNS Tree Walk of RFC 9989, section 4.10, and its Organizational Domain selection. */
export async function organizationalDomain(domain: string, resolveTxt: TxtResolver) {
  const start = ascii(domain);
  const labels = start.split('.');
  const targets = [start];
  let next = labels.length >= 8 ? labels.slice(-7) : labels.slice(1);
  while (next.length) {
    targets.push(next.join('.'));
    next = next.slice(1);
  }
  const found: DmarcRecord[] = [];
  for (const target of targets) {
    const record = await dmarcRecord(target, resolveTxt);
    if (!record) continue;
    found.push(record);
    if (record.psd) break;
  }
  let organization = found.at(-1)?.domain ?? start;
  for (const record of found) {
    if (record.psd === 'n') {
      organization = record.domain;
      break;
    }
    if (record.psd === 'y' && record.domain !== start) {
      organization = start
        .split('.')
        .slice(-(record.domain.split('.').length + 1))
        .join('.');
      break;
    }
  }
  // The policy applied is the author domain's own record, else its organizational domain's.
  const policy =
    found.find((record) => record.domain === start) ??
    found.find((record) => record.domain === organization);
  return { organizationalDomain: organization, policy };
}

const within = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
const REQUIRED_SIGNED = ['from', 'to', 'date', 'message-id', 'content-type', 'mime-version'];
const ALGORITHMS: Record<string, string> = { 'rsa-sha256': 'rsa', 'ed25519-sha256': 'ed25519' };

async function signatureProblem(
  result: JsonObject,
  status: { result?: string },
  message: DeliveredMessage,
  author: { organizationalDomain: string; policy?: DmarcRecord },
  required: string[],
  resolveTxt: TxtResolver,
): Promise<string | undefined> {
  if (status.result === 'none') return 'the message is not signed';
  if (status.result !== 'pass') return `a signature did not verify (${status.result})`;
  if (result.canonBodyLengthLimited) return 'a signature limits the signed body length';
  if (result.signatureTimeValid === false)
    return 'a signature is dated in the future or has expired';
  const family = ALGORITHMS[String(result.algo)];
  if (!family) return `${String(result.algo)} is not an accepted algorithm`;
  const signingDomain = ascii(String(result.signingDomain));
  // The key mailauth verified the signature with, so its real type and length decide.
  const key = createPublicKey(String(result.publicKey));
  const bits = key.asymmetricKeyDetails?.modulusLength ?? 0;
  if (key.asymmetricKeyType !== family)
    return `the ${String(result.algo)} signature uses a ${key.asymmetricKeyType} key`;
  if (family === 'rsa' && bits < 2048) return `the RSA key has ${bits} bits`;
  const aligned =
    author.policy!.adkim === 's'
      ? signingDomain === message.from.domain
      : (await organizationalDomain(signingDomain, resolveTxt)).organizationalDomain ===
        author.organizationalDomain;
  if (!aligned) return `${signingDomain} is not aligned with the From domain`;
  const keys = String((result.signingHeaders as { keys?: string }).keys ?? '')
    .split(':')
    .map(lower)
    .filter(Boolean);
  const unsigned = required.filter((name) => !keys.includes(name));
  if (unsigned.length) return `the signature does not cover ${unsigned.join(', ')}`;
  // DKIM signs one instance of each header; another instance is unsigned.
  const repeated = [...new Set(keys)].filter(
    (name) => (message.headers.get(name)?.length ?? 0) > 1,
  );
  if (repeated.length) return `the message repeats the signed ${repeated.join(', ')} header`;
  return undefined;
}

/**
 * Possession mode: establish that the message is authentic for the sending
 * organization, that it was addressed to the principal, and that every endpoint
 * belongs to that organization. Throws when any rule fails.
 */
export async function assertTrustedPossession(
  raw: Buffer,
  message: DeliveredMessage,
  {
    resolveTxt,
    principalAddresses,
    now = new Date(),
  }: { resolveTxt: TxtResolver; principalAddresses: string[]; now?: Date },
) {
  const { description } = message;
  if (description.service.authority !== 'possession')
    throw new Error('The interaction is not possession mode.');
  const author = await organizationalDomain(message.from.domain, resolveTxt);
  if (!author.policy) throw new Error('The author domain publishes no DMARC policy.');
  if (!author.organizationalDomain.includes('.'))
    throw new Error('The organizational domain is a top-level domain.');

  const resolver = async (name: string, type: string) => {
    if (type !== 'TXT') throw Object.assign(new Error('unsupported'), { code: 'ENOTFOUND' });
    return resolveTxt(name);
  };
  const { results } = await dkimVerify(raw, { resolver, minBitLength: 2048, curTime: now });
  const required = [
    ...REQUIRED_SIGNED,
    ...['cc', 'list-id', 'otp-token'].filter((name) => message.headers.has(name)),
  ];
  // One signature must meet every rule; each that does not records why.
  const reasons: string[] = [];
  let trusted = false;
  for (const result of results as unknown as JsonObject[]) {
    const status = result.status as { result?: string };
    const why = await signatureProblem(result, status, message, author, required, resolveTxt);
    if (!why) {
      trusted = true;
      break;
    }
    reasons.push(why);
  }
  if (!trusted)
    throw new Error(
      `No DKIM signature meets the possession rules: ${reasons.join('; ') || 'the message is not signed'}.`,
    );

  const organization = author.organizationalDomain;
  for (const [label, url] of [
    ['service', description.service.id],
    ['action endpoint', description.service.execution.url],
    [
      'result endpoint',
      description.service.execution.resultUrlTemplate.replace('{requestId}', 'x'),
    ],
    ['human route', description.service.humanUrl],
  ] as const) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new Error(`The ${label} must be a plain HTTPS URL.`);
    if (!within(ascii(parsed.hostname), organization))
      throw new Error(`The ${label} is outside ${organization}.`);
  }
  // Every address compares with its domain as A-labels, as the message's recipients do.
  const recipient = comparableAddress(description.recipient ?? '');
  if (!principalAddresses.map(comparableAddress).includes(recipient))
    throw new Error('The capability was issued to an address the principal does not control.');
  if (!message.recipients.includes(recipient))
    throw new Error('The capability was issued to an address this message was not sent to.');
  return { authorDomain: message.from.domain, organizationalDomain: organization };
}

type CalendarComponent = {
  name: string;
  properties: { name: string; params: string; value: string }[];
};

function calendarComponents(bytes: Buffer) {
  const lines = bytes
    .toString('utf8')
    .replace(/\r?\n[ \t]/g, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const stack: CalendarComponent[] = [];
  const done: CalendarComponent[] = [];
  for (const line of lines) {
    const match = /^([A-Za-z0-9-]+)((?:;[^:]*)?):(.*)$/.exec(line);
    if (!match) throw new Error('The iCalendar part has a malformed line.');
    const [, name, params, value] = match;
    if (name.toUpperCase() === 'BEGIN') stack.push({ name: value.toUpperCase(), properties: [] });
    else if (name.toUpperCase() === 'END') {
      const closed = stack.pop();
      if (!closed || closed.name !== value.toUpperCase())
        throw new Error('The iCalendar part has unbalanced components.');
      done.push(closed);
    } else
      stack
        .at(-1)
        ?.properties.push({ name: name.toUpperCase(), params: params.toUpperCase(), value });
  }
  if (stack.length) throw new Error('The iCalendar part has unbalanced components.');
  return done;
}

/**
 * Calendar types: the target digest binds the one iCalendar part the message
 * carries. Its REQUEST names the component, occurrence, SEQUENCE and attendee the
 * description names.
 */
export function assertCalendarBinding(
  message: DeliveredMessage,
  {
    component,
    uid,
    recurrenceId,
    attendee,
  }: { component: 'VEVENT' | 'VTODO'; uid: string; recurrenceId?: string; attendee?: string },
) {
  const { target } = message.description;
  if (message.calendarParts.length !== 1)
    throw new Error('The message must carry exactly one iCalendar part.');
  const [part] = message.calendarParts;
  if (`sha-256:${sha256(part)}` !== target.digest)
    throw new Error('The iCalendar part does not match the target digest.');
  const components = calendarComponents(part);
  const property = (item: CalendarComponent, name: string) =>
    item.properties.find((entry) => entry.name === name);
  const calendar = components.find((candidate) => candidate.name === 'VCALENDAR');
  if (!calendar || property(calendar, 'METHOD')?.value.toUpperCase() !== 'REQUEST')
    throw new Error('The iCalendar part is not a REQUEST.');
  const matches = components.filter(
    (item) =>
      item.name === component &&
      property(item, 'UID')?.value === uid &&
      property(item, 'RECURRENCE-ID')?.value === recurrenceId,
  );
  if (matches.length !== 1)
    throw new Error('The iCalendar part does not contain exactly the described component.');
  const [match] = matches;
  if (property(match, 'RECURRENCE-ID')?.params.includes('RANGE='))
    throw new Error('A range of occurrences is not a target.');
  if ((property(match, 'SEQUENCE')?.value ?? '0') !== target.revision)
    throw new Error('The iCalendar SEQUENCE differs from the target revision.');
  if (
    attendee &&
    !match.properties.some(
      (entry) => entry.name === 'ATTENDEE' && lower(entry.value) === lower(attendee),
    )
  )
    throw new Error('The iCalendar part does not invite the described attendee.');
}

/** Subscription Preferences: the details name the list the message's List-Id header identifies. */
export function assertListIdentity(message: DeliveredMessage) {
  const listId = message.description.details?.listId;
  if (listId === undefined) return;
  const value = message.headers.get('list-id')?.[0] ?? '';
  const identifier = /<([^>]+)>\s*$/.exec(value)?.[1] ?? value.trim();
  if (identifier !== listId)
    throw new Error('The details name a different list from the List-Id header.');
}
