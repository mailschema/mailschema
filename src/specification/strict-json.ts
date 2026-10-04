// Parse the original JSON text before a general parser can erase duplicate
// members or the spelling of a number. MAP 0.3 applies these I-JSON limits to
// descriptions and contracts; the caller supplies the document's byte limit.
export class InvalidMapJson extends Error {}

const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const numberToken = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/;
const jsonLiteral = /^(?:true|false|null)/;
const zeroToken = /^-?0(?:\.0+)?(?:[eE][+-]?[0-9]+)?$/;

export function decodeMapUtf8(input: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input);
  } catch {
    throw new InvalidMapJson('The JSON is not valid UTF-8.');
  }
}

export function parseMapJson(input: string | Uint8Array, maxBytes: number): unknown {
  const text = typeof input === 'string' ? input : decodeMapUtf8(input);
  if (text.charCodeAt(0) === 0xfeff) throw new InvalidMapJson('A UTF-8 byte order mark is not allowed.');
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new InvalidMapJson(`The JSON exceeds ${maxBytes} bytes.`);

  let index = 0;
  const fail = (reason: string): never => {
    throw new InvalidMapJson(`Invalid MAP JSON at offset ${index}: ${reason}`);
  };
  const space = () => {
    while (' \t\r\n'.includes(text[index] ?? '-')) index++;
  };
  const string = (): string => {
    const start = index++;
    while (index < text.length && text[index] !== '"')
      index += text[index] === '\\' ? 2 : 1;
    if (text[index] !== '"') fail('unterminated string');
    index++;
    let decoded: string;
    try {
      decoded = JSON.parse(text.slice(start, index)) as string;
    } catch {
      return fail('malformed string');
    }
    if (loneSurrogate.test(decoded)) fail('lone surrogate');
    for (const character of decoded) {
      const point = character.codePointAt(0)!;
      if (point === 0 || (point >= 0xfdd0 && point <= 0xfdef) ||
          (point <= 0x10ffff && (point & 0xfffe) === 0xfffe))
        fail('U+0000 or a Unicode noncharacter');
    }
    return decoded;
  };
  const value = (depth: number): unknown => {
    space();
    const next = text[index];
    if ((next === '{' || next === '[') && depth >= 32) fail('nesting deeper than 32');
    if (next === '{') {
      index++;
      const object: Record<string, unknown> = {};
      const names = new Set<string>();
      space();
      if (text[index] === '}') { index++; return object; }
      for (;;) {
        space();
        if (text[index] !== '"') fail('expected a member name');
        const name = string();
        if (names.has(name)) fail(`duplicate member ${JSON.stringify(name)}`);
        names.add(name);
        space();
        if (text[index++] !== ':') fail('expected ":"');
        Object.defineProperty(object, name, {
          value: value(depth + 1), enumerable: true, writable: true, configurable: true,
        });
        space();
        if (text[index] === ',') { index++; continue; }
        if (text[index] === '}') { index++; return object; }
        fail('expected "," or "}"');
      }
    }
    if (next === '[') {
      index++;
      const array: unknown[] = [];
      space();
      if (text[index] === ']') { index++; return array; }
      for (;;) {
        array.push(value(depth + 1));
        space();
        if (text[index] === ',') { index++; continue; }
        if (text[index] === ']') { index++; return array; }
        fail('expected "," or "]"');
      }
    }
    if (next === '"') return string();
    const rest = text.slice(index);
    const literal = jsonLiteral.exec(rest)?.[0];
    if (literal) {
      index += literal.length;
      return JSON.parse(literal) as unknown;
    }
    const token = numberToken.exec(rest)?.[0];
    if (token === undefined) return fail('unexpected token');
    index += token.length;
    if (token.length > 64) fail('numeric token exceeds 64 ASCII characters');
    const number = Number(token);
    if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER)
      fail('number outside the I-JSON range');
    if (number === 0 && !zeroToken.test(token)) fail('number underflows to zero');
    return number;
  };
  const parsed = value(0);
  space();
  if (index !== text.length) fail('trailing content');
  return parsed;
}
