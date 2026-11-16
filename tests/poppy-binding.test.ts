import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { typeRecords } from '../src/data/types';

const chapter = readFileSync('specifications/map-0.3/poppy.md', 'utf8');
const schema = JSON.parse(
  readFileSync('specifications/map-0.3/schemas/poppy-extension.schema.json', 'utf8'),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// The extension example in the chapter, as listed under poppy.json's extensions.
const example = () => {
  const block = /```json\n("extensions": \{[\s\S]*?)\n```/.exec(chapter);
  if (!block) throw new Error('poppy.md: missing extensions example');
  return JSON.parse(`{${block[1]}}`).extensions['mailschema.org/map'][0];
};

test('the chapter example is a valid version 1 entry for a current contract', () => {
  const entry = example();
  expect(validate(entry), JSON.stringify(validate.errors)).toBe(true);
  for (const contract of entry.contracts) {
    const record = typeRecords.find(
      (item) => item.id === contract.id && item.version === contract.version,
    );
    expect(record?.digest).toBe(contract.contractDigest);
    for (const operation of Object.keys(contract.operations))
      expect(record?.operations.map((item) => item.id)).toContain(operation);
  }
});

test('an Operations submission must name the approvers it accepts', () => {
  const entry = example();
  delete entry.contracts[0].operations.approve.approvers;
  expect(validate(entry)).toBe(false);
});

test('a direct submission names no approvers and read is not an operation', () => {
  const direct = example();
  direct.contracts[0].operations.decline.approvers = ['user'];
  expect(validate(direct)).toBe(false);

  const read = example();
  read.contracts[0].operations.read = { submission: 'direct' };
  expect(validate(read)).toBe(false);
});

test('the binding identifier and profile are fixed', () => {
  expect(validate({ ...example(), binding: 'https://example.org/binding' })).toBe(false);
  expect(validate({ ...example(), profile: 'https://mailschema.org/profiles/map/0.2' })).toBe(
    false,
  );
});

test('the MCP URL carries no user information and operation identifiers stay within 64 characters', () => {
  expect(validate({ ...example(), mcp: 'https://user@api.service.example/mcp' })).toBe(false);
  expect(validate({ ...example(), mcp: 'https://api.service.example/mcp#tools' })).toBe(false);
  const long = example();
  long.contracts[0].operations['x'.repeat(65)] = { submission: 'direct' };
  expect(validate(long)).toBe(false);
});

test('the chapter defines every tool argument and result shape it relies on', () => {
  for (const argument of ['action', 'interaction_id', 'terms_id', 'terms_version', 'input'])
    expect(chapter).toContain(`| \`${argument}\` |`);
  for (const result of [
    'Read',
    'Decision taken or recorded',
    'Approval needed',
    'Approval declined',
    'Semantic condition',
  ])
    expect(chapter).toContain(`| ${result} |`);
});

test('human route origins are bare HTTPS origins and scopes are OAuth scope tokens', () => {
  expect(validate({ ...example(), human: ['https://app.service.example/review'] })).toBe(false);
  expect(validate({ ...example(), human: ['http://app.service.example'] })).toBe(false);
  const spaced = example();
  spaced.contracts[0].scopes = ['send approvals'];
  expect(validate(spaced)).toBe(false);
});

test('URLs in the entry parse as HTTPS URLs with a host and an optional numeric port', () => {
  expect(validate({ ...example(), mcp: 'https://api.service.example/mcp?tenant=1' })).toBe(true);
  expect(validate({ ...example(), human: ['https://app.service.example:8443'] })).toBe(true);
  for (const human of ['https://:', 'https://example.com:banana', 'https://App.Example'])
    expect(validate({ ...example(), human: [human] })).toBe(false);
});
