// Parsing MAP documents as I-JSON within the core limits.
import { createHash } from 'node:crypto';

/** A MAP document that is not I-JSON within the core limits. */
export class InvalidDocument extends Error {}

export const MAX_BYTES = 64 * 1024;
export const MAX_DEPTH = 32;

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
// Unicode's noncharacters: U+FDD0 to U+FDEF, and the last two code points of every plane.
const NONCHARACTER = new RegExp(
  `[\\u{FDD0}-\\u{FDEF}${Array.from({ length: 17 }, (_, plane) => `\\u{${(plane * 0x10000 + 0xfffe).toString(16)}}\\u{${(plane * 0x10000 + 0xffff).toString(16)}}`).join('')}]`,
  'u',
);

/**
 * Parse a MAP document as I-JSON (RFC 7493) within the core limits: valid UTF-8 with no
 * byte order mark, at most 64 KiB, no duplicate member names, no lone surrogates,
 * noncharacters or U+0000 in any string, every number within ±(2^53−1), and arrays and
 * objects nested at most 32 deep, the outermost counting as one. Text is measured in its
 * UTF-8 bytes; bytes must be strict UTF-8.
 */
export function parse(input: string | Uint8Array): unknown {
  let text: string;
  if (typeof input === 'string') text = input;
  else {
    try {
      // The byte order mark is kept, so the parser refuses it.
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input);
    } catch {
      throw new InvalidDocument('The MAP document is not valid UTF-8.');
    }
  }
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw new InvalidDocument(`The MAP document exceeds ${MAX_BYTES} bytes.`);
  let index = 0;
  const fail = (message: string): never => {
    throw new InvalidDocument(`Invalid MAP JSON at offset ${index}: ${message}`);
  };
  const space = () => {
    while (' \t\n\r'.includes(text[index] ?? '-')) index += 1;
  };
  const string = () => {
    const start = index;
    index += 1;
    while (index < text.length && text[index] !== '"') index += text[index] === '\\' ? 2 : 1;
    if (text[index] !== '"') fail('unterminated string');
    index += 1;
    let value: string;
    try {
      value = JSON.parse(text.slice(start, index)) as string;
    } catch {
      return fail('malformed string');
    }
    if (LONE_SURROGATE.test(value)) fail('lone surrogate');
    if (value.includes('\u0000')) fail('U+0000 in a string');
    if (NONCHARACTER.test(value)) fail('a noncharacter in a string');
    return value;
  };
  // `depth` counts the arrays and objects enclosing the value.
  const value = (depth: number): unknown => {
    space();
    const next = text[index];
    if ((next === '{' || next === '[') && depth >= MAX_DEPTH)
      fail(`nesting deeper than ${MAX_DEPTH}`);
    if (next === '{') {
      index += 1;
      const result: Record<string, unknown> = {};
      const names = new Set<string>();
      space();
      if (text[index] === '}') {
        index += 1;
        return result;
      }
      for (;;) {
        space();
        if (text[index] !== '"') fail('expected a member name');
        const name = string();
        if (names.has(name)) fail(`duplicate member ${JSON.stringify(name)}`);
        names.add(name);
        space();
        if (text[index] !== ':') fail('expected ":"');
        index += 1;
        // A member named __proto__ is data, never the object's prototype.
        Object.defineProperty(result, name, {
          value: value(depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
        space();
        if (text[index] === ',') {
          index += 1;
          continue;
        }
        if (text[index] === '}') {
          index += 1;
          return result;
        }
        fail('expected "," or "}"');
      }
    }
    if (next === '[') {
      index += 1;
      const result: unknown[] = [];
      space();
      if (text[index] === ']') {
        index += 1;
        return result;
      }
      for (;;) {
        result.push(value(depth + 1));
        space();
        if (text[index] === ',') {
          index += 1;
          continue;
        }
        if (text[index] === ']') {
          index += 1;
          return result;
        }
        fail('expected "," or "]"');
      }
    }
    if (next === '"') return string();
    const literal =
      /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(
        text.slice(index),
      );
    if (!literal) fail('unexpected token');
    index += literal![0].length;
    const parsed = JSON.parse(literal![0]) as unknown;
    if (
      typeof parsed === 'number' &&
      (!Number.isFinite(parsed) || Math.abs(parsed) > Number.MAX_SAFE_INTEGER)
    )
      fail('number outside the I-JSON range');
    return parsed;
  };
  const result = value(0);
  space();
  if (index !== text.length) fail('trailing content');
  return result;
}

const ESCAPES: Record<string, string> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

/**
 * The RFC 8785 canonical form of a JSON value: members sorted by their UTF-16 code units,
 * ECMAScript's minimal string escapes and its number format. An undefined member is
 * left out and an undefined array item is null, as JSON.stringify writes them.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Numbers must be finite.');
    return String(value);
  }
  if (typeof value === 'string')
    return `"${value.replace(/["\\\u0000-\u001f]/g, (char) => ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)}"`;
  if (Array.isArray(value))
    return `[${value.map((item) => (item === undefined ? 'null' : canonicalize(item))).join(',')}]`;
  if (typeof value === 'object') {
    const members = value as Record<string, unknown>;
    return `{${Object.keys(members)
      .filter((name) => members[name] !== undefined)
      .sort()
      .map((name) => `${canonicalize(name)}:${canonicalize(members[name])}`)
      .join(',')}}`;
  }
  throw new TypeError(`${typeof value} is not a JSON value.`);
}

/**
 * `sha-256:` and the SHA-256 of the RFC 8785 canonical form: the digest MAP uses for
 * descriptions, contracts and pinned schemas.
 */
export const digest = (value: unknown) =>
  `sha-256:${createHash('sha256').update(canonicalize(value)).digest('hex')}`;
