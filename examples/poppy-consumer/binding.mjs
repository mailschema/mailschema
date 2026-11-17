import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { Contract, extractMessage, parseDescription, digest } from 'mailschema';
import { dkimVerify } from 'mailauth';

export const TYPE = Object.freeze({
  id: 'https://mailschema.org/types/campaign-send-approval',
  version: '0.1',
  contractDigest: 'sha-256:de3c88a0712adb1d0c6e82f437b825c83520d8e1c44c7b032a2cfcfe5ce55731',
});
export const CONTRACT_URL =
  'https://mailschema.org/artifacts/map-0.3/contracts/campaign-send-approval-0.1.json';
const OPERATIONS = {
  approve: { submission: 'operations', approvers: ['user'] },
  decline: { submission: 'direct' },
};
const same = (actual, expected, reason) => assert.ok(isDeepStrictEqual(actual, expected), reason);

export async function bytes(url, options = {}, max = 2 * 1024 * 1024) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  assert.ok(response.ok, `Request failed (${response.status})`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    assert.ok(length <= max, 'Response too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function json(url, options) {
  return JSON.parse(await bytes(url, options));
}

// Called only from the local setup control, using the operator-configured origin.
// No address, server, scope, tool or contract is selected by an email.
export async function discover(origin) {
  assert.equal(new URL(origin).origin, origin);
  assert.ok(origin.startsWith('https://'));
  const document = await json(`${origin}/.well-known/poppy.json`);
  assert.equal(document.protocol_version, '1.0');
  assert.equal(`https://${document.organization.domain}`, origin);
  const entries = document.extensions?.['mailschema.org/map'];
  assert.ok(Array.isArray(entries));
  const supported = entries.filter((entry) => entry.version === '1');
  assert.equal(supported.length, 1);
  const entry = supported[0];
  assert.equal(entry.profile, 'https://mailschema.org/profiles/map/0.3');
  assert.equal(entry.binding, 'https://mailschema.org/specification/poppy');
  assert.ok(document.apis.some((api) => api.type === 'mcp' && api.url === entry.mcp));
  const mcp = new URL(entry.mcp);
  assert.equal(mcp.origin, origin);
  assert.ok(!mcp.username && !mcp.password && !mcp.hash);
  assert.ok(document.extensions.operations.some((item) => item.version === '3'));
  const contracts = entry.contracts.filter(
    (contract) => TYPE.id === contract.id && TYPE.version === contract.version,
  );
  assert.equal(contracts.length, 1);
  const contractEntry = contracts[0];
  assert.ok(
    typeof contractEntry.tool === 'string' &&
      contractEntry.tool.length > 0 &&
      contractEntry.tool.length <= 128,
  );
  assert.ok(
    !entry.human ||
      entry.human.every((value) => new URL(value).origin === value && value.startsWith('https://')),
  );
  same(
    Object.fromEntries(Object.keys(TYPE).map((key) => [key, contractEntry[key]])),
    TYPE,
    'Contract changed',
  );
  same(contractEntry.operations, OPERATIONS, 'Unsupported decision mapping');
  same(contractEntry.scopes, ['send-approvals'], 'Refusing broader access');
  assert.ok(document.auth.scopes['send-approvals']);
  const resource = await json(`${origin}/.well-known/oauth-protected-resource`);
  assert.equal(resource.resource, origin);
  same(resource.authorization_servers, [origin], 'Unexpected issuer');
  const oauth = await json(`${origin}/.well-known/oauth-authorization-server`);
  assert.equal(oauth.issuer, origin);
  for (const name of ['authorization_endpoint', 'token_endpoint', 'revocation_endpoint'])
    assert.equal(
      new URL(oauth[name]).origin,
      origin,
      'OAuth endpoint leaves the configured company',
    );
  assert.ok(oauth.token_endpoint_auth_methods_supported.includes('private_key_jwt'));
  assert.ok(oauth.code_challenge_methods_supported.includes('S256'));
  const contract = Contract.parse(await bytes(CONTRACT_URL));
  assert.equal(contract.digest, TYPE.contractDigest);
  return { origin, entry, contractEntry, oauth, contract };
}

export function validDescription(description, enabled, contract) {
  assert.deepEqual(contract.descriptionErrors(description), [], 'Invalid Campaign Send Approval');
  same(description.type, TYPE, 'Unsupported contract');
  assert.equal(description.service.id, enabled.origin, 'Service mismatch');
  assert.equal(description.service.tenant, enabled.tenant, 'Tenant mismatch');
  assert.equal(
    description.recipient.toLowerCase(),
    enabled.mailbox.toLowerCase(),
    'Recipient mismatch',
  );
  assert.ok(!description.capability, 'No capability may be used');
  assert.ok(description['@id'].length <= 2048 && description.terms.id.length <= 2048);
  assert.ok(
    Date.parse(description.issuedAt) <= Date.now() &&
      Date.parse(description.expiresAt) > Date.now(),
    'Not current',
  );
}

// Original bytes must come from the enabled mailbox's authenticated provider
// export. A filename, visible To header or forwarded copy does not prove delivery.
export async function receive(raw, delivery, enabled, contract, verification = {}) {
  assert.equal(delivery.mailbox.toLowerCase(), enabled.mailbox.toLowerCase());
  assert.equal(delivery.rawDigest, digest(raw.toString('base64')), 'Provider export mismatch');
  assert.ok(
    delivery.providerMessageId && delivery.receivedDirectly === true,
    'No direct mailbox receipt',
  );
  const extracted = extractMessage(raw);
  assert.equal(extracted.status, 'valid', extracted.reason || 'No MAP description');
  const description = extracted.description;
  validDescription(description, enabled, contract);
  const headers = raw
    .toString('utf8')
    .replaceAll('\r\n', '\n')
    .split('\n\n', 1)[0]
    .replace(/\n[ \t]+/g, ' ');
  const names = headers.split('\n').map((line) => line.split(':', 1)[0].toLowerCase());
  const required = ['from', 'to', 'subject', 'date', 'message-id', 'mime-version', 'content-type'];
  for (const name of [...required, 'cc', 'supersedes', 'expires']) {
    const count = names.filter((item) => item === name).length;
    assert.ok(
      count <= 1 && (!required.includes(name) || count === 1),
      `Ambiguous or absent ${name}`,
    );
  }
  const { results, headerFrom } = await dkimVerify(raw, verification);
  assert.equal(headerFrom.length, 1, 'Exactly one author is required');
  const covered = [
    ...required,
    ...['cc', 'supersedes', 'expires'].filter((name) => names.includes(name)),
  ];
  const signature = results.find(
    (result) =>
      result.status.result === 'pass' &&
      result.status.aligned &&
      enabled.senderDomains.includes(result.signingDomain.toLowerCase()) &&
      !result.canonBodyLengthLimited &&
      ['rsa-sha256', 'ed25519-sha256'].includes(result.algo) &&
      (result.algo !== 'rsa-sha256' || result.modulusLength >= 1024) &&
      covered.every((name) =>
        result.signingHeaders.keys
          .toLowerCase()
          .split(':')
          .map((key) => key.trim())
          .includes(name),
      ),
  );
  assert.ok(
    signature,
    'No qualifying aligned, full-body DKIM signature with the required header coverage',
  );
  return { description, signingDomain: signature.signingDomain };
}

export function readback(result, received, enabled, contract) {
  assert.equal(result.isError, false);
  const body = result.structuredContent;
  validDescription(body.map, enabled, contract);
  same(body.map, received, 'Terms differ from the received request; do not silently upgrade');
  assert.equal(body.state, 'pending');
  assert.ok(body.operations.includes('approve'));
  assert.ok(received.operations.some((operation) => operation.id === 'approve'));
  const reference = body.map.details.content;
  const content = body.content?.find(
    (item) => item.id === reference.id && item.revision === reference.revision,
  );
  assert.ok(content && typeof content.html === 'string', 'Missing bound email content');
  return { map: body.map, content };
}

export function approvalOperation(result, map) {
  assert.equal(result.isError, true, 'First approval call must not perform an effect');
  const operation = result.structuredContent?.operation;
  assert.ok(operation, 'No operation returned');
  same(
    operation.terms,
    { map, operation: 'approve' },
    'Operation differs from the confirmed readback',
  );
  assert.ok(/^[A-Za-z0-9_-]{1,256}$/.test(operation.operation_id));
  assert.ok(/^[A-Za-z0-9_-]{1,256}$/.test(operation.revision));
  assert.ok(
    Date.parse(operation.expires_at) <= Date.parse(map.expiresAt) &&
      Date.parse(operation.expires_at) > Date.now(),
  );
  return operation;
}
export { digest, same, parseDescription };
