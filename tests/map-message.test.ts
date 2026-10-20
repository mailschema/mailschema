import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MEDIA_TYPE, extractMessage, PROFILE, type Description } from '../src/map/core';

// The cases mirror the Ruby package's Message.extract tests, built as raw messages.
const description = JSON.parse(
  readFileSync('specifications/map-0.3/examples/publication-approval.json', 'utf8'),
) as Description;
const json = JSON.stringify(description);
let boundaries = 0;

function base64Lines(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

function machinePart(
  body = json,
  { contentType = DESCRIPTION_MEDIA_TYPE, purpose = 'Machine-readable' as string | null, encoding = 'base64' } = {},
): string {
  const encoded =
    encoding === 'base64'
      ? base64Lines(body)
      : encoding === 'quoted-printable'
        ? body.replace(/=/g, '=3D').replace(/.{1,73}/g, '$&=\r\n').replace(/=\r\n$/, '')
        : body;
  return [
    `Content-Type: ${contentType}`,
    ...(purpose ? [`Content-Purpose: ${purpose}`] : []),
    `Content-Transfer-Encoding: ${encoding}`,
    '',
    encoded,
  ].join('\r\n');
}

const readable = (extra: string[] = []) =>
  ['Content-Type: text/plain; charset=UTF-8', ...extra, '', 'Review the getting started guide.'].join('\r\n');
const attachment = (filename: string) => readable([`Content-Disposition: attachment; filename=${filename}`]);

function multipart(type: string, parts: string[], extra: string[] = []): string {
  const boundary = `b${(boundaries += 1)}`;
  const [mime, ...parameters] = type.split(';');
  const contentType = [mime, ` boundary="${boundary}"`, ...parameters].join(';');
  return [
    `Content-Type: ${contentType}`,
    ...extra,
    '',
    ...parts.flatMap((part) => [`--${boundary}`, part]),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

const received = (type: string, ...parts: string[]) =>
  ['From: service@service.example', 'To: owner@example.net', 'Subject: Review', 'MIME-Version: 1.0', multipart(type, parts)].join('\r\n');
// A related entity whose root is readable, as the Ruby tests build one.
const related = (...parts: string[]) => multipart('multipart/related', [readable(), ...parts]);

describe('extractMessage', () => {
  it('extracts the one designated description', () => {
    const result = extractMessage(received('multipart/related', readable(), machinePart()));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.description).toEqual(description);
      expect(new TextDecoder().decode(result.bytes)).toBe(json);
    }
  });

  it('reads a quoted-printable part from raw bytes', () => {
    const raw = received('multipart/related', readable(), machinePart(json, { encoding: 'quoted-printable' }));
    const result = extractMessage(new TextEncoder().encode(raw));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') expect(new TextDecoder().decode(result.bytes)).toBe(json);
  });

  it('reads the published example message', () => {
    expect(extractMessage(readFileSync('specifications/map-0.3/examples/publication.eml')).status).toBe('valid');
  });

  it('finds the related entity beside attachments and other structured parts', () => {
    const otherProfile = machinePart(json, { contentType: 'application/ld+json; profile="https://example.com/profiles/other"' });
    const unlabelled = machinePart(JSON.stringify({ '@context': 'https://schema.org/', '@type': 'EmailMessage' }), {
      contentType: 'application/ld+json; charset=UTF-8',
    });
    const raw = received('multipart/mixed', related(machinePart(), otherProfile, unlabelled), attachment('brief.txt'));
    expect(extractMessage(raw).status).toBe('valid');
  });

  it('finds nothing without a designated part of this profile', () => {
    expect(extractMessage(received('multipart/related', readable()))).toEqual({ status: 'none' });
    expect(extractMessage(received('multipart/related', readable(), machinePart(json, { purpose: null })))).toEqual({ status: 'none' });
    const other = machinePart(json, { contentType: 'application/ld+json; profile="https://example.com/profiles/other"' });
    expect(extractMessage(received('multipart/related', readable(), other))).toEqual({ status: 'none' });
    expect(extractMessage('From: a@example.net\r\nSubject: x\r\n\r\nReview.')).toEqual({ status: 'none' });
  });

  it('never reads a part inside an attachment', () => {
    const attached = machinePart().replace('Content-Transfer-Encoding', 'Content-Disposition: attachment; filename=map.json\r\nContent-Transfer-Encoding');
    expect(extractMessage(received('multipart/related', readable(), attached)).status).toBe('none');
    const attachedEntity = multipart('multipart/related', [readable(), machinePart()], ['Content-Disposition: attachment']);
    expect(extractMessage(received('multipart/mixed', readable(), attachedEntity)).status).toBe('none');
  });

  it('never reads a part inside an attached message', () => {
    const forwarded = ['Content-Type: message/rfc822', '', received('multipart/related', readable(), machinePart())].join('\r\n');
    expect(extractMessage(received('multipart/mixed', readable(), forwarded)).status).toBe('none');
  });

  it('refuses two designated parts', () => {
    expect(extractMessage(received('multipart/related', readable(), machinePart(), machinePart()))).toEqual({
      status: 'invalid',
      reason: 'multiple_parts',
    });
  });

  it('refuses a repeated content-type parameter or field', () => {
    const raw = received('multipart/related', readable(), machinePart());
    const profile = `profile="${PROFILE}"`;
    for (const changed of [
      raw.replace(profile, `${profile}; profile="https://example.com/other"`),
      raw.replace(profile, `${profile}; profile*=us-ascii''other`),
      raw.replace('Content-Transfer-Encoding: base64', 'Content-Transfer-Encoding: base64\r\nContent-Transfer-Encoding: 8bit'),
      raw.replace('Content-Purpose: Machine-readable', 'Content-Purpose: Machine-readable\r\nContent-Purpose: Other'),
    ])
      expect(extractMessage(changed)).toEqual({ status: 'invalid', reason: 'ambiguous_headers' });
  });

  it('refuses another transfer encoding', () => {
    const raw = received('multipart/related', readable(), machinePart());
    expect(extractMessage(raw.replace('Content-Transfer-Encoding: base64', 'Content-Transfer-Encoding: 8bit'))).toEqual({
      status: 'invalid',
      reason: 'transfer_encoding',
    });
  });

  it('refuses a part labelled with a profile that merely contains this one', () => {
    const longer = machinePart(json, { contentType: `application/ld+json; profile="${PROFILE}0"` });
    expect(extractMessage(received('multipart/related', readable(), longer))).toEqual({ status: 'invalid', reason: 'media_type' });
  });

  it('refuses a part outside a multipart/related entity with a readable root', () => {
    const notPartial = { status: 'invalid', reason: 'not_partial_representation' };
    expect(extractMessage(received('multipart/mixed', readable(), machinePart()))).toEqual(notPartial);
    expect(extractMessage(received('multipart/related', attachment('note.txt'), machinePart()))).toEqual(notPartial);
    expect(extractMessage(received('multipart/related', machinePart(), readable()))).toEqual(notPartial);
  });

  it('honours a start parameter naming the root, and a root of alternatives', () => {
    const root = readable(['Content-ID: <review@service.example>']);
    expect(extractMessage(received('multipart/related; start="<review@service.example>"', machinePart(), root)).status).toBe('valid');
    const alternatives = multipart('multipart/alternative', [readable()]);
    expect(extractMessage(received('multipart/related', alternatives, machinePart())).status).toBe('valid');
  });

  it('refuses an invalid description without throwing', () => {
    const invalidDescription = { status: 'invalid', reason: 'invalid_description' };
    expect(extractMessage(received('multipart/related', readable(), machinePart('{"@type":"MailAction","@type":"MailAction"}')))).toEqual(invalidDescription);
    expect(extractMessage(received('multipart/related', readable(), machinePart(JSON.stringify({ ...description, x: 1 }))))).toEqual(invalidDescription);
    expect(() => extractMessage(new Uint8Array([0xff, 0x00, 0x0a]))).not.toThrow();
  });
});
