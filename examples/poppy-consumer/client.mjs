import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import { bytes, json, same } from './binding.mjs';

const b64 = (value) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const hash = (value) => createHash('sha256').update(value).digest('base64url');
const jwt = (key, claims, header) => {
  const body = `${b64({ alg: 'ES256', ...header })}.${b64(claims)}`;
  return `${body}.${sign('sha256', Buffer.from(body), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
};
export const keyPair = () => generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

// One in-memory, disposable sign-in. No personal credential store or client secret.
export class Client {
  constructor(clientOrigin, localOrigin, binding, operator = keyPair()) {
    this.binding = binding;
    this.operator = operator;
    this.id = `${clientOrigin}/client.json`;
    this.redirect = `${localOrigin}/callback`;
    this.jwksUri = `${clientOrigin}/jwks.json`;
    this.kid = randomUUID();
    this.verifier = randomBytes(32).toString('base64url');
    this.state = randomBytes(32).toString('base64url');
    this.delegate = keyPair();
    this.sid = randomBytes(24).toString('base64url');
    this.sub = randomBytes(24).toString('base64url');
  }
  metadata() {
    return {
      client_id: this.id,
      client_name: 'MAP reference consumer',
      redirect_uris: [this.redirect],
      token_endpoint_auth_method: 'private_key_jwt',
      jwks_uri: this.jwksUri,
    };
  }
  jwks() {
    return {
      keys: [
        {
          ...this.operator.publicKey.export({ format: 'jwk' }),
          kid: this.kid,
          use: 'sig',
          alg: 'ES256',
        },
      ],
    };
  }
  assertion() {
    const now = Math.floor(Date.now() / 1000);
    return jwt(
      this.operator.privateKey,
      {
        iss: this.id,
        sub: this.id,
        aud: this.binding.origin,
        iat: now,
        exp: now + 60,
        jti: randomUUID(),
      },
      { kid: this.kid },
    );
  }
  authorization() {
    const url = new URL(this.binding.oauth.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: this.id,
      response_type: 'code',
      redirect_uri: this.redirect,
      scope: 'send-approvals',
      resource: this.binding.entry.mcp,
      state: this.state,
      code_challenge: hash(this.verifier),
      code_challenge_method: 'S256',
      prompt: 'consent',
    });
    return url.href;
  }
  async callback(params) {
    assert.equal(params.get('state'), this.state);
    assert.equal(params.get('iss'), this.binding.origin);
    assert.ok(
      !this.tokens && params.get('code') && !params.get('error'),
      'Sign-in failed or already consumed',
    );
    await this.token({
      grant_type: 'authorization_code',
      code: params.get('code'),
      code_verifier: this.verifier,
      redirect_uri: this.redirect,
    });
  }
  async token(params) {
    const tokens = await json(this.binding.oauth.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ...params,
        client_id: this.id,
        resource: this.binding.entry.mcp,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: this.assertion(),
      }),
    });
    assert.equal(tokens.token_type.toLowerCase(), 'bearer');
    assert.ok(tokens.access_token && tokens.refresh_token);
    assert.equal(tokens.scope, 'send-approvals');
    this.tokens = tokens;
  }
  async refresh() {
    await this.token({ grant_type: 'refresh_token', refresh_token: this.tokens.refresh_token });
  }
  session() {
    const now = Math.floor(Date.now() / 1000),
      jwk = this.delegate.publicKey.export({ format: 'jwk' });
    const delegation = jwt(
      this.operator.privateKey,
      { iss: this.id, cnf: { jwk }, iat: now, exp: now + 3600, jti: randomUUID() },
      { typ: 'poppy-delegation+jwt', kid: this.kid },
    );
    const thumbprint = hash(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }));
    return jwt(
      this.delegate.privateKey,
      {
        iss: this.id,
        aud: this.binding.origin,
        sid: this.sid,
        sub: this.sub,
        htm: 'POST',
        htu: this.binding.entry.mcp,
        iat: now,
        jti: randomUUID(),
        ath: hash(this.tokens.access_token),
      },
      { typ: 'poppy-session+jwt', kid: thumbprint, poppy_dlg: delegation },
    );
  }
  async rpc(method, params) {
    const result = await json(this.binding.entry.mcp, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Poppy-Version': '1.0',
        'Poppy-Extensions': '"operations";v="3", "mailschema.org/map";v="1"',
        'Poppy-Session': this.session(),
        'MCP-Protocol-Version': '2025-11-25',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method, params }),
    });
    assert.ok(!result.error, `MCP ${method} refused`);
    return result.result;
  }
  async initialize() {
    await this.rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'MAP reference consumer', version: '0.1.0' },
    });
    const tools = await this.rpc('tools/list', {});
    const tool = tools.tools.find((item) => item.name === this.binding.contractEntry.tool);
    assert.ok(tool);
    const declaration = tool._meta?.['mailschema.org/map']?.contracts;
    assert.ok(
      declaration?.some(
        (item) =>
          item.id === this.binding.contractEntry.id &&
          item.version === this.binding.contractEntry.version &&
          item.contractDigest === this.binding.contractEntry.contractDigest,
      ),
    );
    same(
      Object.keys(tool.inputSchema.properties).sort(),
      ['action', 'interaction_id', 'terms_id', 'terms_version'],
      'Unexpected tool arguments',
    );
    same(
      tool.inputSchema.required.slice().sort(),
      ['action', 'interaction_id', 'terms_id'],
      'Unexpected required arguments',
    );
    assert.equal(tool.inputSchema.additionalProperties, false);
    same(
      tool.inputSchema.properties.action.enum.slice().sort(),
      ['approve', 'decline', 'read'],
      'Unexpected operations',
    );
    for (const field of ['action', 'interaction_id', 'terms_id', 'terms_version'])
      assert.equal(tool.inputSchema.properties[field].type, 'string');
  }
  call(action, map, approval) {
    return this.rpc('tools/call', {
      name: this.binding.contractEntry.tool,
      arguments: {
        action,
        interaction_id: map['@id'],
        terms_id: map.terms.id,
        ...(action === 'read' ? {} : { terms_version: map.terms.version }),
      },
      ...(approval ? { _meta: { 'personalagentprotocol.org/approval': approval } } : {}),
    });
  }
  async revoke() {
    if (!this.tokens) return;
    await bytes(this.binding.oauth.revocation_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: this.tokens.refresh_token,
        token_type_hint: 'refresh_token',
        client_id: this.id,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: this.assertion(),
      }),
    });
    this.tokens = undefined;
  }
}
