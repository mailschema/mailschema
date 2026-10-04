// Generated teaching artifacts, not a consumer, connector or live service.
export function walkthroughArtifacts({
  publication,
  api,
  coreSchema,
  content,
  write,
  directory,
  encode,
}) {
  const native = api.paths['/reviews'].get.responses['200'].content['application/json'];
  native.example.content_artifact = { media_type: 'text/markdown', text: content };
  const p = coreSchema.properties;
  native.schema = {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(native.example),
    $defs: coreSchema.$defs,
    properties: {
      review_id: { type: 'string', minLength: 1 },
      interaction: p['@id'],
      service: p.service,
      addressed_to: p.recipient,
      subject: p.subject,
      contract: p.type,
      reference: { type: 'string', format: 'uri' },
      revision: { type: 'string', minLength: 1 },
      expires_at: p.expiresAt,
      allowed_actions: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      publication: p.details,
      state: { const: 'awaiting_review' },
      content_artifact: {
        type: 'object',
        additionalProperties: false,
        required: ['media_type', 'text'],
        properties: { media_type: { const: 'text/markdown' }, text: { type: 'string' } },
      },
    },
  };
  const accepted = { review_id: native.example.review_id, state: 'queued' };
  const acceptedSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['review_id', 'state'],
    properties: { review_id: { type: 'string' }, state: { const: 'queued' } },
  };
  const decision = api.paths['/reviews/{id}/decision'].post;
  decision.responses['202'].content = {
    'application/json': { schema: acceptedSchema, example: accepted },
  };

  // This service's illustrative request shape, not a portable mapping language.
  const body = { decision: 'publish', expected_revision: native.example.revision };
  const reviewId = native.example.review_id;
  const readQuery = new URLSearchParams({ reference: publication.terms.id });
  const host = new URL(publication.service.id).host;
  const http = {
    read: `GET /reviews?${readQuery} HTTP/1.1\nHost: ${host}\nAccept: application/json`,
    response: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n${encode(native.example).trim()}`,
    decision: `POST /reviews/${encodeURIComponent(reviewId)}/decision HTTP/1.1\nHost: ${host}\nContent-Type: application/json\n\n${encode(body).trim()}`,
    result: `HTTP/1.1 202 Accepted\nContent-Type: application/json\n\n${encode(accepted).trim()}`,
  };
  const call = (id, name, args) => ({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  const result = (id, value) => ({
    jsonrpc: '2.0',
    id,
    result: {
      content: [{ type: 'text', text: JSON.stringify(value) }],
      structuredContent: value,
      isError: false,
    },
  });
  const decisionSchema = structuredClone(decision.requestBody.content['application/json'].schema);
  decisionSchema.required.unshift('review_id');
  decisionSchema.properties.review_id = { type: 'string', minLength: 1 };
  const mcp = {
    notice:
      'Illustrative MCP exchange for an already connected server. Tool names, inputs and outputs belong to this example service. Initialization, transport and account authorization are omitted. This is not a normative MAP MCP binding or a conformance claim.',
    protocolVersion: '2026-07-28',
    tools: [
      {
        name: 'read_review',
        description: api.info.description,
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['reference'],
          properties: { reference: { type: 'string', format: 'uri' } },
        },
        outputSchema: native.schema,
      },
      {
        name: 'decide_review',
        description:
          'Record a publication decision. Enforce expected_revision, current permission, recipient relationship, expiry and state atomically. Publish queues the exact approved snapshot. Decline and revise close this review without publication.',
        inputSchema: decisionSchema,
      },
    ],
    read: call(1, 'read_review', { reference: publication.terms.id }),
    response: result(1, native.example),
    decision: call(2, 'decide_review', { review_id: reviewId, ...body }),
    result: result(2, accepted),
  };
  const boundary = 'map-publication-example';
  const encoded = Buffer.from(encode(publication))
    .toString('base64')
    .match(/.{1,76}/g)
    .join('\r\n');
  const mime = [
    `From: Documentation <review@${host}>`,
    `To: ${publication.recipient}`,
    `Subject: ${publication.subject.title}`,
    `Date: ${new Date(publication.issuedAt).toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <publication-p7@${host}>`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/related; type="text/plain";',
    ` boundary="${boundary}"; start="<readable@${host}>"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    `Content-ID: <readable@${host}>`,
    '',
    `Please review ${publication.details.content.title} (${publication.details.content.revision}).`,
    'Approval authorizes publication at:',
    ...publication.details.destinations.map(
      (destination) => `${destination.id} (${destination.visibility})`,
    ),
    `Schedule: ${publication.details.schedule.mode === 'scheduled' ? publication.details.schedule.at : 'immediate'}.`,
    'You can approve, decline or request changes.',
    `Review the proposal: ${publication.human.url}`,
    '',
    `--${boundary}`,
    'Content-Type: application/ld+json;',
    ` profile="${publication.profile}"`,
    'Content-Purpose: Machine-readable',
    'Content-Transfer-Encoding: base64',
    '',
    encoded,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  write(`${directory}/examples/publication.eml`, mime);
  write(`${directory}/bindings/publication.mcp.json`, encode(mcp));
  write(
    `${directory}/examples/publication-exchange.json`,
    encode({
      notice:
        'Illustrative exchange. HTTP credentials and MCP setup are omitted; the MIME message is unsigned. No network calls are performed.',
      http,
      approvalBody: body,
    }),
  );
}
