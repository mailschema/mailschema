// An implementation record: a Registry declaration or report of a service's support for exact
// contract versions.
import {
  CONTRACT_MAX_BYTES,
  createValidator,
  implementationSchema,
  schemaErrors,
} from './artifacts.ts';
import { InvalidDocument, parse } from './json.ts';

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

const validate = createValidator().compile<ImplementationRecord>(implementationSchema);

/** Why the value is not an implementation record, or no reasons. */
export function implementationErrors(value: unknown): string[] {
  if (!validate(value)) return schemaErrors(validate.errors);
  const errors: string[] = [];
  const { origin } = new URL(value.service);
  if (value.service !== origin && value.service !== `${origin}/`)
    errors.push('/service: must be an HTTPS origin, not an operation path');
  if (new Set(value.operations).size !== value.operations.length)
    errors.push('/operations: identifiers must be unique');
  return errors;
}

/** The record in the bytes or text, or InvalidDocument with every reason it is not one. */
export function parseImplementation(input: string | Uint8Array): ImplementationRecord {
  const value = parse(input, CONTRACT_MAX_BYTES);
  const errors = implementationErrors(value);
  if (errors.length) throw new InvalidDocument('The value is not an implementation record.', errors);
  return value as ImplementationRecord;
}
