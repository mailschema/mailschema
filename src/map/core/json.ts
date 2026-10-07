// MAP JSON: I-JSON parsed from its original text, and the RFC 8785 digests that identify
// contracts and descriptions.
import { sha256 } from './sha256.ts';

/** A document that is not MAP JSON, or not the document it claims to be. */
export class InvalidDocument extends Error {
  readonly errors: string[];
  constructor(message: string, errors: string[] = [message]) {
    super(message);
    this.errors = errors;
  }
}

export const MAX_DEPTH = 32;
const MAX_NUMBER_TOKEN = 64;

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const NUMBER = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/;
const ZERO = /^-?0(?:\.0+)?(?:[eE][+-]?[0-9]+)?$/;

const forbidden = (point: number) =>
  point === 0 || (point >= 0xfdd0 && point <= 0xfdef) || (point & 0xfffe) === 0xfffe;

/** The bytes as text, refusing anything but well-formed UTF-8. */
export function decodeUtf8(input: Uint8Array): string {
  try {
    // The byte order mark is kept, so parsing refuses it.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input);
  } catch {
    throw new InvalidDocument('The JSON is not valid UTF-8.');
  }
}

/**
 * Parse MAP JSON from its original text: UTF-8 I-JSON (RFC 7493) of at most `maxBytes`, with
 * no byte order mark, duplicate member names, lone surrogates, noncharacters or U+0000, no
 * container deeper than 32 counting the root as 1, and every number a finite token of at most
 * 64 characters within ±(2^53−1) that does not underflow to zero. These rules apply to the
 * original tokens, before a general parser could erase them.
 */
export function parse(input: string | Uint8Array, maxBytes: number): unknown {
  const text = typeof input === 'string' ? input : decodeUtf8(input);
  if (text.charCodeAt(0) === 0xfeff) throw new InvalidDocument('A byte order mark is not allowed.');
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new InvalidDocument(`The JSON exceeds ${maxBytes} bytes.`);

  let index = 0;
  const fail = (reason: string): never => {
    throw new InvalidDocument(`Invalid MAP JSON at offset ${index}: ${reason}.`);
  };
  const space = () => {
    while (' \t\n\r'.includes(text[index] ?? '-')) index += 1;
  };
  const string = (): string => {
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
    for (const character of value)
      if (forbidden(character.codePointAt(0)!)) fail('U+0000 or a noncharacter');
    return value;
  };
  // `depth` counts the containers enclosing the value.
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
    for (const literal of ['true', 'false', 'null'] as const)
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return JSON.parse(literal) as unknown;
      }
    const token = NUMBER.exec(text.slice(index))?.[0];
    if (token === undefined) return fail('unexpected token');
    index += token.length;
    if (token.length > MAX_NUMBER_TOKEN)
      fail(`a number token longer than ${MAX_NUMBER_TOKEN} characters`);
    const number = Number(token);
    if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER)
      fail('a number outside the I-JSON range');
    if (number === 0 && !ZERO.test(token)) fail('a number that underflows to zero');
    return number;
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
 * ECMAScript's minimal string escapes and its number format.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Numbers must be finite.');
    return String(value);
  }
  if (typeof value === 'string')
    return `"${value.replace(/["\\\u0000-\u001f]/g, (char) => ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)}"`;
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const members = value as Record<string, unknown>;
    return `{${Object.keys(members)
      .sort()
      .map((name) => `${canonicalize(name)}:${canonicalize(members[name])}`)
      .join(',')}}`;
  }
  throw new TypeError(`${typeof value} is not a JSON value.`);
}

/** `sha-256:` and the SHA-256 of the value's RFC 8785 form, as MAP identifies contracts. */
export const digest = (value: unknown) => `sha-256:${sha256(canonicalize(value))}`;
