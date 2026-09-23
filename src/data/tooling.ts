import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import selection from '../../docs/releases/current.json' with { type: 'json' };
import {
  assertPackageSet,
  type PackageRelease,
  type PackageSetSelection,
} from '../lib/package-release';

const evidence = new Map<string, PackageRelease>();
for (const reference of new Set(selection.channels.map((entry) => entry.evidence)))
  evidence.set(
    reference,
    JSON.parse(readFileSync(resolve('docs/releases', `${reference}.json`), 'utf8')),
  );
const selectedChannels = assertPackageSet(
  selection as PackageSetSelection,
  evidence,
  readFileSync(resolve('public/schemas/contribution.schema.json'), 'utf8'),
);
const channel = (name: string) => {
  const selected = selectedChannels.get(name);
  if (!selected) throw new Error(`Package registry ${name} is not selected for the website.`);
  return selected;
};
const npmRelease = channel('npm');
const pythonRelease = channel('PyPI');
const rustRelease = channel('crates.io');
const versions = new Set(selectedChannels.values().map((entry) => entry.version));
const sharedVersion = [...versions][0];
export const packageSetLabel =
  versions.size === 1 ? `Package set ${sharedVersion}` : 'Verified package set';

export const tooling = [
  {
    id: 'javascript',
    name: 'JavaScript',
    registry: 'npm',
    release: npmRelease,
    runtime: 'Node.js 22+',
    title: 'Check a contribution.',
    description:
      'Validate JSON, use typed definitions and check references against a supplied Registry catalogue.',
    install: `npm install mailschema@${npmRelease.version}`,
    command: `npx mailschema@${npmRelease.version} check contribution.json`,
    installLanguage: 'bash' as const,
    language: 'javascript' as const,
    filename: 'check-contribution.mjs',
    example: `import { readFile } from 'node:fs/promises';\nimport { assertContribution } from 'mailschema';\n\nconst contribution = JSON.parse(\n  await readFile('contribution.json', 'utf8'),\n);\n\nassertContribution(contribution);`,
    exampleNote:
      'Returns normally for valid input. Throws an error with field details if the contribution needs changes.',
    api: [
      {
        name: 'assertContribution(value)',
        description: 'Check contribution structure; throw if invalid.',
      },
      { name: 'contributionErrors(value)', description: 'Return field errors, or an empty array.' },
      {
        name: 'assertTypeRecord(value)',
        description: 'Check an expanded record, including attribution and history.',
      },
      {
        name: 'referenceErrors(contribution, catalog)',
        description:
          'Check amendment bases, type names, versions, profiles and supported operations against supplied Registry data.',
      },
      {
        name: 'getContributionSchema() / getRecordSchema()',
        description: 'Return an independent copy of either JSON Schema.',
      },
    ],
    exports:
      'TypeScript: Contribution, TypeDefinition, TypeRecord, Implementation, Party and CatalogView.',
  },
  {
    id: 'python',
    name: 'Python',
    registry: 'PyPI',
    release: pythonRelease,
    runtime: 'Python 3.10+',
    title: 'Validate in Python.',
    description:
      'Check contribution fields and Registry record structure with the established jsonschema library.',
    install: `python -m pip install mailschema==${pythonRelease.version}`,
    command: 'python -m mailschema check contribution.json',
    installLanguage: 'bash' as const,
    language: 'python' as const,
    filename: 'check_contribution.py',
    example: `import json\nfrom pathlib import Path\nfrom mailschema import validate_contribution\n\ncontribution = json.loads(\n    Path("contribution.json").read_text()\n)\n\nvalidate_contribution(contribution)`,
    exampleNote:
      'Returns None for valid input. Raises ValueError with field details if the contribution needs changes.',
    api: [
      {
        name: 'validate_contribution(value)',
        description: 'Check contribution structure; raise ValueError if invalid.',
      },
      { name: 'contribution_errors(value)', description: 'Return field errors, or an empty list.' },
      {
        name: 'validate_record(value) / record_errors(value)',
        description: 'Validate an expanded Registry record or inspect its errors.',
      },
      {
        name: 'get_contribution_schema() / get_record_schema()',
        description: 'Return a fresh copy of either JSON Schema.',
      },
    ],
    exports:
      'Structure and format checks. Registry reference checks run separately in the browser or JavaScript API.',
  },
  {
    id: 'rust',
    name: 'Rust',
    registry: 'crates.io',
    release: rustRelease,
    runtime: 'Rust 1.70+',
    title: 'Bring the schema with you.',
    description:
      'Embed the contribution and record schemas in your application. Use them with your chosen JSON Schema validator.',
    install: `[dependencies]\nmailschema = "=${rustRelease.version}"`,
    command: null,
    installLanguage: 'toml' as const,
    language: 'rust' as const,
    filename: 'src/main.rs',
    example: `use mailschema::{CONTRIBUTION_SCHEMA, RECORD_SCHEMA};\n\nfn main() -> std::io::Result<()> {\n    std::fs::write(\n        "contribution.schema.json", CONTRIBUTION_SCHEMA\n    )?;\n    std::fs::write("record.schema.json", RECORD_SCHEMA)?;\n    Ok(())\n}`,
    exampleNote:
      'Writes both bundled schemas to local files. No runtime dependencies or network calls.',
    api: [
      {
        name: 'CONTRIBUTION_SCHEMA',
        description: 'The contribution JSON Schema as a static string.',
      },
      {
        name: 'RECORD_SCHEMA',
        description: 'The standalone record JSON Schema as a static string.',
      },
      {
        name: 'Schema::Contribution.as_str() / Schema::Record.as_str()',
        description: 'Select a bundled schema through the typed enum.',
      },
    ],
    exports:
      'Schemas only. Validation requires a JSON Schema Draft 2020-12 engine with format checking enabled.',
  },
];

export const localCheckCommands = {
  javascript: tooling[0].command!,
  python: tooling[1].command!,
};
export const recordCheckCommands = {
  javascript: `npx mailschema@${npmRelease.version} check content-review.json --record`,
  python: 'python -m mailschema check content-review.json --record',
};
