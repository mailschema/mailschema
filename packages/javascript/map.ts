import { readFileSync } from 'node:fs';

/** The MAP profile whose core artifacts this package carries. */
export const MAP_PROFILE = 'https://mailschema.org/profiles/map/0.2';

const artifact = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'));

/** A fresh copy of the MAP 0.2 core schema, as the profile record binds it by SHA-256. */
export function getMapSchema(): Record<string, unknown> {
  return artifact('map-0.2.schema.json');
}

/** A fresh copy of the MAP 0.2 JSON-LD context. */
export function getMapContext(): Record<string, unknown> {
  return artifact('map-0.2.jsonld');
}

/** A fresh copy of the type contract format every MAP 0.2 contract follows. */
export function getContractFormatSchema(): Record<string, unknown> {
  return artifact('type-contract-0.2.schema.json');
}

/** A fresh copy of the form fields block contracts pin. */
export function getFormsSchema(): Record<string, unknown> {
  return artifact('forms-0.1.schema.json');
}
