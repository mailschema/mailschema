import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  Contract,
  contractErrors,
  DESCRIPTION_MAX_BYTES,
  descriptionErrors,
  digest,
  implementationErrors,
  parse,
  parseDescription,
  sha256,
  type ContractDocument,
  type Description,
} from '../src/map/core';

const directory = 'specifications/map-0.3';
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
interface JsonVector {
  name: string;
  json: string;
  valid: boolean;
  canonical?: string;
  digest?: string;
}
interface ShapeVector {
  id: string;
  example: string;
  edits: { op: 'replace' | 'remove'; path: string; value?: unknown }[];
  valid: boolean;
}
const vectors = <T>(name: string): T[] => json(`conformance/map-0.3/${name}`);
const contracts = new Map(
  readdirSync(`${directory}/contracts`).map((name) => [
    name.replace(/-[0-9.]+\.json$/, ''),
    Contract.parse(readFileSync(`${directory}/contracts/${name}`)),
  ]),
);
const example = (slug: string): Description => json(`${directory}/examples/${slug}.json`);
const campaign = (): ContractDocument =>
  json(`${directory}/contracts/campaign-send-approval-0.1.json`);

describe('MAP JSON', () => {
  it('computes SHA-256 as node:crypto does, at every padding boundary', () => {
    for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000])
      for (let round = 0; round < 8; round += 1) {
        const bytes = randomBytes(length);
        expect(sha256(bytes)).toBe(createHash('sha256').update(bytes).digest('hex'));
      }
    expect(sha256('é€😀')).toBe(createHash('sha256').update('é€😀').digest('hex'));
  });

  it.each(vectors<JsonVector>('json-vectors.json'))('$name', (vector) => {
    if (!vector.valid) expect(() => parse(vector.json, DESCRIPTION_MAX_BYTES)).toThrow();
    else expect(canonicalize(parse(vector.json, DESCRIPTION_MAX_BYTES))).toBe(vector.canonical);
  });

  it.each(vectors<JsonVector>('jcs-vectors.json'))('RFC 8785: $name', (vector) => {
    expect(canonicalize(JSON.parse(vector.json))).toBe(vector.canonical);
    expect(digest(JSON.parse(vector.json))).toBe(vector.digest);
  });

  it('refuses invalid UTF-8 rather than replacing it', () => {
    expect(() => parse(Uint8Array.from([0x7b, 0x22, 0xff, 0x22, 0x7d]), 100)).toThrow(/UTF-8/);
  });
});

describe('descriptions', () => {
  it.each(vectors<ShapeVector>('shape-vectors.json'))('$id', (vector) => {
    const value = structuredClone(example(vector.example)) as unknown as Record<string, unknown>;
    for (const edit of vector.edits) {
      const segments = edit.path
        .split('/')
        .slice(1)
        .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
      const key = segments.pop()!;
      const target = segments.reduce(
        (node, segment) => node[segment] as Record<string, unknown>,
        value,
      );
      if (edit.op === 'remove') delete target[key];
      else target[key] = edit.value;
    }
    const contract = contracts.get(vector.example)!;
    const valid =
      !descriptionErrors(value).length && !contract.detailsErrors(value.details).length;
    expect(valid).toBe(vector.valid);
  });

  it('accepts every published example under its contract', () => {
    for (const [slug, contract] of contracts) {
      const description = parseDescription(readFileSync(`${directory}/examples/${slug}.json`));
      expect(contract.descriptionErrors(description)).toEqual([]);
    }
  });

  it('refuses identifiers with formatting characters and expiry before issuance', () => {
    const description = example('publication-approval');
    expect(descriptionErrors({ ...description, recipient: 'owner\u202e@example.net' })).toEqual([
      '/recipient: must not contain whitespace, controls or formatting characters',
    ]);
    expect(descriptionErrors({ ...description, expiresAt: description.issuedAt })).toEqual([
      '/expiresAt: must be later than issuedAt',
    ]);
  });

  it('checks a description against the contract it names', () => {
    const contract = contracts.get('email-address-confirmation')!;
    const description = example('email-address-confirmation');
    const capability = description.operations[0].capability!;
    const elsewhere = structuredClone(description);
    elsewhere.operations[0].capability = { url: capability.url.replace('service.example', 'other.example') };
    expect(contract.descriptionErrors(elsewhere)).toEqual([
      "/operations/0/capability/url: must have the service's origin",
    ]);
    const long = { ...description, expiresAt: '2026-10-04T08:00:01Z' };
    expect(contract.descriptionErrors(long)).toEqual([
      '/expiresAt: a confirm capability lasts at most 86400 seconds',
    ]);
    const other = structuredClone(description);
    other.type.contractDigest = contracts.get('publication-approval')!.digest;
    other.operations.push({ id: 'approve' });
    expect(contract.descriptionErrors(other)).toEqual([
      '/type/contractDigest: does not match',
      '/operations/1/id: approve is not an operation of this contract',
    ]);
  });
});

describe('contracts', () => {
  it('identifies each published contract by the digest its examples carry', () => {
    for (const [slug, contract] of contracts)
      expect(example(slug).type.contractDigest).toBe(contract.digest);
  });

  it('checks operation input against the operation', () => {
    const contract = contracts.get('publication-approval')!;
    expect(contract.inputErrors('approve', undefined)).toEqual([]);
    expect(contract.inputErrors('approve', {})).toEqual(['/input: this operation accepts no input']);
    expect(contract.inputErrors('publish', undefined)).toEqual([
      '/operation: publish is not an operation of this contract',
    ]);
    expect(contract.inputErrors('request-changes', {})).not.toEqual([]);
  });

  it.each([
    ['repeats an operation', (c: ContractDocument) => c.operations.push(c.operations[0]), /unique/],
    [
      'gives a capability another effect',
      (c: ContractDocument) => c.operations[1].effects.push('https://mailschema.org/effects/communication'),
      /declares exactly/,
    ],
    [
      'gives a capability a longer lifetime',
      (c: ContractDocument) => (c.operations[1].capability!.maxLifetimeSeconds = 604801),
      /604800/,
    ],
    [
      'references a remote schema',
      (c: ContractDocument) => (c.detailsSchema = { $ref: 'https://untrusted.example/schema.json' }),
      /\$ref is a JSON Pointer to a schema within this schema/,
    ],
    [
      'references a definition it does not have',
      (c: ContractDocument) =>
        (c.detailsSchema = { $defs: { unused: { $ref: '#/$defs/missing' } }, type: 'object' }),
      /\$ref is a JSON Pointer to a schema within this schema/,
    ],
    [
      'refers back to itself without moving into the value',
      (c: ContractDocument) =>
        (c.detailsSchema = { type: 'object', properties: { a: { $ref: '#/properties/a' } } }),
      /\$ref leads back without moving into the value/,
    ],
    [
      'uses a keyword outside MAP',
      (c: ContractDocument) => (c.detailsSchema = { type: 'object', $dynamicRef: '#meta' }),
      /\$dynamicRef is not a MAP schema keyword/,
    ],
    [
      'asserts a format outside MAP',
      (c: ContractDocument) => (c.detailsSchema = { type: 'string', format: 'hostname' }),
      /format is one of/,
    ],
    [
      'uses a pattern engines read differently',
      (c: ContractDocument) => (c.detailsSchema = { type: 'string', pattern: '^\\s+$' }),
      /the escape \\s/,
    ],
    [
      'moves the dialect inside a schema',
      (c: ContractDocument) =>
        (c.detailsSchema = { properties: { a: { $schema: 'https://json-schema.org/draft/2020-12/schema' } } }),
      /at the schema's root only/,
    ],
  ])('refuses a contract that %s', (_name, mutate, reason) => {
    const contract = campaign();
    mutate(contract);
    expect(contractErrors(contract).join('\n')).toMatch(reason);
    expect(() => new Contract(contract)).toThrow(/not a MAP 0.3 type contract/);
  });
});

describe('implementation records', () => {
  it('refuses an operation path in place of a service origin', () => {
    const contract = contracts.get('campaign-send-approval')!;
    const record = {
      service: 'https://example.org/map',
      maintainer: { name: 'Example', url: 'https://example.org' },
      type: { id: contract.id, version: contract.version, contractDigest: contract.digest },
      operations: ['approve'],
      binding: 'https://example.org/map-binding',
      status: 'Draft',
      documentation: 'https://example.org/docs/map',
      evidence: [{ kind: 'declaration', url: 'https://example.org/docs/map', summary: 'Supported.' }],
    };
    expect(implementationErrors(record)).toEqual([
      '/service: must be an HTTPS origin, not an operation path',
    ]);
  });
});
