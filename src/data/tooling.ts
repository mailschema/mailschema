import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import selection from '../../docs/releases/current.json' with { type: 'json' };
import {
  assertPackageSet,
  type PackageContracts,
  type PackageRelease,
  type PackageSetSelection,
} from '../lib/package-release';

const contributionSchema = readFileSync(resolve('public/schemas/contribution.schema.json'), 'utf8');
const contribution = JSON.parse(contributionSchema);
const contracts: PackageContracts = {
  contribution: contributionSchema,
  'map-0.1': readFileSync(resolve('public/schemas/map-0.1.schema.json'), 'utf8'),
  'content-review-0.1': readFileSync(
    resolve('public/schemas/content-review-0.1.schema.json'),
    'utf8',
  ),
  record: `${JSON.stringify(
    { $schema: contribution.$schema, $defs: contribution.$defs, $ref: '#/$defs/record' },
    null,
    2,
  )}\n`,
};

const evidence = new Map<string, PackageRelease>();
for (const reference of new Set(selection.channels.map((entry) => entry.evidence)))
  evidence.set(
    reference,
    JSON.parse(readFileSync(resolve('docs/releases', `${reference}.json`), 'utf8')),
  );
const selectedChannels = assertPackageSet(selection as PackageSetSelection, evidence, contracts);
const channel = (name: string) => {
  const selected = selectedChannels.get(name);
  if (!selected) throw new Error(`Package registry ${name} is not selected for the website.`);
  return selected;
};
const npmRelease = channel('npm');
const pythonRelease = channel('PyPI');
const rustRelease = channel('crates.io');
const goRelease = channel('Go');
const versions = new Set(selectedChannels.values().map((entry) => entry.version));
const sharedVersion = [...versions][0];
export const packageSetLabel =
  versions.size === 1 ? `Package set ${sharedVersion}` : 'Verified package set';
export const packageContractCoverage = [...evidence.values()].every(
  (release) => release.format === 'mailschema-package-release/2',
);

export const tooling = [
  {
    id: 'javascript',
    name: 'JavaScript',
    registry: 'npm',
    release: npmRelease,
    runtime: 'Node.js 22+',
    title: 'Validate MAP at the boundary.',
    description:
      'Check MAP descriptions, requests, results and problems before your application trusts their fields.',
    install: `npm install mailschema@${npmRelease.version}`,
    command: `npx mailschema@${npmRelease.version} check description.json --map`,
    installLanguage: 'bash' as const,
    language: 'javascript' as const,
    filename: 'check-description.mjs',
    example: `import { readFile } from 'node:fs/promises';
import { assertMapDocument } from 'mailschema';

const description = JSON.parse(
  await readFile('description.json', 'utf8'),
);

assertMapDocument(description);`,
    exampleNote:
      'Returns normally for a valid MAP 0.1 document. Throws with field details when the contract does not match.',
    api: [
      {
        name: 'assertMapDocument(value) / mapErrors(value)',
        description: 'Validate a MAP 0.1 description, request, result or problem.',
      },
      {
        name: 'assertContentReviewRequest(value)',
        description: 'Apply the Content Review 0.1 request binding.',
      },
      {
        name: 'getMapSchema() / getContentReviewSchema()',
        description: 'Return independent copies of the protocol schemas.',
      },
      {
        name: 'assertContribution(value) / assertTypeRecord(value)',
        description: 'Validate Registry contributions and expanded type records.',
      },
      {
        name: 'referenceErrors(contribution, catalog)',
        description: 'Check exact Registry versions, profiles, digests and operations.',
      },
    ],
    exports:
      'Runtime validation, Registry reference checks and TypeScript definitions for Registry records.',
  },
  {
    id: 'python',
    name: 'Python',
    registry: 'PyPI',
    release: pythonRelease,
    runtime: 'Python 3.10+',
    title: 'Use the same contract in Python.',
    description:
      'Validate MAP 0.1 and Content Review documents locally with Draft 2020-12 format checking.',
    install: `python -m pip install mailschema==${pythonRelease.version}`,
    command: 'python -m mailschema check description.json --map',
    installLanguage: 'bash' as const,
    language: 'python' as const,
    filename: 'check_description.py',
    example: `import json
from pathlib import Path
from mailschema import validate_map_document

description = json.loads(
    Path("description.json").read_text()
)

validate_map_document(description)`,
    exampleNote:
      'Returns None for a valid MAP 0.1 document. Raises ValueError with field details when validation fails.',
    api: [
      {
        name: 'validate_map_document(value) / map_errors(value)',
        description: 'Validate a MAP 0.1 description, request, result or problem.',
      },
      {
        name: 'validate_content_review_request(value)',
        description: 'Apply the Content Review 0.1 request binding.',
      },
      {
        name: 'get_map_schema() / get_content_review_schema()',
        description: 'Return fresh copies of the protocol schemas.',
      },
      {
        name: 'validate_contribution(value) / validate_record(value)',
        description: 'Validate Registry contributions and expanded type records.',
      },
    ],
    exports: 'Local structure and format validation through the established jsonschema library.',
  },
  {
    id: 'rust',
    name: 'Rust',
    registry: 'crates.io',
    release: rustRelease,
    runtime: 'Rust 1.70+',
    title: 'Bundle exact schema bytes.',
    description:
      'Embed the MAP, Content Review and Registry schemas without a runtime dependency or network lookup.',
    install: `[dependencies]\nmailschema = "=${rustRelease.version}"`,
    command: null,
    installLanguage: 'toml' as const,
    language: 'rust' as const,
    filename: 'src/main.rs',
    example: `use mailschema::{MAP_0_1_SCHEMA, CONTENT_REVIEW_0_1_SCHEMA};

fn main() -> std::io::Result<()> {
    std::fs::write("map-0.1.schema.json", MAP_0_1_SCHEMA)?;
    std::fs::write(
        "content-review-0.1.schema.json",
        CONTENT_REVIEW_0_1_SCHEMA,
    )?;
    Ok(())
}`,
    exampleNote: 'Writes the canonical schemas to local files for use with your chosen validator.',
    api: [
      {
        name: 'MAP_0_1_SCHEMA / CONTENT_REVIEW_0_1_SCHEMA',
        description: 'The protocol schemas as static strings.',
      },
      {
        name: 'CONTRIBUTION_SCHEMA / RECORD_SCHEMA',
        description: 'The Registry schemas as static strings.',
      },
      {
        name: 'Schema::Map01.as_str() / Schema::ContentReview01.as_str()',
        description: 'Select a bundled protocol schema through the typed enum.',
      },
    ],
    exports:
      'Canonical schemas. Validation uses a Draft 2020-12 engine with format checking enabled.',
  },
  {
    id: 'go',
    name: 'Go',
    registry: 'Go',
    release: goRelease,
    runtime: 'Go 1.22+',
    title: 'Decode into protocol types.',
    description:
      'Use typed MAP documents, strict JSON decoding and core reference checks in a Go service or agent.',
    install: `go get github.com/mailschema/go@v${goRelease.version}`,
    command: null,
    installLanguage: 'bash' as const,
    language: 'go' as const,
    filename: 'main.go',
    example: `package main

import (
    "os"
    mailschema "github.com/mailschema/go"
)

func main() {
    request, err := mailschema.Decode[mailschema.Request](os.Stdin)
    if err != nil {
        panic(err)
    }
    if err := mailschema.ValidateRequest(request); err != nil {
        panic(err)
    }
}`,
    exampleNote:
      'Strict decoding rejects unknown fields. Core validation checks the fixed MAP identifiers and references.',
    api: [
      {
        name: 'Decode[T](reader)',
        description: 'Strictly decode a MAP document into its typed representation.',
      },
      {
        name: 'ValidateDescription / ValidateRequest',
        description: 'Check core MAP identifiers and references.',
      },
      {
        name: 'Schema(MAP01Schema)',
        description: 'Return an independent copy of a bundled schema.',
      },
    ],
    exports:
      'Typed descriptions, requests, results and problems, plus the MAP, Content Review and Registry schemas.',
  },
];

export const localCheckCommands = {
  javascript: `npx mailschema@${npmRelease.version} check contribution.json`,
  python: 'python -m mailschema check contribution.json',
};
export const recordCheckCommands = {
  javascript: `npx mailschema@${npmRelease.version} check content-review.json --record`,
  python: 'python -m mailschema check content-review.json --record',
};
