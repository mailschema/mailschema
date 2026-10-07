#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  Contract,
  CONTRACT_MAX_BYTES,
  digest,
  InvalidDocument,
  parseDescription,
  parseImplementation,
} from '../dist/index.js';

const help = `Mail Action Protocol 0.3 checks

  mailschema contract <contract.json>
  mailschema description <description.json> [--contract <contract.json>]
  mailschema implementation <record.json>

contract checks a type contract and prints its digest. description checks a
description and, with --contract, that it uses that contract as it allows,
then prints the description's digest. implementation checks a Registry
implementation record. A digest is the SHA-256 of the document's RFC 8785
canonical JSON. Nothing is uploaded or changed.`;

async function read(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size > CONTRACT_MAX_BYTES)
    throw new Error(`Expected a JSON file of at most ${CONTRACT_MAX_BYTES} bytes.`);
  return new Uint8Array(await readFile(path));
}

function report(errors) {
  if (!errors.length) return;
  throw new InvalidDocument('Not valid.', errors);
}

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { contract: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
  });
  const [command, path, ...extra] = positionals;
  if (values.help || !command) console.log(help);
  else if (!path || extra.length || (values.contract && command !== 'description'))
    throw new Error(help);
  else if (command === 'contract') {
    const contract = Contract.parse(await read(path));
    console.log(`Valid type contract ${contract.id} ${contract.version}\n${contract.digest}`);
  } else if (command === 'description') {
    const description = parseDescription(await read(path));
    if (values.contract)
      report(Contract.parse(await read(values.contract)).descriptionErrors(description));
    console.log(`Valid MAP 0.3 description ${description['@id']}\n${digest(description)}`);
  } else if (command === 'implementation') {
    const record = parseImplementation(await read(path));
    console.log(`Valid implementation record for ${record.service}`);
  } else throw new Error(help);
} catch (error) {
  console.error(error instanceof InvalidDocument ? error.errors.join('\n') : error.message);
  process.exitCode = 1;
}
