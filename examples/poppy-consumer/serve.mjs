import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { discover, receive, readback, approvalOperation, digest, same, TYPE } from './binding.mjs';
import { Client } from './client.mjs';

// This is a local, single-interaction reference, not a hosted agent or a daemon.
// Only public metadata is exposed to the tunnel. No model controls are provided
// for enablement or approval; the person operates those local forms directly.
const configPath = resolve(process.argv[2] || 'consumer.json');
const config = JSON.parse(await readFile(configPath));
const port = config.port ?? 4340,
  metadataPort = config.metadataPort ?? 4341;
assert.ok(
  [port, metadataPort].every((value) => Number.isInteger(value) && value > 0 && value <= 65535),
);
assert.notEqual(port, metadataPort);
const local = `http://127.0.0.1:${port}`;
assert.equal(new URL(config.clientOrigin).protocol, 'https:');
assert.equal(new URL(config.clientOrigin).origin, config.clientOrigin);
assert.ok(config.mailbox && config.tenant && config.senderDomains?.length);
const nonce = randomBytes(32).toString('base64url');
let binding,
  client,
  enabled,
  presentation,
  result,
  error,
  inFlight = false;
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const form = (action, label) =>
  `<form method="post" action="/${action}"><input type="hidden" name="nonce" value="${nonce}"><button>${escape(label)}</button></form>`;
const row = (label, value) => `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`;

function page() {
  let body = `<h1>MAP reference consumer</h1><p>One signed email. One account. You decide.</p><dl>${row('Company', config.origin)}${row('Mailbox', config.mailbox)}${row('Tenant', config.tenant)}</dl>`;
  if (error) body += `<p role="alert">${escape(error)}</p>`;
  if (!enabled) {
    body += `<h2>Enable this binding</h2><p>Only Campaign Send Approval 0.1 is supported. Allow this consumer to read requests delivered directly to the mailbox above and relay your decisions through a separate send-approvals connection.</p><p>Accepted DKIM signing domains: ${escape(config.senderDomains.join(', '))}. This does not allow automatic approvals or broader account access.</p>${form('enable', 'Enable and connect Nitrosend')}`;
  } else if (!client.tokens) {
    body +=
      '<p>Sign in and select the account and brand matching the tenant above. The callback stays on this computer.</p>' +
      `<a class="button" href="${escape(client.authorization())}">Connect Nitrosend</a>`;
  } else if (result) {
    body += `<h2>${result.outcome === 'accepted' ? 'Approval accepted' : 'Outcome needs checking'}</h2><p>${escape(result.note)}</p><pre>${escape(JSON.stringify(result, null, 2))}</pre>${form('disconnect', 'Disconnect this reference consumer')}`;
  } else if (presentation) {
    const map = presentation.map,
      details = map.details;
    body += `<h2>Approve this campaign?</h2><dl>${row('Subject', presentation.content.subject)}${row('From', `${details.sender.name} <${details.sender.mailbox}>`)}${row('Recipients', details.audience.count)}${row('Audience', details.audience.label)}${row('When', details.schedule.at || 'As soon as you approve')}${row('Expires', map.expiresAt)}</dl><h2>The email</h2>`;
    const policy =
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">';
    body += `<iframe title="Email to approve" sandbox="" referrerpolicy="no-referrer" srcdoc="${escape(policy + presentation.content.html)}"></iframe>`;
    body += `<p>Approval releases this exact version. This proof also repeats the identical approval to verify it cannot release another send.</p>${form('approve', 'Approve once and check safe retry')}${form('disconnect', 'Cancel and disconnect')}`;
  } else {
    body += `<h2>Connected</h2><p>Export the original email and its direct-delivery record from the enabled mailbox. Reading checks the signed email, published contract and current service terms before showing any approval control.</p>${form('read', 'Read received request')}${form('disconnect', 'Disconnect')}`;
  }
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MAP reference consumer</title><style>
    :root{color-scheme:light dark;font-family:system-ui,sans-serif;background:oklch(97% .006 260);color:oklch(23% .015 260)}
    *{box-sizing:border-box}body{max-width:850px;margin:48px auto;padding:0 24px 48px}h1{font-size:1.75rem;letter-spacing:-.03em;margin:0 0 8px}h2{font-size:1.2rem;margin:32px 0 16px}p{line-height:1.6;max-width:68ch;color:oklch(44% .015 260)}dl{display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px 20px;padding:20px 0;border-block:1px solid oklch(86% .012 260);margin:28px 0}dt{color:oklch(44% .015 260)}dd{margin:0;overflow-wrap:anywhere}form{display:inline-block;margin:16px 8px 0 0}button,.button{display:inline-block;font:inherit;font-weight:600;border:1px solid transparent;border-radius:6px;padding:12px 18px;color:oklch(99% .005 260);background:oklch(47% .2 270);cursor:pointer;text-decoration:none}button:hover,.button:hover{background:oklch(40% .2 270)}button:focus-visible,a:focus-visible{outline:3px solid oklch(70% .18 270);outline-offset:3px}iframe{width:100%;height:600px;border:1px solid oklch(86% .012 260);border-radius:8px;background:oklch(99% .005 260)}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;padding:16px;background:oklch(92% .01 260);border-radius:6px}[role=alert]{padding:16px;background:oklch(92% .04 30);color:oklch(35% .12 30)}@media(max-width:540px){body{margin-top:28px}dl{grid-template-columns:1fr;gap:4px}dd{margin-bottom:12px}form,button{width:100%}iframe{height:500px}}@media(prefers-color-scheme:dark){:root{background:oklch(18% .015 260);color:oklch(94% .01 260)}p,dt{color:oklch(75% .015 260)}pre{background:oklch(24% .015 260)}}
    </style><body>${body}</body></html>`;
}

async function prepareBinding() {
  const current = await discover(config.origin);
  if (binding)
    same(current.entry, binding.entry, 'Binding changed; restart and enable it deliberately');
  binding = current;
  client ||= new Client(config.clientOrigin, local, binding);
  client.binding = binding;
}

// Only the person can operate enable/approve/disconnect in this proof. Scripts
// may fetch/export mail and inspect the UI, but must never click those controls.
async function action(name) {
  error = undefined;
  if (name === 'enable') {
    assert.ok(!enabled);
    await prepareBinding();
    enabled = {
      origin: config.origin,
      tenant: config.tenant,
      mailbox: config.mailbox,
      senderDomains: config.senderDomains,
    };
  } else if (name === 'read') {
    assert.ok(enabled && client.tokens && !result);
    await prepareBinding();
    presentation = undefined;
    const delivery = JSON.parse(await readFile(resolve(config.deliveryPath)));
    const raw = await readFile(resolve(config.messagePath));
    assert.ok(raw.length <= 2 * 1024 * 1024);
    const received = await receive(raw, delivery, enabled, binding.contract);
    await client.initialize();
    presentation = readback(
      await client.call('read', received.description),
      received.description,
      enabled,
      binding.contract,
    );
    await client.refresh(); // Prove refresh on the same account, scope and resource before decision.
  } else if (name === 'approve') {
    assert.ok(presentation && !result && Date.parse(presentation.map.expiresAt) > Date.now());
    await prepareBinding();
    const map = presentation.map;
    // The person's decision precedes the first approve call, as the binding requires.
    result = {
      outcome: 'unknown',
      note: 'An approval was attempted. Check service state before any further decision.',
    };
    const operation = approvalOperation(await client.call('approve', map), map);
    const approval = {
      operation_id: operation.operation_id,
      revision: operation.revision,
      approver: 'user',
      approved_at: Math.floor(Date.now() / 1000),
      input_type: 'button',
    };
    // Write unknown first. A lost response must not bring the approval button back.
    result = { outcome: 'unknown', note: 'A decision was submitted. Do not create another send.' };
    const first = await client.call('approve', map, approval);
    assert.equal(first.isError, false);
    assert.equal(first.structuredContent.outcome, 'accepted');
    const retry = await client.call('approve', map, approval);
    assert.equal(retry.isError, false);
    assert.equal(retry.structuredContent.outcome, 'accepted');
    same(
      retry.structuredContent.map,
      first.structuredContent.map,
      'Retry changed the approved terms',
    );
    result = {
      outcome: 'accepted',
      interaction: map['@id'],
      terms: map.terms,
      contract: TYPE,
      client: client.id,
      readbackDigest: digest(map),
      approval,
      note: 'Service accepted the exact approval and reported the same decision on retry. Delivery still requires independent mailbox and server readback.',
    };
    await writeFile(resolve(config.evidencePath), JSON.stringify(result, null, 2) + '\n', {
      mode: 0o600,
    });
  } else if (name === 'disconnect') {
    await client?.revoke();
    enabled = undefined;
    presentation = undefined;
    result = undefined;
  } else throw new Error('Unknown action');
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  // Preserve Origin on local form POSTs without leaking referrers off this origin.
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  try {
    const url = new URL(request.url, local);
    assert.equal(request.headers.host, new URL(local).host, 'Loopback controls only');
    if (request.method === 'GET' && url.pathname === '/callback') {
      assert.ok(client && enabled);
      await client.callback(url.searchParams);
      response.writeHead(303, { Location: '/' });
      response.end();
      return;
    }
    if (request.method === 'POST') {
      assert.equal(request.headers.origin, local, 'Cross-origin control refused');
      assert.equal(request.headers['content-type'], 'application/x-www-form-urlencoded');
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        assert.ok(size <= 1024);
        chunks.push(chunk);
      }
      assert.equal(
        new URLSearchParams(Buffer.concat(chunks).toString()).get('nonce'),
        nonce,
        'Invalid control',
      );
      assert.ok(!inFlight, 'An operation is already in progress');
      inFlight = true;
      try {
        await action(url.pathname.slice(1));
      } catch (failure) {
        error = failure.message;
      } finally {
        inFlight = false;
      }
      response.writeHead(303, { Location: '/' });
      response.end();
      return;
    }
    assert.equal(request.method, 'GET');
    assert.equal(url.pathname, '/');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; frame-src about:; form-action 'self'; base-uri 'none'",
    );
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(page());
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain' });
    response.end('Request refused. No control was performed.');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Reference consumer: ${local}. Enablement and approval require the person's own clicks.`,
  ),
);

// A separate listener is the only tunnel target. Host headers cannot turn a
// public metadata request into a private control or callback request.
createServer((request, response) => {
  if (request.method !== 'GET' || !['/client.json', '/jwks.json'].includes(request.url)) {
    response.writeHead(404);
    response.end();
    return;
  }
  client ||= new Client(config.clientOrigin, local, { origin: config.origin });
  response.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60',
  });
  response.end(JSON.stringify(request.url === '/client.json' ? client.metadata() : client.jwks()));
}).listen(metadataPort, '127.0.0.1');
