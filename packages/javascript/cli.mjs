#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  assertContribution,
  assertTypeRecord,
  getContractFormatSchema,
  getContributionSchema,
  getFormsSchema,
  getMapContext,
  getMapSchema,
  getRecordSchema,
} from '../dist/index.js';

const help = `MailSchema Registry tools

  mailschema check <file.json> [--record]
  mailschema schema [--record | --map | --context | --contract-format | --forms]

check validates a Registry contribution, or with --record an expanded record,
locally. schema prints a bundled schema: the contribution schema by default, or
a MAP 0.2 core artifact. No files are uploaded or changed.`;

const schemas = {
  record: getRecordSchema,
  map: getMapSchema,
  context: getMapContext,
  'contract-format': getContractFormatSchema,
  forms: getFormsSchema,
};

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      ...Object.fromEntries(Object.keys(schemas).map((name) => [name, { type: 'boolean' }])),
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command, path, ...extra] = positionals;
  const chosen = Object.keys(schemas).filter((name) => values[name]);
  if (chosen.length > 1) throw new Error('Choose only one schema.');
  if (values.help || !command) console.log(help);
  else if (command === 'schema' && !path && !extra.length)
    console.log(JSON.stringify((schemas[chosen[0]] ?? getContributionSchema)(), null, 2));
  else if (
    command === 'check' &&
    path &&
    !extra.length &&
    chosen.every((name) => name === 'record')
  ) {
    const file = await open(path, 'r');
    let value;
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > 256 * 1024)
        throw new Error('Expected a JSON file no larger than 256 KiB.');
      const bytes = Buffer.alloc(256 * 1024 + 1);
      const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
      if (bytesRead > 256 * 1024) throw new Error('JSON file exceeds 256 KiB.');
      value = JSON.parse(bytes.subarray(0, bytesRead).toString('utf8'));
    } finally {
      await file.close();
    }
    if (values.record) assertTypeRecord(value);
    else assertContribution(value);
    console.log(`Valid MailSchema ${values.record ? 'type record' : 'contribution'}.`);
  } else throw new Error(help);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
