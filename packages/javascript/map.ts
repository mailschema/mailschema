import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import mapSchema from './map-0.1.schema.json' with { type: 'json' };
import contentReview01Schema from './content-review-0.1.schema.json' with { type: 'json' };
import contentReview01Contract from './content-review-0.1.contract.json' with { type: 'json' };
import contentReview02Schema from './content-review-0.2.schema.json' with { type: 'json' };
import contentReview02Contract from './content-review-0.2.contract.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addSchema(mapSchema);
const mapDocument = ajv.getSchema(mapSchema.$id)!;
const contentReview01Request = ajv.compile(contentReview01Schema);
const contentReview02Request = ajv.compile(contentReview02Schema);

function errors(validate: typeof mapDocument, value: unknown): string[] {
  if (validate(value)) return [];
  return (validate.errors || []).map(
    (error) =>
      `${error.instancePath || '/'} ${error.message}${error.keyword === 'required' ? `: ${error.params.missingProperty}` : ''}`,
  );
}

export function mapErrors(value: unknown): string[] {
  return errors(mapDocument, value);
}

export function assertMapDocument(value: unknown): void {
  const found = mapErrors(value);
  if (found.length) throw new Error(`Invalid MAP 0.1 document:\n${found.join('\n')}`);
}

export function contentReviewRequestErrors(value: unknown): string[] {
  return errors(contentReview02Request, value);
}

export function assertContentReviewRequest(value: unknown): void {
  const found = contentReviewRequestErrors(value);
  if (found.length) throw new Error(`Invalid Content Review 0.2 request:\n${found.join('\n')}`);
}

export function contentReview01RequestErrors(value: unknown): string[] {
  return errors(contentReview01Request, value);
}

export function assertContentReview01Request(value: unknown): void {
  const found = contentReview01RequestErrors(value);
  if (found.length) throw new Error(`Invalid Content Review 0.1 request:\n${found.join('\n')}`);
}

export function getMapSchema(): Record<string, unknown> {
  return structuredClone(mapSchema);
}

export function getContentReviewSchema(): Record<string, unknown> {
  return structuredClone(contentReview02Schema);
}

export function getContentReviewContract(): Record<string, unknown> {
  return structuredClone(contentReview02Contract);
}

export function getContentReview01Schema(): Record<string, unknown> {
  return structuredClone(contentReview01Schema);
}

export function getContentReview01Contract(): Record<string, unknown> {
  return structuredClone(contentReview01Contract);
}
