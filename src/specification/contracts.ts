import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../specifications/map-0.3/schemas/contract.schema.json' with { type: 'json' };
import { parseMapJson } from './strict-json.ts';

export interface Contract {
  id: string;
  version: string;
  profile: string;
  name: string;
  summary: string;
  requirements: string[];
  detailsSchema: Record<string, unknown>;
  operations: {
    id: string;
    name: string;
    semantics: string;
    effects: string[];
    bindings: string[];
    actors: string[];
    exactTerms: boolean;
    inputSchema: Record<string, unknown> | null;
    outcomes: Record<string, string>;
    capability?: { kind: string; maxLifetimeSeconds: number };
  }[];
}

const kinds: Record<string, { effects: string[]; maximum: number }> = {
  refusal: { effects: ['refusal', 'state'], maximum: 604800 },
  'protective-report': { effects: ['protection', 'state'], maximum: 259200 },
  'address-confirmation': { effects: ['assertion', 'state'], maximum: 86400 },
};

export function parseContractText(input: string | Uint8Array): Contract {
  const contract = parseMapJson(input, 262144);
  assertContract(contract);
  return contract;
}

export function assertContract(value: unknown): asserts value is Contract {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  const valid = ajv.compile<Contract>(schema);
  if (!valid(value)) throw new Error(ajv.errorsText(valid.errors, { separator: '\n' }));
  if (new TextEncoder().encode(JSON.stringify(value)).length > 262144)
    throw new Error('Contract exceeds the 256 KiB limit.');
  if (new Set(value.operations.map((operation) => operation.id)).size !== value.operations.length)
    throw new Error('Operation identifiers must be unique.');
  const checkSchema = (definition: Record<string, unknown>) => {
    function walk(node: unknown, depth = 0) {
      if (depth > 64) throw new Error('Schema nesting exceeds the checker limit.');
      if (!node || typeof node !== 'object') return;
      for (const [key, child] of Object.entries(node)) {
        if (
          ['$ref', '$dynamicRef'].includes(key) &&
          !(typeof child === 'string' && child.startsWith('#'))
        )
          throw new Error('Schemas must not retrieve external references.');
        walk(child, depth + 1);
      }
    }
    walk(definition);
    // Compile independently so a contributor's $id cannot collide with another schema.
    const validator = new Ajv2020({ strict: true, strictRequired: false });
    addFormats(validator);
    validator.compile(definition);
  };
  checkSchema(value.detailsSchema);
  for (const operation of value.operations) {
    if (operation.inputSchema) checkSchema(operation.inputSchema);
    if (!operation.capability) continue;
    const kind = kinds[operation.capability.kind];
    const expected = kind.effects
      .map((effect) => `https://mailschema.org/effects/${effect}`)
      .sort();
    if (operation.effects.toSorted().join('\n') !== expected.join('\n'))
      throw new Error(`${operation.id}: effects exceed the permitted capability scope.`);
    if (operation.capability.maxLifetimeSeconds > kind.maximum)
      throw new Error(`${operation.id}: capability lifetime exceeds its permitted maximum.`);
  }
}
