// Writes public/fixtures/map-0.2 from conformance/map-0.2/examples.mjs.
// `--check` regenerates in memory and fails if any committed file differs.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { createHash, createPublicKey, generateKeyPairSync, sign as signBytes } from 'node:crypto';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalize from 'canonicalize';
import { dkimSign } from 'mailauth/lib/dkim/sign.js';
import { dkimVerify } from 'mailauth/lib/dkim/verify.js';
import { ReferenceMapService, descriptionDigest, isJsonRequest } from '../src/map/reference.ts';
import {
  CORE_SCHEMA,
  FORMS_SCHEMA,
  MAP_PROFILE,
  canonicalDigest,
  parseMapBytes,
} from '../src/map/artifacts.ts';
import { mapArtifacts } from '../src/map/reference.ts';
import { clock, describedAt, digestOf } from '../conformance/map-0.2/examples.mjs';
import { contextOf, describe, example, examples, request } from '../conformance/map-0.2/build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public/fixtures/map-0.2');
const keyDirectory = resolve(root, 'conformance/map-0.2/keys');
const check = process.argv.includes('--check');
const files = new Map();
const put = (path, content) => files.set(path, content);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

// Test keys are published test material: they sign fixtures and nothing else.
const keySpecs = {
  'example.com': 2048,
  'example.net': 2048,
  'examp1e.com': 2048,
  'weak.example.com': 1024,
};
function keyFor(name) {
  const path = resolve(keyDirectory, `${name}.pem`);
  if (!existsSync(path)) {
    if (check) throw new Error(`Missing test key ${name}; run npm run fixtures`);
    mkdirSync(keyDirectory, { recursive: true });
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: keySpecs[name] });
    writeFileSync(path, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  }
  return readFileSync(path, 'utf8');
}
const selector = 'map2026';
const dns = {};
for (const name of Object.keys(keySpecs)) {
  const spki = createPublicKey(keyFor(name))
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
  const signingDomain = name === 'weak.example.com' ? 'example.com' : name;
  const keySelector = name === 'weak.example.com' ? 'weak2026' : selector;
  dns[`${keySelector}._domainkey.${signingDomain}`] = [[`v=DKIM1; k=rsa; p=${spki}`]];
}
for (const domain of ['example.com', 'example.net', 'examp1e.com'])
  dns[`_dmarc.${domain}`] = [['v=DMARC1; p=reject; rua=mailto:dmarc@' + domain]];
put(
  'dns.json',
  json(Object.fromEntries(Object.entries(dns).sort(([a], [b]) => a.localeCompare(b)))),
);

// Documents for every type: the description, a request and result per operation.
for (const entry of examples) {
  const description = describe(entry);
  put(`${entry.slug}/description.json`, json(description));
  if (entry.calendar)
    put(
      `${entry.slug}/${entry.slug === 'task-assignment' ? 'assignment' : 'invitation'}.ics`,
      entry.calendar,
    );
  entry.operations.forEach(({ id }) => {
    const service = new ReferenceMapService(description, { now: clock });
    const body = request(entry, id);
    put(`${entry.slug}/${id}.request.json`, json(body));
    put(`${entry.slug}/${id}.result.json`, json(service.submit(body, contextOf(entry)).body));
  });
}

// The approval lifecycle, shared by every type that declares it.
for (const slug of ['content-review', 'action-approval']) {
  const entry = example(slug);
  const service = new ReferenceMapService(describe(entry), {
    now: clock,
    requireApproval: () => true,
  });
  const body = request(entry, 'approve');
  put(`${slug}/approve.approval-required.json`, json(service.submit(body, contextOf(entry)).body));
  put(
    `${slug}/approve.declined.json`,
    json(service.decideApproval(body.requestId, contextOf(entry), 'decline').body),
  );
}

// Problems and type-declared failures.
{
  const entry = example('content-review');
  const description = describe(entry);
  const current = {
    ...description.target,
    revision: '5',
    digest: digestOf('campaign-42/revision-5'),
  };
  const service = new ReferenceMapService(description, {
    now: clock,
    currentTarget: () => current,
  });
  put(
    'content-review/stale-target.problem.json',
    json(service.submit(request(entry, 'approve'), contextOf(entry)).body),
  );
}
{
  const entry = example('meeting-scheduling');
  const description = describe(entry);
  const taken = new ReferenceMapService(description, {
    now: clock,
    behaviour: { isAvailable: () => false },
  });
  put(
    'meeting-scheduling/book.unavailable.json',
    json(taken.submit(request(entry, 'book'), contextOf(entry)).body),
  );
  const decided = new ReferenceMapService(description, { now: clock });
  decided.submit(request(entry, 'book'), contextOf(entry));
  put(
    'meeting-scheduling/already-decided.problem.json',
    json(decided.submit(request(entry, 'decline', { n: 2 }), contextOf(entry)).body),
  );
}
{
  const entry = example('information-request');
  const service = new ReferenceMapService(describe(entry), { now: clock });
  const invalid = request(entry, 'submit-response', {
    input: { values: { supportEmail: 'not an address', website: 'https://acme.example' } },
  });
  put(
    'information-request/invalid-request.problem.json',
    json(service.submit(invalid, contextOf(entry)).body),
  );
}

// Messages. Boundaries, dates and signing times are fixed so signatures reproduce.
const base64 = (bytes) => Buffer.from(bytes).toString('base64').replace(/.{76}/g, '$&\r\n');
/**
 * A message whose MAP part, labelled with the profile, sits in a multipart/related partial
 * representation beside the readable text and any other structured parts. With
 * attachments, that entity is the first part of a multipart/mixed body.
 */
function message({
  from,
  to,
  subject,
  messageId,
  description,
  text,
  calendar,
  headers = [],
  structured = [],
  attachments = [],
}) {
  const parts = [
    '--map-readable',
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64(text),
    '--map-readable--',
  ];
  const related = [
    '--map-related',
    'Content-Type: multipart/alternative; boundary="map-readable"',
    '',
    ...parts,
    ...(calendar
      ? [
          '--map-related',
          'Content-Type: text/calendar; charset="utf-8"; method=REQUEST',
          'Content-Transfer-Encoding: base64',
          '',
          base64(calendar),
        ]
      : []),
    '--map-related',
    `Content-Type: application/ld+json; charset="utf-8"; profile="${MAP_PROFILE}"`,
    'Content-Purpose: Machine-readable',
    'Content-Disposition: inline',
    'Content-Transfer-Encoding: base64',
    '',
    base64(json(description)),
    ...structured.flatMap((value) => [
      '--map-related',
      'Content-Type: application/ld+json; charset="utf-8"',
      'Content-Purpose: Machine-readable',
      'Content-Transfer-Encoding: base64',
      '',
      base64(json(value)),
    ]),
    '--map-related--',
    '',
  ];
  const relatedType =
    'Content-Type: multipart/related; boundary="map-related"; type="multipart/alternative"';
  const body = attachments.length
    ? [
        'Content-Type: multipart/mixed; boundary="map-mixed"',
        '',
        '--map-mixed',
        relatedType,
        '',
        ...related,
        ...attachments.flatMap(({ type, filename, content }) => [
          '--map-mixed',
          `Content-Type: ${type}`,
          `Content-Disposition: attachment; filename="${filename}"`,
          'Content-Transfer-Encoding: base64',
          '',
          base64(content),
        ]),
        '--map-mixed--',
        '',
      ]
    : [relatedType, '', ...related];
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Date: Fri, 25 Sep 2026 08:00:00 +0000',
    `Message-ID: <${messageId}>`,
    ...headers,
    'MIME-Version: 1.0',
    ...body,
  ].join('\r\n');
}
async function sign(
  raw,
  key,
  {
    signingDomain,
    keySelector = selector,
    headerList,
    maxBodyLength,
    algorithm = 'rsa-sha256',
    signTime = describedAt,
  } = {},
) {
  const { signatures, errors } = await dkimSign(raw, {
    signTime: new Date(signTime),
    ...(headerList ? { headerList } : {}),
    signatureData: [
      {
        signingDomain,
        selector: keySelector,
        privateKey: keyFor(key),
        algorithm,
        canonicalization: 'relaxed/relaxed',
        ...(maxBodyLength !== undefined ? { maxBodyLength } : {}),
      },
    ],
  });
  if (errors?.length) throw new Error(errors.map((error) => error.message ?? error).join('; '));
  return `${signatures}${raw}`;
}
const bodyLength = (raw) => Buffer.byteLength(raw.slice(raw.indexOf('\r\n\r\n') + 4));

{
  const entry = example('content-review');
  put(
    'emails/content-review.eml',
    message({
      from: 'reviews@reviews.example',
      to: 'reviewer@reviews.example',
      subject: 'Review September product update',
      messageId: 'content-review-4@reviews.example',
      description: describe(entry),
      text: 'September product update, revision 4, is ready for review. Request changes or approve it in the review service.',
    }),
  );
  // The same interaction beside an attachment and another structured part, which a MAP
  // client ignores: the partial representation is the first part of multipart/mixed.
  put(
    'emails/content-review-mixed.eml',
    message({
      from: 'reviews@reviews.example',
      to: 'reviewer@reviews.example',
      subject: 'Review September product update',
      messageId: 'content-review-4-mixed@reviews.example',
      description: describe(entry),
      text: 'September product update, revision 4, is ready for review. The brief is attached.',
      structured: [
        {
          '@context': 'https://schema.org/',
          '@type': 'EmailMessage',
          publisher: { '@type': 'Organization', name: 'Example Reviews' },
        },
      ],
      attachments: [
        {
          type: 'text/plain; charset="utf-8"',
          filename: 'brief.txt',
          content: 'Launch the September product update to every customer.\n',
        },
      ],
    }),
  );
}
const invitation = example('event-response');
put(
  'emails/event-response.eml',
  await sign(
    message({
      from: 'events@calendar.example.net',
      to: invitation.recipient,
      subject: 'Invitation: Design systems workshop',
      messageId: 'workshop-2026-10.2@calendar.example.net',
      description: describe(invitation),
      calendar: invitation.calendar,
      text: 'You are invited to the design systems workshop on 14 October 2026, 09:00 to 12:00 UTC.',
    }),
    'example.net',
    { signingDomain: 'example.net' },
  ),
);

const confirmation = example('email-confirmation');
const confirmationMessage = (description, from = 'no-reply@accounts.example.com', headers = []) =>
  message({
    from,
    to: confirmation.recipient,
    subject: 'Confirm your new account',
    messageId: 'signup-5520@accounts.example.com',
    description,
    headers,
    text: 'Confirm this address to finish creating your Example Developer Tools account. If you did not sign up, report it and we will cancel the account.',
  });
const genuine = await sign(confirmationMessage(describe(confirmation)), 'example.com', {
  signingDomain: 'example.com',
});
put('emails/email-confirmation.eml', genuine);
// An internationalized recipient: the message writes its domain as a U-label and the
// description as the A-label, and trust compares them as A-labels. The local part is
// RFC 6531 UTF-8, compared with only its ASCII letters in lowercase.
{
  const international = describe(confirmation);
  international.recipient = 'al\u00e9x@xn--bcher-kva.example';
  put(
    'emails/international-recipient.eml',
    await sign(
      message({
        from: 'no-reply@accounts.example.com',
        to: 'Al\u00e9x@b\u00fccher.example',
        subject: 'Confirm your new account',
        messageId: 'signup-5521@accounts.example.com',
        description: international,
        text: 'Confirm this address to finish creating your Example Developer Tools account.',
      }),
      'example.com',
      { signingDomain: 'example.com' },
    ),
  );
}

// Negative messages: each must be refused by possession trust or by the type's client rule.
const unsigned = confirmationMessage(describe(confirmation));
put('emails/negative/unsigned.eml', unsigned);
put(
  'emails/negative/spoofed-authentication-results.eml',
  `Authentication-Results: mx.example.org; dkim=pass header.d=example.com; dmarc=pass header.from=accounts.example.com\r\n${unsigned}`,
);
put(
  'emails/negative/weak-key.eml',
  await sign(unsigned, 'weak.example.com', {
    signingDomain: 'example.com',
    keySelector: 'weak2026',
  }),
);
put(
  'emails/negative/unsigned-recipient.eml',
  await sign(unsigned, 'example.com', {
    signingDomain: 'example.com',
    headerList: 'From:Subject:Date:Message-ID:MIME-Version:Content-Type',
  }),
);
{
  const foreign = describe(confirmation);
  foreign.service.execution.url = `https://collector.example.net/map/c/${confirmation.capability}`;
  put(
    'emails/negative/foreign-endpoint.eml',
    await sign(confirmationMessage(foreign), 'example.com', { signingDomain: 'example.com' }),
  );
}
{
  const lookalike = JSON.parse(
    JSON.stringify(describe(confirmation)).replaceAll('example.com', 'examp1e.com'),
  );
  put(
    'emails/negative/lookalike-domain.eml',
    await sign(confirmationMessage(lookalike, 'no-reply@accounts.examp1e.com'), 'examp1e.com', {
      signingDomain: 'examp1e.com',
    }),
  );
}
put(
  'emails/negative/embedded-message.eml',
  [
    'From: forwarder@example.org',
    `To: ${confirmation.recipient}`,
    'Subject: Fwd: Confirm your new account',
    'Date: Fri, 25 Sep 2026 08:05:00 +0000',
    'Message-ID: <forward-1@example.org>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="map-forward"',
    '',
    '--map-forward',
    'Content-Type: text/plain; charset="utf-8"',
    '',
    'Forwarding this confirmation.',
    '--map-forward',
    'Content-Type: message/rfc822',
    'Content-Disposition: attachment; filename="confirmation.eml"',
    '',
    genuine,
    '--map-forward--',
    '',
  ].join('\r\n'),
);

const signedBy = (raw, options = {}) =>
  sign(raw, 'example.com', { signingDomain: 'example.com', ...options });
const defaultHeaders = 'From:To:Date:Message-ID:Subject:MIME-Version:Content-Type';
put(
  'emails/negative/spf-only.eml',
  `Authentication-Results: mx.example.org; spf=pass smtp.mailfrom=accounts.example.com; dmarc=pass header.from=accounts.example.com\r\n${unsigned}`,
);
put(
  'emails/negative/body-length-limit.eml',
  `${await signedBy(unsigned, { maxBodyLength: bodyLength(unsigned) })}Appended after the signed length.\r\n`,
);
put(
  'emails/negative/unsigned-content-type.eml',
  await signedBy(unsigned, { headerList: 'From:To:Date:Message-ID:Subject:MIME-Version' }),
);
put('emails/negative/repeated-to.eml', `To: ${confirmation.recipient}\r\n${genuine}`);
put(
  'emails/negative/unsigned-cc.eml',
  (
    await signedBy(unsigned.replace(/^To: .*$/m, 'To: someone@example.org'), {
      headerList: defaultHeaders,
    })
  ).replace('\r\nFrom:', `\r\nCc: ${confirmation.recipient}\r\nFrom:`),
);
put(
  'emails/negative/obsolete-from.eml',
  `From : "Example Bank" <security@bank.example>\r\n${genuine}`,
);
put(
  'emails/negative/two-mailbox-from.eml',
  await signedBy(
    unsigned.replace(/^From: .*$/m, 'From: no-reply@accounts.example.com, security@bank.example'),
  ),
);
put('emails/negative/rsa-sha1.eml', await signedBy(unsigned, { algorithm: 'rsa-sha1' }));
{
  // An Ed25519 algorithm tag over the domain's 2048-bit RSA key, signed with that key.
  // mailauth verifies it; only the key type the signature claims can refuse it.
  const forged = (await signedBy(unsigned))
    .replace('a=rsa-sha256', 'a=ed25519-sha256')
    .replace(/b=[A-Za-z0-9+/=\s]+?(?=\r\n(?![ \t]))/, 'b=AAAA');
  const resolver = async (name) => {
    if (dns[name]) return dns[name];
    throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
  };
  const { results } = await dkimVerify(Buffer.from(forged, 'latin1'), { resolver });
  const canonical = Buffer.from(results[0].signingHeaders.canonicalizedHeader, 'base64');
  const signature = signBytes(
    null,
    createHash('sha256').update(canonical).digest(),
    keyFor('example.com'),
  );
  put(
    'emails/negative/ed25519-over-rsa.eml',
    forged.replace('b=AAAA', `b=${signature.toString('base64')}`),
  );
}
// Signed and authentic, but sent to an address other than the one the capability names.
put(
  'emails/negative/other-recipient.eml',
  await signedBy(unsigned.replace(/^To: .*$/m, 'To: someone@example.org')),
);
// A signed Reply-To and a second, unsigned one above it.
put(
  'emails/negative/duplicate-signed-header.eml',
  `Reply-To: collect@attacker.example\r\n${await signedBy(
    unsigned.replace(
      '\r\nMIME-Version:',
      '\r\nReply-To: support@accounts.example.com\r\nMIME-Version:',
    ),
    { headerList: `${defaultHeaders}:Reply-To` },
  )}`,
);
put(
  'emails/negative/unsigned-list-id.eml',
  await signedBy(
    unsigned.replace(
      '\r\nMIME-Version:',
      '\r\nList-Id: Updates <updates.news.example.com>\r\nMIME-Version:',
    ),
    {
      headerList: defaultHeaders,
    },
  ),
);
put(
  'emails/negative/future-signature.eml',
  await signedBy(unsigned, { signTime: '2030-01-01T00:00:00Z' }),
);
put(
  'emails/negative/invalid-date.eml',
  await signedBy(unsigned.replace(/^Date: .*$/m, 'Date: Friday morning')),
);
// A fold between a field name and its colon: mail readers disagree on whether it is a header.
put(
  'emails/negative/folded-field-name.eml',
  await signedBy(unsigned.replace(/^Subject: /m, 'Subject\r\n : ')),
);
put(
  'emails/negative/otp-and-confirm.eml',
  await signedBy(
    confirmationMessage(describe(confirmation), 'no-reply@accounts.example.com', [
      'OTP-Token: "731946"; origin="https://devtools.example.com"',
    ]),
    { headerList: `${defaultHeaders}:OTP-Token` },
  ),
);
put(
  'emails/negative/inline-attached-message.eml',
  await signedBy(
    [
      'From: postmaster@example.com',
      `To: ${confirmation.recipient}`,
      'Subject: Delivery report',
      'Date: Fri, 25 Sep 2026 08:10:00 +0000',
      'Message-ID: <report-1@example.com>',
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; boundary="map-outer"',
      '',
      '--map-outer',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'The attached message could not be delivered.',
      '--map-outer',
      'Content-Type: message/rfc822',
      'Content-Disposition: inline',
      '',
      unsigned,
      '--map-outer--',
      '',
    ].join('\r\n'),
  ),
);
const preferences = example('subscription-preferences');
put(
  'emails/subscription-preferences.eml',
  await signedBy(
    message({
      from: 'updates@news.example.com',
      to: preferences.recipient,
      subject: 'Your product updates',
      messageId: 'updates-2026-09@news.example.com',
      description: describe(preferences),
      headers: ['List-Id: Product updates <updates.news.example.com>'],
      text: 'This month in product updates. Change how often we write, or unsubscribe.',
    }),
  ),
);

// RFC 8785 vectors shared with every implementation that computes description digests.
const vectors = [
  ['member ordering', '{"b":2,"a":1,"aa":3,"A":4,"é":5}'],
  // RFC 8785 section 3.2.3: names sort by UTF-16 code units, which UTF-8 byte order gets wrong.
  [
    'member ordering by UTF-16 code units',
    '{"\\u20ac":"Euro Sign","\\r":"Carriage Return","\\ufb33":"Hebrew Letter Dalet With Dagesh","1":"One","\\ud83d\\ude00":"Emoji: Grinning Face","\\u0080":"Control","\\u00f6":"Latin Small Letter O With Diaeresis"}',
  ],
  ['string escapes', '{"s":"quote\\" backslash\\\\ tab\\t line\\n nul\\u0000 bell\\u0007"}'],
  ['unicode is not normalised', '{"s":"café ☕ 𝄞 e\\u0301"}'],
  ['integers', '{"n":[0,-0,1,-1,9007199254740991,-9007199254740991]}'],
  ['numbers', '{"n":[1.5,1e21,1e-7,0.1,100,-0.5,1E2]}'],
  [
    'shortest round-trip numbers',
    '{"n":[0.30000000000000004,1.2345678901234567,5e-324,1.7976931348623157e308,4.35,0.000001,123e-20,333333333.3333333]}',
  ],
  ['nesting and empties', '{"a":[],"b":{},"c":[{"z":null,"y":true,"x":false}]}'],
].map(([name, text]) => {
  const canonical = canonicalize(JSON.parse(text));
  return { name, json: text, canonical, digest: canonicalDigest(JSON.parse(text)) };
});
const confirmationDescription = describe(confirmation);
vectors.push({
  name: 'Email Confirmation description',
  json: JSON.stringify(confirmationDescription),
  canonical: canonicalize(confirmationDescription),
  digest: descriptionDigest(confirmationDescription),
});
put('jcs-vectors.json', json(vectors));

// I-JSON vectors: the core limits every MAP parser applies, each at its boundary.
const nested = (depth, inner = '1') => `${'['.repeat(depth)}${inner}${']'.repeat(depth)}`;
const ijson = [
  ['an object', '{"a":1}', true],
  ['arrays and objects 32 deep', nested(31, '{"a":1}'), true],
  ['arrays and objects 33 deep', nested(32, '{"a":1}'), false],
  ['empty arrays 32 deep', nested(32, ''), true],
  ['empty arrays 33 deep', nested(33, ''), false],
  ['a duplicate member', '{"a":1,"a":2}', false],
  ['a duplicate member after unescaping', '{"a":1,"\\u0061":2}', false],
  ['a lone high surrogate', '{"a":"\\ud800"}', false],
  ['a lone low surrogate', '{"a":"\\udc00"}', false],
  ['a surrogate pair', '{"a":"\\ud83d\\ude00"}', true],
  ['U+0000 in a string', '{"a":"ok\\u0000"}', false],
  ['U+0000 in a member name', '{"a\\u0000":1}', false],
  ['a noncharacter', '{"a":"\\uffff"}', false],
  ['a noncharacter in the Arabic block', '{"a":"\\ufdd0"}', false],
  ['an astral noncharacter', '{"a":"\\ud83f\\udffe"}', false],
  ['a noncharacter member name', '{"\\ufffe":1}', false],
  ['the neighbours of noncharacters', '{"a":"\\ufdcf\\ufdf0\\ufffd\\ud83f\\udffd"}', true],
  ['the largest exact integer', '{"a":9007199254740991}', true],
  ['the smallest exact integer', '{"a":-9007199254740991}', true],
  ['an integer beyond the exact range', '{"a":9007199254740992}', false],
  ['a negative integer beyond the exact range', '{"a":-9007199254740992}', false],
  ['a large fraction', '{"a":1e300}', false],
  ['a fraction', '{"a":0.5}', true],
  ['trailing content', '{"a":1} x', false],
  ['a trailing comma', '{"a":1,}', false],
  ['a leading byte order mark', `${String.fromCharCode(0xfeff)}{"a":1}`, false],
  ['exactly 64 KiB', `{"a":"${'x'.repeat(65536 - 8)}"}`, true],
  ['one byte over 64 KiB', `{"a":"${'x'.repeat(65536 - 7)}"}`, false],
  // Leniencies some JSON parsers allow by default; RFC 8259 allows none of them.
  ['a block comment', '{"a":1/**/}', false],
  ['a line comment', '{"a":1//\n}', false],
  ['a raw control character', `{"a":"${String.fromCharCode(1)}"}`, false],
  ['a leading zero', '{"a":01}', false],
  ['a plus sign', '{"a":+1}', false],
  ['an invalid escape', '{"a":"\\x"}', false],
  ['NaN', '{"a":NaN}', false],
  ['single quotes', "{'a':1}", false],
  ['an exponent without digits', '{"a":1e}', false],
  ['a fraction without digits', '{"a":1.}', false],
  ['a number that overflows', '{"a":1e400}', false],
  ['negative zero', '{"a":-0}', true],
  ['an escaped solidus', '{"a":"\\/"}', true],
  ['whitespace around every token', ' { "a" : [ 1 , 2 ] } ', true],
  ['a form feed as whitespace', '{"a":1}\f', false],
  ['a no-break space as whitespace', `{"a":1}${String.fromCharCode(0xa0)}`, false],
  ['a top-level number', '1', true],
  ['a fraction that rounds into range', '{"a":9007199254740991.4}', true],
  // Numbers read as ECMAScript reads them, whatever their spelling.
  ['an exponent padded with zeros', '{"a":25e-00000000000000000000001}', true],
  ['a positive exponent padded with zeros', '{"a":1e0000000000000000000001}', true],
  ['an uppercase exponent with a sign', '{"a":1E+2}', true],
  ['a fraction with an exponent', '{"a":123.456e-2}', true],
  ['integral fractions', '{"a":[1.0,-0.0,2.50,1e2]}', true],
  ['a number that underflows to zero', '{"a":1e-400}', true],
  ['the smallest subnormal', '{"a":4.9e-324}', true],
  ['a subnormal just above halfway', '{"a":2.4703282292062328e-324}', true],
  ['a subnormal just below halfway', '{"a":2.4703282292062327e-324}', true],
  ['the shortest round trip', '{"a":0.30000000000000004}', true],
  // Bytes that are not UTF-8 travel as base64.
  ['invalid UTF-8', Buffer.from('{"a":"\xff"}', 'latin1'), false],
  ['an encoded lone surrogate', Buffer.from('{"a":"\xed\xa0\x80"}', 'latin1'), false],
  ['an overlong encoding', Buffer.from('{"a":"\xc0\xaf"}', 'latin1'), false],
].map(([name, value, valid]) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  let canonical;
  try {
    canonical = canonicalize(parseMapBytes(bytes));
  } catch {
    canonical = undefined;
  }
  if ((canonical !== undefined) !== valid)
    throw new Error(`The reference parser disagrees with the I-JSON vector: ${name}`);
  // A valid vector carries its RFC 8785 form, so every parser is held to the values
  // JavaScript reads, not to its own.
  return {
    name,
    ...(Buffer.isBuffer(value) ? { base64: value.toString('base64') } : { json: value }),
    valid,
    ...(valid ? { canonical } : {}),
  };
});
put('ijson-vectors.json', json(ijson));

// Lexical form vectors: every validator must decide these as the core patterns do.
const lexical = {
  dateTime: [
    [
      '2026-09-25T08:00:00Z',
      '2026-09-25T08:00:00.1Z',
      '2026-09-25T08:00:00.123+05:30',
      '2024-02-29T00:00:00Z',
      '2000-02-29T00:00:00-12:00',
    ],
    [
      '2026-09-25 08:00:00Z',
      '2026-09-25T08:00:00+01',
      '2026-09-25T08:00:00+0100',
      ' 2026-09-25T08:00:00Z',
      '-2026-09-25T08:00:00Z',
      '2026-09-25t08:00:00z',
      '2026-09-25T08:00:00.0001Z',
      '2026-02-29T00:00:00Z',
      '1900-02-29T00:00:00Z',
      '2026-09-24T23:59:60Z',
      '2026-13-01T00:00:00Z',
      '2026-09-31T00:00:00Z',
      '2026-09-25T24:00:00Z',
      '2026-09-25T08:00Z',
      '2026-09-25T08:00:00+24:00',
      '2026-09-25T08:00:00Z\n',
    ],
  ],
  date: [
    ['2026-01-01', '2024-02-29', '2000-02-29'],
    [
      ' 2026-01-01',
      '-2026-01-01',
      '2026-02-29',
      '1900-02-29',
      '2026-1-01',
      '2026-01-01\n',
      '2026-04-31',
    ],
  ],
  address: [
    [
      'alex@example.org',
      'alex+devtools-7f3a@example.org',
      'a@localhost',
      'first.last@sub.example.co',
      // RFC 6531 local parts; domains are always A-labels.
      'al\u00e9x@example.org',
      '\u7528\u6237@xn--bcher-kva.example',
      'a\u{1F600}@example.org',
    ],
    [
      'a\u0085b@example.org',
      'a\u00a0b@example.org',
      'a\u2028b@example.org',
      'a\u3000b@example.org',
      // Invisible and bidirectional format characters could make one address read as another.
      'a\u200bb@example.org',
      'a\u202eb@example.org',
      'a\u2066b@example.org',
      '"a b"@example.com',
      'a@[127.0.0.1]',
      'a@-example.com',
      'a@example..com',
      'a@example.com.',
      'alex@bücher.example',
      'a b@example.com',
      '@example.com',
      'a@',
      'a@example.com\n',
    ],
  ],
  identifier: [
    [
      'https://example.com/',
      'urn:uuid:01926a00-0000-7000-8000-000000000001',
      'mailto:a@example.com',
      'https://example.com/a%20b',
    ],
    [
      'https://example.com/?a[]=1',
      'https://example.com/?q=a|b',
      'https://example.com/?q=a^b',
      'https://example.com/?q={x}',
      'x:',
      'https://example.com/a b',
      'https://example.com/\u2028',
      'no-scheme',
      'https://example.com/%zz',
    ],
  ],
  httpsIdentifier: [
    [
      'https://example.com',
      'https://example.com:8443/path?q=1#f',
      'https://xn--bcher-kva.example/',
      'https://app.nitrosend.test/my/map',
      'https://3com.com/',
    ],
    [
      'http://example.com/',
      'https://example.com:port/',
      'https://example.com:99999/',
      'https://1.2.3.256/',
      'https://1.2.3.4/',
      'https://exa%00mple.com/',
      'https://user@example.com/',
      'https://-example.com/',
      'https://example.com:0/',
      'https://example.com/\u2028',
      'https://example..com/',
      'https://example.com./',
    ],
  ],
  httpsTarget: [
    ['https://api.example.com/v1/my/map', 'https://api.example.com:8443/map/actions?tenant=1'],
    [
      'https://api.example.com/#section',
      'https://api.example.com/map/actions#run',
      'http://api.example.com/map',
    ],
  ],
  httpsOrigin: [
    ['https://devtools.example.com', 'https://example.com:8443'],
    ['https://example.com/', 'https://example.com:99999', 'http://example.com'],
  ],
  urlTemplate: [
    [
      'https://reviews.example/map/results/{requestId}',
      'https://example.com/r?id={requestId}',
      'https://example.com/r/{requestId}#result',
    ],
    [
      'https://reviews.example/r/\u2028{requestId}',
      'https://example.com/r#{requestId}',
      'https://example.com#{requestId}',
      'https://example.com/{request.Id}{requestId}',
      'https://example.com/{requestId}/{requestId}',
      'https://example.com/results',
      'https://example.com/r/\u007f{requestId}',
      'https://example.com{requestId}',
    ],
  ],
  token: [
    ['approve', 'request-changes', 'a1-b2'],
    ['Approve', '-approve', 'approve-', 'approve--now', 'approve now', '1approve', ''],
  ],
  digest: [
    [
      'sha-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'sha-256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ],
    [
      'sha-256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'sha-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'SHA-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ],
  ],
  uuidUrn: [
    [
      'urn:uuid:01926a00-0000-7000-8000-000000000001',
      'urn:uuid:3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    ],
    [
      'URN:UUID:01926a00-0000-7000-8000-000000000001',
      'urn:uuid:01926A00-0000-7000-8000-000000000001',
      'urn:uuid:01926a00-0000-0000-8000-000000000001',
      'urn:uuid:01926a00-0000-7000-c000-000000000001',
      '01926a00-0000-7000-8000-000000000001',
    ],
  ],
  contractDigest: [
    ['sha-256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    [
      'sha-256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ],
  ],
  detailsKey: [
    ['a', 'authorizationDetails', 'seats_1', `a${'b'.repeat(63)}`],
    ['', '1a', '_a', 'a-b', 'prix€', `a${'b'.repeat(64)}`],
  ],
  nonBlank: [
    ['a', ' a ', 'é', '😀'],
    ['   ', '\u2028', '\u00a0', '\t\n', '\ufeff', '\u3000'],
  ],
};
const coreDefinitions = JSON.parse(
  readFileSync(resolve(root, 'public/schemas/map-0.2.schema.json'), 'utf8'),
).$defs;
// The form fields block's own lexical forms.
const formsLexical = {
  fieldName: [
    ['a', 'companyName', `a${'B'.repeat(63)}`],
    ['', 'A', '1a', 'company_name', 'company-name', `a${'b'.repeat(64)}`],
  ],
  autocomplete: [
    ['email', 'shipping postal-code', 'section-a1 billing work tel'],
    ['Email', 'new-password', 'billing cc-number', 'section- email', 'home  tel'],
  ],
};
const formsDefinitions = JSON.parse(
  readFileSync(resolve(root, 'public/schemas/forms-0.1.schema.json'), 'utf8'),
).$defs;
// Every line terminator an engine may anchor at: ECMA-262's, and those of engines that
// also count CR, NEL, LS and PS.
const LINE_BREAKS = ['\n', '\r', '\r\n', '\u0085', '\u2028', '\u2029'];
const lexicalVectors = [
  ...Object.entries(lexical).map((entry) => [CORE_SCHEMA, coreDefinitions, ...entry]),
  ...Object.entries(formsLexical).map((entry) => [FORMS_SCHEMA, formsDefinitions, ...entry]),
].flatMap(([schema, definitions, definition, [valid, invalid]]) => {
  const validate = mapArtifacts().ajv.compile({ $ref: `${schema}#/$defs/${definition}` });
  // An anchored form refuses a valid value with a line break before or after it, so an
  // engine whose `$` matches before a final newline, or whose anchors match at line
  // breaks, must read `^` and `$` as whole-value anchors to agree.
  const anchored = /^\^.*\$$/s.test(definitions[definition].pattern);
  const broken = anchored
    ? LINE_BREAKS.flatMap((line) => [
        `${valid[0]}${line}`,
        `${line}${valid[0]}`,
        `x${line}${valid[0]}`,
      ])
    : [];
  return [
    ...valid.map((value) => ({ schema, definition, value, valid: true })),
    ...[...new Set([...invalid, ...broken])].map((value) => ({
      schema,
      definition,
      value,
      valid: false,
    })),
  ].map((vector) => {
    if (validate(vector.value) !== vector.valid)
      throw new Error(`The ${definition} pattern disagrees with ${JSON.stringify(vector.value)}`);
    return vector;
  });
});
put('lexical-vectors.json', json(lexicalVectors));

// Media type vectors: the Content-Type values an execution URL accepts rather than
// answering 415.
const mediaTypes = [
  [
    'application/json',
    'Application/JSON',
    'application/json; charset=utf-8',
    'application/json;charset="UTF-8"',
    'application/json ;\tcharset=utf-8',
    ' application/json\t',
    'application/json; charset=utf-8; charset=utf-8',
    // RFC 9110 section 5.6.6 permits empty parameter slots.
    'application/json;',
    'application/json; ;charset=utf-8',
  ],
  [
    '',
    'text/plain',
    'application/jsonx',
    'application/problem+json',
    'application/json, text/plain',
    ';application/json',
    'application/json; charset=latin1',
    'application/json; charset=utf8',
    'application/json; charset = utf-8',
    'application/json; charset=utf-8; x=1',
    'application/json;\u00a0charset=utf-8',
    'application/json\u000b',
  ],
];
const mediaTypeVectors = mediaTypes.flatMap((values, index) =>
  values.map((contentType) => {
    const accepted = index === 0;
    if (isJsonRequest(contentType) !== accepted)
      throw new Error(`The media type rule disagrees with ${JSON.stringify(contentType)}`);
    return { contentType, accepted };
  }),
);
put('media-type-vectors.json', json(mediaTypeVectors));

// Write or compare.
const listed = (directory) =>
  existsSync(directory)
    ? readdirSync(directory).flatMap((name) => {
        const path = resolve(directory, name);
        return statSync(path).isDirectory() ? listed(path) : [relative(output, path)];
      })
    : [];
if (check) {
  const stale = [];
  for (const [path, content] of files) {
    const target = resolve(output, path);
    if (!existsSync(target) || readFileSync(target, 'utf8') !== content) stale.push(path);
  }
  for (const path of listed(output)) if (!files.has(path)) stale.push(`${path} (not generated)`);
  if (stale.length) {
    console.error(`MAP 0.2 fixtures are stale; run npm run fixtures:\n${stale.join('\n')}`);
    process.exit(1);
  }
  console.log(`MAP 0.2 fixtures current: ${files.size} files.`);
} else {
  rmSync(output, { recursive: true, force: true });
  for (const [path, content] of files) {
    const target = resolve(output, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  console.log(`Wrote ${files.size} MAP 0.2 fixture files.`);
}
