import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'public/og');
const font = (await readFile(resolve(root, 'public/fonts/plus-jakarta-sans-latin.woff2'))).toString(
  'base64',
);
await mkdir(output, { recursive: true });

const structure = `
  <svg class="structure" viewBox="0 0 540 520" aria-hidden="true">
    <defs>
      <linearGradient id="yellow" x1="150" y1="170" x2="250" y2="420" gradientUnits="userSpaceOnUse">
        <stop stop-color="#f0ffab"/><stop offset=".48" stop-color="#d9ff6b"/><stop offset="1" stop-color="#80993a"/>
      </linearGradient>
      <linearGradient id="violet" x1="330" y1="170" x2="470" y2="420" gradientUnits="userSpaceOnUse">
        <stop stop-color="#b7abff"/><stop offset=".45" stop-color="#7861ff"/><stop offset="1" stop-color="#332576"/>
      </linearGradient>
      <linearGradient id="dark" x1="235" y1="55" x2="320" y2="410" gradientUnits="userSpaceOnUse">
        <stop stop-color="#353740"/><stop offset="1" stop-color="#16171d"/>
      </linearGradient>
      <radialGradient id="halo"><stop stop-color="#76865d" stop-opacity=".26"/><stop offset="1" stop-color="#111217" stop-opacity="0"/></radialGradient>
      <linearGradient id="fade-yellow" x1="290" y1="385" x2="90" y2="520"><stop stop-color="#d9ff6b" stop-opacity=".28"/><stop offset="1" stop-color="#d9ff6b" stop-opacity="0"/></linearGradient>
      <linearGradient id="fade-violet" x1="420" y1="405" x2="240" y2="520"><stop stop-color="#7861ff" stop-opacity=".32"/><stop offset="1" stop-color="#7861ff" stop-opacity="0"/></linearGradient>
    </defs>
    <ellipse cx="300" cy="335" rx="235" ry="180" fill="url(#halo)"/>
    <g stroke="#747782" stroke-opacity=".12" stroke-width="1">
      <path d="m25 370 245 136 260-152M65 345l245 136 220-129M105 321l245 136 180-105M145 297l245 136 140-82"/>
      <path d="m75 407 260-150M130 439l260-150M185 471l260-150M240 503l260-150"/>
    </g>
    <path d="m255 360 80 47-205 126-88-47Z" fill="url(#fade-yellow)"/>
    <path d="m392 405 80 46-190 104-89-47Z" fill="url(#fade-violet)"/>
    <path d="m139 170 96 55v169l-96-55Z" fill="url(#yellow)"/>
    <path d="m139 170 6-3 96 55-6 3Z" fill="#efffc3"/>
    <path d="m235 225 6-3v169l-6 3Z" fill="#8daf42"/>
    <path d="m246 64 98 56v292l-98-56Z" fill="url(#dark)"/>
    <path d="m246 64 6-3 98 56-6 3Z" fill="#484a53"/>
    <path d="m344 120 6-3v292l-6 3Z" fill="#535a46"/>
    <path d="m246 294 98 56v62l-98-56Z" fill="url(#yellow)"/>
    <path d="m361 180 98 57v199l-98-57Z" fill="url(#violet)"/>
    <path d="m361 180 6-3 98 57-6 3Z" fill="#b5a7ff"/>
    <path d="m459 237 6-3v199l-6 3Z" fill="#423196"/>
    <g fill="#a2a4ad" font-family="MailSchema Mono,monospace" font-size="9" letter-spacing="2.4">
      <text x="98" y="148">DESCRIBE</text><text x="250" y="42">REQUEST</text><text x="380" y="158">RESOLVE</text>
    </g>
  </svg>`;

const mark = `<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M2 10 12 16v21L2 31Z" fill="#d9ff6b"/><path d="M15 2 25 8v34l-10-6Z" fill="#f3f3f5"/><path d="m28 10 10 6v21l-10-6Z" fill="#7861ff"/></svg>`;

function page({ eyebrow, title, accent, description, footer }) {
  return `<!doctype html><html><head><style>
    @font-face{font-family:MailSchema;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}
    *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#111217;color:#f3f3f5;font-family:MailSchema,sans-serif}
    body:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.9%,rgba(121,124,138,.07) 50%,transparent 50.1%);pointer-events:none}
    .top{position:absolute;left:62px;right:62px;top:48px;height:48px;display:flex;align-items:center;border-bottom:1px solid #30323a;padding-bottom:24px}
    .brand{display:flex;align-items:center;gap:14px;font-size:24px;font-weight:720;letter-spacing:-.045em}.brand svg{width:24px;height:28px}.status{margin-left:auto;color:#9b9da6;font:600 10px ui-monospace,monospace;letter-spacing:.18em}
    .copy{position:absolute;left:62px;top:153px;width:650px;z-index:2}.eyebrow{display:flex;align-items:center;gap:12px;color:#a89aff;font:700 10px ui-monospace,monospace;letter-spacing:.18em;margin-bottom:25px}.eyebrow:before{content:"";width:19px;height:1px;background:#7861ff}
    h1{font-size:76px;line-height:.99;letter-spacing:-.072em;font-weight:590;margin:0;max-width:640px}h1 .accent{color:#d9ff6b}.description{font-size:17px;line-height:1.6;color:#aeb0b8;max-width:520px;margin-top:26px;letter-spacing:-.01em}
    .structure{position:absolute;right:20px;top:92px;width:535px;height:515px}.bottom{position:absolute;left:62px;right:62px;bottom:38px;display:flex;align-items:center;border-top:1px solid #30323a;padding-top:20px;color:#8d9099;font:600 10px ui-monospace,monospace;letter-spacing:.12em}.bottom strong{color:#d9ff6b;font-weight:650}.bottom span:last-child{margin-left:auto}
  </style></head><body><div class="top"><div class="brand">${mark}<span>MailSchema</span></div><div class="status">MAP 0.1 · WORKING DRAFT</div></div><div class="copy"><div class="eyebrow">${eyebrow}</div><h1>${title}<span class="accent">${accent}</span></h1><p class="description">${description}</p></div>${structure}<div class="bottom"><strong>mailschema.org</strong><span>${footer}</span></div></body></html>`;
}

const cards = [
  {
    file: 'mailschema-v1.png',
    eyebrow: 'OPEN STANDARDS FOR EMAIL ACTIONS',
    title: 'Email agents<br>can ',
    accent: 'act on.',
    description: 'A common interface for agents and services to work through email.',
    footer: 'MAIL ACTION PROTOCOL · TYPES · REGISTRY',
  },
  {
    file: 'map-v1.png',
    eyebrow: 'THE OPEN SPECIFICATION',
    title: 'Mail Action<br>',
    accent: 'Protocol',
    description:
      'Describe available actions, submit authorized requests and return truthful results.',
    footer: 'MAP 0.1 · SPECIFICATION',
  },
];

const browser = await chromium.launch();
try {
  const browserPage = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of cards) {
    await browserPage.setContent(page(card), { waitUntil: 'load' });
    await browserPage.evaluate(() => document.fonts.ready);
    await browserPage.screenshot({ path: resolve(output, card.file), type: 'png' });
  }
} finally {
  await browser.close();
}
console.log(`Generated ${cards.length} MailSchema social cards in public/og/.`);
