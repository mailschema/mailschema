import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import selection from '../../docs/releases/current.json' with { type: 'json' };
import { packageContractBytes } from '../lib/package-artifacts';
import {
  assertPackageSet,
  type PackageContracts,
  type PackageRelease,
  type PackageReleaseChannel,
  type PackageSetSelection,
} from '../lib/package-release';

const contracts = packageContractBytes() as PackageContracts;

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
const rubyRelease = channel('RubyGems');

/** The MAP version a selected release implements: the one core schema its evidence binds. */
function mapVersion(registry: string) {
  const selected = selection.channels.find((entry) => entry.registry === registry)!;
  const versions = (evidence.get(selected.evidence)!.contracts ?? []).flatMap(
    (contract) => /^map-(\d+\.\d+)$/.exec(contract.name)?.[1] ?? [],
  );
  if (versions.length !== 1)
    throw new Error(`The ${registry} release must bind exactly one MAP core schema.`);
  return versions[0];
}
const versions = new Set(selectedChannels.values().map((entry) => entry.version));
const sharedVersion = [...versions][0];
export const packageSetLabel =
  versions.size === 1 ? `Package set ${sharedVersion}` : 'Verified package set';

/** The Ruby tab. */
export const rubyTool = (release: PackageReleaseChannel, map: string) => ({
  id: 'ruby',
  name: 'Ruby',
  registry: 'RubyGems',
  release,
  runtime: 'Ruby 3.3+',
  map,
  note: undefined,
  title: 'Run the MAP 0.2 lifecycle in Ruby.',
  description:
    'Parse and digest MAP documents, verify the contracts you vendor, and build results and problems the core accepts.',
  install: `gem install mailschema -v ${release.version}`,
  command: null,
  installLanguage: 'bash' as const,
  language: 'ruby' as const,
  filename: 'check_description.rb',
  example: `require "mailschema"

description = Mailschema.parse(File.read("description.json"))
errors = Mailschema.description_errors(description)
raise errors.join("\\n") if errors.any?`,
  exampleNote:
    'Parses the file as I-JSON within the MAP limits, or raises. Lists every error when the description breaks the MAP 0.2 core.',
  api: [
    {
      name: 'Mailschema.parse(json) / Mailschema.digest(value)',
      description: 'Read a MAP document as I-JSON and compute its RFC 8785 digest.',
    },
    {
      name: 'Mailschema::Contract.new(contract, schema, digest:)',
      description: 'Verify a vendored type contract against the digest you pinned.',
    },
    {
      name: 'contract.description_errors / request_problem / input_errors',
      description: 'Check descriptions, requests and inputs against the contract.',
    },
    {
      name: 'Mailschema.result / Mailschema.problem',
      description: 'Build results and problems the core accepts.',
    },
  ],
  exports: 'MAP 0.2 parsing, RFC 8785 digests, contract verification, validation and documents.',
});

export const tooling = [
  {
    id: 'javascript',
    name: 'JavaScript',
    registry: 'npm',
    release: npmRelease,
    runtime: 'Node.js 22+',
    map: mapVersion('npm'),
    title: 'Run the MAP 0.2 lifecycle in JavaScript.',
    description:
      'Parse and digest MAP documents, verify the contracts you vendor, build results and problems the core accepts, and check Registry files.',
    install: `npm install mailschema@${npmRelease.version}`,
    command: `npx mailschema@${npmRelease.version} check contribution.json`,
    installLanguage: 'bash' as const,
    language: 'javascript' as const,
    filename: 'check-description.mjs',
    example: `import { readFile } from 'node:fs/promises';
import { descriptionErrors, parse } from 'mailschema';

const description = parse(await readFile('description.json'));
const errors = descriptionErrors(description);
if (errors.length) throw new Error(errors.join('\\n'));`,
    exampleNote:
      'Parses the file as I-JSON within the MAP limits, or throws. Lists every error when the description breaks the MAP 0.2 core.',
    api: [
      {
        name: 'parse(text) / digest(value)',
        description: 'Read a MAP document as I-JSON and compute its RFC 8785 digest.',
      },
      {
        name: 'new Contract(contract, schema, { digest })',
        description: 'Verify a vendored type contract against the digest you pinned.',
      },
      {
        name: 'contract.descriptionErrors / requestProblem / inputErrors',
        description: 'Check descriptions, requests and inputs against the contract.',
      },
      {
        name: 'result() / problem()',
        description: 'Build results and problems the core accepts.',
      },
      {
        name: 'assertContribution(value) / referenceErrors(contribution, catalog)',
        description: 'Validate Registry contributions against the exact Registry versions.',
      },
    ],
    exports:
      'MAP 0.2 parsing, RFC 8785 digests, contract verification, validation and documents; the core artifacts; Registry validation; TypeScript definitions.',
  },
  {
    id: 'python',
    name: 'Python',
    registry: 'PyPI',
    release: pythonRelease,
    runtime: 'Python 3.10+',
    map: mapVersion('PyPI'),
    title: 'The same artifacts in Python.',
    description:
      'The MAP 0.2 core artifacts, and Draft 2020-12 checks for Registry contributions and records.',
    install: `python -m pip install mailschema==${pythonRelease.version}`,
    command: 'python -m mailschema check contribution.json',
    installLanguage: 'bash' as const,
    language: 'python' as const,
    filename: 'check_contribution.py',
    example: `import json
from pathlib import Path
from mailschema import validate_contribution

validate_contribution(
    json.loads(Path("contribution.json").read_text())
)`,
    exampleNote:
      'Raises ValueError with field details when the contribution does not match the Registry schema.',
    api: [
      {
        name: 'get_map_schema() / get_map_context()',
        description: 'The MAP 0.2 core schema and JSON-LD context.',
      },
      {
        name: 'get_contract_format_schema() / get_forms_schema()',
        description: 'The contract format and the form fields block contracts pin.',
      },
      {
        name: 'validate_contribution(value) / validate_record(value)',
        description: 'Validate Registry contributions and expanded type records.',
      },
    ],
    exports: 'The MAP 0.2 core artifacts and Registry validation through the jsonschema library.',
  },
  {
    id: 'rust',
    name: 'Rust',
    registry: 'crates.io',
    release: rustRelease,
    runtime: 'Rust 1.70+',
    map: mapVersion('crates.io'),
    note: 'MAP schemas never use format; the Registry schemas check URIs with it.',
    title: 'Embed the exact artifact bytes.',
    description:
      'The MAP 0.2 core artifacts and the Registry schemas as static strings, with no runtime dependency.',
    install: `[dependencies]\nmailschema = "=${rustRelease.version}"`,
    command: null,
    installLanguage: 'toml' as const,
    language: 'rust' as const,
    filename: 'src/main.rs',
    example: `use mailschema::{MAP_CONTEXT, MAP_SCHEMA};

fn main() -> std::io::Result<()> {
    std::fs::write("map-0.2.schema.json", MAP_SCHEMA)?;
    std::fs::write("map-0.2.jsonld", MAP_CONTEXT)?;
    Ok(())
}`,
    exampleNote:
      'Writes the canonical artifacts to local files for your chosen validator and JSON-LD processor.',
    api: [
      {
        name: 'MAP_SCHEMA / MAP_CONTEXT',
        description: 'The MAP 0.2 core schema and JSON-LD context.',
      },
      {
        name: 'CONTRACT_FORMAT_SCHEMA / FORMS_SCHEMA',
        description: 'The contract format and the form fields block contracts pin.',
      },
      {
        name: 'CONTRIBUTION_SCHEMA / RECORD_SCHEMA',
        description: 'The Registry schemas.',
      },
    ],
    exports: 'The MAP 0.2 core artifacts and the Registry schemas, byte for byte.',
  },
  {
    id: 'go',
    name: 'Go',
    registry: 'Go',
    release: goRelease,
    runtime: 'Go 1.22+',
    map: mapVersion('Go'),
    note: 'MAP schemas never use format; the Registry schema checks URIs with it.',
    title: 'Embed the artifacts in Go.',
    description:
      'The MAP 0.2 core artifacts and the Registry contribution schema, returned as independent copies.',
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
    schema, err := mailschema.Schema(mailschema.MAPSchema)
    if err != nil {
        panic(err)
    }
    os.Stdout.Write(schema)
}`,
    exampleNote: 'Prints the MAP 0.2 core schema exactly as the profile record binds it.',
    api: [
      {
        name: 'Schema(MAPSchema) / Schema(MAPContext)',
        description: 'The MAP 0.2 core schema and JSON-LD context.',
      },
      {
        name: 'Schema(ContractFormatSchema) / Schema(FormsSchema)',
        description: 'The contract format and the form fields block contracts pin.',
      },
      {
        name: 'Schema(ContributionSchema)',
        description: 'The Registry contribution schema.',
      },
    ],
    exports: 'The MAP 0.2 core artifacts and the Registry contribution schema.',
  },
  rubyTool(rubyRelease, mapVersion('RubyGems')),
];

export const localCheckCommands = {
  javascript: `npx mailschema@${npmRelease.version} check contribution.json`,
  python: 'python -m mailschema check contribution.json',
};
export const recordCheckCommands = {
  javascript: `npx mailschema@${npmRelease.version} check content-review.json --record`,
  python: 'python -m mailschema check content-review.json --record',
};
