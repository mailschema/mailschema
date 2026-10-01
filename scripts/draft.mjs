// Generate the active MAP 0.3 submission candidate and preserve the MAP 0.2 projection.
// Normative prose and type contracts have one source; templates hold RFC front matter,
// implementation status, and references. --check verifies both generated documents.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractText } from './map-0.3.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const TEMPLATE = 'ietf/archive/map-0.2.template.xml';
const DRAFT = 'ietf/archive/map-0.2.xml';
const SITE = 'https://mailschema.org';
const MARKER = '    <!-- profile -->';

// The draft is ASCII, as RFC 7997 expects of body text; these are the only other characters the
// specification uses, and anything else stops the build.
const ASCII = { '±': 'plus or minus ', '−': '-', '…': '...', '–': '-', '’': "'" };
const ascii = (text) =>
  text.replace(/[^\x09\x0a\x20-\x7e]/g, (character) => {
    if (character in ASCII) return ASCII[character];
    throw new Error(`No ASCII form for ${JSON.stringify(character)} in the specification`);
  });
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const cited = new Set();
let currentProfile = false;

/** A link as the draft cites it: an RFC or draft reference, a section of this draft, or a URL. */
function link(text, href) {
  const rfc =
    /^https:\/\/www\.rfc-editor\.org\/rfc\/rfc(\d+)(?:\.html)?(?:#section-([\d.]+))?$/.exec(href);
  if (rfc) {
    const target = `RFC${rfc[1]}`;
    cited.add(target);
    const xref = `<xref target="${target}"${rfc[2] ? ` section="${rfc[2]}"` : ''}/>`;
    return new RegExp(`^RFC ${rfc[1]}( section [\\d.]+)?$`).test(text) ? xref : `${text} ${xref}`;
  }
  if (href === 'https://www.rfc-editor.org/info/bcp14') return text;
  if (href.startsWith('https://www.w3.org/TR/json-ld11/')) {
    cited.add('JSON-LD11');
    return `${text} <xref target="JSON-LD11"/>`;
  }
  if (href.startsWith('https://datatracker.ietf.org/doc/html/draft-ietf-sml-structured-email')) {
    cited.add('I-D.ietf-sml-structured-email');
    return `${text} <xref target="I-D.ietf-sml-structured-email"/>`;
  }
  if (href === 'https://json-schema.org/draft/2020-12/json-schema-validation') {
    cited.add('JSON-SCHEMA');
    return `${text} <xref target="JSON-SCHEMA"/>`;
  }
  const section = /^(?:\/specification\/(?:profile|type-contracts))?#([a-z0-9-]+)$/.exec(href);
  if (section) return `${text} (<xref target="${section[1]}"/>)`;
  const url = href.startsWith('/') ? `${SITE}${href}` : href;
  return `<eref target="${escape(url)}">${text}</eref>`;
}

/** Inline Markdown: code, emphasis, links and BCP 14 key words. */
function inline(source) {
  const code = [];
  let text = source.replace(/`([^`]+)`/g, (_, value) => {
    code.push(escape(value));
    return `\u0000${code.length - 1}\u0000`;
  });
  // Link text is plain, since xml2rfc allows no <tt> inside a reference.
  const plain = (value) => value.replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)]);
  text = escape(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(
      currentProfile
        ? /\b(NOT RECOMMENDED|MUST NOT|SHALL NOT|SHOULD NOT|RECOMMENDED|REQUIRED|OPTIONAL|MUST|SHALL|SHOULD|MAY)\b/g
        : /\b(MUST NOT|SHOULD NOT|MUST|SHOULD|MAY)\b/g,
      '<bcp14>$1</bcp14>',
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
      link(plain(label), href.replace(/&amp;/g, '&')),
    );
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => `<tt>${code[Number(index)]}</tt>`);
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/\|(?=(?:[^`]*`[^`]*`)*[^`]*$)/)
    .map((cell) => cell.trim());

/** Block Markdown to xml2rfc: sections, paragraphs, lists, tables and code. */
function blocks(markdown, depth, fold = false) {
  const lines = ascii(markdown).split('\n');
  const out = [];
  const open = [];
  const indent = (extra = 0) => '  '.repeat(depth + open.length + extra);
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const heading = /^(#{2,3}) (.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      while (open.length && open.at(-1) >= level) {
        open.pop();
        out.push(`${indent()}</section>`);
      }
      out.push(`${indent()}<section anchor="${slug(heading[2])}" numbered="true">`);
      open.push(level);
      out.push(`${indent()}<name>${inline(heading[2])}</name>`);
      i += 1;
    } else if (line.startsWith('```')) {
      const type = line.slice(3).trim();
      const body = [];
      for (i += 1; !lines[i].startsWith('```'); i += 1) body.push(lines[i]);
      const source = fold ? foldCode(body.join('\n')) : body.join('\n');
      out.push(`${indent()}<sourcecode type="${type}"><![CDATA[${source}]]></sourcecode>`);
      i += 1;
    } else if (line.startsWith('|')) {
      const rows = [];
      for (; lines[i]?.startsWith('|'); i += 1) rows.push(cells(lines[i]));
      const [head, , ...body] = rows;
      out.push(`${indent()}<table>`);
      out.push(
        `${indent(1)}<thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`,
      );
      out.push(`${indent(1)}<tbody>`);
      for (const row of body)
        out.push(`${indent(2)}<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`);
      out.push(`${indent(1)}</tbody>`, `${indent()}</table>`);
    } else if (/^(?:- |\d+\. )/.test(line)) {
      const items = [];
      for (; /^(?:- |\d+\. | {3}- )/.test(lines[i] ?? ''); i += 1) items.push(lines[i]);
      out.push(...list(items, indent()));
    } else if (line.trim()) {
      const paragraph = [];
      for (; lines[i]?.trim() && !/^(?:#|- |\d+\. |\||```)/.test(lines[i]); i += 1)
        paragraph.push(lines[i].trim());
      out.push(`${indent()}<t>${inline(paragraph.join(' '))}</t>`);
    } else i += 1;
  }
  while (open.length) {
    open.pop();
    out.push(`${indent()}</section>`);
  }
  return out;
}

// RFC 8792 single-backslash folding, applied only to the displayed draft code.
// JSON artifacts remain unmodified and executable in the drafting bundle.
function foldCode(source) {
  if (!source.split('\n').some((line) => line.length > 69)) return source;
  const lines = [];
  for (let line of source.split('\n')) {
    while (line.length > 69) {
      let cut = 68;
      while (line[cut - 1] === '\\' || /\s/.test(line[cut])) cut -= 1;
      lines.push(line.slice(0, cut) + '\\');
      line = '    ' + line.slice(cut);
    }
    lines.push(line);
  }
  const folded = lines.join('\n');
  if (folded.replace(/\\\n[ \t]*/g, '') !== source) throw new Error('Code folding changed content');
  return "NOTE: '\\' line wrapping per RFC 8792\n\n" + folded;
}

/** A list, with one level of nesting as the profile uses it. */
function list(items, indent) {
  const tag = /^\d+\. /.test(items[0]) ? 'ol' : 'ul';
  const out = [`${indent}<${tag}>`];
  for (let i = 0; i < items.length; i += 1) {
    const text = items[i].replace(/^(?:- |\d+\. )/, '');
    const nested = [];
    while (items[i + 1]?.startsWith('   - ')) nested.push(items[(i += 1)].slice(3));
    if (!nested.length) out.push(`${indent}  <li>${inline(text)}</li>`);
    else
      out.push(
        `${indent}  <li><t>${inline(text)}</t>`,
        ...list(nested, `${indent}    `),
        `${indent}  </li>`,
      );
  }
  out.push(`${indent}</${tag}>`);
  return out;
}

const body = (path) => read(path).replace(/^---\n[\s\S]*?\n---\n/, '');
const sectionsFrom = (markdown, first) => markdown.slice(markdown.indexOf(`## ${first}`));

// The profile from its first section, with the bound artifacts' digests after their table.
const record = JSON.parse(read('public/profiles/map/0.2.json'));
const digests = ['schema', 'context', 'contractFormat']
  .map((name) => `\`${record.artifacts[name].url}\`, SHA-256 \`${record.artifacts[name].sha256}\``)
  .join('; ');
const profile = sectionsFrom(body('docs/specification/profile.md'), 'Published artifacts').replace(
  '\n## Email representation',
  `\nThe profile record binds these artifacts by the SHA-256 digest of their exact bytes: ${digests}.\n\n## Email representation`,
);
// The contract rules, as one section of the draft.
const rules = sectionsFrom(body('docs/specification/type-contracts.md'), 'Contract rules').replace(
  /^## /gm,
  '### ',
);
const generated = [...blocks(profile, 2), ...blocks(`## Type contract rules\n\n${rules}`, 2)].join(
  '\n',
);

const template = read(TEMPLATE);
if (template.split(MARKER).length !== 2)
  throw new Error(`${TEMPLATE} must contain one ${MARKER.trim()}`);
const draft = template.replace(MARKER, generated);

// Every reference the generated text cites must be in the template's reference lists.
for (const target of cited)
  if (
    !draft.includes(`reference.${target.replace(/^RFC/, 'RFC.')}.xml`) &&
    !draft.includes(`anchor="${target}"`)
  )
    throw new Error(`${target} is cited but not listed in ${TEMPLATE}`);

function output(path, value) {
  if (process.argv.includes('--check')) {
    if (read(path) !== value) throw new Error(`${path} differs from its source; run npm run draft`);
    console.log(`${path} matches its source.`);
  } else {
    writeFileSync(resolve(root, path), value);
    console.log(`Wrote ${path} from its source.`);
  }
}
output(DRAFT, draft);

cited.clear();
currentProfile = true;
const base = 'specifications/map-0.3';
const section = (name) => read(`${base}/${name}.md`).replace(/^# [^\n]+\n/, '');
const core03 = section('core');
// Bindings precede security/privacy/conformance without duplicating the source prose.
const split = core03.indexOf('## Security considerations');
if (split < 0) throw new Error('Core security section is missing');
const main = core03.slice(0, split) + section('http') + section('capability') + core03.slice(split);
const context = read(`${base}/context.jsonld`).trim();
const example = read(`${base}/examples/campaign-send-approval.json`).trim();
const appendix =
  contractText({ schemas: false }) +
  '\n## Description example\n\n' +
  'This generated example uses synthetic identities and an inert service. The content digest is illustrative. Long code lines are folded as described in [RFC 8792](https://www.rfc-editor.org/rfc/rfc8792); unfold them before parsing. The complete contract documents and schemas are maintained alongside the specification source.\n\n```json\n' +
  example +
  '\n```\n\n' +
  '## Fixed JSON-LD context\n\nThe following context defines the compact representation. Consumers resolve it locally, never from an email-triggered network request.\n\n```json\n' +
  context +
  '\n```\n';
const currentTemplate = read('ietf/draft.template.xml');
let current = currentTemplate;
for (const [marker, text] of [
  ['<!-- specification -->', main],
  ['<!-- appendices -->', appendix],
]) {
  if (current.split(marker).length !== 2) throw new Error(`Missing or duplicate marker ${marker}`);
  current = current.replace(marker, blocks(text, 2, true).join('\n'));
}
for (const target of cited)
  if (
    !current.includes(`reference.${target.replace(/^RFC/, 'RFC.')}.xml`) &&
    !current.includes(`anchor="${target}"`)
  )
    throw new Error(`${target} is cited but not listed in the 0.3 template`);
const anchors = [...current.matchAll(/\banchor="([^"]+)"/g)].map((m) => m[1]);
if (anchors.length !== new Set(anchors).size) throw new Error('Duplicate draft anchor');
output('ietf/draft-mailschema-mail-action-protocol-00.xml', current);
