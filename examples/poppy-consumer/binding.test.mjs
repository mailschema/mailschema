import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync, verify, createHash } from 'node:crypto';
import { dkimSign } from 'mailauth';
import { Contract } from 'mailschema';
import { receive, validDescription, readback, approvalOperation, digest } from './binding.mjs';
import { Client } from './client.mjs';

const contract = Contract.parse(
  await readFile('../../specifications/map-0.3/contracts/campaign-send-approval-0.1.json'),
);
const source = JSON.parse(
  await readFile('../../specifications/map-0.3/examples/campaign-send-approval.json'),
);
const enabled = {
  origin: 'https://service.example',
  tenant: source.service.tenant,
  mailbox: source.recipient,
  senderDomains: ['service.example'],
};
function description() {
  return {
    ...structuredClone(source),
    issuedAt: new Date(Date.now() - 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    expiresAt: new Date(Date.now() + 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const dns = async () => [
  [`v=DKIM1; k=rsa; p=${publicKey.export({ type: 'spki', format: 'der' }).toString('base64')}`],
];
async function message(map, options = {}) {
  const unsigned = Buffer.from(
    [
      'From: Example <news@service.example>',
      'To: owner@example.net',
      'Subject: Review send',
      `Date: ${new Date().toUTCString()}`,
      'Message-ID: <reference@service.example>',
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; boundary="map-boundary"; type="text/html"',
      '',
      '--map-boundary',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>Review the campaign.</p>',
      '--map-boundary',
      'Content-Type: application/ld+json; profile="https://mailschema.org/profiles/map/0.3"',
      'Content-Purpose: Machine-readable',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(JSON.stringify(map)).toString('base64'),
      '--map-boundary--',
      '',
    ].join('\r\n'),
  );
  const signed = await dkimSign(unsigned, {
    headerList: options.headers || 'from:to:subject:date:message-id:mime-version:content-type',
    signatureData: [
      {
        signingDomain: 'service.example',
        selector: 'test',
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        ...options.signature,
      },
    ],
  });
  assert.equal(signed.errors.length, 0);
  return Buffer.concat([Buffer.from(signed.signatures), unsigned]);
}
const delivery = (raw) => ({
  mailbox: enabled.mailbox,
  rawDigest: digest(raw.toString('base64')),
  providerMessageId: 'provider-message-1',
  receivedDirectly: true,
});

test('verifies original MIME and a real qualifying full-body DKIM signature before readback', async () => {
  const map = description(),
    raw = await message(map);
  const result = await receive(raw, delivery(raw), enabled, contract, { resolver: dns });
  assert.deepEqual(result.description, map);
  assert.equal(result.signingDomain, 'service.example');
});

test('rejects partial-body signatures even when their l= covers the entire body', async () => {
  const raw = await message(description(), { signature: { maxBodyLength: 99999 } });
  await assert.rejects(
    receive(raw, delivery(raw), enabled, contract, { resolver: dns }),
    /qualifying/,
  );
});

test('a cryptographically valid signature without required header coverage is not enough', async () => {
  const raw = await message(description(), {
    headers: 'from:to:subject:date:message-id:content-type',
  });
  await assert.rejects(
    receive(raw, delivery(raw), enabled, contract, { resolver: dns }),
    /qualifying/,
  );
});

test('rejects duplicated security headers and modified signed machine data', async () => {
  const raw = await message(description());
  const duplicate = Buffer.concat([Buffer.from('Subject: injected\r\n'), raw]);
  await assert.rejects(
    receive(duplicate, delivery(duplicate), enabled, contract, { resolver: dns }),
    /[Aa]mbiguous/,
  );
  const tampered = Buffer.from(
    raw.toString().replace('Review the campaign.', 'Altered message content'),
  );
  await assert.rejects(
    receive(tampered, delivery(tampered), enabled, contract, { resolver: dns }),
    /qualifying/,
  );
});

test('a forwarded message, a To header or another mailbox export cannot supply recipient control', async () => {
  const raw = await message(description());
  for (const bad of [
    { ...delivery(raw), receivedDirectly: false },
    { ...delivery(raw), mailbox: 'other@example.net' },
    { ...delivery(raw), rawDigest: digest('different raw bytes') },
  ])
    await assert.rejects(receive(raw, bad, enabled, contract, { resolver: dns }));
});

test('wrong service, tenant, recipient, digest and expired terms stop before any request', () => {
  for (const mutate of [
    (map) => {
      map.service.id = 'https://lookalike.example';
    },
    (map) => {
      map.service.tenant = 'urn:example:tenant:8';
    },
    (map) => {
      map.recipient = 'other@example.net';
    },
    (map) => {
      map.type.contractDigest = `sha-256:${'0'.repeat(64)}`;
    },
    (map) => {
      map.expiresAt = '2020-01-01T00:00:00Z';
    },
  ]) {
    const map = description();
    mutate(map);
    assert.throws(() => validDescription(map, enabled, contract));
  }
});

test('requires current exact readback and the referenced email, not just its title', () => {
  const map = description();
  const result = {
    isError: false,
    structuredContent: {
      map,
      state: 'pending',
      operations: ['approve'],
      content: [
        {
          id: map.details.content.id,
          revision: map.details.content.revision,
          html: '<p>Exact email</p>',
        },
      ],
    },
  };
  assert.equal(readback(result, map, enabled, contract).content.html, '<p>Exact email</p>');
  const changed = structuredClone(result);
  changed.structuredContent.map.terms.version = 'newer';
  assert.throws(() => readback(changed, map, enabled, contract), /Terms differ/);
  const absent = structuredClone(result);
  absent.structuredContent.content = [];
  assert.throws(() => readback(absent, map, enabled, contract), /bound email/);
});

test('an effect on the first call, changed operation terms or expired operation cannot be approved', () => {
  const map = description();
  const result = {
    isError: true,
    structuredContent: {
      operation: {
        operation_id: 'operation_1',
        revision: 'revision_1',
        terms: { map, operation: 'approve' },
        expires_at: map.expiresAt,
      },
    },
  };
  assert.equal(approvalOperation(result, map).operation_id, 'operation_1');
  assert.throws(() => approvalOperation({ ...result, isError: false }, map), /must not perform/);
  for (const mutate of [
    (op) => {
      op.terms.map.details.audience.count++;
    },
    (op) => {
      op.terms.operation = 'decline';
    },
    (op) => {
      op.terms.input = { surprise: true };
    },
    (op) => {
      op.expires_at = '2020-01-01T00:00:00Z';
    },
  ]) {
    const changed = structuredClone(result);
    mutate(changed.structuredContent.operation);
    assert.throws(() => approvalOperation(changed, map));
  }
});

test('OAuth uses PKCE, restricted resource and one-use issuer/state-bound callback', async () => {
  const client = new Client('https://consumer.example', 'http://127.0.0.1:4340', {
    origin: enabled.origin,
    entry: { mcp: `${enabled.origin}/mcp` },
    oauth: { authorization_endpoint: `${enabled.origin}/oauth/authorize` },
  });
  const url = new URL(client.authorization());
  assert.equal(url.searchParams.get('scope'), 'send-approvals');
  assert.equal(url.searchParams.get('resource'), `${enabled.origin}/mcp`);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  await assert.rejects(
    client.callback(new URLSearchParams({ state: 'wrong', iss: enabled.origin, code: 'fake' })),
  );
  await assert.rejects(
    client.callback(
      new URLSearchParams({ state: client.state, iss: 'https://lookalike.example', code: 'fake' }),
    ),
  );
  client.tokens = { access_token: 'fake-existing' };
  await assert.rejects(
    client.callback(
      new URLSearchParams({ state: client.state, iss: enabled.origin, code: 'fake' }),
    ),
    /already consumed/,
  );
});

test('assertions and delegated Sessions really verify and bind the exact token, issuer and endpoint', () => {
  const client = new Client('https://consumer.example', 'http://127.0.0.1:4340', {
    origin: enabled.origin,
    entry: { mcp: `${enabled.origin}/mcp` },
  });
  const decode = (compact, key) => {
    const [header, payload, signature] = compact.split('.');
    assert.ok(
      verify(
        'sha256',
        Buffer.from(`${header}.${payload}`),
        { key, dsaEncoding: 'ieee-p1363' },
        Buffer.from(signature, 'base64url'),
      ),
    );
    return {
      header: JSON.parse(Buffer.from(header, 'base64url')),
      claims: JSON.parse(Buffer.from(payload, 'base64url')),
    };
  };
  const assertion = decode(client.assertion(), client.operator.publicKey);
  assert.equal(assertion.claims.iss, client.id);
  assert.equal(assertion.claims.sub, client.id);
  assert.equal(assertion.claims.aud, enabled.origin);
  assert.equal(assertion.claims.exp - assertion.claims.iat, 60);
  client.tokens = { access_token: 'a-test-only-opaque-token' };
  const session = decode(client.session(), client.delegate.publicKey);
  assert.equal(session.header.typ, 'poppy-session+jwt');
  const delegation = decode(session.header.poppy_dlg, client.operator.publicKey);
  assert.deepEqual(delegation.claims.cnf.jwk, client.delegate.publicKey.export({ format: 'jwk' }));
  assert.equal(session.claims.iss, client.id);
  assert.equal(session.claims.aud, enabled.origin);
  assert.equal(session.claims.htm, 'POST');
  assert.equal(session.claims.htu, `${enabled.origin}/mcp`);
  assert.equal(
    session.claims.ath,
    createHash('sha256').update(client.tokens.access_token).digest('base64url'),
  );
  assert.notEqual(
    decode(client.session(), client.delegate.publicKey).claims.jti,
    session.claims.jti,
  );
});
