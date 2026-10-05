import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../specifications/map-0.3/schemas/implementation.schema.json' with { type: 'json' };
import { parseMapJson } from './strict-json.ts';

export interface ImplementationRecord {
  service: string;
  maintainer: { name: string; url: string };
  type: { id: string; version: string; contractDigest: string };
  operations: string[];
  binding: string;
  artifact?: { url: string; digest: string; digestMode: 'canonical-json' | 'bytes' };
  format?: string;
  status: 'Draft' | 'Experimental' | 'Stable' | 'Deprecated' | 'Superseded';
  documentation: string;
  evidence: { kind: 'declaration' | 'test-report'; url: string; summary: string }[];
  successor?: string;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile<ImplementationRecord>(schema);

export function assertImplementation(value: unknown): asserts value is ImplementationRecord {
  if (!validate(value)) throw new Error(ajv.errorsText(validate.errors, { separator: '\n' }));
  const service = new URL(value.service);
  if (value.service !== service.origin && value.service !== `${service.origin}/`)
    throw new Error('Service must identify an HTTPS origin, not an operation path.');
  if (new Set(value.operations).size !== value.operations.length)
    throw new Error('Supported operation identifiers must be unique.');
}

export function parseImplementationText(input: string | Uint8Array): ImplementationRecord {
  const value = parseMapJson(input, 262144);
  assertImplementation(value);
  return value;
}
