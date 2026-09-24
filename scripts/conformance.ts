import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import canonicalize from 'canonicalize';
import { conformanceCases } from '../conformance/map-0.1/cases.mjs';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path));
const manifest = JSON.parse(read('conformance/map-0.1/manifest.json').toString('utf8'));
const matrix = JSON.parse(read('conformance/map-0.1/requirements.json').toString('utf8'));

assert.equal(manifest.format, 'mailschema-conformance/1');
assert.equal(manifest.profile, 'https://mailschema.org/profiles/map/0.1');
const paths = new Set<string>();
for (const artifact of manifest.artifacts) {
  assert(!paths.has(artifact.path), `Duplicate conformance artifact: ${artifact.path}`);
  paths.add(artifact.path);
  const digest = createHash('sha256').update(read(artifact.path)).digest('hex');
  assert.equal(digest, artifact.sha256, `Stale conformance digest: ${artifact.path}`);
}

const contract = JSON.parse(read('public/contracts/content-review-0.2.json').toString('utf8'));
const contractBytes = canonicalize(contract);
assert.notEqual(contractBytes, undefined);
const contractDigest = createHash('sha256').update(contractBytes!).digest('hex');
assert.equal(manifest.type.id, 'https://mailschema.org/types/content-review');
assert.equal(manifest.type.version, contract.version);
assert.equal(manifest.type.contractDigest, `sha-256:${contractDigest}`);
assert.deepEqual(
  manifest.cases.map((entry: { id: string }) => entry.id),
  conformanceCases.map((entry) => entry.id),
  'The manifest must name every executable conformance case in execution order.',
);
for (const [index, entry] of manifest.cases.entries()) {
  assert.equal(entry.title, conformanceCases[index].title, `${entry.id}: stale case title`);
  assert.equal(entry.expected, conformanceCases[index].expected, `${entry.id}: stale expectation`);
}

assert.equal(matrix.format, 'mailschema-requirements/1');
assert.equal(matrix.profile, manifest.profile);
const requirementIds = new Set<string>();
const executedCaseIds = new Set(conformanceCases.map((entry) => entry.id));
for (const requirement of matrix.requirements) {
  assert.match(requirement.id, /^MAP-[A-Z]+-[0-9]{3}$/);
  assert(!requirementIds.has(requirement.id), `Duplicate requirement ID: ${requirement.id}`);
  requirementIds.add(requirement.id);
  assert.equal(typeof requirement.actor, 'string');
  assert.equal(typeof requirement.requirement, 'string');
  assert(
    requirement.cases?.length || requirement.manual,
    `${requirement.id} needs executable cases or explicit manual evidence.`,
  );
  for (const caseId of requirement.cases ?? [])
    assert(executedCaseIds.has(caseId), `${requirement.id} names unknown case ${caseId}.`);
}

console.log(
  `Conformance manifest valid: ${manifest.artifacts.length} bound artifacts, ${manifest.cases.length} executable cases and ${matrix.requirements.length} mapped requirements.`,
);
