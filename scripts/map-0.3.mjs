// Draft artifacts only. This does not select a runtime profile or prepare packages.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import canonicalize from 'canonicalize';
import jsonld from 'jsonld';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = 'specifications/map-0.3';
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const encode = (value) => JSON.stringify(value, null, 2) + '\n';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const contractDigest = (value) => `sha-256:${sha(canonicalize(value))}`;
const profile = 'https://mailschema.org/profiles/map/0.3';
const contextId = 'https://mailschema.org/contexts/map-0.3.jsonld';
// Conditional requirements refer to properties declared in the containing schema.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const core = ajv.compile(json(`${directory}/schemas/core.schema.json`));
const format = ajv.compile(json(`${directory}/schemas/contract.schema.json`));
const assertValid = (validate, value, label) =>
  assert(validate(value), `${label}: ${JSON.stringify(validate.errors)}`);

const kinds = {
  refusal: { effects: ['refusal', 'state'], maximum: 604800 },
  'protective-report': { effects: ['protection', 'state'], maximum: 259200 },
  'address-confirmation': { effects: ['assertion', 'state'], maximum: 86400 },
};

function checkSchema(schema) {
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['$ref', '$dynamicRef'].includes(key))
        assert(typeof child === 'string' && child.startsWith('#'), 'External schema reference');
      walk(child);
    }
  };
  walk(schema);
  return ajv.compile(schema);
}

export const contracts = readdirSync(resolve(root, directory, 'contracts'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => {
    const path = `${directory}/contracts/${name}`;
    const contract = json(path);
    assertValid(format, contract, path);
    assert.equal(contract.profile, profile);
    assert.equal(new Set(contract.operations.map((op) => op.id)).size, contract.operations.length);
    assert(Buffer.byteLength(read(path)) <= 262144, 'Contract exceeds Core limit');
    for (const operation of contract.operations) {
      if (operation.inputSchema) checkSchema(operation.inputSchema);
      if (!operation.capability) continue;
      const kind = kinds[operation.capability.kind];
      assert.deepEqual(
        [...operation.effects].sort(),
        kind.effects.map((effect) => `https://mailschema.org/effects/${effect}`).sort(),
        `${path} ${operation.id}: disallowed capability effect`,
      );
      assert(operation.capability.maxLifetimeSeconds <= kind.maximum);
    }
    return {
      slug: name.slice(0, -5),
      path,
      contract,
      digest: contractDigest(contract),
      validateDetails: checkSchema(contract.detailsSchema),
    };
  });

export function contractText({ schemas = true } = {}) {
  const out = [
    '## Initial Registry contracts',
    '',
    'These four contracts are Draft Registry contributions, not a mandatory set of Core types. Their operation declarations and requirements below are generated from the digest-bound JSON contracts. No conforming runtime or independent interoperability is claimed. MailSchema maintains these initial contributions; other maintainers can use their own namespaces.',
    '',
  ];
  for (const { contract: c, digest } of contracts) {
    out.push(
      `### ${c.name}`,
      '',
      c.summary,
      '',
      `Identifier: \`${c.id}\`. Version: \`${c.version}\`. Profile: \`${c.profile}\`.`,
      '',
      `Canonical contract digest: \`${digest}\`.`,
      '',
      ...c.requirements.flatMap((r) => [r, '']),
    );
    for (const op of c.operations) {
      out.push(
        `**${op.name} (\`${op.id}\`).** ${op.semantics}`,
        '',
        `Bindings: ${op.bindings.map((s) => `\`${s}\``).join(', ')}. Actors: ${op.actors.join(', ')}. Exact terms: ${op.exactTerms ? 'required' : 'not required'}. Effects: ${op.effects.map((s) => `\`${s}\``).join(', ')}.`,
        '',
        op.inputSchema
          ? "Input: an object validated by the contract's input schema."
          : 'Input: none.',
        '',
      );
      if (op.capability)
        out.push(
          `Capability kind: \`${op.capability.kind}\`; maximum lifetime: ${op.capability.maxLifetimeSeconds} seconds.`,
          '',
        );
      for (const [id, meaning] of Object.entries(op.outcomes)) out.push(`- \`${id}\`: ${meaning}`);
      out.push('');
      if (schemas && op.inputSchema)
        out.push('```json', JSON.stringify(op.inputSchema, null, 2), '```', '');
    }
    if (schemas)
      out.push(
        'Details schema:',
        '',
        '```json',
        JSON.stringify(c.detailsSchema, null, 2),
        '```',
        '',
      );
  }
  return out.join('\n');
}

export async function draftArtifacts(check) {
  const write = (path, value) => {
    if (check) assert.equal(read(path), value, `${path} is stale; run npm run spec:generate`);
    else writeFileSync(resolve(root, path), value);
  };
  const source = json(`${directory}/examples/source.json`);
  assert.deepEqual(Object.keys(source).sort(), contracts.map((c) => c.slug).sort());
  const examples = new Map();
  for (const item of contracts) {
    const example = {
      '@context': contextId,
      '@type': 'MailAction',
      profile,
      type: { id: item.contract.id, version: item.contract.version, contractDigest: item.digest },
      ...source[item.slug],
    };
    assertValid(core, example, item.slug);
    assertValid(item.validateDetails, example.details, item.slug);
    assert(Date.parse(example.expiresAt) > Date.parse(example.issuedAt));
    assert.equal(example.type.contractDigest, item.digest);
    assert.equal(new Set(example.operations.map((op) => op.id)).size, example.operations.length);
    for (const offered of example.operations) {
      const operation = item.contract.operations.find((op) => op.id === offered.id);
      assert(operation, `Unknown operation ${offered.id}`);
      if (offered.capability) {
        assert(operation.capability, 'Capability not permitted');
        assert.equal(new URL(offered.capability.url).origin, example.service.id);
        assert(
          Date.parse(example.expiresAt) - Date.parse(example.issuedAt) <=
            operation.capability.maxLifetimeSeconds * 1000,
        );
      }
    }
    // Exercise JSON-LD offline: no identifier in an example may cause retrieval.
    const expanded = await Promise.resolve(
      jsonld.expand(example, {
        documentLoader: async (url) => {
          assert.equal(url, contextId, `Unexpected JSON-LD fetch: ${url}`);
          return {
            contextUrl: null,
            documentUrl: url,
            document: json(`${directory}/context.jsonld`),
          };
        },
      }),
    );
    assert.equal(expanded.length, 1);
    assert.equal(expanded[0]['https://mailschema.org/vocab/map/0.3#details'][0]['@type'], '@json');
    examples.set(item.slug, example);
    write(`${directory}/examples/${item.slug}.json`, encode(example));
  }

  const vectors = json('conformance/map-0.3/shape-vectors.json');
  for (const vector of vectors) {
    const value = structuredClone(examples.get(vector.example));
    assert(value, `Unknown example ${vector.example}`);
    for (const edit of vector.edits) {
      const segments = edit.path
        .split('/')
        .slice(1)
        .map((s) => s.replaceAll('~1', '/').replaceAll('~0', '~'));
      const key = segments.pop();
      const target = segments.reduce((obj, segment) => obj[segment], value);
      if (edit.op === 'remove') delete target[key];
      else {
        assert.equal(edit.op, 'replace');
        target[key] = edit.value;
      }
    }
    const item = contracts.find((c) => c.slug === vector.example);
    const valid = Boolean(core(value) && item.validateDetails(value.details));
    assert.equal(valid, vector.valid, vector.id);
  }

  const scenarios = json('conformance/map-0.3/scenarios.json');
  const ids = new Set();
  for (const scenario of scenarios) {
    assert(/^[a-z][a-z0-9-]+$/.test(scenario.id));
    assert(!ids.has(scenario.id), `Duplicate scenario ${scenario.id}`);
    ids.add(scenario.id);
    assert.equal(scenario.status, 'unimplemented');
    for (const field of ['roles', 'requirements', 'given', 'when', 'then'])
      assert(
        Array.isArray(scenario[field]) &&
          scenario[field].length &&
          scenario[field].every((value) => typeof value === 'string' && value.trim()),
        `${scenario.id}: missing ${field}`,
      );
    for (const role of scenario.roles)
      assert(['consumer', 'producer', 'service', 'http', 'capability', 'human'].includes(role));
    for (const reference of scenario.requirements) {
      const [path, anchor] = reference.split('#');
      const headings = [...read(path).matchAll(/^#{2,3} (.+)$/gm)].map((m) =>
        m[1]
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
      assert(headings.includes(anchor), `${scenario.id}: missing requirement ${reference}`);
    }
  }
  const artifacts = [
    'core.md',
    'http.md',
    'capability.md',
    'schemas/core.schema.json',
    'schemas/contract.schema.json',
    'context.jsonld',
  ].map((name) => ({ path: `${directory}/${name}`, sha256: sha(read(`${directory}/${name}`)) }));
  write(
    `${directory}/catalogue.json`,
    encode({
      profile,
      status: 'draft',
      published: false,
      notice: 'Draft build inventory, not a published profile or an active runtime catalogue.',
      artifacts,
      types: contracts.map((c) => ({
        id: c.contract.id,
        version: c.contract.version,
        contractDigest: c.digest,
        path: c.path,
        status: 'draft',
        implementationEvidence: [],
      })),
    }),
  );
  write(
    `${directory}/contracts.md`,
    '# MAP 0.3 initial contracts\n\nGenerated by `npm run spec:generate` from `contracts/*.json`. Edit those JSON documents; do not edit this projection.\n\n' +
      contractText(),
  );
  console.log(
    `MAP 0.3 draft: ${contracts.length} contracts, ${examples.size} offline JSON-LD examples, ${vectors.length} executable shape vectors; ${scenarios.length} runtime scenarios remain unimplemented.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await draftArtifacts(process.argv.includes('--check'));
