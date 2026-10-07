import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { typeRecords, currentCatalog } from '../src/data/types';
import { digest, parseImplementation } from '../src/map/core';
import { decide, type Proposal } from '../src/examples/approval';

test('current catalogue binds every rendered contract and example to its canonical source', () => {
  for (const record of typeRecords) {
    const source = JSON.parse(
      readFileSync(
        `specifications/map-0.3/contracts/${record.slug}-${record.version}.json`,
        'utf8',
      ),
    );
    expect(record.digest).toBe(digest(source));
    expect(record.operations).toEqual(source.operations);
    expect(record.requirements).toEqual(source.requirements);
    expect(record.example.type.contractDigest).toBe(digest(source));
    expect(currentCatalog.types.find((item) => item.slug === record.slug)?.digest).toBe(
      digest(source),
    );
    expect(record.exampleHref).toContain('/artifacts/map-0.3/');
  }
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
  expect(parseImplementation(JSON.stringify(record))).toEqual(record);
  expect(() =>
    parseImplementation(
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
    expect(decide(proposal, 'original', 'approve', true)).not.toBe('accepted');
    expect(proposal.queued).toBe(0);
  }
  const proposal = fresh();
  expect(decide(proposal, 'original', 'approve', false)).toBe('confirmation-required');
  expect(proposal.queued).toBe(0);
  expect(decide(proposal, 'original', 'approve', true)).toBe('accepted');
  expect(decide(proposal, 'original', 'approve', true)).toBe('already-decided');
  expect(proposal.queued).toBe(1);
  const declined = fresh();
  expect(decide(declined, 'original', 'decline', true)).toBe('declined');
  expect(decide(declined, 'original', 'approve', true)).toBe('already-decided');
  expect(declined.queued).toBe(0);
});
