import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import contractSchema from '../../public/schemas/type-contract-0.1.schema.json' with { type: 'json' };
import type { TypeRecord } from './model';

const publicOrigin = 'https://mailschema.org';
const maxArtifactBytes = 256 * 1024;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

export interface TypeContract {
  kind: 'MapTypeContract';
  id: string;
  version: string;
  profile: string;
  target: string;
  requestSchema: { url: string; canonicalDigest: string };
  operations: {
    id: string;
    effect: string;
    results: { state: string; outputSchema: Record<string, unknown> | boolean }[];
  }[];
}

export interface TypeContractCatalogEntry {
  type: string;
  id: string;
  version: string;
  profile: string;
  contract: { url: string; canonicalDigest: string; sha256: string };
  requestSchema: { url: string; canonicalDigest: string; sha256: string };
  operations: string[];
}

const validateContract = ajv.compile<TypeContract>(contractSchema);

function regularFile(path: string) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular file: ${path}`);
  if (stat.size > maxArtifactBytes) throw new Error(`File exceeds 256 KiB: ${path}`);
  return readFileSync(path);
}

function parseJson(bytes: Buffer, path: string): unknown {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`Could not parse JSON: ${path}`);
  }
}

function sha256(bytes: string | Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalDigest(value: unknown) {
  const canonical = canonicalize(value);
  if (canonical === undefined) throw new Error('Artifact is not canonical JSON.');
  return `sha-256:${sha256(canonical)}`;
}

function stringConstants(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) stringConstants(item, found);
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) {
      if (key === 'const' && typeof item === 'string') found.add(item);
      else stringConstants(item, found);
    }
  return found;
}

export function assertTypeContract(value: unknown): asserts value is TypeContract {
  if (!validateContract(value))
    throw new Error(
      `Invalid executable type contract:\n${ajv.errorsText(validateContract.errors, { separator: '\n' })}`,
    );
  const operationIds = value.operations.map((operation) => operation.id);
  if (new Set(operationIds).size !== operationIds.length)
    throw new Error(`${value.id}@${value.version}: duplicate operation identifiers`);
  for (const operation of value.operations) {
    const states = operation.results.map((result) => result.state);
    if (new Set(states).size !== states.length)
      throw new Error(`${value.id}@${value.version}: duplicate ${operation.id} result states`);
  }
}

export function loadTypeContractCatalog(root = process.cwd()): TypeContractCatalogEntry[] {
  const directory = resolve(root, 'public/contracts');
  if (!existsSync(directory)) throw new Error(`Missing executable type contracts: ${directory}`);
  const entries = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file): TypeContractCatalogEntry => {
      const contractPath = resolve(directory, file);
      const contractBytes = regularFile(contractPath);
      const contractValue = parseJson(contractBytes, contractPath);
      assertTypeContract(contractValue);

      const type = new URL(contractValue.id).pathname.split('/').filter(Boolean).at(-1)!;
      if (file !== `${type}-${contractValue.version}.json`)
        throw new Error(`${file}: filename must match type identifier and version`);

      const schemaUrl = new URL(contractValue.requestSchema.url);
      if (schemaUrl.origin !== publicOrigin || !schemaUrl.pathname.startsWith('/schemas/'))
        throw new Error(`${file}: request schema must be a canonical MailSchema schema URL`);
      const schemaPath = resolve(root, 'public/schemas', basename(schemaUrl.pathname));
      const schemaBytes = regularFile(schemaPath);
      const schemaValue = parseJson(schemaBytes, schemaPath);
      if (
        !schemaValue ||
        typeof schemaValue !== 'object' ||
        !('$id' in schemaValue) ||
        schemaValue.$id !== contractValue.requestSchema.url
      )
        throw new Error(`${file}: request schema $id does not match its contract URL`);
      const foundDigest = canonicalDigest(schemaValue);
      if (foundDigest !== contractValue.requestSchema.canonicalDigest)
        throw new Error(`${file}: request schema canonical digest does not match the contract`);

      const constants = stringConstants(schemaValue);
      for (const expected of [
        contractValue.id,
        contractValue.version,
        ...contractValue.operations.map((operation) => operation.id),
      ])
        if (!constants.has(expected))
          throw new Error(`${file}: request schema does not bind ${expected}`);

      return {
        type,
        id: contractValue.id,
        version: contractValue.version,
        profile: contractValue.profile,
        contract: {
          url: `${publicOrigin}/contracts/${file}`,
          canonicalDigest: canonicalDigest(contractValue),
          sha256: sha256(contractBytes),
        },
        requestSchema: {
          url: contractValue.requestSchema.url,
          canonicalDigest: foundDigest,
          sha256: sha256(schemaBytes),
        },
        operations: contractValue.operations.map((operation) => operation.id),
      };
    })
    .sort((a, b) =>
      `${a.id}@${a.version}`.localeCompare(`${b.id}@${b.version}`, 'en', { numeric: true }),
    );

  const keys = entries.map((entry) => `${entry.id}@${entry.version}`);
  if (new Set(keys).size !== keys.length)
    throw new Error('Duplicate executable type contract version');
  const schemas = entries.map((entry) => entry.requestSchema.url);
  if (new Set(schemas).size !== schemas.length)
    throw new Error('Executable contract versions must use distinct request schemas');
  return entries;
}

export function assertContractCoverage(records: TypeRecord[], entries: TypeContractCatalogEntry[]) {
  const recordsByType = new Map(records.map((record) => [record.slug, record]));
  for (const entry of entries)
    if (!recordsByType.has(entry.type))
      throw new Error(`${entry.id}@${entry.version}: executable contract has no Registry record`);

  for (const record of records.filter((item) => item.status === 'Draft')) {
    const matches = entries.filter(
      (entry) => entry.type === record.slug && entry.version === record.version,
    );
    if (matches.length !== 1)
      throw new Error(`${record.slug}@${record.version}: expected one current executable contract`);
    const [entry] = matches;
    if (entry.profile !== record.profile)
      throw new Error(
        `${record.slug}@${record.version}: contract profile differs from Registry record`,
      );
    const recordOperations = record.operations.map((operation) => operation.id).sort();
    if (entry.operations.toSorted().join('\n') !== recordOperations.join('\n'))
      throw new Error(
        `${record.slug}@${record.version}: contract operations differ from Registry record`,
      );
  }
}
