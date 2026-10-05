import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { typeRecords, currentCatalog } from '../src/data/types';
import { assertContract } from '../src/specification/contracts';
import { parseImplementationText } from '../src/specification/implementations';
import { approve, type Proposal } from '../src/examples/approval';

test('current catalogue binds every rendered contract and example to its canonical source', () => {
  for (const record of typeRecords) {
    const source = JSON.parse(
      readFileSync(
        `specifications/map-0.3/contracts/${record.slug}-${record.version}.json`,
        'utf8',
      ),
    );
    const digest = `sha-256:${createHash('sha256').update(canonicalize(source)!).digest('hex')}`;
    expect(record.digest).toBe(digest);
    expect(record.operations).toEqual(source.operations);
    expect(record.requirements).toEqual(source.requirements);
    expect(record.example.type.contractDigest).toBe(digest);
    expect(currentCatalog.types.find((item) => item.slug === record.slug)?.digest).toBe(digest);
    expect(record.exampleHref).toContain('/artifacts/map-0.3/');
  }
});

test('contract intake rejects unbounded capabilities, duplicate operations and remote schemas', () => {
  const source = JSON.parse(
    readFileSync('specifications/map-0.3/contracts/campaign-send-approval-0.1.json', 'utf8'),
  );
  expect(() => assertContract(source)).not.toThrow();
  const duplicates = structuredClone(source);
  duplicates.operations.push(duplicates.operations[0]);
  expect(() => assertContract(duplicates)).toThrow(/unique/);
  const excess = structuredClone(source);
  excess.operations[1].effects.push('https://mailschema.org/effects/communication');
  expect(() => assertContract(excess)).toThrow(/scope/);
  const lifetime = structuredClone(source);
  lifetime.operations[1].capability.maxLifetimeSeconds = 604801;
  expect(() => assertContract(lifetime)).toThrow(/604800|maximum/);
  const remote = structuredClone(source);
  remote.detailsSchema = { $ref: 'https://untrusted.example/schema.json' };
  expect(() => assertContract(remote)).toThrow(/external/);
});

test('a service can declare built-in support without distributing a connector', () => {
  const type = typeRecords[0];
  const record = {
    service: 'https://example.org',
    maintainer: { name: 'Example', url: 'https://example.org' },
    type: { id: type.id, version: type.version, contractDigest: type.digest },
    operations: [type.operations[0].id],
    binding: 'https://example.org/map-binding',
    status: 'Draft',
    documentation: 'https://example.org/docs/map',
    evidence: [
      { kind: 'declaration', url: 'https://example.org/docs/map', summary: 'Supported operation.' },
    ],
  };
  expect(parseImplementationText(JSON.stringify(record))).toEqual(record);
  expect(() =>
    parseImplementationText(
      JSON.stringify({
        ...record,
        artifact: {
          url: 'https://example.org/connector.json',
          digest: type.digest,
          digestMode: 'canonical-json',
        },
      }),
    ),
  ).toThrow();
});

test('approval illustration commits once and cannot bypass confirmation or changed service state', () => {
  const fresh = (): Proposal => ({
    version: 'original',
    authorized: true,
    expired: false,
    decision: 'open',
    queued: 0,
  });
  for (const mutation of [
    { version: 'changed' },
    { authorized: false },
    { expired: true },
    { decision: 'declined' as const },
  ]) {
    const proposal = { ...fresh(), ...mutation };
    expect(approve(proposal, 'original', true)).not.toBe('accepted');
    expect(proposal.queued).toBe(0);
  }
  const proposal = fresh();
  expect(approve(proposal, 'original', false)).toBe('confirmation-required');
  expect(proposal.queued).toBe(0);
  expect(approve(proposal, 'original', true)).toBe('accepted');
  expect(approve(proposal, 'original', true)).toBe('already-decided');
  expect(proposal.queued).toBe(1);
});
