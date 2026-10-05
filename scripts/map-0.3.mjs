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
import { walkthroughArtifacts } from './map-walkthrough.mjs';
import { interfaceResearch, interfaceLandscape } from './interface-research.mjs';
import { parseContractText } from '../src/specification/contracts.ts';
import { parseMapJson } from '../src/specification/strict-json.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = 'specifications/map-0.3';
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => parseMapJson(readFileSync(resolve(root, path)), 262144);
const encode = (value) => JSON.stringify(value, null, 2) + '\n';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const contractDigest = (value) => `sha-256:${sha(canonicalize(value))}`;
const profile = 'https://mailschema.org/profiles/map/0.3';
const contextId = 'https://mailschema.org/contexts/map-0.3.jsonld';
// Conditional requirements refer to properties declared in the containing schema.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const core = ajv.compile(json(`${directory}/schemas/core.schema.json`));
const assertValid = (validate, value, label) =>
  assert(validate(value), `${label}: ${JSON.stringify(validate.errors)}`);

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
    const contract = parseContractText(readFileSync(resolve(root, path)));
    const suffix = `-${contract.version}.json`;
    assert(name.endsWith(suffix), `${name}: filename must end with its contract version`);
    const slug = name.slice(0, -suffix.length);
    assert(/^[a-z][a-z0-9-]*$/.test(slug), `${name}: invalid page slug`);
    return {
      slug,
      path,
      contract,
      digest: contractDigest(contract),
      validateDetails: checkSchema(contract.detailsSchema),
    };
  });
const registryMetadata = json(`${directory}/registry.json`);
assert.equal(
  new Set(contracts.map((item) => `${item.contract.id}\n${item.contract.version}`)).size,
  contracts.length,
  'Duplicate contract identifier and version',
);
const currentContracts = contracts.filter(
  (item) => registryMetadata[item.slug]?.current === item.contract.version,
);
assert.deepEqual(
  Object.keys(registryMetadata).sort(),
  [...new Set(contracts.map((item) => item.slug))].sort(),
);
for (const [slug, record] of Object.entries(registryMetadata)) {
  assert.deepEqual(
    Object.keys(record.versions).sort(),
    contracts
      .filter((item) => item.slug === slug)
      .map((item) => item.contract.version)
      .sort(),
    `${slug}: each contract version needs Registry metadata`,
  );
  assert(
    currentContracts.some((item) => item.slug === slug),
    `${slug}: no current contract version`,
  );
}

export function contractText({
  schemas = true,
  reader = false,
  only,
  onlyVersion,
  title = 'Initial Registry contracts',
} = {}) {
  const selected = contracts.filter(
    (item) =>
      (!only || item.slug === only) && (!onlyVersion || item.contract.version === onlyVersion),
  );
  if (only && selected.length !== 1)
    throw new Error(`Missing or ambiguous draft example contract: ${only} ${onlyVersion || ''}`);
  const out = [
    `## ${title}`,
    '',
    only
      ? 'This pinned contract revision illustrates how a type defines operations, effects, exact terms and permitted bindings. It is an example, not a required MAP type. The versioned JSON contract is its authoritative definition.'
      : 'These contracts define separate interactions. Each specifies its operations, effects, exact terms and permitted bindings. Implementations select the types they support; Core does not require this collection. MailSchema maintains the initial contributions, and other maintainers can define types in their own namespaces. The JSON contract is the authoritative definition.',
    '',
  ];
  for (const { contract: c, digest, slug } of selected) {
    out.push(
      `${reader ? '##' : '###'} ${c.name}`,
      '',
      c.summary,
      '',
      reader
        ? `[Contract and schemas](/registry/${slug}) · [JSON definition](/artifacts/map-0.3/contracts/${slug}-${c.version}.json)`
        : `Identifier: \`${c.id}\`. Version: \`${c.version}\`. Profile: \`${c.profile}\`.`,
      '',
      ...(reader ? [] : [`Canonical contract digest: \`${digest}\`.`, '']),
      ...(reader
        ? [
            '### Requirements',
            '',
            ...c.requirements.map((requirement, index) => `${index + 1}. ${requirement}`),
            '',
            '### Operations',
            '',
          ]
        : c.requirements.flatMap((requirement) => [requirement, ''])),
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
  const interfaces = json('docs/research/map-interfaces.json');
  write('docs/research/MAP-INTERFACES.md', interfaceResearch(interfaces));
  const interfaceChapter = read(`${directory}/interfaces.md`);
  const landscape = /<!-- interfaces:table -->[\s\S]*?<!-- \/interfaces:table -->/;
  assert(landscape.test(interfaceChapter), 'Interface chapter is missing its generated landscape');
  write(
    `${directory}/interfaces.md`,
    interfaceChapter.replace(
      landscape,
      `<!-- interfaces:table -->\n${interfaceLandscape(interfaces)}\n<!-- /interfaces:table -->`,
    ),
  );
  assert.deepEqual(Object.keys(source).sort(), currentContracts.map((c) => c.slug).sort());
  const content = read(`${directory}/examples/publication.md`);
  source['publication-approval'].details.content.title = content.split('\n')[0].replace(/^# /, '');
  source['publication-approval'].details.content.digest = `sha-256:${sha(content)}`;
  const examples = new Map();
  for (const item of currentContracts) {
    const example = {
      '@context': contextId,
      '@type': 'MailAction',
      profile,
      type: { id: item.contract.id, version: item.contract.version, contractDigest: item.digest },
      ...source[item.slug],
    };
    parseMapJson(encode(example), 65536);
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

  // One authored native API description; type identity and service example are projections.
  const api = json(`${directory}/bindings/publication.source.json`);
  const publication = examples.get('publication-approval');
  api.paths['/reviews'].get.responses['200'].content['application/json'].example = {
    review_id: 'p7',
    interaction: publication['@id'],
    service: publication.service,
    addressed_to: publication.recipient,
    subject: publication.subject,
    contract: publication.type,
    reference: publication.terms.id,
    revision: publication.terms.version,
    expires_at: publication.expiresAt,
    allowed_actions: publication.operations.map((operation) => operation.id),
    publication: publication.details,
    state: 'awaiting_review',
  };
  walkthroughArtifacts({
    publication,
    api,
    coreSchema: json(`${directory}/schemas/core.schema.json`),
    content,
    write,
    directory,
    encode,
  });
  write(`${directory}/bindings/publication.openapi.json`, encode(api));

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
    const item = currentContracts.find((c) => c.slug === vector.example);
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
    'overview.md',
    'interfaces.md',
    'core.md',
    'http.md',
    'bindings.md',
    'registry.md',
    'capability.md',
    'schemas/core.schema.json',
    'schemas/contract.schema.json',
    'schemas/implementation.schema.json',
    'bindings/publication.openapi.json',
    'bindings/publication.mcp.json',
    'examples/publication.eml',
    'examples/publication-exchange.json',
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
      })),
    }),
  );
  write(
    `${directory}/contracts.md`,
    '---\ndescription: "Operation semantics, effects and schemas for the initial type contracts."\n---\n\n# Type contracts\n\n' +
      contractText({ schemas: false, reader: true }),
  );
  console.log(
    `MAP 0.3 draft: ${contracts.length} contracts, ${examples.size} offline JSON-LD examples, ${vectors.length} executable shape vectors; ${scenarios.length} runtime scenarios remain unimplemented.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await draftArtifacts(process.argv.includes('--check'));
