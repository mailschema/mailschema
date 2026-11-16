import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  server.close();
  await once(server, 'close');
  return port;
}

test('public metadata cannot reach controls, callbacks, mailbox data or private key material, even with a forged Host', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'map-consumer-test-'));
  const config = join(directory, 'consumer.json');
  const port = await availablePort(),
    metadataPort = await availablePort();
  const base = `http://127.0.0.1:${port}`,
    metadataBase = `http://127.0.0.1:${metadataPort}`;
  await writeFile(
    config,
    JSON.stringify({
      origin: 'https://service.example',
      clientOrigin: 'https://consumer.example',
      mailbox: 'owner@example.net',
      tenant: 'urn:example:tenant:7',
      senderDomains: ['service.example'],
      port,
      metadataPort,
    }),
  );
  const child = spawn(process.execPath, ['serve.mjs', config], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  try {
    await Promise.race([
      once(child.stdout, 'data'),
      exited.then(() => {
        throw new Error('Consumer did not start');
      }),
    ]);
    for (const path of ['/', '/enable', '/approve', '/callback?code=never-use-this']) {
      const response = await fetch(`${metadataBase}${path}`, {
        headers: { Host: new URL(base).host },
      });
      assert.equal(response.status, 404);
    }
    const metadata = await fetch(`${metadataBase}/client.json`).then((response) => response.json());
    assert.equal(metadata.client_id, 'https://consumer.example/client.json');
    assert.deepEqual(metadata.redirect_uris, [`${base}/callback`]);
    assert.ok(!JSON.stringify(metadata).includes('owner@example.net'));
    const jwks = await fetch(`${metadataBase}/jwks.json`).then((response) => response.json());
    assert.ok(jwks.keys[0].x && jwks.keys[0].y && !jwks.keys[0].d);
    const local = await fetch(`${base}/`).then((response) => response.text());
    const nonce = /name="nonce" value="([^"]+)"/.exec(local)[1];
    for (const [origin, value] of [
      ['https://attacker.example', nonce],
      [base, 'wrong'],
    ]) {
      const refused = await fetch(`${base}/enable`, {
        method: 'POST',
        redirect: 'manual',
        headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ nonce: value }),
      });
      assert.equal(refused.status, 400);
    }
    assert.equal((await fetch(`${base}/callback?code=not-authorized`)).status, 400);
  } finally {
    child.kill('SIGTERM');
    await exited;
    await rm(directory, { recursive: true });
  }
});
