// Checks the MAP 0.2 conformance manifest against the files it binds and the
// executable cases. `--write` regenerates the manifest after a deliberate change.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAP_PROFILE, MapArtifacts, sha256 } from '../src/map/artifacts.ts';
import { conformanceCases } from '../conformance/map-0.2/cases.mjs';

const root = process.cwd();
const manifestPath = resolve(root, 'conformance/map-0.2/manifest.json');
const matrix = JSON.parse(
  readFileSync(resolve(root, 'conformance/map-0.2/requirements.json'), 'utf8'),
);
const artifacts = new MapArtifacts(root);
const current = artifacts.contracts.filter((entry) => entry.contract.profile === MAP_PROFILE);

const filesUnder = (directory: string): string[] =>
  readdirSync(resolve(root, directory))
    .sort()
    .flatMap((name) => {
      const path = `${directory}/${name}`;
      return statSync(resolve(root, path)).isDirectory() ? filesUnder(path) : [path];
    });

const bound = [
  'public/profiles/map/0.2.json',
  'public/contexts/map-0.2.jsonld',
  'public/schemas/map-0.2.schema.json',
  'public/schemas/forms-0.1.schema.json',
  'public/schemas/type-contract-0.2.schema.json',
  ...current.flatMap((entry) => [
    `public/contracts/${entry.file}`,
    `public/schemas/${entry.requestSchema.url.split('/').at(-1)}`,
  ]),
  ...filesUnder('public/fixtures/map-0.2'),
  'src/map/artifacts.ts',
  'src/map/reference.ts',
  'src/map/behaviours.ts',
  'src/map/mail.ts',
  'conformance/map-0.2/examples.mjs',
  'conformance/map-0.2/build.mjs',
  'conformance/map-0.2/cases.mjs',
  'conformance/map-0.2/requirements.json',
  'scripts/map-fixtures.mjs',
  'tests/map-conformance.test.mjs',
];

const manifest = {
  format: 'mailschema-conformance/1',
  profile: MAP_PROFILE,
  types: current.map((entry) => ({
    id: entry.contract.id,
    version: entry.contract.version,
    contractDigest: entry.contractDigest,
  })),
  artifacts: bound.map((path) => ({ path, sha256: sha256(readFileSync(resolve(root, path))) })),
  cases: conformanceCases.map(({ id, title, expected }) => ({ id, title, expected })),
};

if (process.argv.includes('--write')) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Wrote the MAP 0.2 conformance manifest: ${bound.length} artifacts, ${manifest.cases.length} cases.`,
  );
} else {
  assert(existsSync(manifestPath), 'Missing conformance manifest; run npm run conformance:write');
  assert.deepEqual(
    JSON.parse(readFileSync(manifestPath, 'utf8')),
    manifest,
    'The conformance manifest is stale; review the change and run npm run conformance:write',
  );
}

assert.equal(matrix.format, 'mailschema-requirements/1');
assert.equal(matrix.profile, MAP_PROFILE);
const caseIds = new Set(conformanceCases.map((entry) => entry.id));
const covered = new Set<string>();
const requirementIds = new Set<string>();
for (const requirement of matrix.requirements) {
  assert.match(requirement.id, /^MAP-[A-Z]+-[0-9]{3}$/);
  assert(!requirementIds.has(requirement.id), `Duplicate requirement ID: ${requirement.id}`);
  requirementIds.add(requirement.id);
  assert.equal(typeof requirement.actor, 'string');
  assert.equal(typeof requirement.requirement, 'string');
  assert(
    requirement.cases?.length || requirement.manual,
    `${requirement.id} needs cases or manual evidence.`,
  );
  for (const id of requirement.cases ?? []) {
    assert(caseIds.has(id), `${requirement.id} names unknown case ${id}.`);
    covered.add(id);
  }
}
assert.deepEqual(
  [...caseIds].filter((id) => !covered.has(id)),
  [],
  'Every executable case supports at least one requirement.',
);

console.log(
  `Conformance manifest valid: ${manifest.types.length} types, ${bound.length} bound artifacts, ${manifest.cases.length} executable cases and ${matrix.requirements.length} mapped requirements.`,
);
