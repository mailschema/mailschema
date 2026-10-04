import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseContractText } from '../src/specification/contracts.ts';
import { parseMapJson } from '../src/specification/strict-json.ts';

describe('MAP 0.3 source JSON', () => {
  it('accepts each published draft contract from its original bytes', () => {
    for (const name of readdirSync('specifications/map-0.3/contracts').filter(name => name.endsWith('.json'))) {
      const bytes = readFileSync(`specifications/map-0.3/contracts/${name}`);
      expect(parseContractText(bytes)).toHaveProperty('id');
    }
  });

  it.each([
    ['duplicate member after unescaping', '{"a":1,"\\u0061":2}'],
    ['number that underflows to zero', '{"a":1e-400}'],
    ['numeric token longer than 64 characters', `{"a":1e${'0'.repeat(65)}1}`],
    ['number outside the exact range', '{"a":9007199254740992}'],
    ['unpaired surrogate', '{"a":"\\ud800"}'],
    ['Unicode noncharacter', '{"a":"\\uffff"}'],
    ['byte order mark', '\ufeff{"a":1}'],
  ])('rejects a %s before ordinary JSON parsing', (_name, source) => {
    expect(() => parseMapJson(source, 262144)).toThrow();
  });

  it('rejects invalid UTF-8 bytes without replacement characters', () => {
    expect(() => parseMapJson(Uint8Array.from([0x7b, 0x22, 0xff, 0x22, 0x7d]), 262144)).toThrow();
  });

  it('accepts exact zero and a rounded value within range', () => {
    expect(parseMapJson('{"zero":0e-400,"limit":9007199254740991.4}', 262144))
      .toEqual({ zero: 0, limit: 9007199254740991 });
  });
});
