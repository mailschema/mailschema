import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import publication from '../../specifications/map-0.3/examples/publication-approval.json';
import mcp from '../../specifications/map-0.3/bindings/publication.mcp.json';
import exchange from '../../specifications/map-0.3/examples/publication-exchange.json';
const json = (value: unknown) => JSON.stringify(value, null, 2);
const base = '/artifacts/map-0.3';
export { publication };
export const article = readFileSync(
  resolve('specifications/map-0.3/examples/publication.md'),
  'utf8',
);
export const steps = [
  { id: 'email', label: 'Email' },
  { id: 'map', label: 'MAP' },
  { id: 'read', label: 'Read' },
  { id: 'act', label: 'Decide' },
  { id: 'result', label: 'Result' },
];
export const panels = [
  {
    step: 'email',
    transport: 'any',
    title: 'Ordinary email. A structured request.',
    description:
      'The readable message and MAP description travel together. The client checks the signed original and recipient before reading from a connected service.',
    label: 'MIME message · unsigned illustration',
    lang: 'text' as const,
    code: readFileSync(resolve('specifications/map-0.3/examples/publication.eml'), 'utf8'),
    link: `${base}/examples/publication.eml`,
    download: 'Download the .eml',
    note: 'This download is deliberately unsigned. A real producer must sign it; this file does not pass MAP authentication.',
  },
  {
    step: 'map',
    transport: 'any',
    title: 'The same request on every path.',
    description:
      'The description identifies the service, proposal, exact terms and offered decisions. It contains no API endpoint, tool name or executable request.',
    label: 'Decoded application/ld+json',
    lang: 'json' as const,
    code: json(publication),
    link: `${base}/examples/publication-approval.json`,
    download: 'Download the description',
    note: 'The contract defines what “approve” means. The installed binding supplies how to call this service.',
  },
  {
    step: 'read',
    transport: 'http',
    title: 'Read through the connected API.',
    description:
      'The installed integration selects readReview. The service supplies the current proposal, permitted decisions and the actual content to inspect.',
    label: 'HTTP · readReview',
    lang: 'http' as const,
    code: `${exchange.http.read}\n\n${exchange.http.response}`,
    link: `${base}/bindings/publication.openapi.json`,
    download: 'Read the OpenAPI description',
    note: 'The example omits credentials. A real read uses the account already authorized for this service.',
  },
  {
    step: 'read',
    transport: 'mcp',
    title: 'Read through the connected tool.',
    description:
      'The installed integration selects read_review on the connected MCP server. Its structured result supplies the same proposal and content as the HTTP path.',
    label: 'MCP · tools/call',
    lang: 'json' as const,
    code: `${json(mcp.read)}\n\n${json(mcp.response)}`,
    link: `${base}/bindings/publication.mcp.json`,
    download: 'Read the MCP exchange',
    note: 'MCP setup and authorization are assumed here. The email cannot discover, install or select the server.',
  },
  {
    step: 'act',
    transport: 'http',
    title: 'Your API. Its existing operation.',
    description:
      'After the host checks the content and obtains approval, the mapping sends the decision and exact version through the service’s own request format.',
    label: 'HTTP · decideReview',
    lang: 'http' as const,
    code: exchange.http.decision,
    link: `${base}/bindings/publication.openapi.json`,
    download: 'Read the OpenAPI description',
    note: 'The service checks permission and expected_revision together. Changed terms stop publication.',
  },
  {
    step: 'act',
    transport: 'mcp',
    title: 'Your tool. The same decision.',
    description:
      'After the same content check and approval, the installed integration calls decide_review. Tool arguments preserve the decision and exact version.',
    label: 'MCP · tools/call',
    lang: 'json' as const,
    code: json(mcp.decision),
    link: `${base}/bindings/publication.mcp.json`,
    download: 'Read the MCP exchange',
    note: 'The tool must enforce the same atomic checks. A model’s approval cannot stand in for the host’s decision.',
  },
  {
    step: 'result',
    transport: 'http',
    title: 'Accepted means accepted.',
    description:
      'The service has queued publication of the approved snapshot. The connector reports acceptance and preserves the distinction from completed publication.',
    label: 'HTTP · 202 Accepted',
    lang: 'http' as const,
    code: exchange.http.result,
    link: '/specification/http#http-decisions-retries-and-outcomes',
    download: 'Decisions and outcomes',
    note: 'A lost response leaves the outcome unknown. The client must not blindly repeat the request.',
  },
  {
    step: 'result',
    transport: 'mcp',
    title: 'Read the service’s actual result.',
    description:
      'The tool result says the work is queued. A successful tools/call does not by itself mean the article has been published.',
    label: 'MCP · structured result',
    lang: 'json' as const,
    code: json(mcp.result),
    link: '/interfaces#mcp',
    download: 'MCP research and requirements',
    note: 'The service’s result determines the outcome. isError: false alone is not proof of publication.',
  },
];
