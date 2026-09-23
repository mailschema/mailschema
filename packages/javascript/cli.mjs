#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  assertContribution,
  assertTypeRecord,
  getContributionSchema,
  getRecordSchema,
} from './dist/index.js';

const help = `MailSchema contribution tools

  mailschema check <file.json> [--record]
  mailschema schema [--record]

Checks JSON structure and required fields locally. Registry references and
editorial acceptance are separate checks. No files are uploaded or changed.`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { record: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
  });
  const [command, path, ...extra] = positionals;
  if (values.help || !command) console.log(help);
  else if (command === 'schema' && !path && !extra.length)
    console.log(
      JSON.stringify(values.record ? getRecordSchema() : getContributionSchema(), null, 2),
    );
  else if (command === 'check' && path && !extra.length) {
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
    console.log(
      'Valid MailSchema ' + (values.record ? 'type record' : 'contribution') + ' structure.',
    );
  } else throw new Error(help);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
